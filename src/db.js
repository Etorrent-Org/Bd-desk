import * as core from './db-core.js';

export * from './db-core.js';

export const MIN_COVER_EDGE = 300;
export const COVER_ESCALATION_EDGE = 700;

function knownLowRes(value) {
  const width=Number(value?.width ?? value?.cover_width ?? 0);
  const height=Number(value?.height ?? value?.cover_height ?? 0);
  if(width>0&&height>0)return Math.min(width,height)<MIN_COVER_EDGE;
  if(width>0)return width<MIN_COVER_EDGE;
  return false;
}

function ensureCoverStatus(db){
  const columns=db.prepare('PRAGMA table_info(albums)').all();
  if(!columns.some(column=>column.name==='cover_status')) db.exec('ALTER TABLE albums ADD COLUMN cover_status TEXT');
}

function escalationWhere(){
  return `(
    cover_url IS NULL OR TRIM(cover_url)='' OR
    (cover_width IS NOT NULL AND cover_width>0 AND (
      (cover_height IS NOT NULL AND cover_height>0 AND MIN(cover_width,cover_height)<${COVER_ESCALATION_EDGE})
      OR ((cover_height IS NULL OR cover_height<=0) AND cover_width<${COVER_ESCALATION_EDGE})
    ))
  )`;
}

function migrateCoverQualityV3(db){
  ensureCoverStatus(db);
  const key='cover-quality-v3';
  if(db.prepare('SELECT 1 FROM settings WHERE key=?').get(key))return;
  db.exec(`
    UPDATE albums
       SET cover_checked_at=NULL, cover_decision='quality-v3-recheck'
     WHERE isbn IS NOT NULL AND TRIM(isbn)<>''
       AND COALESCE(cover_origin,'')<>'user'
       AND ((cover_url IS NULL OR TRIM(cover_url)='') OR COALESCE(cover_origin,'') IN ('machine','partner'));
    UPDATE albums SET cover_status='verified'
     WHERE cover_url IS NOT NULL AND TRIM(cover_url)<>'' AND cover_origin='user';
    UPDATE albums SET cover_status='low_res'
     WHERE cover_url IS NOT NULL AND TRIM(cover_url)<>'' AND COALESCE(cover_origin,'')<>'user'
       AND cover_width IS NOT NULL AND cover_width>0
       AND ((cover_height IS NOT NULL AND cover_height>0 AND MIN(cover_width,cover_height)<300)
         OR ((cover_height IS NULL OR cover_height<=0) AND cover_width<300));
    UPDATE albums SET cover_status='missing'
     WHERE cover_url IS NULL OR TRIM(cover_url)='';
    UPDATE albums SET cover_status=COALESCE(cover_status,'verified')
     WHERE cover_url IS NOT NULL AND TRIM(cover_url)<>'';
  `);
  db.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run(key,new Date().toISOString());
}

function migrateRealCoverEscalationV4(db){
  ensureCoverStatus(db);
  const key='real-cover-escalation-v4';
  if(db.prepare('SELECT 1 FROM settings WHERE key=?').get(key))return;
  db.prepare(`UPDATE albums
    SET cover_checked_at=NULL, cover_decision='real-cover-v4-recheck'
    WHERE isbn IS NOT NULL AND TRIM(isbn)<>''
      AND COALESCE(cover_origin,'')<>'user'
      AND ${escalationWhere()}`).run();
  db.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run(key,new Date().toISOString());
}

function migrateBibliographicCoverV5(db){
  ensureCoverStatus(db);
  const key='bibliographic-cover-v5';
  if(db.prepare('SELECT 1 FROM settings WHERE key=?').get(key))return;
  db.prepare(`UPDATE albums
    SET cover_checked_at=NULL, cover_decision='bibliographic-cover-v5-recheck'
    WHERE COALESCE(cover_origin,'')<>'user'
      AND ${escalationWhere()}`).run();
  db.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run(key,new Date().toISOString());
}

export function migrate(db){
  core.migrate(db);
  migrateCoverQualityV3(db);
  migrateRealCoverEscalationV4(db);
  migrateBibliographicCoverV5(db);
}

export function openDatabase(dbPath=':memory:'){
  const db=core.openDatabase(dbPath);
  migrateCoverQualityV3(db);
  migrateRealCoverEscalationV4(db);
  migrateBibliographicCoverV5(db);
  return db;
}

function updateCoverStatus(db,id,album){
  const status=!album?.cover_url?'missing':knownLowRes(album)?'low_res':'verified';
  db.prepare('UPDATE albums SET cover_status=? WHERE id=?').run(status,id);
  return {...album,cover_status:status};
}

function isPartnerCover(selection){
  if(selection?.source!=='bdfugue')return false;
  try{
    const url=new URL(String(selection.url||''));
    return url.protocol==='https:'&&(url.hostname==='bdfugue.com'||url.hostname==='www.bdfugue.com'||url.hostname.endsWith('.bdfugue.com'));
  }catch{return false}
}

export function persistCoverDecision(db,id,selection={}){
  const current=core.getAlbum(db,id);
  if(!current)return {updated:false,reason:'album-not-found',album:null};
  if(current.cover_origin==='user')return {updated:false,reason:'preserve-user-cover',album:updateCoverStatus(db,id,current)};

  if(selection.url&&knownLowRes(selection)){
    if(current.cover_origin!=='user'&&knownLowRes(current)){
      db.prepare(`UPDATE albums SET cover_url=NULL,cover_origin=NULL,cover_source=NULL,cover_confidence=NULL,
        cover_width=NULL,cover_height=NULL,cover_bytes=NULL,cover_checked_at=CURRENT_TIMESTAMP,
        cover_decision='low-resolution-rejected',cover_status='low_res',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(id);
    }else{
      db.prepare(`UPDATE albums SET cover_checked_at=CURRENT_TIMESTAMP,cover_decision='low-resolution-rejected',cover_status=COALESCE(cover_status,'missing') WHERE id=?`).run(id);
    }
    return {updated:false,reason:'low-resolution-cover',album:core.getAlbum(db,id)};
  }

  if(isPartnerCover(selection)){
    const confidence=Number(selection.confidence)||0.82;
    const oldPixels=Number(current.cover_width||0)*Number(current.cover_height||0);
    const newPixels=Number(selection.width||0)*Number(selection.height||0);
    if(current.cover_url&&current.cover_origin==='partner'&&oldPixels&&newPixels&&oldPixels>=newPixels&&Number(current.cover_confidence||0)>=confidence){
      db.prepare(`UPDATE albums SET cover_checked_at=CURRENT_TIMESTAMP,cover_decision='partner-no-better-cover',cover_status=? WHERE id=?`).run(knownLowRes(current)?'low_res':'verified',id);
      return {updated:false,reason:'preserve-better-partner-cover',album:core.getAlbum(db,id)};
    }
    db.prepare(`UPDATE albums SET cover_url=?,cover_origin='partner',cover_source='bdfugue',cover_confidence=?,
      cover_width=?,cover_height=?,cover_bytes=?,cover_checked_at=CURRENT_TIMESTAMP,cover_decision=?,
      cover_status='verified',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(selection.url,confidence,selection.width||null,selection.height||null,selection.bytes||null,selection.decision||'verified-partner-source',id);
    return {updated:true,reason:'partner-cover-selected',album:core.getAlbum(db,id)};
  }

  const result=core.persistCoverDecision(db,id,selection);
  if(result.album)result.album=updateCoverStatus(db,id,result.album);
  return result;
}

export function applyMetadataResolution(db,id,resolution={}){
  const deferred={...resolution,cover:{url:null,decision:'metadata-only',reason:'cover-deferred-to-quality-gate'}};
  const base=core.applyMetadataResolution(db,id,deferred);
  const cover=persistCoverDecision(db,id,resolution.cover||{});
  return {...base,album:cover.album||base.album,cover};
}

function noCoverWhere(){return `(cover_url IS NULL OR TRIM(cover_url)='')`}

export function coverResolutionStatus(db){
  ensureCoverStatus(db);
  const total=Number(db.prepare('SELECT COUNT(*) c FROM albums').get().c||0);
  const lowRes=Number(db.prepare(`SELECT COUNT(*) c FROM albums WHERE cover_url IS NOT NULL AND TRIM(cover_url)<>'' AND COALESCE(cover_origin,'')<>'user' AND cover_width IS NOT NULL AND cover_width>0 AND ((cover_height IS NOT NULL AND cover_height>0 AND MIN(cover_width,cover_height)<300) OR ((cover_height IS NULL OR cover_height<=0) AND cover_width<300))`).get().c||0);
  const rawWithCover=Number(db.prepare(`SELECT COUNT(*) c FROM albums WHERE NOT ${noCoverWhere()}`).get().c||0);
  const withCover=Math.max(rawWithCover-lowRes,0);
  const pending=Number(db.prepare(`SELECT COUNT(*) c FROM albums WHERE cover_checked_at IS NULL AND COALESCE(cover_origin,'')<>'user' AND ${escalationWhere()}`).get().c||0);
  const withoutIsbn=Number(db.prepare(`SELECT COUNT(*) c FROM albums WHERE ${noCoverWhere()} AND (isbn IS NULL OR TRIM(isbn)='')`).get().c||0);
  const checkedWithoutCover=Number(db.prepare(`SELECT COUNT(*) c FROM albums WHERE ${noCoverWhere()} AND cover_checked_at IS NOT NULL`).get().c||0);
  return {total,withCover,missing:Math.max(total-withCover,0),lowRes,pending,withoutIsbn,checkedWithoutCover,coveragePercent:total?Math.round(withCover/total*100):0};
}

export function prepareCoverResolutionQueue(db){
  ensureCoverStatus(db);
  db.prepare(`UPDATE albums
    SET cover_checked_at=NULL, cover_decision='real-cover-retry'
    WHERE COALESCE(cover_origin,'')<>'user'
      AND ${escalationWhere()}`).run();
  return coverResolutionStatus(db);
}

export function listPendingCoverAlbums(db,limit=8){
  const parsed=Number.parseInt(limit,10);
  const safeLimit=Math.min(Math.max(Number.isInteger(parsed)?parsed:8,1),24);
  return db.prepare(`SELECT id,isbn,series,number,title,publisher,cover_url,cover_origin,cover_source,cover_width,cover_height,cover_checked_at,cover_status FROM albums WHERE cover_checked_at IS NULL AND COALESCE(cover_origin,'')<>'user' AND ${escalationWhere()} ORDER BY CASE WHEN cover_url IS NULL OR TRIM(cover_url)='' THEN 0 ELSE 1 END,id LIMIT ?`).all(safeLimit);
}

export function dashboard(db){
  const value=core.dashboard(db);
  return {...value,coverStats:coverResolutionStatus(db)};
}
