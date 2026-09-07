import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, createAlbum, persistCoverDecision } from '../src/db.js';
import { createBdDeskApp } from '../src/app.js';

test('une couverture BDfugue partenaire est servie par le proxy same-origin',async()=>{
  const db=openDatabase(':memory:');
  const album=createAlbum(db,{series:'Nocéan',number:'1',title:'Atari et Tika',isbn:'9791034758739'});
  const coverUrl='https://www.bdfugue.com/media/catalog/product/cache/demo/9/7/9791034758739_1_75.jpg';
  const stored=persistCoverDecision(db,album.id,{url:coverUrl,source:'bdfugue',confidence:.9,width:900,height:1400,bytes:24000});
  assert.equal(stored.album.cover_origin,'partner');
  let fetchedUrl=null;
  const server=createBdDeskApp({dbPath:':memory:',seedCsvPath:null,licenseSecret:'secret',googleBooksApiKey:'',webhookSigningSecret:'hook',allowedOrigins:[],edition:'free'}, {
    db,
    seed:false,
    coverFetchImpl:async url=>{
      fetchedUrl=String(url);
      return new Response(new Uint8Array([255,216,255,0]),{status:200,headers:{'content-type':'image/jpeg'}});
    }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const response=await fetch(base+`/api/albums/${album.id}/cover/image`);
    assert.equal(response.status,200);
    assert.equal(response.headers.get('content-type'),'image/jpeg');
    assert.equal(fetchedUrl,coverUrl);
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});
