import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('experience v3 is wired after legacy visual layers',async()=>{
  const html=await read('public/index.html');
  assert.match(html,/experience-v3\.css\?v=\d{8}-\d+/);
  assert.match(html,/experience-v3\.js\?v=\d{8}-\d+/);
  assert.match(html,/cover-sources\.js\?v=\d{8}-\d+/);
  assert.ok(html.indexOf('catalog-ui.css')<html.indexOf('experience-v3.css'));
  assert.ok(html.indexOf('experience-v3.js')<html.indexOf('cover-sources.js'));
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

test('real cover resolver prefers BnF, enriches from discover, supports Glenat and persists the result',async()=>{
  const js=await read('public/cover-sources.js');
  assert.match(js,/openapi\.bnf\.fr\/couverture/);
  assert.match(js,/covers\.openlibrary\.org/);
  assert.match(js,/\/api\/discover\?isbn=/);
  assert.match(js,/media\.hachette\.fr\/imgArticle\/GLENAT/);
  assert.match(js,/gl[eé]nat\|comix\\s\*buro/i);
  assert.ok(js.indexOf("source:'bnf'")<js.indexOf("source:'open-library'"));
  assert.match(js,/method:'PATCH'/);
  assert.match(js,/coverUrl:candidate\.url/);
});

test('failed covers fall back to editorial album identity, not generic Couverture',async()=>{
  const js=await read('public/cover-fallback.js');
  assert.match(js,/BDDeskExperience/);
  assert.match(js,/payload\.title/);
  assert.doesNotMatch(js,/label\|\|'Couverture'/);
});
