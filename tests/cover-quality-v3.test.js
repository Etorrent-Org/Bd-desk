import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, persistCoverDecision, coverResolutionStatus } from '../src/db.js';
import { resolveCandidates } from '../src/metadata.js';

test('le résolveur refuse une couverture connue sous 300 px',()=>{
  const isbn='9782344059814';
  const result=resolveCandidates(isbn,[{source:'google-books',sourceId:'tiny',title:'Test',identifiers:[isbn],coverUrl:'https://books.google.com/tiny.jpg',coverWidth:128,coverHeight:190,coverEvidence:{apiRecord:true}}]);
  assert.equal(result.cover.url,null);
  assert.equal(result.cover.reason,'low-resolution-cover');
});

test('le résolveur conserve une couverture haute définition',()=>{
  const isbn='9782344059814';
  const result=resolveCandidates(isbn,[{source:'google-books',sourceId:'hd',title:'Test',identifiers:[isbn],coverUrl:'https://books.google.com/hd.jpg',coverWidth:900,coverHeight:1400,coverEvidence:{apiRecord:true}}]);
  assert.equal(result.cover.url,'https://books.google.com/hd.jpg');
});

test('la base expose les couvertures basse définition séparément',()=>{
  const db=openDatabase(':memory:');
  const album=db.prepare(`INSERT INTO albums(isbn,series,title,cover_url,cover_origin,cover_source,cover_width,cover_height,cover_checked_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) RETURNING id`).get('9782344059814','Saga','Titre','https://books.google.com/tiny.jpg','machine','google-books',120,180).id;
  const status=coverResolutionStatus(db);
  assert.equal(status.lowRes,1);
  assert.equal(status.withCover,0);
  const decision=persistCoverDecision(db,album,{url:'https://books.google.com/new.jpg',source:'google-books',confidence:.9,width:160,height:240,decision:'verified-source'});
  assert.equal(decision.updated,false);
  assert.equal(decision.reason,'low-resolution-cover');
  assert.equal(db.prepare('SELECT cover_url FROM albums WHERE id=?').get(album).cover_url,null);
});
