import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openDatabase } from '../src/db.js';
import { createBdDeskApp } from '../src/app.js';

function insertMachine(db,{url,source='media-participations'}){
  return db.prepare("INSERT INTO albums(isbn,series,title,cover_url,cover_origin,cover_source,cover_width,cover_height,cover_checked_at,cover_status) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,'verified') RETURNING id").get('9782205208412','Murailles invisibles (Les)','Tome 2',url,'machine',source,900,1200).id;
}

async function withServer(db,coverFetchImpl,fn){
  const server=createBdDeskApp({dbPath:':memory:',seedCsvPath:null,licenseSecret:'secret',googleBooksApiKey:'',webhookSigningSecret:'hook',allowedOrigins:[],edition:'free'},{db,seed:false,coverFetchImpl});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{return await fn('http://127.0.0.1:'+server.address().port)}finally{await new Promise(resolve=>server.close(resolve))}
}

for(const [source,url] of [['media-participations','https://bdi.dlpdomain.com/cover.jpg'],['bdbase','https://static.bdbase.fr/couvertures/cover.jpg']]){
  test('le proxy sert les couvertures '+source,async()=>{
    const db=openDatabase(':memory:');
    const id=insertMachine(db,{url,source});
    let fetched='';
    await withServer(db,async value=>{fetched=String(value);return new Response(new Uint8Array([255,216,255,0]),{status:200,headers:{'content-type':'image/jpeg'}})},async base=>{
      const response=await fetch(base+'/api/albums/'+id+'/cover/image');
      assert.equal(response.status,200);
      assert.equal(fetched,url);
    });
  });
}

test('une URL de couverture morte est invalidée au lieu de rester comptée comme trouvée',async()=>{
  const db=openDatabase(':memory:');
  const id=insertMachine(db,{url:'https://bdi.dlpdomain.com/dead.jpg'});
  await withServer(db,async()=>new Response('down',{status:503}),async base=>{
    const response=await fetch(base+'/api/albums/'+id+'/cover/image');
    assert.equal(response.status,502);
  });
  const album=db.prepare('SELECT cover_url,cover_checked_at,cover_decision,cover_status FROM albums WHERE id=?').get(id);
  assert.equal(album.cover_url,null);
  assert.equal(album.cover_checked_at,null);
  assert.equal(album.cover_decision,'proxy-source-unavailable');
  assert.equal(album.cover_status,'missing');
});

test('le récupérateur navigateur intercepte les erreurs image et connaît les CDN éditeur/BDbase',()=>{
  const js=fs.readFileSync(new URL('../public/cover-sources.js',import.meta.url),'utf8');
  assert.match(js,/document\.addEventListener\('error'/);
  assert.match(js,/void recoverImage\(image\)/);
  assert.match(js,/bdi\.dlpdomain\.com/);
  assert.match(js,/static\.bdbase\.fr/);
});
