(()=>{
  const attempted=new Set();
  const text=v=>String(v??'').trim();
  function localCover(im,data={}){
    const p=document.createElement('div');p.className='placeholder cover-fallback';
    const host=im.closest?.('[data-album],.resume,.detail-hero');
    const guessed=window.BDDeskExperience?.infoFromHost?.(host,'BD')||{};
    const payload={series:data.series||guessed.series||'BD Desk',title:data.title||guessed.title||text(im.alt).replace(/^Couverture(?: de)?\s*/i,'')||'Album',number:data.number||guessed.number||'',publisher:data.publisher||''};
    im.replaceWith(p);
    if(window.BDDeskExperience?.makeCover)window.BDDeskExperience.makeCover(p,payload);else{p.textContent=payload.title;p.dataset.enhanced='1'}
    return p;
  }
  const valid=v=>{try{const u=new URL(v,location.href);return u.protocol==='https:'?u.href:null}catch{return null}};
  function probe(src){return new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(true);i.onerror=()=>resolve(false);i.src=src})}
  async function recover(im){
    const host=im.closest('[data-album]');
    const id=host?.dataset?.album;
    if(!id||attempted.has(id))return localCover(im);
    attempted.add(id);
    try{
      const album=await fetch('/api/albums/'+encodeURIComponent(id),{cache:'no-store'}).then(r=>r.ok?r.json():null);
      if(!album)return localCover(im);
      if(!album.isbn)return localCover(im,album);
      const d=await fetch('/api/discover?isbn='+encodeURIComponent(album.isbn),{cache:'no-store'}).then(r=>r.ok?r.json():null);
      const current=valid(im.currentSrc||im.src);
      const urls=[...new Set((d?.candidates||[]).map(c=>valid(c.coverUrl||c.cover_url)).filter(Boolean))].filter(x=>x!==current);
      for(const src of urls){if(!(await probe(src)))continue;im.src=src;if(!album.cover_url&&!album.coverUrl)fetch('/api/albums/'+id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({coverUrl:src})}).catch(()=>{});return}
      localCover(im,album);
    }catch{localCover(im)}
  }
  document.addEventListener('error',e=>{const im=e.target;if(!(im instanceof HTMLImageElement)||!im.classList.contains('cover-image'))return;recover(im)},true);
})();
