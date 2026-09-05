import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase,importBdgest,listAlbums,createAlbum,updateAlbum,deleteAlbum,seriesSummary,dashboard,basicStats,stats,peopleSummary,publishersSummary,seedIfEmpty,editionAnomalies,exportCollection,getAlbum,migrate,persistCoverDecision,applyMetadataResolution} from '../src/db.js';
const csv=fs.readFileSync(new URL('./fixtures/bdgest-sample.csv',import.meta.url),'utf8');
test('import réel BDGest, idempotence et KPI',()=>{const db=openDatabase(':memory:');const r=importBdgest(db,csv);assert.deepEqual(r,{rows:4,imported:4,skipped:0,errors:[]});const again=importBdgest(db,csv);assert.equal(again.imported,4);assert.equal(db.prepare('SELECT COUNT(*) c FROM albums').get().c,4);const d=dashboard(db);assert.equal(d.albums,4);assert.equal(d.series,2);assert.equal(d.eo,2);assert.equal(d.read,2);assert.equal(listAlbums(db,{search:'Saga'}).total>0,true);assert.equal(stats(db).albums,4);assert.equal(basicStats(db).albums,4);assert.equal(editionAnomalies(db).duplicateIsbns.some(x=>x.isbn==='9782203237766'),true);assert.equal(exportCollection(db).length,4);assert.equal(peopleSummary(db).length>=6,true);assert.equal(publishersSummary(db).length===3,true)});
test('CRUD manuel',()=>{const db=openDatabase(':memory:');const a=createAlbum(db,{isbn:'9782344059814',series:'Test',number:'1',title:'Test 1',read:false});assert.equal(a.series,'Test');assert.equal(updateAlbum(db,a.id,{read:true,followed:true,title:'Renommé'}).read,1);assert.equal(getAlbum(db,a.id).followed,1);assert.equal(updateAlbum(db,999,{title:'Fantôme'}),null);assert.equal(db.prepare("SELECT COUNT(*) c FROM history WHERE event='album_updated'").get().c,1);assert.equal(deleteAlbum(db,a.id),true);assert.equal(deleteAlbum(db,a.id),false)});
test('détection trous de série',()=>{const db=openDatabase(':memory:');createAlbum(db,{series:'Saga',number:'1',title:'1'});createAlbum(db,{series:'Saga',number:'3',title:'3'});const s=seriesSummary(db).find(x=>x.name==='Saga');assert.deepEqual(s.missing,[2])});
test('seedIfEmpty ne double pas',()=>{const db=openDatabase(':memory:');const tmp=new URL('./fixtures/bdgest-sample.csv',import.meta.url).pathname;assert.equal(seedIfEmpty(db,tmp).seeded,true);assert.equal(seedIfEmpty(db,tmp).seeded,false)});
test('import BDGest ne fabrique pas de couverture Open Library',()=>{const db=openDatabase(':memory:');importBdgest(db,csv);const rows=listAlbums(db,{limit:10}).items;assert.ok(rows.every(row=>row.cover_url===null));});
test('migration et décision de couverture distinguent machine et utilisateur',()=>{
  const db=openDatabase(':memory:');
  const a=createAlbum(db,{isbn:'9782344059814',series:'Valhalla Bunker',title:'Sweet revenge'});
  db.prepare('UPDATE albums SET cover_url=?,cover_origin=NULL,cover_source=NULL WHERE id=?').run('https://covers.openlibrary.org/b/isbn/9782344059814-L.jpg?default=false',a.id);
  migrate(db);
  assert.equal(getAlbum(db,a.id).cover_origin,'machine');
  const selected='https://www.images.hachette-livre.fr/media/imgArticle/GLENAT/2024/9782344059814-001-X.jpeg?v=fixture';
  assert.equal(persistCoverDecision(db,a.id,{url:selected,source:'hachette',confidence:.98}).updated,true);
  assert.equal(getAlbum(db,a.id).cover_url,selected);
  const b=createAlbum(db,{isbn:'9782344059814',series:'Valhalla Bunker',title:'Sweet revenge',coverUrl:'https://example.test/user-cover.jpg'});
  const preserved=persistCoverDecision(db,b.id,{url:selected,source:'hachette',confidence:.98});
  assert.equal(preserved.reason,'preserve-user-cover');
  assert.equal(getAlbum(db,b.id).cover_url,'https://example.test/user-cover.jpg');
});
test('résolution éditoriale ne touche pas aux champs personnels',()=>{
  const db=openDatabase(':memory:');
  const a=createAlbum(db,{isbn:'9782344059814',series:'Saisie',title:'Titre personnel',purchasePrice:18.5,comment:'Ne pas écraser'});
  const result=applyMetadataResolution(db,a.id,{fields:{
    title:{value:'Sweet revenge',source:'hachette',confidence:.94},
    series:{value:'Valhalla Bunker',source:'hachette',confidence:.94},
    publisher:{value:'Glénat',source:'hachette',confidence:.94},
    writer:{value:'Fabien Bedouel',source:'hachette',confidence:.94},
    pageCount:{value:64,source:'hachette',confidence:.94}
  },cover:{url:'https://www.images.hachette-livre.fr/cover.jpeg',source:'hachette',confidence:.98,decision:'verified-source'}});
  assert.equal(result.album.title,'Titre personnel');
  assert.equal(result.album.series,'Saisie');
  assert.equal(result.album.publisher,'Glénat');
  assert.equal(result.album.writer,'Fabien Bedouel');
  assert.equal(result.album.page_count,64);
  assert.equal(result.album.purchase_price,18.5);
  assert.equal(result.album.comment,'Ne pas écraser');
});
test('migration ajoute les colonnes de provenance à une ancienne base',()=>{
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE albums (id INTEGER PRIMARY KEY, isbn TEXT, series TEXT NOT NULL, title TEXT NOT NULL, cover_url TEXT)');
  migrate(db);
  const columns=db.prepare('PRAGMA table_info(albums)').all().map(column=>column.name);
  assert.ok(columns.includes('cover_origin'));
  assert.ok(columns.includes('cover_decision'));
  assert.ok(columns.includes('page_count'));
  assert.equal(persistCoverDecision(db,999,{url:'https://example.test/nope.jpg'}).reason,'album-not-found');
});
test('décision de couverture gère absence de preuve, URL invalide et confiance supérieure',()=>{
  const db=openDatabase(':memory:');
  const a=createAlbum(db,{isbn:'9782344059814',series:'S',title:'T'});
  assert.equal(persistCoverDecision(db,a.id,{}).reason,'no-trusted-cover');
  assert.equal(persistCoverDecision(db,a.id,{url:'not-an-url',source:'hachette',confidence:.9}).reason,'no-trusted-cover');
  db.prepare('UPDATE albums SET cover_url=?,cover_origin=?,cover_source=?,cover_confidence=? WHERE id=?').run('https://images.hachette-livre.fr/old.jpeg','legacy-other','legacy',.99,a.id);
  assert.equal(persistCoverDecision(db,a.id,{url:'https://www.images.hachette-livre.fr/new.jpeg',source:'hachette',confidence:.5}).reason,'preserve-existing-cover');
  db.prepare('UPDATE albums SET cover_origin=?,cover_confidence=? WHERE id=?').run('machine',.99,a.id);
  assert.equal(persistCoverDecision(db,a.id,{url:'https://www.images.hachette-livre.fr/new.jpeg',source:'hachette',confidence:.5}).reason,'preserve-higher-confidence-cover');
  assert.equal(persistCoverDecision(db,999,{url:null}).reason,'album-not-found');
});
test('effacer une couverture manuelle réouvre la résolution machine',()=>{
  const db=openDatabase(':memory:');
  const a=createAlbum(db,{isbn:'9782344059814',series:'S',title:'T',coverUrl:'https://example.test/user.jpg'});
  assert.equal(updateAlbum(db,a.id,{coverUrl:''}).cover_origin,null);
  assert.equal(persistCoverDecision(db,a.id,{url:'https://www.images.hachette-livre.fr/new.jpeg',source:'hachette',confidence:.9}).updated,true);
});
