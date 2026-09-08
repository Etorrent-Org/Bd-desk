import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=path=>fs.readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('dashboard KPIs expose navigation and keyboard affordances',async()=>{
  const js=await read('public/dashboard-kpis.js');
  assert.match(js,/Ma collection/);
  assert.match(js,/Séries suivies/);
  assert.match(js,/Albums manquants/);
  assert.match(js,/Wishlist/);
  assert.match(js,/setAttribute\('role','link'\)/);
  assert.match(js,/setAttribute\('tabindex','0'\)/);
  assert.match(js,/event\.key!=='Enter'/);
  assert.match(js,/event\.key!==' '/);
});

test('missing KPI opens the dedicated filtered series view',async()=>{
  const js=await read('public/dashboard-kpis.js');
  assert.match(js,/bd-desk-series-missing-only/);
  assert.match(js,/fetch\('\/api\/series'/);
  assert.match(js,/Tomes manquants/);
  assert.match(js,/Voir toutes les séries/);
});

test('dashboard KPI assets are loaded and cached',async()=>{
  const [html,sw]=await Promise.all([read('public/index.html'),read('public/sw.js')]);
  assert.match(html,/dashboard-kpis\.css\?v=20260908-1/);
  assert.match(html,/dashboard-kpis\.js\?v=20260908-1/);
  assert.match(sw,/dashboard-kpis\.css\?v=20260908-1/);
  assert.match(sw,/dashboard-kpis\.js\?v=20260908-1/);
});
