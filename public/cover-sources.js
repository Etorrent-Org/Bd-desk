(()=>{
  const queued=new Set();
  const completed=new Set();
  const queue=[];
  let active=0;
  const MAX_CONCURRENCY=2;
  const text=v=>String(v??'').trim();
  const canonical=v=>text(v).replace(/[^0-9X]/gi,'').toUpperCase();
  const dateFr=()=>new Date().toLocaleDateString('fr-FR');

  function sourcesFor(isbn){
    const n=canonical(isbn);
    if(!n)return [];
    return [
      {
        source:'bnf',
        url:`https://openapi.bnf.fr/couverture/image/image/recupererImage?EAN=${encodeURIComponent(n)}&couverture=1&taille=originale&largeur=900&hauteur=1400`
      },
      {
        source:'open-library',
        url:`https://covers.openlibrary.org/b/isbn/${encodeURIComponent(n)}-L.jpg?default=false`
      }
    ];
  }

  function probe(url){
    return new Promise(resolve=>{
      const im=new Image();
      im.onload=()=>resolve(im.naturalWidth>=120&&im.naturalHeight>=160);
      im.onerror=()=>resolve(false);
      im.src=url;
    });
  }

  async function hydrate(host){
    const id=host?.dataset?.album;
    if(!id||completed.has(id))return;
    const placeholder=host.querySelector('.placeholder,.cover-fallback,.editorial-cover');
    if(!placeholder)return;
    completed.add(id);
    try{
      const album=await fetch('/api/albums/'+encodeURIComponent(id),{cache:'no-store'}).then(r=>r.ok?r.json():null);
      if(!album?.isbn)return;
      for(const candidate of sourcesFor(album.isbn)){
        if(!(await probe(candidate.url)))continue;
        if(!placeholder.isConnected)return;
        const im=document.createElement('img');
        im.className='cover-image';
        im.loading='lazy';
        im.decoding='async';
        im.alt=`Couverture de ${text(album.title)||text(album.series)||'album'}`;
        im.src=candidate.url;
        im.dataset.coverSource=candidate.source;
        im.title=candidate.source==='bnf'
          ?`Source : Bibliothèque nationale de France · récupérée le ${dateFr()}`
          :'Source : Open Library';
        placeholder.replaceWith(im);
        if(album.cover_url!==candidate.url&&album.coverUrl!==candidate.url){
          fetch('/api/albums/'+encodeURIComponent(id),{
            method:'PATCH',
            headers:{'content-type':'application/json'},
            body:JSON.stringify({coverUrl:candidate.url})
          }).catch(()=>{});
        }
        return;
      }
    }catch{}
  }

  function pump(){
    while(active<MAX_CONCURRENCY&&queue.length){
      const host=queue.shift();
      active++;
      hydrate(host).finally(()=>{active--;pump()});
    }
  }

  function enqueue(host){
    const id=host?.dataset?.album;
    if(!id||queued.has(id)||completed.has(id))return;
    queued.add(id);
    queue.push(host);
    pump();
  }

  const io=('IntersectionObserver'in window)?new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      io.unobserve(entry.target);
      enqueue(entry.target);
    }
  },{rootMargin:'320px'}):null;

  function scan(root=document){
    const hosts=[];
    if(root instanceof Element&&root.matches?.('[data-album]'))hosts.push(root);
    root.querySelectorAll?.('[data-album]').forEach(h=>hosts.push(h));
    for(const host of hosts){
      if(host.querySelector('.cover-image'))continue;
      if(!host.querySelector('.placeholder,.cover-fallback,.editorial-cover'))continue;
      if(io)io.observe(host);else enqueue(host);
    }
  }

  let raf=0;
  const mo=new MutationObserver(records=>{
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      for(const record of records)for(const node of record.addedNodes)if(node instanceof Element)scan(node);
      scan();
    });
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('pageshow',()=>scan());
  document.addEventListener('DOMContentLoaded',()=>scan(),{once:true});
  scan();

  window.BDDeskCoverSources={sourcesFor};
})();
