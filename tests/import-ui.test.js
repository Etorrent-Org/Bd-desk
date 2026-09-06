import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('le flux BDGest propose une source fichier et une source texte avant import',async()=>{
  const js=await read('public/app.js');
  const css=await read('public/styles.css');
  assert.match(js,/form id="bdgestImportForm" novalidate/);
  assert.match(js,/input id="csvFile" name="file" type="file"/);
  assert.match(js,/textarea id="csvText"/);
  assert.match(js,/input\.addEventListener\('change',\(\)=>/);
  assert.match(js,/textarea\.addEventListener\('input',\(\)=>/);
  assert.match(js,/FileReader/);
  assert.match(js,/inspectLocalCsv/);
  assert.match(js,/Route API inconnue/);
  assert.match(js,/addEventListener\('drop'/);
  assert.match(js,/api\/import\/bdgest\/preview/);
  assert.match(js,/id="analyzeImport"/);
  assert.match(js,/form\.addEventListener\('submit',async e=>/);
  assert.match(js,/isCsv=file=>/);
  assert.doesNotMatch(js,/input\.click\(\)/);
  assert.doesNotMatch(js,/showOpenFilePicker/);
  assert.match(css,/\.file-picker\{display:grid/);
  assert.match(css,/\.file-picker input\[type=file\]\{display:block;position:static;width:100%/);
  assert.match(css,/opacity:1;z-index:auto;cursor:pointer/);
  assert.match(css,/::file-selector-button/);
  assert.match(css,/\.import-preview/);
  assert.match(css,/\.import-or/);
});
