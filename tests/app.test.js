import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase,createAlbum,persistCoverDecision} from '../src/db.js';
import {createBdDeskApp} from '../src/app.js';
import {createLicense} from '../src/license.js';
import {MCP_PROTOCOL_VERSION} from '../src/mcp.js';

async function withServer(fn,options={}){
  const db=openDatabase(':memory:');
  createAlbum(db,{series:'Saga',number:'1',title:'Premier',isbn:'9782203237766'});
  const config={dbPath:':memory:',seedCsvPath:null,licenseSecret:'secret-123',googleBooksApiKey:'',webhookSigningSecret:'hook',allowedOrigins:['https://client.test'],edition:options.edition||'licensed'};
  let metadataCalls=0;
  const metadataFetcher=async isbn=>{metadataCalls++;return[{source:'bnf',sourceId:'x',title:'Titre BnF',publisher:'Editeur BnF',publishedDate:'2024',identifiers:[isbn],coverIdentifiers:[isbn],coverUrl:'https://openapi.bnf.fr/couverture/'+isbn,coverEvidence:{official:true}}]};
  const webhookCalls=[];
  const dispatchWebhookImpl=async(hook,event,payload)=>{webhookCalls.push({hook,event,payload});return{ok:true,status:200}};
  const server=createBdDeskApp(config,{db,seed:false,fetchMetadataImpl:metadataFetcher,dispatchWebhookImpl,coverFetchImpl:options.coverFetchImpl});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{await fn({base,db,config,webhookCalls,metadataCallCount:()=>metadataCalls})}finally{await new Promise(r=>server.close(r))}
}
async function activate(base,config){
  const key=createLicense({sub:'test'},config.licenseSecret);
  let r=await fetch(base+'/api/license/activate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key})});
  assert.equal(r.status,200);
  r=await fetch(base+'/api/keys',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'test'})});
  assert.equal(r.status,201);return await r.json();
}
const mcpHeaders=apiKey=>({'content-type':'application/json',Authorization:`Bearer ${apiKey}`,'MCP-Protocol-Version':MCP_PROTOCOL_VERSION,'Mcp-Method':'tools/list'});

test('health, dashboard, statiques et sécurité',()=>withServer(async({base})=>{let r=await fetch(base+'/api/health');assert.equal(r.status,200);assert.equal((await r.json()).albums,1);r=await fetch(base+'/api/dashboard');assert.equal((await r.json()).albums,1);r=await fetch(base+'/');assert.equal(r.status,200);assert.match(await r.text(),/BD Desk/);assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.match(r.headers.get('content-security-policy'),/default-src/)}));
test('CRUD albums, filtres et export gratuit',()=>withServer(async({base})=>{let r=await fetch(base+'/api/albums',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({series:'Nouvelle',title:'Album'})});assert.equal(r.status,201);const a=await r.json();r=await fetch(base+`/api/albums/${a.id}`);assert.equal((await r.json()).title,'Album');r=await fetch(base+`/api/albums/${a.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({read:true,wishlist:true})});assert.equal((await r.json()).read,1);r=await fetch(base+'/api/albums?read=1&wishlist=1');assert.ok((await r.json()).total>=1);r=await fetch(base+'/api/export/collection.json');assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/attachment/);assert.equal((await r.json()).albums.length,2);r=await fetch(base+`/api/albums/${a.id}`,{method:'DELETE'});assert.equal(r.status,200);assert.equal((await fetch(base+`/api/albums/${a.id}`)).status,404)}));
test('recherche multi-source gratuite et JSON invalide',()=>withServer(async({base})=>{let r=await fetch(base+'/api/discover?isbn=9782203237766');assert.equal(r.status,200);const discovery=await r.json();assert.equal(discovery.candidates[0].source,'bnf');assert.equal(discovery.resolution.cover.source,'bnf');assert.equal(discovery.resolution.fields.publisher.value,'Editeur BnF');r=await fetch(base+'/api/discover?isbn=abc');assert.equal(r.status,400);r=await fetch(base+'/api/albums',{method:'POST',headers:{'content-type':'application/json'},body:'{'});assert.equal(r.status,400)}));
test('résolution de couverture API et protection d’une couverture utilisateur',()=>withServer(async({base})=>{let r=await fetch(base+'/api/albums',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({isbn:'9782203237766',series:'Saga',title:'Sans couverture'})});const created=await r.json();assert.equal(created.cover_url,null);r=await fetch(base+'/api/albums/'+created.id+'/cover/resolve',{method:'POST'});assert.equal(r.status,200);const resolved=await r.json();assert.equal(resolved.changed,true);assert.equal(resolved.album.cover_origin,'machine');assert.match(resolved.album.cover_url,/openapi\.bnf\.fr/);r=await fetch(base+'/api/albums/'+created.id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({coverUrl:'https://example.test/personal.jpg'})});assert.equal((await r.json()).cover_origin,'user');r=await fetch(base+'/api/albums/'+created.id+'/cover/resolve',{method:'POST'});const preserved=await r.json();assert.equal(preserved.reason,'preserve-user-cover');assert.equal(preserved.album.cover_url,'https://example.test/personal.jpg')}));
test('prêts : création puis retour',()=>withServer(async({base})=>{let r=await fetch(base+'/api/loans',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({albumId:1,borrower:'Alex'})});assert.equal(r.status,201);const id=(await r.json()).id;r=await fetch(base+`/api/loans/${id}/return`,{method:'PATCH'});assert.equal(r.status,200);r=await fetch(base+'/api/loans');assert.ok((await r.json())[0].returned_at)}));
test('Premium protège puis active import, stats, enrichissement, API, webhooks et MCP',()=>withServer(async({base,config,webhookCalls})=>{let r=await fetch(base+'/api/import/bdgest',{method:'POST',body:'x'});assert.equal(r.status,402);assert.equal((await fetch(base+'/api/stats/advanced')).status,402);const keyInfo=await activate(base,config);r=await fetch(base+'/api/stats/advanced');assert.equal(r.status,200);r=await fetch(base+'/api/editions/anomalies');assert.equal(r.status,200);r=await fetch(base+'/api/metadata/1/enrich',{method:'POST'});assert.equal(r.status,200);assert.equal((await r.json()).album.publisher,'Editeur BnF');r=await fetch(base+'/api/webhooks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'n8n',url:'https://example.test/hook',events:['album.created']})});assert.equal(r.status,201);const hookId=(await r.json()).id;r=await fetch(base+'/api/webhooks');assert.equal((await r.json()).length,1);r=await fetch(base+'/api/webhooks/'+hookId,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({enabled:false})});assert.equal(r.status,200);r=await fetch(base+'/api/webhooks/'+hookId,{method:'DELETE'});assert.equal(r.status,200);r=await fetch(base+'/api/v1/collection',{headers:{Authorization:`Bearer ${keyInfo.key}`}});assert.equal(r.status,200);r=await fetch(base+'/mcp',{method:'POST',headers:mcpHeaders(keyInfo.key),body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{},_meta:{'io.modelcontextprotocol/clientInfo':{name:'test',version:'1'}}})});assert.equal(r.status,200);assert.equal((await r.json()).result.tools.length>0,true);r=await fetch(base+'/mcp',{method:'POST',headers:{...mcpHeaders(keyInfo.key),'Mcp-Method':'bad'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});assert.equal(r.status,400);r=await fetch(base+'/api/keys/'+keyInfo.id,{method:'DELETE'});assert.equal(r.status,200);assert.equal((await fetch(base+'/api/v1/collection',{headers:{Authorization:`Bearer ${keyInfo.key}`}})).status,401);assert.equal(webhookCalls.length,0)}));
test('webhook actif émis sur création',()=>withServer(async({base,config,webhookCalls})=>{await activate(base,config);let r=await fetch(base+'/api/webhooks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'n8n',url:'https://example.test/hook',events:['album.created']})});assert.equal(r.status,201);r=await fetch(base+'/api/albums',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({series:'S',title:'Nouveau'})});assert.equal(r.status,201);assert.equal(webhookCalls[0].event,'album.created')}));
test('routes de synthèse et 404',()=>withServer(async({base})=>{for(const p of ['/api/series','/api/authors','/api/publishers','/api/stats','/api/history','/api/loans']){const r=await fetch(base+p);assert.equal(r.status,200,p)}assert.equal((await fetch(base+'/api/inconnue')).status,404)}));
test('le cache serveur mutualise une résolution ISBN entre découverte et couverture',()=>withServer(async({base,metadataCallCount})=>{await fetch(base+'/api/discover?isbn=9782203237766');const r=await fetch(base+'/api/albums/1/cover/resolve',{method:'POST'});assert.equal(r.status,200);assert.equal(metadataCallCount(),1)}));
test('la couverture machine est servie en same-origin et refuse une URL non approuvée',()=>withServer(async({base,db})=>{
  const a=createAlbum(db,{series:'Valhalla Bunker',number:'1',title:'Sweet revenge',isbn:'9782344059814'});
  persistCoverDecision(db,a.id,{url:'https://www.images.hachette-livre.fr/media/imgArticle/GLENAT/2024/9782344059814-001-X.jpeg',source:'hachette',confidence:.94});
  let r=await fetch(base+'/api/albums/'+a.id+'/cover/image');
  assert.equal(r.status,200);
  assert.equal(r.headers.get('content-type'),'image/jpeg');
  assert.equal(await r.text(),'official-cover');
  const user=createAlbum(db,{series:'S',title:'User',coverUrl:'https://example.test/user.jpg'});
  r=await fetch(base+'/api/albums/'+user.id+'/cover/image');
  assert.equal(r.status,404);
},{coverFetchImpl:async()=>new Response('official-cover',{status:200,headers:{'content-type':'image/jpeg'}})}));

test('le proxy accepte une image valide malgré un MIME fournisseur incorrect',()=>withServer(async({base,db})=>{
  const a=createAlbum(db,{series:'Saga',number:'1',title:'Couverture MIME',isbn:'9782344059814'});
  persistCoverDecision(db,a.id,{url:'https://www.images.hachette-livre.fr/cover.jpeg',source:'hachette',confidence:.94});
  const r=await fetch(base+'/api/albums/'+a.id+'/cover/image');
  assert.equal(r.status,200);
  assert.equal(r.headers.get('content-type'),'image/jpeg');
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[255,216,255,0]);
},{coverFetchImpl:async()=>new Response(new Uint8Array([255,216,255,0]),{status:200,headers:{'content-type':'application/octet-stream'}})}));

test('les routes refusent proprement les albums et prêts inexistants',()=>withServer(async({base})=>{
  let r=await fetch(base+'/api/albums/999',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({title:'x'})});
  assert.equal(r.status,404);
  r=await fetch(base+'/api/albums/999',{method:'DELETE'}); assert.equal(r.status,404);
  r=await fetch(base+'/api/albums/999/cover/resolve',{method:'POST'}); assert.equal(r.status,404);
  r=await fetch(base+'/api/loans',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({albumId:999,borrower:'Alex'})}); assert.equal(r.status,400);
  r=await fetch(base+'/api/loans/999/return',{method:'PATCH'}); assert.equal(r.status,404);
  r=await fetch(base+'/mcp'); assert.equal(r.status,405);
  r=await fetch(base+'/api/inconnue'); assert.equal(r.status,404);
}));

test('l’import BDGest Premium fonctionne et reste idempotent par IdAlbum',()=>withServer(async({base,config})=>{
  await activate(base,config);
  const csv='Table;IdAlbum;ISBN;Serie;Num;Titre\nALBUM;9001;9782203237766;Saga;1;Importé';
  let r=await fetch(base+'/api/import/bdgest',{method:'POST',headers:{'content-type':'text/csv'},body:csv});
  assert.equal(r.status,200); assert.deepEqual(await r.json(),{rows:1,imported:1,skipped:0,errors:[]});
  r=await fetch(base+'/api/import/bdgest',{method:'POST',headers:{'content-type':'text/csv'},body:csv});
  assert.equal(r.status,200); assert.deepEqual(await r.json(),{rows:1,imported:1,skipped:0,errors:[]});
  r=await fetch(base+'/api/albums?limit=500'); assert.equal((await r.json()).total,2);
}));

test('proxy de couverture rejette un contenu non image',()=>withServer(async({base,db})=>{
  const a=createAlbum(db,{series:'Saga',number:'1',title:'Mauvais MIME',isbn:'9782344059814'});
  persistCoverDecision(db,a.id,{url:'https://www.images.hachette-livre.fr/cover.jpeg',source:'hachette',confidence:.94});
  const r=await fetch(base+'/api/albums/'+a.id+'/cover/image');
  assert.equal(r.status,502);
},{coverFetchImpl:async()=>new Response('not-an-image',{status:200,headers:{'content-type':'text/plain'}})}));

test('capabilities et validation des entrées protègent le MVP Free',()=>withServer(async({base})=>{
  let r=await fetch(base+'/api/capabilities');
  const capabilities=await r.json();
  assert.equal(capabilities.plan,'free');
  assert.ok(capabilities.free.includes('collection'));
  assert.ok(capabilities.premium.includes('bulk_import'));
  r=await fetch(base+'/api/albums',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({series:'Saga',title:'Erreur',isbn:'9782203237767'})});
  assert.equal(r.status,400);
  r=await fetch(base+'/api/albums',{method:'POST',headers:{'content-type':'application/json'},body:'null'});
  assert.equal(r.status,400);
  r=await fetch(base+'/api/loans',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({albumId:1,borrower:' '})});
  assert.equal(r.status,400);
}));

test('l’édition Free désactive réellement les modules licenciés',()=>withServer(async({base,config})=>{
  const capabilities=await (await fetch(base+'/api/capabilities')).json();
  assert.equal(capabilities.edition,'free');
  assert.equal((await (await fetch(base+'/api/license')).json()).plan,'free');
  let r=await fetch(base+'/api/license/activate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:createLicense({},config.licenseSecret)})});
  assert.equal(r.status,402);
  r=await fetch(base+'/api/import/bdgest',{method:'POST',headers:{'content-type':'text/csv'},body:'Table;IdAlbum;Titre\nALBUM;1;Test'});
  assert.equal(r.status,402);
},{edition:'free'}));

test('les entrées Premium restent strictement validées',()=>withServer(async({base,config})=>{
  await activate(base,config);
  let r=await fetch(base+'/api/keys',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:{}})});assert.equal(r.status,400);
  r=await fetch(base+'/api/webhooks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'x',url:'https://user:pass@example.test/hook',events:['*']})});assert.equal(r.status,400);
  r=await fetch(base+'/api/webhooks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'x',url:'https://example.test/hook',events:['*']})});assert.equal(r.status,201);
  const id=(await r.json()).id;
  r=await fetch(base+'/api/webhooks/'+id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({enabled:'false'})});assert.equal(r.status,400);
  r=await fetch(base+'/api/import/bdgest',{method:'POST',headers:{'content-type':'text/csv'},body:'not a BDGest export'});assert.equal(r.status,400);
}));
