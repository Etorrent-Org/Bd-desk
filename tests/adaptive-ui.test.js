import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('index wires the adaptive smartphone and catalog layers',async()=>{
  const html=await read('public/index.html');
  assert.match(html,/adaptive-ui\.css\?v=/);
  assert.match(html,/catalog-ui\.css\?v=/);
  assert.match(html,/adaptive-ui\.js\?v=/);
  assert.match(html,/id="mobileSearchBtn"/);
  assert.match(html,/class="mobile-brand"/);
});

test('adaptive UI classifies by capabilities and viewport, not user-agent sniffing',async()=>{
  const js=await read('public/adaptive-ui.js');
  assert.match(js,/pointer: coarse/);
  assert.match(js,/maxTouchPoints/);
  assert.match(js,/data\.device|dataset\.device/);
  assert.match(js,/orientation/);
  assert.doesNotMatch(js,/userAgent/i);
});

test('phone portrait keeps dedicated two-column navigation and catalog density',async()=>{
  const adaptive=await read('public/adaptive-ui.css');
  const catalog=await read('public/catalog-ui.css');
  assert.match(adaptive,/data-device="phone"/);
  assert.match(adaptive,/data-orientation="portrait"/);
  assert.match(adaptive,/\.bottom-nav\{position:fixed/);
  assert.match(adaptive,/\.mobile-more-actions/);
  assert.match(catalog,/grid-template-columns:repeat\(2,clamp\(128px,34vw,148px\)\)/);
  assert.match(catalog,/\.album-card>p:last-child\{display:none\}/);
});

test('tablet and desktop expose denser visual catalog grids',async()=>{
  const css=await read('public/catalog-ui.css');
  assert.match(css,/data-device="tablet"/);
  assert.match(css,/repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/data-device="desktop"/);
  assert.match(css,/minmax\(128px,154px\)/);
});

test('service worker caches adaptive catalog assets',async()=>{
  const sw=await read('public/sw.js');
  assert.match(sw,/bd-desk-v26/);
  assert.match(sw,/adaptive-ui\.css/);
  assert.match(sw,/catalog-ui\.css/);
  assert.match(sw,/adaptive-ui\.js/);
  assert.match(sw,/experience-v3\.css/);
  assert.match(sw,/experience-v3\.js/);
});
