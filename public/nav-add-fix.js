(()=>{
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
        const s=document.createElement('script');s.dataset.bdScannerLoader='1';s.src='/ean-scanner.js?v=20260901-4';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
      });
      if(window.BDDeskScanner?.open)window.BDDeskScanner.open('add');
      else toast('Scanner caméra indisponible');
    }catch{toast('Impossible de charger le scanner caméra');}
  }
  function openAdd(isbn=''){
    const modal=document.getElementById('modal');
    if(!modal)return;
    modal.innerHTML=`<div class="modal-card add-album-modal"><h2>Ajouter un album</h2><p class="muted">Ajout manuel, avec scan ISBN/EAN si besoin.</p><form id="mobileAddForm"><div class="form-grid"><div class="field wide"><label>ISBN / EAN</label><div class="input-action"><input name="isbn" id="addIsbn" inputmode="numeric" value="${esc(isbn)}" placeholder="978…"><button type="button" class="btn" id="mobileAddScan">Scanner</button></div></div><div class="field"><label>Série</label><input name="series" required></div><div class="field"><label>Tome</label><input name="number"></div><div class="field wide"><label>Titre</label><input name="title" required></div><div class="field"><label>Éditeur</label><input name="publisher"></div><div class="field"><label>Prix d’achat (€)</label><input name="purchasePrice" type="number" step="0.01"></div></div><div class="modal-actions"><button type="button" class="btn" id="mobileAddCancel">Annuler</button><button class="btn primary">Ajouter à ma collection</button></div></form></div>`;
    modal.classList.remove('hidden');
    document.getElementById('mobileAddCancel').onclick=()=>modal.classList.add('hidden');
    document.getElementById('mobileAddScan').onclick=openCameraScanner;
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
