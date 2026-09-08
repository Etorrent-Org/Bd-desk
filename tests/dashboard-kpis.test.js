import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=path=>fs.readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('dashboard KPIs expose direct app routing and keyboard affordances',async()=>{
  const js=await read('public/dashboard-kpis.js');
  assert.match(js,/Ma collection/);
  assert.match(js,/Séries suivies/);
  assert.match(js,/Albums manquants/);
  assert.match(js,/Wishlist/);
  assert.match(js,/card\.dataset\.route=target\.route/);
  assert.match(js,/setAttribute\('role','link'\)/);
  assert.match(js,/setAttribute\('tabindex','0'\)/);
  assert.match(js,/event\.key!=='Enter'/);
  assert.match(js,/event\.key!==' '/);
  assert.match(js,/card\.click\(\)/);
  assert.doesNotMatch(js,/location\.hash=`#\$\{target\.route\}`/);
});

test('missing KPI preserves the dedicated filtered series view',async()=>{
  const js=await read('public/dashboard-kpis.js');
  assert.match(js,/bd-desk-series-missing-only/);
  assert.match(js,/dashboardMissing==='1'/);
  assert.match(js,/sessionStorage\.setItem\(MISSING_FILTER_KEY,'1'\)/);
  assert.match(js,/fetch\('\/api\/series'/);
  assert.match(js,/Tomes manquants/);
  assert.match(js,/Voir toutes les séries/);
});

test('dashboard KPI assets are loaded and cached with the fixed navigation bundle',async()=>{
  const [html,sw]=await Promise.all([read('public/index.html'),read('public/sw.js')]);
  assert.match(html,/dashboard-kpis\.css\?v=20260908-1/);
  assert.match(html,/dashboard-kpis\.js\?v=20260908-1/);
  assert.match(sw,/dashboard-kpis\.css\?v=20260908-1/);
  assert.match(sw,/dashboard-kpis\.js\?v=20260908-1/);
});
