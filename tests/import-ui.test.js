import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('le sélecteur BDGest reste activable et expose le fichier choisi',async()=>{
  const js=await read('public/app.js');
  const css=await read('public/styles.css');
  assert.match(js,/input id="csvFile" name="file" type="file"/);
  assert.match(js,/button type="button" class="btn file-picker-trigger" id="chooseCsv">Choisir le fichier<\/button>/);
  assert.match(js,/input\.onchange=\(\)=>/);
  assert.match(js,/window\.showOpenFilePicker/);
  assert.match(js,/input\.click\(\)/);
  assert.match(js,/selectedFile/);
  assert.match(css,/\.file-picker input\[type=file\]\{position:absolute/);
  assert.match(css,/\.file-picker-trigger:focus-visible/);
});
