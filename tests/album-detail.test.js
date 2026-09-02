import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase,createAlbum,updateAlbum,getAlbum} from '../src/db.js';

test('la fiche album accepte les champs éditoriaux sans écraser les données personnelles',()=>{
  const db=openDatabase(':memory:');
  const a=createAlbum(db,{isbn:'9782203237766',series:'Saga',title:'Titre',purchasePrice:12.5,comment:'Perso'});
  const updated=updateAlbum(db,a.id,{collectionName:'Comix Buro',writer:'Auteur',artist:'Dessinateur',format:'48 pages',condition:'Très bon',coverUrl:'https://example.test/cover.jpg',description:'Résumé',printDate:'2024'});
  assert.equal(updated.collection_name,'Comix Buro');
  assert.equal(updated.writer,'Auteur');
  assert.equal(updated.artist,'Dessinateur');
  assert.equal(updated.cover_url,'https://example.test/cover.jpg');
  assert.equal(updated.description,'Résumé');
  assert.equal(updated.print_date,'2024');
  assert.equal(updated.purchase_price,12.5);
  assert.equal(updated.comment,'Perso');
});

test('création riche conserve couverture et métadonnées éditoriales',()=>{
  const db=openDatabase(':memory:');
  const a=createAlbum(db,{series:'Valhalla Bunker',number:'1',title:'Sweet revenge',publisher:'Glénat',collectionName:'Comix Buro',writer:'Fabien Bedouel',coverUrl:'https://example.test/c.jpg',description:'Résumé',format:'Album'});
  const saved=getAlbum(db,a.id);
  assert.equal(saved.publisher,'Glénat');
  assert.equal(saved.collection_name,'Comix Buro');
  assert.equal(saved.writer,'Fabien Bedouel');
  assert.equal(saved.cover_url,'https://example.test/c.jpg');
  assert.equal(saved.description,'Résumé');
  assert.equal(saved.format,'Album');
});
