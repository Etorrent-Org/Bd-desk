(()=>{
  const drawer=document.getElementById('drawer');
  const modal=document.getElementById('modal');
  if(!drawer||!modal)return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=v=>v==null?'':String(v).trim();
  const euro=v=>v==null||v===''?'':Number(v).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
  const date=v=>{if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('fr-FR')};
  const row=(label,value)=>clean(value)?`<div class="info-row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`:'';
  const badge=(label,kind='')=>`<span class="detail-badge ${kind}">${esc(label)}</span>`;
  const flash=message=>{let t=document.getElementById('detailFlash');if(!t){t=document.createElement('div');t.id='detailFlash';t.className='toast';document.body.appendChild(t)}t.textContent=message;t.classList.remove('hidden');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.add('hidden'),2200)};

  async function resolveAlbum(){
    const id=drawer.querySelector('[data-detail-album]')?.dataset.detailAlbum || drawer.dataset.albumId;
    if(id){const r=await fetch('/api/albums/'+id);if(r.ok)return r.json()}
    const isbn=[...drawer.querySelectorAll('dt')].find(x=>x.textContent.trim()==='ISBN')?.parentElement?.querySelector('dd')?.textContent.trim();
    if(!isbn||isbn==='—')return null;
    const r=await fetch('/api/albums?search='+encodeURIComponent(isbn)+'&limit=200');if(!r.ok)return null;
    const d=await r.json();return (d.items||[]).find(a=>String(a.isbn||'')===isbn)||null;
  }

  function renderRich(a,provenance=[]){
    drawer.dataset.albumId=a.id;
    const hero=drawer.querySelector('.detail-hero');
    if(hero){
      hero.setAttribute('data-detail-album',a.id);
      const current=hero.querySelector('img,.placeholder');
      const cover=a.cover_url||a.coverUrl;
      if(cover){
        const im=document.createElement('img');im.className='cover-image detail-cover';im.src=cover;im.alt='Couverture '+(a.title||a.series||'album');
        if(current)current.replaceWith(im);else hero.prepend(im);
      }
      const h2=hero.querySelector('h2');if(h2)h2.textContent=a.title||'Sans titre';
      const small=hero.querySelector('small');if(small)small.textContent=a.series||'Sans série';
      const p=hero.querySelector('p');if(p)p.textContent=[a.number?`Tome ${a.number}`:null,a.publisher,a.collection_name].filter(Boolean).join(' · ');
    }

    const body=drawer.querySelector('.detail-body');if(!body)return;
    const old=body.querySelector('.album-rich-detail');if(old)old.remove();
    const legacy=body.querySelector('dl');if(legacy)legacy.hidden=true;
    const authors=[];
    if(clean(a.writer))authors.push(row(a.artist?'Scénario':'Auteur(s)',a.writer));
    if(clean(a.artist))authors.push(row('Dessin',a.artist));
    const editorial=[
      row('ISBN',a.isbn),row('Éditeur',a.publisher),row('Collection',a.collection_name),row('Date',a.print_date||a.legal_deposit),row('Pagination',a.page_count),row('Format',a.format)
    ].join('');
    const personal=[
      row('État',a.condition),row('Prix d’achat',euro(a.purchase_price)),row('Date d’achat',date(a.purchase_date)),row('Valeur estimée',euro(a.market_value))
    ].join('');
    const status=[a.read?badge('Lu','ok'):badge('À lire'),a.wishlist?badge('Wishlist','wish'):'',a.first_edition?badge('Édition originale','gold'):'',a.signed?badge('Dédicacé','gold'):'' ].join('');
    const prov=provenance.length?`<div class="source-list">${provenance.map(p=>`<span>${esc(p.field)} · ${esc(p.source)} · ${Math.round(Number(p.confidence||0)*100)}%</span>`).join('')}</div>`:'';
    const html=`<div class="album-rich-detail">
      <div class="detail-status">${status}</div>
      ${editorial?`<section class="detail-panel"><h3>Informations éditoriales</h3>${editorial}</section>`:''}
      ${authors.length?`<section class="detail-panel"><h3>Créateurs</h3>${authors.join('')}</section>`:''}
      ${clean(a.description)?`<section class="detail-panel detail-summary"><h3>Résumé</h3><p>${esc(a.description)}</p></section>`:''}
      ${personal?`<section class="detail-panel"><h3>Ma collection</h3>${personal}</section>`:''}
      ${(clean(a.comment)||clean(a.note))?`<section class="detail-panel detail-summary"><h3>Notes personnelles</h3><p>${esc(a.comment||a.note)}</p></section>`:''}
      <section class="detail-panel detail-sources"><h3>Métadonnées</h3>${row('Source',a.source||'BD Desk')}${row('Dernière mise à jour',date(a.updated_at))}${prov}</section>
    </div>`;
    const toolbar=body.querySelector('.toolbar');(toolbar||body.firstElementChild)?.insertAdjacentHTML(toolbar?'afterend':'beforebegin',html);
  }

  function openPremiumInfo(){
    modal.innerHTML=`<div class="modal-card premium-info-modal"><div class="premium-lock">✦</div><h2>Enrichissement automatique</h2><p>Cette fonction est incluse dans <b>BD Desk Premium</b>. Elle complète les métadonnées éditoriales et les couvertures sans écraser vos informations personnelles de collection.</p><div class="premium-benefits"><span>Couverture et résumé</span><span>Série, tome et collection</span><span>Sources et provenance</span></div><div class="modal-actions"><button type="button" class="btn" id="stayOnAlbum">Rester sur la fiche</button><button type="button" class="btn primary" id="viewPremium">Voir Premium</button></div></div>`;
    modal.classList.remove('hidden');
    document.getElementById('stayOnAlbum').onclick=()=>modal.classList.add('hidden');
    document.getElementById('viewPremium').onclick=()=>{modal.classList.add('hidden');drawer.classList.add('hidden');document.querySelector('[data-route="settings"]')?.click()};
  }

  async function runEnrichment(){
    const album=await resolveAlbum().catch(()=>null);if(!album){flash('Album introuvable');return}
    const license=await fetch('/api/license').then(r=>r.json()).catch(()=>({plan:'free'}));if(license.plan!=='premium'){openPremiumInfo();return}
    flash('Enrichissement en cours…');
    const r=await fetch('/api/metadata/'+album.id+'/enrich',{method:'POST'});const data=await r.json().catch(()=>({}));
    if(!r.ok){flash(data.error||'Enrichissement impossible');return}
    renderRich(data.album||album,data.provenance||[]);flash(data.changed?'Fiche enrichie':'Aucune donnée fiable supplémentaire');
  }

  function openEdit(a){
    modal.innerHTML=`<div class="modal-card edit-album-modal"><h2>Modifier l’album</h2><p class="muted">Vos données personnelles restent sous votre contrôle.</p><form id="editAlbumForm"><div class="form-grid"><div class="field"><label>Série</label><input name="series" value="${esc(a.series||'')}"></div><div class="field"><label>Tome</label><input name="number" value="${esc(a.number||'')}"></div><div class="field wide"><label>Titre</label><input name="title" value="${esc(a.title||'')}"></div><div class="field"><label>Éditeur</label><input name="publisher" value="${esc(a.publisher||'')}"></div><div class="field"><label>Collection</label><input name="collectionName" value="${esc(a.collection_name||'')}"></div><div class="field"><label>Auteur / scénario</label><input name="writer" value="${esc(a.writer||'')}"></div><div class="field"><label>Dessin</label><input name="artist" value="${esc(a.artist||'')}"></div><div class="field"><label>Format</label><input name="format" value="${esc(a.format||'')}"></div><div class="field"><label>État</label><input name="condition" value="${esc(a.condition||'')}"></div><div class="field wide"><label>Couverture (URL)</label><input name="coverUrl" value="${esc(a.cover_url||'')}"></div><div class="field wide"><label>Résumé</label><textarea name="description" rows="5">${esc(a.description||'')}</textarea></div><div class="field"><label>Prix d’achat (€)</label><input name="purchasePrice" type="number" step="0.01" value="${a.purchase_price??''}"></div><div class="field"><label>Valeur estimée (€)</label><input name="marketValue" type="number" step="0.01" value="${a.market_value??''}"></div><div class="field wide check-field"><label><input name="firstEdition" type="checkbox" ${a.first_edition?'checked':''}> Édition originale</label></div><div class="field wide"><label>Commentaire personnel</label><textarea name="comment" rows="4">${esc(a.comment||'')}</textarea></div></div><div class="modal-actions"><button type="button" class="btn" id="cancelEditAlbum">Annuler</button><button class="btn primary">Enregistrer</button></div></form></div>`;
    modal.classList.remove('hidden');document.getElementById('cancelEditAlbum').onclick=()=>modal.classList.add('hidden');
    document.getElementById('editAlbumForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const payload={series:f.get('series'),number:f.get('number'),title:f.get('title'),publisher:f.get('publisher'),collectionName:f.get('collectionName'),writer:f.get('writer'),artist:f.get('artist'),format:f.get('format'),condition:f.get('condition'),coverUrl:f.get('coverUrl'),description:f.get('description'),purchasePrice:f.get('purchasePrice')===''?null:Number(f.get('purchasePrice')),marketValue:f.get('marketValue')===''?null:Number(f.get('marketValue')),firstEdition:f.get('firstEdition')==='on',comment:f.get('comment')};const r=await fetch('/api/albums/'+a.id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});if(!r.ok){flash('Impossible d’enregistrer');return}const updated=await r.json();modal.classList.add('hidden');renderRich(updated);flash('Album mis à jour')};
  }

  async function enhance(){
    if(drawer.classList.contains('hidden'))return;
    const body=drawer.querySelector('.detail-body'),toolbar=body?.querySelector('.toolbar');if(!body||!toolbar)return;
    if(!document.getElementById('editAlbumBtn')){const edit=document.createElement('button');edit.className='btn';edit.id='editAlbumBtn';edit.textContent='✎ Modifier';const enrich=document.getElementById('enrichBtn');if(enrich){enrich.innerHTML='✦ Enrichir <span class="premium-chip">Premium</span>';toolbar.insertBefore(edit,enrich)}else toolbar.appendChild(edit);edit.onclick=async()=>{const a=await resolveAlbum().catch(()=>null);if(a)openEdit(a)}}
    const album=await resolveAlbum().catch(()=>null);if(album)renderRich(album);
  }

  drawer.addEventListener('click',e=>{const b=e.target.closest?.('#enrichBtn');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();runEnrichment()},true);
  const observer=new MutationObserver(()=>queueMicrotask(enhance));observer.observe(drawer,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
