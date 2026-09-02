(()=>{
  const attempted=new Set();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function placeholder(im,label){
    const p=document.createElement('div');p.className='placeholder cover-fallback';p.innerHTML=`<span>${esc((label||'BD').slice(0,36))}</span>`;im.replaceWith(p);
  }
  async function recover(im){
    const host=im.closest('[data-album]');
    const id=host?.dataset?.album;
    const label=(im.getAttribute('alt')||'').replace(/^Couverture\s*/i,'').trim()||'BD';
    if(!id||attempted.has(id)) return placeholder(im,label);
    attempted.add(id);
    try{
      const album=await fetch('/api/albums/'+encodeURIComponent(id)).then(r=>r.ok?r.json():null);
      if(!album?.isbn) return placeholder(im,label);
      const d=await fetch('/api/discover?isbn='+encodeURIComponent(album.isbn)).then(r=>r.ok?r.json():null);
      const candidates=d?.candidates||[];
      const google=candidates.find(x=>x.source==='google-books'&&x.coverUrl)?.coverUrl;
      const open=candidates.find(x=>x.source==='open-library'&&x.coverUrl)?.coverUrl;
      const next=google||open;
      if(!next) return placeholder(im,label);
      const probe=new Image();
      probe.onload=async()=>{
        im.src=next;
        try{await fetch('/api/albums/'+id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({coverUrl:next})})}catch{}
      };
      probe.onerror=()=>placeholder(im,label);
      probe.src=next;
    }catch{return placeholder(im,label)}
  }
  document.addEventListener('error',e=>{
    const im=e.target;
    if(!(im instanceof HTMLImageElement)||!im.classList.contains('cover-image'))return;
    recover(im);
  },true);
})();
