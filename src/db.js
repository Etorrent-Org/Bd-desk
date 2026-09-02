import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseBdgestCsv, toIsoDate } from './csv.js';
import { openLibraryCover } from './metadata.js';

export function openDatabase(dbPath=':memory:') {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), {recursive:true});
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  migrate(db);
  return db;
}

export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT, bdgest_id TEXT UNIQUE, isbn TEXT, series TEXT NOT NULL,
      number TEXT, number_alt TEXT, title TEXT NOT NULL, publisher TEXT, collection_name TEXT,
      first_edition INTEGER DEFAULT 0, legal_deposit TEXT, print_date TEXT, market_value REAL,
      condition TEXT, purchase_date TEXT, purchase_price REAL, note TEXT, writer TEXT, artist TEXT,
      wishlist INTEGER DEFAULT 0, for_sale INTEGER DEFAULT 0, format TEXT, followed INTEGER DEFAULT 0,
      read INTEGER DEFAULT 0, read_date TEXT, signed INTEGER DEFAULT 0, signed_date TEXT, comment TEXT,
      table_name TEXT, cover_url TEXT, description TEXT, source TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    DROP INDEX IF EXISTS idx_albums_isbn;
    CREATE INDEX IF NOT EXISTS idx_albums_isbn ON albums(isbn) WHERE isbn IS NOT NULL AND isbn <> '';
    CREATE INDEX IF NOT EXISTS idx_albums_series ON albums(series);
    CREATE INDEX IF NOT EXISTS idx_albums_title ON albums(title);
    CREATE TABLE IF NOT EXISTS metadata_provenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT, album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      field TEXT NOT NULL, source TEXT NOT NULL, confidence REAL NOT NULL, value TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, album_id INTEGER, detail TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT, album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      borrower TEXT NOT NULL, loaned_at TEXT DEFAULT CURRENT_TIMESTAMP, due_at TEXT, returned_at TEXT
    );
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE, prefix TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, last_used_at TEXT, revoked_at TEXT
    );
    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, url TEXT NOT NULL, events TEXT NOT NULL,
      enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
}

const INSERT = `INSERT INTO albums
(bdgest_id,isbn,series,number,number_alt,title,publisher,collection_name,first_edition,legal_deposit,print_date,market_value,condition,purchase_date,purchase_price,note,writer,artist,wishlist,for_sale,format,followed,read,read_date,signed,signed_date,comment,table_name,cover_url,source)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
ON CONFLICT(bdgest_id) DO UPDATE SET
isbn=excluded.isbn,series=excluded.series,number=excluded.number,number_alt=excluded.number_alt,title=excluded.title,publisher=excluded.publisher,collection_name=excluded.collection_name,first_edition=excluded.first_edition,legal_deposit=excluded.legal_deposit,print_date=excluded.print_date,market_value=excluded.market_value,condition=excluded.condition,purchase_date=excluded.purchase_date,purchase_price=excluded.purchase_price,note=excluded.note,writer=excluded.writer,artist=excluded.artist,wishlist=excluded.wishlist,for_sale=excluded.for_sale,format=excluded.format,followed=excluded.followed,read=excluded.read,read_date=excluded.read_date,signed=excluded.signed,signed_date=excluded.signed_date,comment=excluded.comment,table_name=excluded.table_name,updated_at=CURRENT_TIMESTAMP`;

export function importBdgest(db, text) {
  const rows = parseBdgestCsv(text);
  const stmt = db.prepare(INSERT);
  db.exec('BEGIN');
  let imported=0, skipped=0; const errors=[];
  try {
    for (const a of rows) {
      try {
        stmt.run(a.bdgestId,a.isbn,a.series,a.number,a.numberAlt,a.title,a.publisher,a.collection,a.firstEdition,a.legalDeposit,a.printDate,a.marketValue,a.condition,toIsoDate(a.purchaseDate)||a.purchaseDate,a.purchasePrice,a.note,a.writer,a.artist,a.wishlist,a.forSale,a.format,a.followed,a.read,toIsoDate(a.readDate)||a.readDate,a.signed,toIsoDate(a.signedDate)||a.signedDate,a.comment,a.tableName,openLibraryCover(a.isbn),a.source);
        imported++;
      } catch (e) {
        // Keep importing the remaining rows and expose malformed records in the report.
        skipped++;
        errors.push({bdgestId:a.bdgestId||null,isbn:a.isbn||null,error:String(e?.message||e)});
      }
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  db.prepare('INSERT INTO history(event,detail) VALUES (?,?)').run('bulk_import', JSON.stringify({rows:rows.length,imported,skipped}));
  return {rows:rows.length, imported, skipped, errors};
}

export function seedIfEmpty(db, csvPath) {
  const count = db.prepare('SELECT COUNT(*) c FROM albums').get().c;
  if (count || !csvPath || !fs.existsSync(csvPath)) return {seeded:false,count};
  return {seeded:true, ...importBdgest(db, fs.readFileSync(csvPath,'utf8'))};
}

export function listAlbums(db, {search='',limit=60,offset=0,series=null,wishlist=null,read=null}={}) {
  const where=[], params=[];
  if (search) { where.push('(title LIKE ? OR series LIKE ? OR writer LIKE ? OR artist LIKE ? OR isbn LIKE ?)'); const q=`%${search}%`; params.push(q,q,q,q,q); }
  if (series) { where.push('series=?'); params.push(series); }
  if (wishlist !== null) { where.push('wishlist=?'); params.push(wishlist?1:0); }
  if (read !== null) { where.push('read=?'); params.push(read?1:0); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const safeLimit=Math.min(Math.max(Number(limit)||60,1),500), safeOffset=Math.max(Number(offset)||0,0);
  const total=db.prepare(`SELECT COUNT(*) c FROM albums ${w}`).get(...params).c;
  const items=db.prepare(`SELECT * FROM albums ${w} ORDER BY COALESCE(purchase_date,'') DESC, series COLLATE NOCASE, CAST(number AS REAL), title COLLATE NOCASE LIMIT ? OFFSET ?`).all(...params,safeLimit,safeOffset);
  return {items,total,limit:safeLimit,offset:safeOffset};
}

export function getAlbum(db,id) { return db.prepare('SELECT * FROM albums WHERE id=?').get(id); }

export function createAlbum(db,a) {
  const r=db.prepare(`INSERT INTO albums(isbn,series,number,title,publisher,collection_name,writer,artist,first_edition,read,wishlist,purchase_price,cover_url,source) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    a.isbn||null,a.series||'Sans série',a.number||null,a.title||'Sans titre',a.publisher||null,a.collectionName||a.collection||null,a.writer||null,a.artist||null,a.firstEdition?1:0,a.read?1:0,a.wishlist?1:0,a.purchasePrice??null,a.coverUrl||openLibraryCover(a.isbn),a.source||'manual');
  db.prepare('INSERT INTO history(event,album_id,detail) VALUES (?,?,?)').run('album_created',r.lastInsertRowid,JSON.stringify({title:a.title}));
  return getAlbum(db,r.lastInsertRowid);
}

export function updateAlbum(db,id,patch) {
  const allowed={title:'title',series:'series',number:'number',publisher:'publisher',collectionName:'collection_name',writer:'writer',artist:'artist',read:'read',wishlist:'wishlist',forSale:'for_sale',firstEdition:'first_edition',marketValue:'market_value',purchasePrice:'purchase_price',coverUrl:'cover_url',description:'description',comment:'comment'};
  const sets=[],vals=[];
  for (const [k,col] of Object.entries(allowed)) if (k in patch) { sets.push(`${col}=?`); vals.push(['read','wishlist','forSale','firstEdition'].includes(k)?(patch[k]?1:0):patch[k]); }
  if (!sets.length) return getAlbum(db,id);
  sets.push('updated_at=CURRENT_TIMESTAMP');
  db.prepare(`UPDATE albums SET ${sets.join(',')} WHERE id=?`).run(...vals,id);
  db.prepare('INSERT INTO history(event,album_id,detail) VALUES (?,?,?)').run('album_updated',id,JSON.stringify(Object.keys(patch)));
  return getAlbum(db,id);
}

export function deleteAlbum(db,id) {
  const a=getAlbum(db,id); if(!a) return false;
  db.prepare('DELETE FROM albums WHERE id=?').run(id);
  db.prepare('INSERT INTO history(event,album_id,detail) VALUES (?,?,?)').run('album_deleted',id,JSON.stringify({title:a.title}));
  return true;
}

function numN(v){ const m=String(v||'').match(/^(\d+(?:\.\d+)?)$/); return m?Number(m[1]):null; }
export function seriesSummary(db) {
  const rows=db.prepare('SELECT series, number, read, cover_url, id, title FROM albums ORDER BY series COLLATE NOCASE, CAST(number AS REAL)').all();
  const map=new Map();
  for(const r of rows){ if(!map.has(r.series)) map.set(r.series,{name:r.series,owned:0,read:0,numbers:[],coverUrl:r.cover_url,albumId:r.id,title:r.title}); const s=map.get(r.series); s.owned++; s.read+=r.read?1:0; const n=numN(r.number); if(n!=null)s.numbers.push(n); }
  return [...map.values()].map(s=>{ const ints=s.numbers.filter(Number.isInteger); let missing=[]; if(ints.length>=2){ const min=Math.min(...ints),max=Math.max(...ints),set=new Set(ints); for(let n=min;n<=max;n++)if(!set.has(n))missing.push(n); } return {...s,missing,progress:s.owned?Math.round(s.read/s.owned*100):0}; }).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
}

export function dashboard(db) {
  const stats=db.prepare(`SELECT COUNT(*) albums, COUNT(DISTINCT series) series, SUM(CASE WHEN read=1 THEN 1 ELSE 0 END) read, SUM(CASE WHEN wishlist=1 THEN 1 ELSE 0 END) wishlist, SUM(CASE WHEN first_edition=1 THEN 1 ELSE 0 END) eo, COALESCE(SUM(purchase_price),0) spent FROM albums`).get();
  const series=seriesSummary(db); const missing=series.reduce((n,s)=>n+s.missing.length,0);
  const recent=db.prepare(`SELECT id,title,series,number,cover_url,purchase_date,publisher FROM albums ORDER BY COALESCE(purchase_date,'') DESC LIMIT 5`).all();
  const resume=db.prepare(`SELECT id,title,series,number,cover_url FROM albums WHERE read=0 ORDER BY series COLLATE NOCASE, CAST(number AS REAL) LIMIT 4`).all();
  return {...stats,missing,recent,resume,readPercent:stats.albums?Math.round(stats.read/stats.albums*100):0};
}

export function stats(db) {
  const base=dashboard(db);
  const formats=db.prepare(`SELECT COALESCE(format,'?') label, COUNT(*) value FROM albums GROUP BY format ORDER BY value DESC`).all();
  const publishers=db.prepare(`SELECT COALESCE(publisher,'Inconnu') label, COUNT(*) value FROM albums GROUP BY publisher ORDER BY value DESC LIMIT 12`).all();
  const years=db.prepare(`SELECT substr(purchase_date,1,4) label, COUNT(*) value, COALESCE(SUM(purchase_price),0) spent FROM albums WHERE purchase_date GLOB '[0-9][0-9][0-9][0-9]-*' GROUP BY substr(purchase_date,1,4) ORDER BY label`).all();
  const estimatedValue=db.prepare(`SELECT COALESCE(SUM(market_value),0) value FROM albums`).get().value;
  return {...base,formats,publishers,years,estimatedValue,eoPercent:base.albums?Math.round(base.eo/base.albums*100):0};
}

export function basicStats(db) {
  const d=dashboard(db);
  return {albums:d.albums,series:d.series,read:d.read,wishlist:d.wishlist,missing:d.missing,readPercent:d.readPercent};
}

export function editionAnomalies(db) {
  const duplicateIsbns=db.prepare(`SELECT isbn, COUNT(*) count, GROUP_CONCAT(id) album_ids FROM albums WHERE isbn IS NOT NULL AND isbn<>'' GROUP BY isbn HAVING COUNT(*)>1 ORDER BY count DESC,isbn`).all();
  const variants=db.prepare(`SELECT series, number, COUNT(*) count, COUNT(DISTINCT isbn) isbn_count, GROUP_CONCAT(id) album_ids FROM albums WHERE number IS NOT NULL AND TRIM(number)<>'' GROUP BY series,number HAVING COUNT(*)>1 AND COUNT(DISTINCT COALESCE(isbn,''))>1 ORDER BY series COLLATE NOCASE,CAST(number AS REAL)`).all();
  return {duplicateIsbns,variants,total:duplicateIsbns.length+variants.length};
}

export function exportCollection(db) {
  return db.prepare(`SELECT id,bdgest_id,isbn,series,number,number_alt,title,publisher,collection_name,first_edition,legal_deposit,print_date,market_value,condition,purchase_date,purchase_price,note,writer,artist,wishlist,for_sale,format,followed,read,read_date,signed,signed_date,comment,cover_url,description,source,created_at,updated_at FROM albums ORDER BY series COLLATE NOCASE,CAST(number AS REAL),title COLLATE NOCASE`).all();
}

export function peopleSummary(db) {
  const rows=db.prepare('SELECT writer,artist FROM albums').all(), map=new Map();
  for(const r of rows) for(const [role,val] of [['Scénariste',r.writer],['Dessinateur',r.artist]]) if(val){ for(const name of String(val).split(/\s*;\s*/)){ const k=`${name}|${role}`; map.set(k,{name,role,count:(map.get(k)?.count||0)+1}); } }
  return [...map.values()].sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name,'fr'));
}

export function publishersSummary(db){ return db.prepare(`SELECT COALESCE(publisher,'Inconnu') name, COUNT(*) count FROM albums GROUP BY publisher ORDER BY count DESC, name COLLATE NOCASE`).all(); }
