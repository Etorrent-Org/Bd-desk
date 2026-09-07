import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, persistCoverDecision, coverResolutionStatus, prepareCoverResolutionQueue, listPendingCoverAlbums } from '../src/db.js';
import { resolveCandidates, mergeCandidates } from '../src/metadata.js';
import { fetchBdfugueCover, fetchBdfugueCoverByMetadata, fetchBibliographicCoverCandidates, fetchOfficialCoverCandidates } from '../src/official-covers.js';

const isbn='9782344059814';

function pngHeader(width=900,height=1400){
  const buffer=Buffer.alloc(24);
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(buffer,0);
  buffer.writeUInt32BE(width,16);
  buffer.writeUInt32BE(height,20);
  return buffer;
}

function bdfugueFetch({lowRes=false,foreign=false}={}){
  const image=pngHeader(lowRes?120:900,lowRes?180:1400);
  return async url=>{
    const value=String(url);
    if(value.includes('/a/?'))return {
      ok:true,
      url:foreign?'https://example.test/not-bdfugue':'https://www.bdfugue.com/album-test',
      text:async()=>`<html><body>ISBN 978-2-344-05981-4<meta property="og:title" content="Titre &amp; test"><meta property="og:image" content="https://static.bdfugue.com/cover.png"></body></html>`
    };
    if(value.includes('/catalogsearch/result'))return {
      ok:true,
      url:value,
      text:async()=>`<html><body><a href="/album-test">Album test</a></body></html>`
    };
    if(value==='https://www.bdfugue.com/album-test')return {
      ok:true,
      url:value,
      text:async()=>`<html><body>ISBN 978-2-344-05981-4<meta property="og:title" content="Titre &amp; test"><meta property="og:image" content="https://static.bdfugue.com/cover.png"></body></html>`
    };
    if(value==='https://static.bdfugue.com/cover.png')return {ok:true,arrayBuffer:async()=>image};
    return {ok:false,url:value,text:async()=>'',arrayBuffer:async()=>Buffer.alloc(0)};
  };
}

function bibliographicFetch(){
  const image=pngHeader(1000,1500);
  return async url=>{
    const value=String(url);
    if(value.includes('/catalogsearch/result'))return {
      ok:true,url:value,
      text:async()=>`<html><body><a href="/nocean-atari-tika">Nocéan tome 1</a><a href="/autre-album">Autre</a></body></html>`
    };
    if(value==='https://www.bdfugue.com/nocean-atari-tika')return {
      ok:true,url:value,
      text:async()=>`<html><head><meta property="og:title" content="Nocéan Tome 1 - Atari &amp; Tika"><meta property="og:image" content="https://static.bdfugue.com/nocean.jpg"></head><body>Nocéan Tome 1 Atari &amp; Tika Dupuis</body></html>`
    };
    if(value==='https://www.bdfugue.com/autre-album')return {
      ok:true,url:value,
      text:async()=>`<html><head><meta property="og:title" content="Un autre album"><meta property="og:image" content="https://static.bdfugue.com/autre.jpg"></head><body>Autre série tome 9</body></html>`
    };
    if(value==='https://static.bdfugue.com/nocean.jpg')return {ok:true,arrayBuffer:async()=>image};
    if(value==='https://static.bdfugue.com/autre.jpg')return {ok:true,arrayBuffer:async()=>image};
    return {ok:false,url:value,text:async()=>'',arrayBuffer:async()=>Buffer.alloc(0)};
  };
}

test('le résolveur refuse une couverture connue sous 300 px',()=>{
  const result=resolveCandidates(isbn,[{source:'google-books',sourceId:'tiny',title:'Test',identifiers:[isbn],coverUrl:'https://books.google.com/tiny.jpg',coverWidth:128,coverHeight:190,coverEvidence:{apiRecord:true}}]);
  assert.equal(result.cover.url,null);
  assert.equal(result.cover.reason,'low-resolution-cover');
});

test('le résolveur conserve une couverture haute définition',()=>{
  const result=resolveCandidates(isbn,[{source:'google-books',sourceId:'hd',title:'Test',identifiers:[isbn],coverUrl:'https://books.google.com/hd.jpg',coverWidth:900,coverHeight:1400,coverEvidence:{apiRecord:true}}]);
  assert.equal(result.cover.url,'https://books.google.com/hd.jpg');
});

test('la fusion retire une petite couverture sélectionnée par le cœur historique',()=>{
  const candidate={source:'google-books',sourceId:'tiny',title:'Test',identifiers:[isbn],coverUrl:'https://books.google.com/tiny.jpg',coverWidth:128,coverHeight:190,coverEvidence:{apiRecord:true}};
  const merged=mergeCandidates({isbn,title:'Titre',series:'Saga',cover_url:null},[candidate]);
  assert.equal(merged.resolution.cover.url,null);
  assert.equal(merged.album.coverUrl,undefined);
  assert.equal(merged.provenance.some(entry=>entry.field==='coverUrl'),false);
});

test('la base expose les couvertures basse définition séparément',()=>{
  const db=openDatabase(':memory:');
  const album=db.prepare(`INSERT INTO albums(isbn,series,title,cover_url,cover_origin,cover_source,cover_width,cover_height,cover_checked_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) RETURNING id`).get(isbn,'Saga','Titre','https://books.google.com/tiny.jpg','machine','google-books',120,180).id;
  const status=coverResolutionStatus(db);
  assert.equal(status.lowRes,1);
  assert.equal(status.withCover,0);
  const decision=persistCoverDecision(db,album,{url:'https://books.google.com/new.jpg',source:'google-books',confidence:.9,width:160,height:240,decision:'verified-source'});
  assert.equal(decision.updated,false);
  assert.equal(decision.reason,'low-resolution-cover');
  assert.equal(db.prepare('SELECT cover_url FROM albums WHERE id=?').get(album).cover_url,null);
});

test('la file de résolution relance les couvertures absentes et faibles sans toucher aux bonnes ni aux manuelles',()=>{
  const db=openDatabase(':memory:');
  const missing=db.prepare(`INSERT INTO albums(isbn,series,title,cover_checked_at) VALUES(?,?,?,CURRENT_TIMESTAMP) RETURNING id`).get('9782203237766','Saga','Sans couverture').id;
  const weak=db.prepare(`INSERT INTO albums(isbn,series,title,cover_url,cover_origin,cover_source,cover_width,cover_height,cover_checked_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) RETURNING id`).get(isbn,'Saga','Faible','https://books.google.com/weak.jpg','machine','google-books',500,800).id;
  const good=db.prepare(`INSERT INTO albums(isbn,series,title,cover_url,cover_origin,cover_source,cover_width,cover_height,cover_checked_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) RETURNING id`).get('9782505064721','Saga','Bonne','https://books.google.com/good.jpg','machine','google-books',900,1400).id;
  const user=db.prepare(`INSERT INTO albums(isbn,series,title,cover_url,cover_origin,cover_width,cover_height,cover_checked_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP) RETURNING id`).get('9782344059814','Saga','Manuelle','https://example.test/user.jpg','user',120,180).id;
  prepareCoverResolutionQueue(db);
  assert.equal(db.prepare('SELECT cover_checked_at FROM albums WHERE id=?').get(missing).cover_checked_at,null);
  assert.equal(db.prepare('SELECT cover_checked_at FROM albums WHERE id=?').get(weak).cover_checked_at,null);
  assert.notEqual(db.prepare('SELECT cover_checked_at FROM albums WHERE id=?').get(good).cover_checked_at,null);
  assert.notEqual(db.prepare('SELECT cover_checked_at FROM albums WHERE id=?').get(user).cover_checked_at,null);
});

test('la file inclut maintenant les albums sans ISBN',()=>{
  const db=openDatabase(':memory:');
  const id=db.prepare(`INSERT INTO albums(series,number,title,publisher,cover_checked_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) RETURNING id`).get('Nocéan','1','Atari & Tika','Dupuis').id;
  prepareCoverResolutionQueue(db);
  const pending=listPendingCoverAlbums(db,10);
  assert.equal(pending.some(album=>Number(album.id)===Number(id)),true);
  assert.equal(coverResolutionStatus(db).pending,1);
});

test('une couverture partenaire BDfugue HD est conservée et une moins bonne ne la remplace pas',()=>{
  const db=openDatabase(':memory:');
  const album=db.prepare(`INSERT INTO albums(isbn,series,title) VALUES(?,?,?) RETURNING id`).get(isbn,'Saga','Titre').id;
  const first=persistCoverDecision(db,album,{url:'https://static.bdfugue.com/cover.png',source:'bdfugue',confidence:.9,width:900,height:1400,bytes:24000});
  assert.equal(first.updated,true);
  assert.equal(first.album.cover_origin,'partner');
  assert.equal(first.album.cover_status,'verified');
  const second=persistCoverDecision(db,album,{url:'https://static.bdfugue.com/smaller.png',source:'bdfugue',confidence:.85,width:600,height:900,bytes:12000});
  assert.equal(second.updated,false);
  assert.equal(second.reason,'preserve-better-partner-cover');
});

test('BDfugue est interrogé directement sans identifiant partenaire',async()=>{
  const previous=process.env.BDFUGUE_AFFILIATE_ID;
  delete process.env.BDFUGUE_AFFILIATE_ID;
  try{
    const candidates=await fetchBdfugueCover(isbn,{fetchImpl:bdfugueFetch()});
    assert.equal(candidates.length,1);
    assert.equal(candidates[0].source,'bdfugue');
    assert.equal(candidates[0].coverWidth,900);
    assert.equal(candidates[0].coverEvidence.scraped,true);
  }finally{
    if(previous===undefined)delete process.env.BDFUGUE_AFFILIATE_ID;else process.env.BDFUGUE_AFFILIATE_ID=previous;
  }
});

test('BDfugue valide ISBN, page finale et dimensions avant de proposer la couverture',async()=>{
  const fetchImpl=bdfugueFetch();
  const candidates=await fetchBdfugueCover(isbn,{affiliateId:'partner-test',fetchImpl});
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].source,'bdfugue');
  assert.equal(candidates[0].title,'Titre & test');
  assert.deepEqual(candidates[0].identifiers,[isbn]);
  assert.equal(candidates[0].coverWidth,900);
  assert.equal(candidates[0].coverHeight,1400);
  assert.equal(candidates[0].coverEvidence.partnerRetailer,true);
  const all=await fetchOfficialCoverCandidates(isbn,{affiliateId:'partner-test',fetchImpl});
  assert.equal(all.length,1);
});

test('BDfugue retrouve une couverture par série, titre, tome et éditeur même sans ISBN',async()=>{
  const album={series:'Nocéan',number:'1',title:'Atari & Tika',publisher:'Dupuis'};
  const candidates=await fetchBdfugueCoverByMetadata(album,{fetchImpl:bibliographicFetch()});
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].source,'bdfugue');
  assert.equal(candidates[0].coverWidth,1000);
  assert.equal(candidates[0].coverEvidence.bibliographicMatch,true);
  assert.ok(candidates[0].coverEvidence.bibliographicScore>=0.9);
  const all=await fetchBibliographicCoverCandidates(album,{fetchImpl:bibliographicFetch()});
  assert.equal(all.length,1);
});

test('BDfugue refuse une image trop petite et continue à chercher',async()=>{
  assert.deepEqual(await fetchBdfugueCover(isbn,{fetchImpl:bdfugueFetch({lowRes:true})}),[]);
});

test('BDfugue rejette une redirection hors domaine puis tente la recherche directe',async()=>{
  const candidates=await fetchBdfugueCover(isbn,{affiliateId:'partner-test',fetchImpl:bdfugueFetch({foreign:true})});
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].source,'bdfugue');
});
