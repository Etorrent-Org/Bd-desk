import test from 'node:test';
import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {readFile} from 'node:fs/promises';
import {isBdgestCsv,readBdgestFile} from '../public/import-bdgest.js';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('le flux BDGest utilise le champ natif avant l’analyse serveur',async()=>{
  const js=await read('public/app.js');
  const css=await read('public/styles.css');
  const reader=await read('public/import-bdgest.js');
  assert.match(js,/form id="bdgestImportForm" novalidate/);
  assert.match(js,/label class="file-choose-button" for="csvFile">Choisir un fichier<\/label>/);
  assert.match(js,/input id="csvFile" class="file-input-native" name="file" type="file" accept="\.csv,text\/csv,application\/vnd\.ms-excel"/);
  assert.match(js,/aria-labelledby="csvFileLabel"/);
  assert.match(js,/output id="csvFileName"/);
  assert.match(js,/input\.addEventListener\('change',\(\)=>void loadFile\(selectedFile\(\)\)\)/);
  assert.match(js,/import \{isBdgestCsv,readBdgestFile\}/);
  assert.match(js,/fileName\.textContent=file\.name/);
  assert.match(js,/readBdgestFile\(file\)/);
  assert.match(js,/addEventListener\('drop'/);
  assert.match(js,/api\/import\/bdgest\/preview/);
  assert.match(js,/id="analyzeImport"/);
  assert.match(js,/form\.addEventListener\('submit',async e=>/);
  assert.match(reader,/isBdgestCsv=file=>/);
  assert.match(reader,/readBdgestFile=file=>/);
  assert.match(reader,/FileReader/);
  assert.doesNotMatch(js,/inspectLocalCsv/);
  assert.doesNotMatch(js,/parseLocalCsv/);
  assert.doesNotMatch(js,/csvText/);
  assert.doesNotMatch(js,/Aperçu local/);
  assert.doesNotMatch(js,/Route API inconnue/);
  assert.doesNotMatch(js,/input\.click\(\)/);
  assert.doesNotMatch(js,/showOpenFilePicker/);
  assert.match(css,/\.file-picker\{display:grid/);
  assert.match(css,/\.file-picker-control\{display:flex/);
  assert.match(css,/\.file-choose-button\{display:inline-flex/);
  assert.match(css,/\.file-input-native\{position:absolute!important;width:1px!important;height:1px!important/);
  assert.match(css,/clip-path:inset\(50%\)!important/);
  assert.match(css,/\.import-preview/);
});

test('le lecteur BDGest lit un vrai objet File avant l’appel serveur',async()=>{
  const csv='Table;IdAlbum;Titre\\nALBUM;990001;Test';
  const file=new File([csv],'collection.csv',{type:'text/csv'});
  assert.equal(isBdgestCsv(file),true);
  assert.equal(await readBdgestFile(file),csv);
  assert.equal(isBdgestCsv(new File(['x'],'collection.txt',{type:'text/plain'})),false);
});

test('le lecteur conserve le chemin FileReader pour les navigateurs sans File.text',async()=>{
  const previous=global.FileReader;
  global.FileReader=class {
    readAsText(){this.result='Table;IdAlbum;Titre\\nALBUM;990002;FileReader';this.onload?.();}
  };
  try{
    assert.equal(await readBdgestFile({name:'collection.csv',type:'text/csv'}),'Table;IdAlbum;Titre\\nALBUM;990002;FileReader');
  }finally{
    if(previous===undefined)delete global.FileReader;
    else global.FileReader=previous;
  }
});

test('le déploiement refuse un serveur AlwaysData sans route d’aperçu',async()=>{
  const workflow=await read('.github/workflows/deploy-alwaysdata.yml');
  assert.match(workflow,/The AlwaysData API key is unavailable/);
  assert.match(workflow,/secrets\.ALWAYS_DATA_API_KEY/);
  assert.match(workflow,/name: Validate deployment control secrets/);
  assert.match(workflow,/test -n "\$ALWAYSDATA_API_KEY"/);
  assert.match(workflow,/POST "\$PREVIEW_URL\/api\/import\/bdgest\/preview"/);
  assert.match(workflow,/bdgest-sample\.csv/);
  assert.match(workflow,/Live BDGest preview route is not the deployed server route/);
  assert.match(workflow,/def hostname\(value\)/);
  assert.match(workflow,/site_items\(payload\)/);
  assert.doesNotMatch(workflow,/Require AlwaysData restart control/);
  assert.doesNotMatch(workflow,/No BD Desk Node process found/);
});
