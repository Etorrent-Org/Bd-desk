import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('toutes les routes UI passent par un aiguillage centralisé',async()=>{
  const app=await read('public/app.js');
  const html=await read('public/index.html');
  assert.match(app,/const routeNames=new Set/);
  assert.match(app,/document\.addEventListener\('click',e=>/);
  assert.match(app,/button\.dataset\.route==='add'/);
  assert.match(app,/e\.preventDefault\(\);go\(button\.dataset\.route\)/);
  assert.doesNotMatch(app,/\$\$\('\[data-route\]'\)\.forEach\(b=>b\.onclick/);
  assert.match(app,/route==='settings'\)html=await settings\(\)/);
  assert.match(html,/data-route="settings"/);
  assert.match(html,/data-route="help"/);
});

test('un rendu retardé ne peut pas écraser la route courante',async()=>{
  const app=await read('public/app.js');
  assert.match(app,/const version=\+\+renderVersion,route=state\.route/);
  assert.match(app,/if\(version!==renderVersion\|\|route!==state\.route\)return/);
});
