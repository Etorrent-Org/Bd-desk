(()=>{
  const queued=new Set();
  const completed=new Set();
  const queue=[];
  let active=0;
  const MAX_CONCURRENCY=2;
  const text=value=>String(value??'').trim();
  const canonical=value=>text(value).replace(/[^0-9X]/gi,'').toUpperCase();
  const dateFr=()=>new Date().toLocaleDateString('fr-FR');
  const hostId=host=>host?.dataset?.album||host?.dataset?.detailAlbum||null;
  const displayUrl=album=>{const src=album?.cover_url||album?.coverUrl;const id=album?.id||album?.albumId;const machine=album?.cover_origin==='machine'||album?.coverOrigin==='machine';return src&&machine&&id?'/covers/'+encodeURIComponent(id)+'.svg':src||null};

  function sourcesFor(isbn){
    const n=canonical(isbn);
    if(!n)return [];
    return [{
      source:'bnf',
      url:'https://openapi.bnf.fr/couverture/image/image/recupererImage?EAN='+encodeURIComponent(n)+'&couverture=1&taille=originale&largeur=900&hauteur=1400',
      evidence:'exact-isbn'
    }];
  }

  async function resolveFor(id){
    if(!id)return null;
    try{
      const response=await fetch('/api/albums/'+encodeURIComponent(id)+'/cover/resolve',{method:'POST',headers:{accept:'application/json'},cache:'no-store'});
      return response.ok?await response.json():null;
    }catch{return null}
  }

  function probe(url,timeoutMs=5500){
    return new Promise(resolve=>{
      const im=new Image();
      let done=false;
      const finish=value=>{if(done)return;done=true;clearTimeout(timer);im.onload=null;im.onerror=null;resolve(value)};
      const timer=setTimeout(()=>finish(false),timeoutMs);
      im.onload=()=>finish(im.naturalWidth>=120&&im.naturalHeight>=160);
      im.onerror=()=>finish(false);
      im.src=url;
    });
  }

  function sourceTitle(source){
    if(source==='hachette')return 'Source : catalogue officiel Glénat / Hachette Livre · récupérée le '+dateFr();
    if(source==='bnf'||source==='bnf-intermarc')return 'Source : Bibliothèque nationale de France · récupérée le '+dateFr();
    if(source==='google-books')return 'Source : Google Books · ISBN vérifié';
    return 'Source : Open Library · ISBN vérifié';
  }

  function makeEditorial(node,album={}){
    if(!node)return null;
    const host=node.closest?.('[data-album],.resume,.detail-hero');
    const info=window.BDDeskExperience?.infoFromHost?.(host,'BD')||{};
    const payload={
      series:text(album.series)||info.series||'BD Desk',
      title:text(album.title)||info.title||'Album',
      number:text(album.number)||info.number||'',
      publisher:text(album.publisher)
    };
    if(window.BDDeskExperience?.makeCover)return window.BDDeskExperience.makeCover(node,payload);
    node.classList.add('cover-fallback');
    node.textContent=payload.title;
    node.dataset.enhanced='1';
    return node;
  }

  async function installCover({node,album,cover}){
    if(!cover?.url||album?.cover_origin==='user')return false;
    const url=displayUrl({...album,cover_url:cover.url,cover_origin:'machine'});
    if(!(await probe(url)))return false;
    if(!node?.isConnected)return true;
    const im=document.createElement('img');
    im.className='cover-image';
    im.loading='lazy';
    im.decoding='async';
    im.alt='Couverture de '+(text(album.title)||text(album.series)||'album');
    im.src=url;
    im.dataset.coverSource=cover.source||'metadata-resolver';
    im.dataset.coverConfidence=String(cover.confidence??'');
    im.title=sourceTitle(cover.source);
    node.replaceWith(im);
    return true;
  }

  async function recoverHost(host,node){
    const id=hostId(host);
    if(!id)return false;
    try{
      const album=await fetch('/api/albums/'+encodeURIComponent(id),{cache:'no-store'}).then(response=>response.ok?response.json():null);
      if(!album)return false;
      if(album.cover_origin==='user')return Boolean(makeEditorial(node,album));
      if(!album.isbn)return Boolean(makeEditorial(node,album));
      const payload=await resolveFor(id);
      const current=payload?.album||album;
      if(await installCover({node,album:current,cover:payload?.resolution?.cover}))return true;
      makeEditorial(node,current);
      return false;
    }catch{
      makeEditorial(node);
      return false;
    }
  }

  async function recoverImage(image){
    const host=image?.closest?.('[data-album],[data-detail-album]')||document.getElementById('drawer');
    const id=hostId(host)||document.getElementById('drawer')?.dataset?.albumId;
    if(!id)return Boolean(makeEditorial(image));
    if(completed.has(id))return false;
    completed.add(id);
    return recoverHost(host,image);
  }

  async function hydrate(host){
    const id=hostId(host);
    if(!id||completed.has(id))return;
    const node=host.querySelector('.placeholder,.cover-fallback,.editorial-cover');
    if(!node)return;
    completed.add(id);
    await recoverHost(host,node);
  }

  function pump(){
    while(active<MAX_CONCURRENCY&&queue.length){
      const host=queue.shift();
      active++;
      hydrate(host).finally(()=>{active--;pump()});
    }
  }

  function enqueue(host){
    const id=hostId(host);
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
    if(root instanceof Element&&root.matches?.('[data-album],[data-detail-album]'))hosts.push(root);
    root.querySelectorAll?.('[data-album],[data-detail-album]').forEach(host=>hosts.push(host));
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

  window.BDDeskCoverSources={sourcesFor,resolveFor,recoverHost,recoverImage,displayUrl};
})();
