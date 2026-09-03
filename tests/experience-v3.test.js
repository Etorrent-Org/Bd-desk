import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('experience v3 is wired after legacy visual layers',async()=>{
  const html=await read('public/index.html');
  assert.match(html,/experience-v3\.css\?v=20260903-3/);
  assert.match(html,/experience-v3\.js\?v=20260903-3/);
  assert.ok(html.indexOf('catalog-ui.css')<html.indexOf('experience-v3.css'));
  assert.match(html,/Collection studio/);
});

test('experience v3 keeps one UX and four visual themes',async()=>{
  const css=await read('public/experience-v3.css');
  for(const theme of ['neutral','bd','comics','manga'])assert.match(css,new RegExp(`data-theme=\\"${theme}\\"`));
  assert.match(css,/editorial-cover/);
  assert.match(css,/theme-preview/);
  assert.match(css,/data-route="discover"/);
});

test('cover experience is progressive and avoids user-agent sniffing',async()=>{
  const js=await read('public/experience-v3.js');
  assert.match(js,/IntersectionObserver/);
  assert.match(js,/MutationObserver/);
  assert.match(js,/AUTO_LIMIT=14/);
  assert.match(js,/BDDeskExperience/);
  assert.doesNotMatch(js,/userAgent/i);
});

test('failed covers fall back to editorial album identity, not generic Couverture',async()=>{
  const js=await read('public/cover-fallback.js');
  assert.match(js,/BDDeskExperience/);
  assert.match(js,/payload\.title/);
  assert.doesNotMatch(js,/label\|\|'Couverture'/);
});
