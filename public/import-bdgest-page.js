import {isBdgestCsv,readBdgestFile} from './import-bdgest.js';

const $=selector=>document.querySelector(selector);
const form=$('#bdgestImportForm');
const picker=$('#csvPicker');
const input=$('#csvFile');
const fileName=$('#csvFileName');
const licenseStatus=$('#licenseStatus');
const preview=$('#importPreview');
const status=$('#importStatus');
const analyzeButton=$('#analyzeImport');
const importButton=$('#doImport');
const resetButton=$('#resetImport');

const source={text:'',label:'',analysis:null,reading:false,sequence:0};
let capabilitiesReady=false;
let premiumAllowed=false;

const setStatus=(message='',state='')=>{status.textContent=message;status.dataset.state=state};
const messages=value=>Array.isArray(value)?value.map(item=>typeof item==='string'?item:item?.error||item?.message||'Erreur de ligne').filter(Boolean):[];
const addPreviewLine=(tag,text,className='')=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;preview.append(node);return node};
const resetAnalysis=()=>{source.analysis=null;importButton.disabled=true;preview.replaceChildren();preview.textContent='Aucun contenu à analyser.'};
const setSource=(text,label)=>{source.text=String(text||'');source.label=label||'';resetAnalysis();analyzeButton.disabled=!source.text.trim()||!premiumAllowed};
const selectedFile=()=>input.files?.item?.(0)||input.files?.[0]||null;

const renderPreview=result=>{
  preview.replaceChildren();
  if(result?.valid){
    addPreviewLine('strong',(Number(result.rows)||0)+' albums détectés');
    addPreviewLine('span',(Number(result.isbnPresent)||0)+' ISBN · '+(Number(result.duplicateIsbnGroups)||0)+' groupe(s) d’ISBN partagé(s) · '+(Number(result.ignoredRows)||0)+' ligne(s) ignorée(s)');
    const warnings=messages(result.errors);
    if(warnings.length)addPreviewLine('span',warnings.join(' '),'error');
    return;
  }
  addPreviewLine('strong','CSV BDGest non reconnu');
  addPreviewLine('span',messages(result?.errors).join(' ')||'Vérifiez le fichier sélectionné.','error');
};

const readCapabilities=async()=>{
  try{
    const response=await fetch('/api/capabilities',{cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    capabilitiesReady=response.ok;
    premiumAllowed=response.ok&&data.plan==='premium'&&Array.isArray(data.features)&&data.features.includes('bulk_import');
    if(premiumAllowed){
      licenseStatus.textContent='Licence Premium active · import BDGest disponible.';
      licenseStatus.dataset.state='success';
      analyzeButton.disabled=!source.text.trim();
    }else{
      licenseStatus.textContent=response.ok?'L’import BDGest nécessite une licence Premium active.':'Impossible de vérifier la licence sur le serveur.';
      licenseStatus.dataset.state='error';
      analyzeButton.disabled=true;
    }
  }catch(error){
    capabilitiesReady=false;
    premiumAllowed=false;
    licenseStatus.textContent='Impossible de vérifier la licence sur le serveur.';
    licenseStatus.dataset.state='error';
    analyzeButton.disabled=true;
  }
};

const loadFile=async file=>{
  const sequence=++source.sequence;
  source.analysis=null;
  importButton.disabled=true;
  analyzeButton.disabled=true;
  if(!file){
    fileName.textContent='Aucun fichier choisi.';
    input.setCustomValidity('');
    setSource('','');
    setStatus('Choisissez un fichier CSV BDGest.');
    return;
  }
  fileName.textContent=file.name;
  if(!isBdgestCsv(file)){
    input.value='';
    fileName.textContent='Aucun fichier choisi.';
    input.setCustomValidity('Le fichier sélectionné doit être un CSV.');
    setSource('','');
    setStatus('Le fichier sélectionné doit être un CSV.','error');
    return;
  }
  if(file.size>5000000){
    input.value='';
    fileName.textContent='Aucun fichier choisi.';
    input.setCustomValidity('Le fichier dépasse 5 Mo.');
    setSource('','');
    setStatus('Fichier trop volumineux (5 Mo maximum).','error');
    return;
  }
  input.setCustomValidity('');
  source.reading=true;
  setStatus('Lecture locale de '+file.name+'…');
  try{
    const text=await readBdgestFile(file);
    if(sequence!==source.sequence)return;
    if(!text.trim())throw new Error('Le fichier CSV est vide.');
    setSource(text,file.name);
    fileName.textContent='Fichier sélectionné : '+file.name;
    setStatus(premiumAllowed?'Fichier prêt. Cliquez sur « Analyser ».':'Fichier lu. Une licence Premium est requise pour analyser.');
  }catch(error){
    if(sequence===source.sequence){
      input.value='';
      fileName.textContent='Aucun fichier choisi.';
      setSource('','');
      setStatus(error.message||'Lecture du fichier impossible.','error');
    }
  }finally{
    if(sequence===source.sequence)source.reading=false;
  }
};

input.addEventListener('change',()=>void loadFile(selectedFile()));
['dragenter','dragover'].forEach(eventName=>picker.addEventListener(eventName,event=>{
  event.preventDefault();
  picker.classList.add('drag-over');
}));
['dragleave','drop'].forEach(eventName=>picker.addEventListener(eventName,event=>{
  event.preventDefault();
  picker.classList.remove('drag-over');
}));
picker.addEventListener('drop',event=>void loadFile(event.dataTransfer?.files?.[0]));

analyzeButton.addEventListener('click',async()=>{
  if(!capabilitiesReady){setStatus('Vérification de la licence en cours.');return}
  if(!premiumAllowed){setStatus('Import massif réservé au Premium.','error');return}
  if(source.reading||!source.text.trim()){setStatus('Choisissez un fichier CSV BDGest.');return}
  analyzeButton.disabled=true;
  importButton.disabled=true;
  setStatus('Analyse du format BDGest…');
  try{
    const response=await fetch('/api/import/bdgest/preview',{method:'POST',headers:{'content-type':'text/csv'},body:source.text});
    const data=await response.json().catch(()=>({}));
    const result=data.preview||data;
    renderPreview(result);
    if(!response.ok)throw Object.assign(new Error(data.error||('HTTP '+response.status)),{status:response.status});
    if(!result.valid)throw Object.assign(new Error(messages(result.errors)[0]||'CSV BDGest invalide'),{status:400});
    source.analysis=result;
    importButton.disabled=false;
    setStatus((Number(result.rows)||0)+' albums prêts à importer. Vérifiez l’aperçu puis cliquez sur « Importer ».');
  }catch(error){
    source.analysis=null;
    importButton.disabled=true;
    analyzeButton.disabled=!source.text.trim()||!premiumAllowed;
    setStatus(error.status===402?'Import massif réservé au Premium':error.status===404?'Le contrôle BDGest est indisponible.':'Analyse impossible : '+(error.message||'erreur inconnue'),'error');
  }
});

form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!premiumAllowed){setStatus('Import massif réservé au Premium.','error');return}
  if(!source.analysis?.valid){setStatus('Analysez le CSV avant de lancer l’import.');return}
  analyzeButton.disabled=true;
  importButton.disabled=true;
  setStatus('Import en cours…');
  try{
    const response=await fetch('/api/import/bdgest',{method:'POST',headers:{'content-type':'text/csv'},body:source.text});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(new Error(data.error||('HTTP '+response.status)),{status:response.status});
    if(data.errors?.length||data.skipped){
      renderPreview({valid:false,errors:data.errors});
      analyzeButton.disabled=false;
      setStatus((Number(data.imported)||0)+' album(s) importé(s), '+(Number(data.skipped)||0)+' rejeté(s). Corrigez le fichier puis recommencez.','error');
      return;
    }
    renderPreview({valid:true,rows:data.imported||0,isbnPresent:data.imported||0,duplicateIsbnGroups:0,ignoredRows:data.skipped||0});
    setStatus('Import terminé : '+(Number(data.imported)||0)+' album(s) ajouté(s).'+(data.coverSearchStarted?' Recherche automatique des couvertures lancée.':''),'success');
    input.disabled=true;
    analyzeButton.disabled=true;
    importButton.disabled=true;
    resetButton.hidden=false;
  }catch(error){
    importButton.disabled=false;
    analyzeButton.disabled=!source.text.trim()||!premiumAllowed;
    setStatus(error.status===402?'Import massif réservé au Premium':error.message||'Import impossible.','error');
  }
});

resetButton.addEventListener('click',()=>window.location.reload());
void readCapabilities();
