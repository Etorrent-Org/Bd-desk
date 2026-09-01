(()=>{
  const drawer=document.getElementById('drawer');
  const modal=document.getElementById('modal');
  if(!drawer||!modal)return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const euro=v=>v==null||v===''?'—':Number(v).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
  const flash=message=>{
    let t=document.getElementById('detailFlash');
    if(!t){t=document.createElement('div');t.id='detailFlash';t.className='toast';document.body.appendChild(t)}
    t.textContent=message;t.classList.remove('hidden');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.add('hidden'),2200);
  };
  const fieldValue=label=>{
    const dt=[...drawer.querySelectorAll('dt')].find(x=>x.textContent.trim()===label);
    return dt?.parentElement?.querySelector('dd')?.textContent.trim()||'';
  };
  const setField=(label,value)=>{
    const dt=[...drawer.querySelectorAll('dt')].find(x=>x.textContent.trim()===label);
    const dd=dt?.parentElement?.querySelector('dd');if(dd)dd.textContent=value;
  };
  async function resolveAlbum(){
    const isbn=fieldValue('ISBN');
    if(!isbn||isbn==='—')return null;
    const r=await fetch('/api/albums?search='+encodeURIComponent(isbn)+'&limit=200');
    if(!r.ok)return null;
    const data=await r.json();
    let items=(data.items||[]).filter(a=>String(a.isbn||'')===isbn);
    if(items.length===1)return items[0];
    const title=drawer.querySelector('.detail-hero h2')?.textContent.trim()||'';
    const series=drawer.querySelector('.detail-hero small')?.textContent.trim()||'';
    const meta=drawer.querySelector('.detail-hero p')?.textContent.trim()||'';
    const m=meta.match(/^Tome\s+([^·]+?)(?:\s*·|$)/i);const number=m?.[1]?.trim()||null;
    const exact=items.filter(a=>String(a.title||'')===title&&String(a.series||'')===series&&(!number||String(a.number||'')===number));
    return exact.length===1?exact[0]:items[0]||null;
  }
  function updateVisible(a){
    const title=drawer.querySelector('.detail-hero h2');if(title)title.textContent=a.title||'Sans titre';
    const series=drawer.querySelector('.detail-hero small');if(series)series.textContent=a.series||'Sans série';
    const meta=drawer.querySelector('.detail-hero p');if(meta)meta.textContent=`${a.number?`Tome ${a.number}`:'Album'} · ${a.publisher||''}`;
    setField('Éditeur',a.publisher||'—');setField('Scénario',a.writer||'—');setField('Dessin',a.artist||'—');
    setField('Édition originale',a.first_edition?'Oui':'Non / inconnue');setField('Prix d’achat',euro(a.purchase_price));
  }
  function openEdit(a){
    modal.innerHTML=`<div class="modal-card edit-album-modal"><h2>Modifier l’album</h2><p class="muted">Les données personnelles ne sont modifiées que par vous.</p><form id="editAlbumForm"><div class="form-grid"><div class="field"><label>Série</label><input name="series" value="${esc(a.series||'')}"></div><div class="field"><label>Tome</label><input name="number" value="${esc(a.number||'')}"></div><div class="field wide"><label>Titre</label><input name="title" value="${esc(a.title||'')}"></div><div class="field"><label>Éditeur</label><input name="publisher" value="${esc(a.publisher||'')}"></div><div class="field"><label>Scénario</label><input name="writer" value="${esc(a.writer||'')}"></div><div class="field"><label>Dessin</label><input name="artist" value="${esc(a.artist||'')}"></div><div class="field"><label>Prix d’achat (€)</label><input name="purchasePrice" type="number" step="0.01" value="${a.purchase_price??''}"></div><div class="field"><label>Valeur estimée (€)</label><input name="marketValue" type="number" step="0.01" value="${a.market_value??''}"></div><div class="field wide check-field"><label><input name="firstEdition" type="checkbox" ${a.first_edition?'checked':''}> Édition originale</label></div><div class="field wide"><label>Commentaire personnel</label><textarea name="comment" rows="4">${esc(a.comment||'')}</textarea></div></div><div class="modal-actions"><button type="button" class="btn" id="cancelEditAlbum">Annuler</button><button class="btn primary">Enregistrer</button></div></form></div>`;
    modal.classList.remove('hidden');
    document.getElementById('cancelEditAlbum').onclick=()=>modal.classList.add('hidden');
    document.getElementById('editAlbumForm').onsubmit=async e=>{
      e.preventDefault();const f=new FormData(e.currentTarget);
      const payload={series:f.get('series'),number:f.get('number'),title:f.get('title'),publisher:f.get('publisher'),writer:f.get('writer'),artist:f.get('artist'),purchasePrice:f.get('purchasePrice')===''?null:Number(f.get('purchasePrice')),marketValue:f.get('marketValue')===''?null:Number(f.get('marketValue')),firstEdition:f.get('firstEdition')==='on',comment:f.get('comment')};
      const r=await fetch('/api/albums/'+a.id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok){flash('Impossible d’enregistrer');return}
      const updated=await r.json();modal.classList.add('hidden');updateVisible(updated);flash('Album mis à jour');
    };
  }
  async function enhance(){
    if(drawer.classList.contains('hidden'))return;
    const body=drawer.querySelector('.detail-body'),toolbar=body?.querySelector('.toolbar');
    if(!body||!toolbar||body.dataset.polished==='1')return;
    body.dataset.polished='1';toolbar.classList.add('detail-actions');
    const enrich=document.getElementById('enrichBtn');
    if(enrich){enrich.innerHTML='✦ Enrichir <span class="premium-chip">Premium</span>';}
    const edit=document.createElement('button');edit.className='btn';edit.id='editAlbumBtn';edit.textContent='✎ Modifier';
    if(enrich)toolbar.insertBefore(edit,enrich);else toolbar.appendChild(edit);
    const dl=body.querySelector('dl');if(dl)dl.insertAdjacentHTML('beforebegin','<div class="detail-section-title">Informations</div>');
    edit.onclick=async()=>{edit.disabled=true;const album=await resolveAlbum().catch(()=>null);edit.disabled=false;if(!album){flash('Album introuvable');return}openEdit(album)};
  }
  const observer=new MutationObserver(()=>queueMicrotask(enhance));
  observer.observe(drawer,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
