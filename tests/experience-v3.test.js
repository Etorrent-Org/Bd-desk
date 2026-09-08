import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('experience v3 est branchée après les couches visuelles legacy',async()=>{
  const html=await read('public/index.html');
  assert.match(html,/experience-v3\.css\?v=\d{8}-\d+/);
  assert.match(html,/experience-v3\.js\?v=\d{8}-\d+/);
  assert.match(html,/cover-sources\.js\?v=\d{8}-\d+/);
  assert.ok(html.indexOf('catalog-ui.css')<html.indexOf('experience-v3.css'));
  assert.ok(html.indexOf('experience-v3.js')<html.indexOf('cover-sources.js'));
  assert.match(html,/Collection studio/);
});

test('la PWA invalide explicitement le bundle pour ne pas conserver une ancienne couverture',async()=>{
  const html=await read('public/index.html');
  const sw=await read('public/sw.js');
  const app=await read('public/app.js');
  const build=html.match(/bd-desk-build" content="(\d{4})\.(\d{2})\.(\d{2})\.(\d+)"/);
  assert.ok(build,'Marqueur de build absent');
  const version=`${build[1]}${build[2]}${build[3]}-${build[4]}`;
  const htmlVersions=[...html.matchAll(/\?v=(\d{8}-\d+)/g)].map(match=>match[1]);
  assert.ok(htmlVersions.length>5);
  assert.ok(htmlVersions.every(value=>value===version));
  assert.ok(app.includes('/sw.js?v='+version));
  assert.match(app,/updateViaCache:'none'/);
  assert.match(app,/\/api\/albums\/\$\{encodeURIComponent\(id\)\}\/cover\/image/);
  assert.match(app,/\/api\/covers\/resolve/);
  assert.match(sw,/const CACHE='bd-desk-v\d+'/);
  assert.ok(sw.includes('/import-bdgest.js?v='+version));
  assert.ok(sw.includes('/app.js?v='+version));
});

test('experience v3 conserve une UX et quatre thèmes visuels',async()=>{
  const css=(await read('public/experience-v3-core.css'))+'\n'+(await read('public/experience-v3.css'));
  for(const theme of ['neutral','bd','comics','manga'])assert.match(css,new RegExp('data-theme="' + theme + '"'));
  assert.match(css,/editorial-cover/);
  assert.match(css,/theme-preview/);
  assert.match(css,/data-route="discover"/);
});

test('experience v3 reste progressive et délègue la résolution au service central',async()=>{
  const js=await read('public/experience-v3.js');
  assert.match(js,/MutationObserver/);
  assert.match(js,/BDDeskExperience/);
  assert.doesNotMatch(js,/api\/discover/);
  assert.doesNotMatch(js,/userAgent/i);
});

test('le client de couverture utilise une résolution API vérifiée et garde la concurrence bornée',async()=>{
  const js=await read('public/cover-sources.js');
  assert.match(js,/openapi\.bnf\.fr\/couverture/);
  assert.match(js,/\/api\/albums\/.*cover\/resolve/);
  assert.match(js,/\/api\/albums\/.*cover\/image/);
  assert.match(js,/MAX_CONCURRENCY=2/);
  assert.match(js,/method:'POST'/);
  assert.doesNotMatch(js,/url:'https:\/\/covers\.openlibrary\.org/);
  assert.doesNotMatch(js,/media\.hachette\.fr\/imgArticle\/GLENAT/);
  assert.doesNotMatch(js,/method:'PATCH'/);
});

test('une couverture échouée revient à l’identité éditoriale de l’album',async()=>{
  const js=await read('public/cover-fallback.js');
  assert.match(js,/BDDeskExperience/);
  assert.match(js,/payload\.title/);
  assert.match(js,/BDDeskCoverSources/);
  assert.doesNotMatch(js,/label\|\|'Couverture'/);
});

test('la fiche contrôle la feature d’enrichissement, pas seulement le plan',async()=>{
  const js=await read('public/detail-enhance.js');
  assert.match(js,/features\?\.includes\('metadata_auto'\)/);
});
