import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('la couche typographique est chargée après experience-v3',async()=>{
  const html=await read('public/index.html');
  const build=html.match(/bd-desk-build" content="(\d{4})\.(\d{2})\.(\d{2})\.(\d+)"/);
  assert.ok(build,'Marqueur de build absent');
  const version=`${build[1]}${build[2]}${build[3]}-${build[4]}`;
  assert.ok(html.includes('/typography-v1.css?v='+version));
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
  const html=await read('public/index.html');
  const sw=await read('public/sw.js');
  const build=html.match(/bd-desk-build" content="(\d{4})\.(\d{2})\.(\d{2})\.(\d+)"/);
  assert.ok(build,'Marqueur de build absent');
  const version=`${build[1]}${build[2]}${build[3]}-${build[4]}`;
  assert.match(sw,/bd-desk-v\d+/);
  assert.ok(sw.includes('/typography-v1.css?v='+version));
});
