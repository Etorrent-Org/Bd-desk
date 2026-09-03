import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('index wires the adaptive smartphone layer',async()=>{
  const html=await read('public/index.html');
  assert.match(html,/adaptive-ui\.css\?v=/);
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

test('phone portrait uses a dedicated two-column collection and mobile navigation',async()=>{
  const css=await read('public/adaptive-ui.css');
  assert.match(css,/data-device="phone"/);
  assert.match(css,/data-orientation="portrait"/);
  assert.match(css,/\.album-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.bottom-nav\{position:fixed/);
  assert.match(css,/\.mobile-more-actions/);
});

test('service worker caches adaptive assets',async()=>{
  const sw=await read('public/sw.js');
  assert.match(sw,/bd-desk-v23/);
  assert.match(sw,/adaptive-ui\.css/);
  assert.match(sw,/adaptive-ui\.js/);
});
