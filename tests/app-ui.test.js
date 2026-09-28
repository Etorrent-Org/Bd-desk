import test from 'node:test';
import assert from 'node:assert/strict';
import {coverCard,coverSrc,escapeHtml,euro,img} from '../public/app-ui.js';

Object.defineProperty(globalThis,'location',{
  configurable:true,
  value:{origin:'http://localhost'}
});

test('app-ui échappe le HTML et formate les montants',()=>{
  assert.equal(escapeHtml('<A & "B">'),'&lt;A &amp; &quot;B&quot;&gt;');
  assert.match(euro(12.5),/12,50/);
});

test('app-ui proxifie les couvertures machine approuvées',()=>{
  const album={
    id:42,
    title:'Album',
    series:'Série',
    cover_url:'https://openapi.bnf.fr/couverture/test.jpg',
    cover_origin:'machine'
  };
  assert.equal(coverSrc(album),'/api/albums/42/cover/image');
  assert.match(img(album),/\/api\/albums\/42\/cover\/image/);
  assert.match(coverCard(album),/data-album="42"/);
});

test('app-ui conserve une couverture utilisateur directe',()=>{
  const album={
    id:7,
    title:'Album',
    cover_url:'https://example.test/perso.jpg',
    cover_origin:'user'
  };
  assert.equal(coverSrc(album),'https://example.test/perso.jpg');
});
