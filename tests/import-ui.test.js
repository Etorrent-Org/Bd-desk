import test from 'node:test';
import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {readFile} from 'node:fs/promises';
import {isBdgestCsv,readBdgestFile} from '../public/import-bdgest.js';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('le flux BDGest utilise une page dédiée et un champ natif visible',async()=>{
  const js=await read('public/app.js');
  const page=await read('public/import-bdgest.html');
  const pageJs=await read('public/import-bdgest-page.js');
  assert.match(js,/function openImport\(\)\{location\.href='\/import-bdgest\.html';\}/);
  assert.match(page,/id="csvFile"[^>]*type="file"/);
  assert.match(page,/class="file-native"/);
  assert.match(page,/script type="module" src="\/import-bdgest-page\.js\?v=20260907-2"/);
  assert.doesNotMatch(page,/file-input-native|input\.click\(\)|showOpenFilePicker/);
  assert.match(pageJs,/input\.addEventListener\('change'/);
  assert.match(pageJs,/api\/capabilities/);
  assert.match(pageJs,/api\/import\/bdgest\/preview/);
  assert.match(pageJs,/api\/import\/bdgest/);
  assert.doesNotMatch(pageJs,/input\.click\(\)|showOpenFilePicker/);
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
