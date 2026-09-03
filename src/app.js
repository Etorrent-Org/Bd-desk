import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDatabase, seedIfEmpty, listAlbums, getAlbum, createAlbum, updateAlbum, deleteAlbum, dashboard, basicStats, stats, seriesSummary, peopleSummary, publishersSummary, importBdgest, editionAnomalies, exportCollection, persistCoverDecision, applyMetadataResolution } from './db.js';
import { canonicalIsbn } from './isbn.js';
import { verifyLicense, hasFeature } from './license.js';
import { fetchMetadata, resolveCandidates } from './metadata.js';
import { handleMcp, validateMcpHttp, MCP_PROTOCOL_VERSION } from './mcp.js';
import { dispatchWebhook } from './webhooks.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PUBLIC=path.resolve(__dirname,'../public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};

function json(res,status,data,headers={}){ res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}); res.end(JSON.stringify(data)); }
function text(res,status,data,type='text/plain; charset=utf-8'){ res.writeHead(status,{'content-type':type}); res.end(data); }
async function body(req,max=5_000_000){ let chunks=[],size=0; for await(const c of req){ size+=c.length;if(size>max) throw Object.assign(new Error('Payload too large'),{status:413});chunks.push(c); } return Buffer.concat(chunks).toString('utf8'); }
async function jsonBody(req){ const b=await body(req); if(!b)return {}; try{return JSON.parse(b)}catch{throw Object.assign(new Error('JSON invalide'),{status:400})} }
function bearer(req){ const h=req.headers.authorization||''; return h.startsWith('Bearer ')?h.slice(7):null; }
function hash(v){ return crypto.createHash('sha256').update(v).digest('hex'); }
function randomKey(){ return `bdk_${crypto.randomBytes(24).toString('base64url')}`; }

const COVER_HOSTS=new Set(['openapi.bnf.fr','covers.openlibrary.org','books.google.com','books.googleusercontent.com','images.hachette-livre.fr']);
const COVER_MAX_BYTES=10*1024*1024;
function isTrustedCoverUrl(value){
  try{
    const url=new URL(String(value||''));
    return url.protocol==='https:'&&(COVER_HOSTS.has(url.hostname)||url.hostname.endsWith('.hachette-livre.fr'));
  }catch{return false}
}
async function fetchCover(fetchImpl,url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetchImpl(url,{headers:{accept:'image/avif,image/webp,image/apng,image/*,*/*;q=0.8','user-agent':'BD-Desk/1.0 (+https://github.com/Etorrent-Org/Bd-desk)'},signal:controller.signal});
    if(!response.ok)return null;
    const contentType=(response.headers.get('content-type')||'').split(';')[0].toLowerCase();
    if(contentType&&!contentType.startsWith('image/'))return null;
    const declaredLength=Number(response.headers.get('content-length')||0);
    if(declaredLength>COVER_MAX_BYTES)return null;
    const buffer=Buffer.from(await response.arrayBuffer());
    if(!buffer.length||buffer.length>COVER_MAX_BYTES)return null;
    return {contentType:contentType||'image/jpeg',buffer};
  }finally{clearTimeout(timer)}
}

export function createBdDeskApp(config, opts={}){
  const db=opts.db||openDatabase(config.dbPath);
  if(opts.seed!==false) seedIfEmpty(db,config.seedCsvPath);
  const metadataFetcher=opts.fetchMetadataImpl||fetchMetadata;
  const metadataCache=new Map();
  const metadataCacheTtlMs=Number(config.metadataCacheTtlMs)>0?Number(config.metadataCacheTtlMs):300_000;
  const webhookDispatcher=opts.dispatchWebhookImpl||dispatchWebhook;
  const coverFetcher=opts.coverFetchImpl||fetch;
  const getLicense=()=>verifyLicense(db.prepare(`SELECT value FROM settings WHERE key='license'`).get()?.value,config.licenseSecret);
  const premium=(feature)=>hasFeature(getLicense(),feature);
  function authenticateApiKey(req){ const token=bearer(req)||req.headers['x-api-key']; if(!token)return false; const row=db.prepare('SELECT id FROM api_keys WHERE key_hash=? AND revoked_at IS NULL').get(hash(String(token))); if(row)db.prepare('UPDATE api_keys SET last_used_at=CURRENT_TIMESTAMP WHERE id=?').run(row.id); return Boolean(row); }
  async function emit(event,payload){ const hooks=db.prepare('SELECT * FROM webhooks WHERE enabled=1').all().filter(h=>JSON.parse(h.events).includes(event)||JSON.parse(h.events).includes('*')); for(const hook of hooks){ try{await webhookDispatcher(hook,event,payload,{secret:config.webhookSigningSecret});}catch{} } }
  async function metadataFor(isbn){
    const key=canonicalIsbn(isbn);
    if(!key)return [];
    const now=Date.now();
    const cached=metadataCache.get(key);
    if(cached&&cached.expiresAt>now)return cached.promise;
    const promise=Promise.resolve(metadataFetcher(key,{googleBooksApiKey:config.googleBooksApiKey})).then(value=>Array.isArray(value)?value:[]);
    metadataCache.set(key,{promise,expiresAt:now+metadataCacheTtlMs});
    try{return await promise}catch(error){if(metadataCache.get(key)?.promise===promise)metadataCache.delete(key);throw error}
  }
  const mcpCtx={dashboard:()=>dashboard(db),listAlbums:o=>listAlbums(db,o),series:()=>seriesSummary(db),updateAlbum:(id,p)=>updateAlbum(db,id,p)};

  return http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost'), p=url.pathname;
      let m;
      if(p==='/api/health') return json(res,200,{ok:true,service:'bd-desk',version:'1.0.0',albums:db.prepare('SELECT COUNT(*) c FROM albums').get().c});
      if(p==='/api/license'&&req.method==='GET'){ const l=getLicense(); return json(res,200,{plan:l.valid?l.plan:'free',valid:l.valid,features:l.payload?.features||[]}); }
      if(p==='/api/license/activate'&&req.method==='POST'){ const {key}=await jsonBody(req); const l=verifyLicense(key,config.licenseSecret); if(!l.valid)return json(res,400,{error:'Licence invalide',reason:l.reason}); db.prepare(`INSERT INTO settings(key,value) VALUES('license',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(key); return json(res,200,{ok:true,plan:l.plan,features:l.payload.features}); }
      if(p==='/api/dashboard') return json(res,200,dashboard(db));
      if(p==='/api/stats') return json(res,200,basicStats(db));
      if(p==='/api/stats/advanced'){ if(!premium('advanced_stats'))return json(res,402,{error:'Premium requis',feature:'advanced_stats'}); return json(res,200,stats(db)); }
      if(p==='/api/series') return json(res,200,seriesSummary(db));
      if(p==='/api/authors') return json(res,200,peopleSummary(db));
      if(p==='/api/publishers') return json(res,200,publishersSummary(db));
      if(p==='/api/history') return json(res,200,db.prepare('SELECT * FROM history ORDER BY id DESC LIMIT 100').all());
      if(p==='/api/loans'&&req.method==='GET') return json(res,200,db.prepare(`SELECT loans.*,albums.title,albums.series,albums.cover_url FROM loans JOIN albums ON albums.id=loans.album_id ORDER BY returned_at IS NULL DESC, loaned_at DESC`).all());
      if(p==='/api/loans'&&req.method==='POST'){ const a=await jsonBody(req); if(!getAlbum(db,a.albumId)||!String(a.borrower||'').trim())return json(res,400,{error:'Album et emprunteur requis'}); const r=db.prepare('INSERT INTO loans(album_id,borrower,due_at) VALUES(?,?,?)').run(a.albumId,String(a.borrower).trim(),a.dueAt||null); const id=Number(r.lastInsertRowid); db.prepare('INSERT INTO history(event,album_id,detail) VALUES(?,?,?)').run('loan_created',a.albumId,JSON.stringify({loanId:id,borrower:a.borrower})); await emit('loan.created',{id,albumId:a.albumId,borrower:a.borrower,dueAt:a.dueAt||null}); return json(res,201,{id}); }
      m=p.match(/^\/api\/loans\/(\d+)\/return$/);
      if(m&&req.method==='PATCH'){ const loan=db.prepare('SELECT * FROM loans WHERE id=?').get(m[1]); if(!loan)return json(res,404,{error:'Prêt introuvable'}); db.prepare('UPDATE loans SET returned_at=COALESCE(returned_at,CURRENT_TIMESTAMP) WHERE id=?').run(m[1]); db.prepare('INSERT INTO history(event,album_id,detail) VALUES(?,?,?)').run('loan_returned',loan.album_id,JSON.stringify({loanId:Number(m[1])})); await emit('loan.returned',{id:Number(m[1]),albumId:loan.album_id}); return json(res,200,{ok:true}); }
      if(p==='/api/albums'&&req.method==='GET'){ return json(res,200,listAlbums(db,{search:url.searchParams.get('search')||'',limit:url.searchParams.get('limit')||60,offset:url.searchParams.get('offset')||0,series:url.searchParams.get('series'),wishlist:url.searchParams.has('wishlist')?url.searchParams.get('wishlist')==='1':null,read:url.searchParams.has('read')?url.searchParams.get('read')==='1':null})); }
      if(p==='/api/discover'&&req.method==='GET'){ const isbn=canonicalIsbn(url.searchParams.get('isbn')); if(!isbn)return json(res,400,{error:'ISBN valide requis'}); const candidates=await metadataFor(isbn); const resolution=resolveCandidates(isbn,candidates); return json(res,200,{isbn,candidates,resolution}); }
      if(p==='/api/export/collection.json'&&req.method==='GET') return json(res,200,{exportedAt:new Date().toISOString(),albums:exportCollection(db)},{'content-disposition':'attachment; filename=bd-desk-collection.json'});
      if(p==='/api/editions/anomalies'&&req.method==='GET'){ if(!premium('advanced_stats'))return json(res,402,{error:'Premium requis',feature:'advanced_stats'}); return json(res,200,editionAnomalies(db)); }
      if(p==='/api/albums'&&req.method==='POST'){ const a=await jsonBody(req); a.isbn=canonicalIsbn(a.isbn); const created=createAlbum(db,a); await emit('album.created',created); return json(res,201,created); }
      m=p.match(/^\/api\/albums\/(\d+)\/cover\/resolve$/);
      if(m&&req.method==='POST'){ const a=getAlbum(db,m[1]); if(!a)return json(res,404,{error:'Album introuvable'}); if(a.cover_origin==='user')return json(res,200,{album:a,candidates:[],resolution:{isbn:a.isbn,decision:'preserved-user-cover',fields:{},cover:{url:a.cover_url,source:a.cover_source||'user',confidence:Number(a.cover_confidence)||1,decision:'preserved-user-cover',reason:'user-selected',evidence:[]}},changed:false,reason:'preserve-user-cover'}); if(!a.isbn)return json(res,200,{album:a,resolution:{decision:'fallback-editorial',cover:{url:null,decision:'fallback-editorial',reason:'isbn-required'}},changed:false}); const candidates=await metadataFor(a.isbn); const resolution=resolveCandidates(a.isbn,candidates,a); const decision=persistCoverDecision(db,a.id,resolution.cover); return json(res,200,{album:decision.album,resolution,candidates,changed:decision.updated,reason:decision.reason}); }
      m=p.match(/^\/api\/albums\/(\d+)\/cover\/image$/);
      if(m&&req.method==='GET'){
        const a=getAlbum(db,m[1]);
        if(!a||a.cover_origin!=='machine'||!isTrustedCoverUrl(a.cover_url))return json(res,404,{error:'Couverture machine introuvable'});
        const cover=await fetchCover(coverFetcher,a.cover_url);
        if(!cover)return json(res,502,{error:'Source de couverture indisponible'});
        res.writeHead(200,{'content-type':cover.contentType,'content-length':cover.buffer.length,'cache-control':'public, max-age=86400','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; img-src 'self'; frame-ancestors 'none'"});
        return res.end(cover.buffer);
      }
      m=p.match(/^\/api\/albums\/(\d+)$/);
      if(m&&req.method==='GET'){ const a=getAlbum(db,m[1]); return a?json(res,200,a):json(res,404,{error:'Album introuvable'}); }
      if(m&&req.method==='PATCH'){ const a=updateAlbum(db,m[1],await jsonBody(req)); await emit('album.updated',a); return json(res,200,a); }
      if(m&&req.method==='DELETE'){ const ok=deleteAlbum(db,m[1]); return json(res,ok?200:404,{ok}); }
      m=p.match(/^\/api\/metadata\/(\d+)\/enrich$/);
      if(m&&req.method==='POST'){ if(!premium('metadata_auto'))return json(res,402,{error:'Premium requis',feature:'metadata_auto'}); const a=getAlbum(db,m[1]); if(!a||!a.isbn)return json(res,400,{error:'ISBN requis'}); const candidates=await metadataFor(a.isbn); const resolution=resolveCandidates(a.isbn,candidates,a); const applied=applyMetadataResolution(db,a.id,resolution); await emit('album.enriched',{album:applied.album,provenance:applied.provenance,cover:applied.cover}); return json(res,200,{album:applied.album,candidates,resolution,provenance:applied.provenance,changed:applied.updatedFields.length>0||applied.cover.updated}); }
      if(p==='/api/import/bdgest'&&req.method==='POST'){ if(!premium('bulk_import'))return json(res,402,{error:'Premium requis',feature:'bulk_import'}); const csv=await body(req); const result=importBdgest(db,csv); await emit('collection.imported',result); return json(res,200,result); }
      if(p==='/api/keys'&&req.method==='GET'){ if(!premium('api'))return json(res,402,{error:'Premium requis'}); return json(res,200,db.prepare('SELECT id,name,prefix,created_at,last_used_at,revoked_at FROM api_keys ORDER BY id DESC').all()); }
      if(p==='/api/keys'&&req.method==='POST'){ if(!premium('api'))return json(res,402,{error:'Premium requis'}); const {name='API'}=await jsonBody(req), key=randomKey(); const r=db.prepare('INSERT INTO api_keys(name,key_hash,prefix) VALUES(?,?,?)').run(name,hash(key),key.slice(0,12)); return json(res,201,{id:Number(r.lastInsertRowid),key,name,warning:'Cette clé ne sera plus affichée.'}); }
      m=p.match(/^\/api\/keys\/(\d+)$/);
      if(m&&req.method==='DELETE'){ if(!premium('api'))return json(res,402,{error:'Premium requis'}); const r=db.prepare('UPDATE api_keys SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND revoked_at IS NULL').run(m[1]); return json(res,r.changes?200:404,{ok:Boolean(r.changes)}); }
      if(p==='/api/webhooks'&&req.method==='GET'){ if(!premium('webhooks'))return json(res,402,{error:'Premium requis'}); return json(res,200,db.prepare('SELECT * FROM webhooks ORDER BY id DESC').all().map(h=>({...h,events:JSON.parse(h.events)}))); }
      if(p==='/api/webhooks'&&req.method==='POST'){ if(!premium('webhooks'))return json(res,402,{error:'Premium requis'}); const a=await jsonBody(req); if(!/^https?:\/\//.test(a.url||''))return json(res,400,{error:'URL invalide'}); const r=db.prepare('INSERT INTO webhooks(name,url,events) VALUES(?,?,?)').run(a.name||'Webhook',a.url,JSON.stringify(a.events||['*'])); return json(res,201,{id:Number(r.lastInsertRowid)}); }
      m=p.match(/^\/api\/webhooks\/(\d+)$/);
      if(m&&req.method==='PATCH'){ if(!premium('webhooks'))return json(res,402,{error:'Premium requis'}); const a=await jsonBody(req); const current=db.prepare('SELECT * FROM webhooks WHERE id=?').get(m[1]); if(!current)return json(res,404,{error:'Webhook introuvable'}); const name=a.name??current.name,urlValue=a.url??current.url,events=a.events??JSON.parse(current.events),enabled=a.enabled==null?current.enabled:(a.enabled?1:0); if(!/^https?:\/\//.test(urlValue))return json(res,400,{error:'URL invalide'}); db.prepare('UPDATE webhooks SET name=?,url=?,events=?,enabled=? WHERE id=?').run(name,urlValue,JSON.stringify(events),enabled,m[1]); return json(res,200,{ok:true}); }
      if(m&&req.method==='DELETE'){ if(!premium('webhooks'))return json(res,402,{error:'Premium requis'}); const r=db.prepare('DELETE FROM webhooks WHERE id=?').run(m[1]); return json(res,r.changes?200:404,{ok:Boolean(r.changes)}); }
      if(p==='/api/v1/collection'&&req.method==='GET'){ if(!premium('api')||!authenticateApiKey(req))return json(res,401,{error:'API Premium + clé requise'}); return json(res,200,{dashboard:dashboard(db),albums:listAlbums(db,{limit:url.searchParams.get('limit')||100})}); }
      if(p==='/mcp'&&req.method==='POST'){
        if(!premium('mcp')||!authenticateApiKey(req))return json(res,401,{error:'MCP Premium + clé API requise'});
        const message=await jsonBody(req), validation=validateMcpHttp(req,message,{allowedOrigins:config.allowedOrigins||[]});
        if(!validation.ok)return json(res,validation.status,validation.error,{'mcp-protocol-version':MCP_PROTOCOL_VERSION});
        const response=handleMcp(message,mcpCtx), status=response.error?.code===-32601?404:200;
        return json(res,status,response,{'mcp-protocol-version':MCP_PROTOCOL_VERSION});
      }
      if(p==='/mcp') return json(res,405,{error:'MCP 2026-07-28 utilise POST'},{allow:'POST','mcp-protocol-version':MCP_PROTOCOL_VERSION});
      if(p.startsWith('/api/')) return json(res,404,{error:'Route API inconnue'});
      let file=p==='/'?'index.html':p.replace(/^\//,''); file=path.resolve(PUBLIC,file); if(!file.startsWith(PUBLIC))return text(res,403,'Forbidden');
      if(!fs.existsSync(file)||fs.statSync(file).isDirectory()) file=path.join(PUBLIC,'index.html');
      const ext=path.extname(file); res.writeHead(200,{'content-type':mime[ext]||'application/octet-stream','cache-control':ext==='.html'?'no-cache':'public, max-age=3600','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','permissions-policy':'camera=(self)','content-security-policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"}); fs.createReadStream(file).pipe(res);
    }catch(e){ json(res,e.status||500,{error:e.message||'Erreur interne'}); }
  });
}
