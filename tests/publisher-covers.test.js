import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchMediaParticipationsCover, mediaParticipationsCoverUrls } from '../src/publisher-covers.js';
import { openDatabase, persistCoverDecision } from '../src/db.js';

function png(width=900,height=1400){
  const buffer=Buffer.alloc(24);
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(buffer,0);
  buffer.writeUInt32BE(width,16);
  buffer.writeUInt32BE(height,20);
  return buffer;
}

test('les URL Média-Participations sont déterministes à partir de l ISBN',()=>{
  assert.deepEqual(mediaParticipationsCoverUrls('979-10-347-5873-9'),[
    'https://bdi.dlpdomain.com/album/9791034758739-couv-M700x1200.jpg',
    'https://bdi.dlpdomain.com/album/9791034758739-couv.jpg'
  ]);
});

test('la source éditeur accepte la première vraie couverture disponible',async()=>{
  const calls=[];
  const fetchImpl=async url=>{
    calls.push(String(url));
    if(String(url).endsWith('-couv-M700x1200.jpg'))return new Response('',{status:404});
    return new Response(png(900,1400),{status:200,headers:{'content-type':'image/png'}});
  };
  const candidates=await fetchMediaParticipationsCover('9782205063592',{fetchImpl});
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].source,'media-participations');
  assert.equal(candidates[0].coverWidth,900);
  assert.equal(candidates[0].coverHeight,1400);
  assert.equal(candidates[0].coverEvidence.official,true);
  assert.equal(calls.length,2);
});

test('la source éditeur rejette une miniature',async()=>{
  const fetchImpl=async()=>new Response(png(120,180),{status:200,headers:{'content-type':'image/png'}});
  assert.deepEqual(await fetchMediaParticipationsCover('9791034758739',{fetchImpl}),[]);
});

test('la base persiste une couverture officielle Média-Participations',()=>{
  const db=openDatabase(':memory:');
  const id=db.prepare('INSERT INTO albums(isbn,series,title) VALUES(?,?,?) RETURNING id').get('9791034758739','Nocéan','Atari & Tika').id;
  const decision=persistCoverDecision(db,id,{url:'https://bdi.dlpdomain.com/album/9791034758739-couv-M700x1200.jpg',source:'media-participations',confidence:.94,width:700,height:1200,bytes:200000,decision:'verified-source'});
  assert.equal(decision.updated,true);
  assert.equal(decision.album.cover_origin,'machine');
  assert.equal(decision.album.cover_source,'media-participations');
  assert.equal(decision.album.cover_status,'verified');
});
