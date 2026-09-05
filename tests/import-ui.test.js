import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('le sélecteur BDGest reste activable et expose le fichier choisi',async()=>{
  const js=await read('public/app.js');
  const css=await read('public/styles.css');
  assert.match(js,/input id="csvFile" name="file" type="file"/);
  assert.match(js,/label class="btn file-picker-trigger" for="csvFile">Choisir le fichier<\/label>/);
  assert.match(js,/input\.onchange=\(\)=>/);
  assert.match(js,/fileName\.textContent=file\?file\.name/);
  assert.match(css,/\.file-picker input\[type=file\]\{position:absolute/);
  assert.match(css,/\.file-picker input\[type=file\]:focus-visible\+\.file-picker-trigger/);
});
