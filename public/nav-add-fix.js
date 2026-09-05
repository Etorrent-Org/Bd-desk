(()=>{
  window.__BD_ADD_FLOW_VERSION='2026-09-02.5';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast=message=>{
    const t=document.getElementById('toast');
    if(!t)return;
    t.textContent=message;t.classList.remove('hidden');
    clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.add('hidden'),2400);
  };
  async function openCameraScanner(){
    if(window.BDDeskScanner?.open){window.BDDeskScanner.open('add');return;}
    try{
      await new Promise((resolve,reject)=>{
        const existing=document.querySelector('script[data-bd-scanner-loader]');
        if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
        const s=document.createElement('script');s.dataset.bdScannerLoader='1';s.src='/ean-scanner.js?v=20260905-3';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
      });
      if(window.BDDeskScanner?.open)window.BDDeskScanner.open('add');
      else toast('Scanner caméra indisponible');
    }catch{toast('Impossible de charger le scanner caméra');}
  }
  function resolvedValue(resolution,field){
    return resolution?.fields?.[field]?.value??null;
  }
  function mergeDiscovered(payload){
    const resolution=payload?.resolution||{};
    return {
      title:resolvedValue(resolution,'title'),
      publisher:resolvedValue(resolution,'publisher'),
      series:resolvedValue(resolution,'series'),
      seriesNumber:resolvedValue(resolution,'number'),
      collection:resolvedValue(resolution,'collectionName'),
      authors:resolvedValue(resolution,'writer')
    };
  }
  function openAdd(isbn=''){
    const modal=document.getElementById('modal');
    if(!modal)return;
    let discoveredMeta=null,lookupToken=0,lookupTimer=null;
    modal.innerHTML=`<div class="modal-card add-album-modal"><h2>Ajouter un album</h2><p class="muted">Ajout manuel, avec recherche automatique après scan ISBN/EAN.</p><form id="mobileAddForm"><div class="form-grid"><div class="field wide"><label>ISBN / EAN</label><div class="input-action"><input name="isbn" id="addIsbn" inputmode="numeric" value="${esc(isbn)}" placeholder="978…"><button type="button" class="btn" id="mobileAddScan">Scanner</button><button type="button" class="btn" id="mobileAddLookup">Rechercher</button></div><small id="isbnLookupStatus" class="muted" style="min-height:1.25em"></small><small class="muted" style="font-size:10px">Flux ISBN v2026.09.05.3</small></div><div class="field"><label>Série</label><input name="series" id="addSeries" required></div><div class="field"><label>Tome</label><input name="number" id="addNumber"></div><div class="field wide"><label>Titre</label><input name="title" id="addTitle" required></div><div class="field"><label>Éditeur</label><input name="publisher" id="addPublisher"></div><div class="field"><label>Collection</label><input name="collectionName" id="addCollection"></div><div class="field wide"><label>Auteur(s)</label><input name="writer" id="addAuthors" placeholder="Nom ; Nom"></div><div class="field"><label>Prix d’achat (€)</label><input name="purchasePrice" type="number" step="0.01"></div></div><div class="modal-actions"><button type="button" class="btn" id="mobileAddCancel">Annuler</button><button class="btn primary">Ajouter à ma collection</button></div></form></div>`;
    modal.classList.remove('hidden');
    const isbnInput=document.getElementById('addIsbn'),status=document.getElementById('isbnLookupStatus');
    const lookup=async()=>{
      const value=isbnInput.value.replace(/[^0-9Xx]/g,'');
      if(![10,13].includes(value.length)){status.textContent='Saisissez ou scannez un ISBN/EAN valide.';discoveredMeta=null;return;}
      const token=++lookupToken;status.textContent='Recherche du catalogue officiel et des sources bibliographiques…';
      try{
        const r=await fetch('/api/discover?isbn='+encodeURIComponent(value),{cache:'no-store'});
        const body=await r.json().catch(()=>({}));
        if(token!==lookupToken)return;
        if(!r.ok)throw new Error(body.error||'Recherche impossible');
        const candidates=Array.isArray(body.candidates)?body.candidates:[];
        if(!candidates.length){status.textContent='ISBN reconnu, mais aucune métadonnée trouvée. Saisie manuelle possible.';discoveredMeta=null;return;}
        const merged=mergeDiscovered(body);
        discoveredMeta={...merged,source:'isbn-discover'};
        const titleInput=document.getElementById('addTitle'),publisherInput=document.getElementById('addPublisher'),seriesInput=document.getElementById('addSeries'),numberInput=document.getElementById('addNumber'),collectionInput=document.getElementById('addCollection'),authorsInput=document.getElementById('addAuthors');
        if(merged.title)titleInput.value=merged.title;
        if(merged.publisher)publisherInput.value=merged.publisher;
        if(merged.series)seriesInput.value=Array.isArray(merged.series)?merged.series[0]:merged.series;
        if(merged.seriesNumber!=null&&merged.seriesNumber!=='')numberInput.value=String(merged.seriesNumber);
        if(merged.collection)collectionInput.value=merged.collection;
        if(merged.authors)authorsInput.value=(Array.isArray(merged.authors)?merged.authors:[merged.authors]).join('; ');
        const sourceLabels=candidates.map(c=>c.source==='hachette'?'Glénat / Hachette':c.source==='google-books'?'Google Books':c.source==='open-library'?'Open Library':c.source==='bnf'||c.source==='bnf-intermarc'?'BnF':c.source).filter(Boolean);
        const sources=[...new Set(sourceLabels)];
        const detected=[];
        if(merged.series)detected.push(`Série ${Array.isArray(merged.series)?merged.series[0]:merged.series}`);
        if(merged.seriesNumber!=null&&merged.seriesNumber!=='')detected.push(`Tome ${merged.seriesNumber}`);
        if(merged.collection)detected.push(`Collection ${merged.collection}`);
        if(merged.authors?.length)detected.push('auteur');
        status.textContent=`Métadonnées trouvées${sources.length?' · '+sources.join(' + '):''}${detected.length?' · '+detected.join(' · '):''}. Vérifiez avant ajout.`;
      }catch(e){if(token===lookupToken){status.textContent='Erreur : '+(e.message||'recherche de métadonnées impossible');discoveredMeta=null;}}
    };
    const lookupScannedCode=code=>{
      const value=String(code||'').replace(/[^0-9Xx]/g,'');
      if(![10,13].includes(value.length)){status.textContent='EAN scanné invalide.';return;}
      isbnInput.value=value;
      status.textContent='EAN scanné · lancement de la recherche…';
      clearTimeout(lookupTimer);
      lookupTimer=setTimeout(()=>void lookup(),30);
      isbnInput.focus();
    };
    window.BDDeskAddLookup=lookupScannedCode;
    const cleanup=()=>{if(window.BDDeskAddLookup===lookupScannedCode)delete window.BDDeskAddLookup;};
    isbnInput.addEventListener('input',()=>{clearTimeout(lookupTimer);lookupTimer=setTimeout(()=>void lookup(),220)});
    isbnInput.addEventListener('change',()=>{clearTimeout(lookupTimer);lookupTimer=setTimeout(()=>void lookup(),30)});
    if(isbn){lookupTimer=setTimeout(()=>void lookup(),80)}
    document.getElementById('mobileAddLookup').onclick=()=>void lookup();
    document.getElementById('mobileAddCancel').onclick=()=>{cleanup();modal.classList.add('hidden')};
    document.getElementById('mobileAddScan').onclick=openCameraScanner;
    document.getElementById('mobileAddForm').onsubmit=async e=>{
      e.preventDefault();
      const data=Object.fromEntries(new FormData(e.currentTarget));
      data.purchasePrice=data.purchasePrice?Number(data.purchasePrice):null;
      if(discoveredMeta)data.source=discoveredMeta.source;
      const r=await fetch('/api/albums',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
      const body=await r.json().catch(()=>({}));
      if(!r.ok){toast(body.error||'Impossible d’ajouter cet album');return;}
      cleanup();modal.classList.add('hidden');
      toast('Album ajouté à la collection');
      location.hash='#collection';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    };
  }
  window.BDDeskOpenAdd=openAdd;
  document.addEventListener('click',e=>{
    const candidate=e.target.closest?.('[data-add-candidate]');
    if(candidate){
      const isbn=String(document.getElementById('discoverIsbn')?.value||'').replace(/[^0-9Xx]/g,'');
      if([10,13].includes(isbn.length)){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        openAdd(isbn);return;
      }
    }
    const button=e.target.closest?.('[data-route="add"],#homeAdd,#fab');
    if(!button)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    openAdd();
  },true);
})();
