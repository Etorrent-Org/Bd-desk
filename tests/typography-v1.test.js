import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('la couche typographique est chargée après experience-v3',async()=>{
  const html=await read('public/index.html');
  assert.match(html,/typography-v1\.css\?v=20260908-1/);
  assert.ok(html.indexOf('experience-v3.css')<html.indexOf('typography-v1.css'));
});

test('les cartes catalogue évitent le gras et les capitales forcées',async()=>{
  const css=await read('public/typography-v1.css');
  assert.match(css,/\.album-card h3\{[\s\S]*font-weight:500!important/);
  assert.match(css,/\.album-card h3\{[\s\S]*text-transform:none!important/);
  assert.match(css,/\.album-card \.series\{font-weight:400!important/);
  assert.doesNotMatch(css,/font-weight:(?:7|8|9)\d\d/);
});

test('les thèmes gardent une personnalité sans Impact ni uppercase forcé',async()=>{
  const css=await read('public/typography-v1.css');
  assert.match(css,/body\[data-theme="comics"\]\{--display:var\(--font-comics\)\}/);
  assert.match(css,/body\[data-theme="bd"\]\{--display:var\(--font-editorial\)\}/);
  assert.match(css,/body\[data-theme="manga"\]\{--display:var\(--font-manga\)\}/);
  assert.doesNotMatch(css,/Impact|Arial Narrow Bold/);
});

test('la PWA met en cache la nouvelle couche typographique',async()=>{
  const sw=await read('public/sw.js');
  assert.match(sw,/bd-desk-v49/);
  assert.match(sw,/typography-v1\.css\?v=20260908-1/);
});
