import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAlbumPayload, normalizeLoanPayload, normalizeWebhookPayload, normalizeApiKeyPayload} from '../src/validation.js';
import {configFromEnv, assertProductionConfig} from '../src/config.js';

test('normalise un album et canonise l’ISBN',()=>{
  const value=normalizeAlbumPayload({isbn:'2-87097-043-9',series:' Saga ',title:' Premier ',read:true,purchasePrice:'12,50',collection:'Comix Buro'});
  assert.deepEqual(value,{isbn:'9782870970430',series:'Saga',number:null,numberAlt:null,title:'Premier',publisher:null,collectionName:'Comix Buro',writer:null,artist:null,legalDeposit:null,printDate:null,condition:null,purchaseDate:null,note:null,format:null,readDate:null,signedDate:null,comment:null,description:null,source:'manual',coverUrl:null,marketValue:null,purchasePrice:12.5,pageCount:null,read:1,wishlist:0,forSale:0,firstEdition:0,followed:0,signed:0});
});

test('rejette les albums incomplets ou les valeurs dangereuses',()=>{
  assert.throws(()=>normalizeAlbumPayload({series:'Saga',title:'Titre',isbn:'9782203237767'}),/ISBN\/EAN invalide/);
  assert.throws(()=>normalizeAlbumPayload({series:'Saga',title:''}),/title requis/);
  assert.throws(()=>normalizeAlbumPayload({series:'Saga',title:'Titre',pageCount:12.5}),/pageCount invalide/);
  assert.throws(()=>normalizeAlbumPayload({series:'Saga',title:'Titre',coverUrl:'javascript:alert(1)'}),/coverUrl invalide/);
  assert.throws(()=>normalizeAlbumPayload({series:'Saga',title:'Titre',read:'yes'}),/read invalide/);
});

test('normalise un prêt et refuse un emprunteur vide',()=>{
  assert.deepEqual(normalizeLoanPayload({albumId:'3',borrower:' Alex ',dueAt:''}),{albumId:3,borrower:'Alex',dueAt:null});
  assert.throws(()=>normalizeLoanPayload({albumId:3,borrower:' '}),/Emprunteur requis/);
  assert.throws(()=>normalizeLoanPayload({albumId:0,borrower:'Alex'}),/Album invalide/);
});

test('valide les webhooks et clés API sans coercion dangereuse',()=>{
  assert.deepEqual(normalizeWebhookPayload({url:' https://example.test/hook ',events:['album.created','album.created']}),{name:'Webhook',url:'https://example.test/hook',events:['album.created']});
  assert.throws(()=>normalizeWebhookPayload({name:'x',url:'http://user:pass@example.test/hook',events:['*']}),/URL de webhook invalide/);
  assert.throws(()=>normalizeWebhookPayload({name:'x',url:'https://example.test/hook',events:['']}),/events invalides/);
  assert.throws(()=>normalizeWebhookPayload({name:'x',url:'https://example.test/hook',enabled:'false'}),/enabled invalide/);
  assert.deepEqual(normalizeApiKeyPayload({name:' Automations '}),{name:'Automations'});
  assert.throws(()=>normalizeApiKeyPayload({name:{}}),/Nom de clé API invalide/);
});

test('la configuration production exige deux secrets forts',()=>{
  const config=configFromEnv({NODE_ENV:'production',BD_DESK_EDITION:'licensed',BD_DESK_LICENSE_SECRET:'short',WEBHOOK_SIGNING_SECRET:'short'});
  assert.throws(()=>assertProductionConfig(config),/BD_DESK_LICENSE_SECRET/);
  assert.throws(()=>assertProductionConfig(configFromEnv({NODE_ENV:'production',BD_DESK_EDITION:'licensed',BD_DESK_LICENSE_SECRET:'a'.repeat(32)})),/WEBHOOK_SIGNING_SECRET/);
  assert.equal(assertProductionConfig(configFromEnv({NODE_ENV:'production',BD_DESK_EDITION:'licensed',BD_DESK_LICENSE_SECRET:'a'.repeat(32),WEBHOOK_SIGNING_SECRET:'b'.repeat(32)})),true);
  assert.equal(assertProductionConfig(configFromEnv({NODE_ENV:'production',BD_DESK_EDITION:'free'})),true);
  assert.throws(()=>configFromEnv({BD_DESK_EDITION:'gold'}),/BD_DESK_EDITION/);
});
