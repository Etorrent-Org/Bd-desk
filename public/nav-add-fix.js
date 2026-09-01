(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast=message=>{
    const t=document.getElementById('toast');
    if(!t)return;
    t.textContent=message;t.classList.remove('hidden');
    clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.add('hidden'),2400);
  };
  function openManualScanner(target){
    const modal=document.getElementById('modal');
    modal.innerHTML=`<div class="modal-card"><h2>Scanner ISBN / EAN</h2><p>Si le scan caméra n’est pas disponible dans ce navigateur, saisissez simplement le code.</p><div class="field"><label>ISBN / EAN</label><input id="manualScanValue" inputmode="numeric" placeholder="978…"></div><div class="modal-actions"><button type="button" class="btn" id="scanCancel">Annuler</button><button type="button" class="btn primary" id="scanUse">Utiliser</button></div></div>`;
    modal.classList.remove('hidden');
    document.getElementById('scanCancel').onclick=()=>modal.classList.add('hidden');
    document.getElementById('scanUse').onclick=()=>{
      const value=document.getElementById('manualScanValue').value.trim();
      if(!value)return;
      modal.classList.add('hidden');
      openAdd(value);
      const input=document.getElementById('addIsbn');if(input)input.value=value;
      if(target)target.value=value;
    };
  }
  function openAdd(isbn=''){
    const modal=document.getElementById('modal');
    if(!modal)return;
    modal.innerHTML=`<div class="modal-card add-album-modal"><h2>Ajouter un album</h2><p class="muted">Ajout manuel, avec scan ISBN/EAN si besoin.</p><form id="mobileAddForm"><div class="form-grid"><div class="field wide"><label>ISBN / EAN</label><div class="input-action"><input name="isbn" id="addIsbn" inputmode="numeric" value="${esc(isbn)}" placeholder="978…"><button type="button" class="btn" id="mobileAddScan">Scanner</button></div></div><div class="field"><label>Série</label><input name="series" required></div><div class="field"><label>Tome</label><input name="number"></div><div class="field wide"><label>Titre</label><input name="title" required></div><div class="field"><label>Éditeur</label><input name="publisher"></div><div class="field"><label>Prix d’achat (€)</label><input name="purchasePrice" type="number" step="0.01"></div></div><div class="modal-actions"><button type="button" class="btn" id="mobileAddCancel">Annuler</button><button class="btn primary">Ajouter à ma collection</button></div></form></div>`;
    modal.classList.remove('hidden');
    document.getElementById('mobileAddCancel').onclick=()=>modal.classList.add('hidden');
    document.getElementById('mobileAddScan').onclick=()=>openManualScanner(document.getElementById('addIsbn'));
    document.getElementById('mobileAddForm').onsubmit=async e=>{
      e.preventDefault();
      const data=Object.fromEntries(new FormData(e.currentTarget));
      data.purchasePrice=data.purchasePrice?Number(data.purchasePrice):null;
      const r=await fetch('/api/albums',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
      const body=await r.json().catch(()=>({}));
      if(!r.ok){toast(body.error||'Impossible d’ajouter cet album');return;}
      modal.classList.add('hidden');
      toast('Album ajouté à la collection');
      location.hash='#collection';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    };
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-route="add"]');
    if(!button)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    openAdd();
  },true);
})();
