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

  function yearFrom(value){
    const match=text(value).match(/(?:19|20)\d{2}/);
    return match?.[0]||null;
  }

  function yearsFor(album,candidates=[]){
    const years=[];
    const add=value=>{const year=yearFrom(value);if(year&&!years.includes(year))years.push(year)};
    add(album?.legal_deposit);
    add(album?.print_date);
    add(album?.purchase_date);
    for(const candidate of candidates)add(candidate?.publishedDate);
    return years;
  }

  function isGlenat(album,candidates=[]){
    const values=[album?.publisher,album?.collection_name,...candidates.flatMap(c=>[c?.publisher,c?.collection])];
    return values.some(value=>/gl[eé]nat|comix\s*buro/i.test(text(value)));
  }

  function glenatSources(album,candidates=[]){
    const isbn=canonical(album?.isbn);
    if(!isbn||!isGlenat(album,candidates))return [];
    return yearsFor(album,candidates).map(year=>({
      source:'glenat-hachette',
      url:`https://media.hachette.fr/imgArticle/GLENAT/${year}/${encodeURIComponent(isbn)}-001-X.jpeg?source=web`
    }));
  }

  async function discoverCandidates(isbn){
    try{
      const response=await fetch('/api/discover?isbn='+encodeURIComponent(canonical(isbn)),{cache:'no-store'});
      if(!response.ok)return [];
      const payload=await response.json();
      return Array.isArray(payload?.candidates)?payload.candidates:[];
    }catch{return []}
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
    if(source==='bnf')return `Source : Bibliothèque nationale de France · récupérée le ${dateFr()}`;
    if(source==='glenat-hachette')return 'Source : Éditions Glénat / Hachette Livre';
    if(source==='google-books')return 'Source : Google Books';
    return 'Source : Open Library';
  }

  async function installCover({host,placeholder,album,candidate}){
    if(!(await probe(candidate.url)))return false;
    if(!placeholder.isConnected)return true;
    const im=document.createElement('img');
    im.className='cover-image';
    im.loading='lazy';
    im.decoding='async';
    im.alt=`Couverture de ${text(album.title)||text(album.series)||'album'}`;
    im.src=candidate.url;
    im.dataset.coverSource=candidate.source;
    im.title=sourceTitle(candidate.source);
    placeholder.replaceWith(im);
    if(album.cover_url!==candidate.url&&album.coverUrl!==candidate.url){
      fetch('/api/albums/'+encodeURIComponent(host.dataset.album),{
        method:'PATCH',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({coverUrl:candidate.url})
      }).catch(()=>{});
    }
    return true;
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

      const direct=sourcesFor(album.isbn);
      const bnf=direct.find(candidate=>candidate.source==='bnf');
      if(bnf&&await installCover({host,placeholder,album,candidate:bnf}))return;

      const discovered=await discoverCandidates(album.isbn);
      for(const item of discovered){
        if(!item?.coverUrl)continue;
        const source=item.source==='google-books'?'google-books':'open-library';
        if(await installCover({host,placeholder,album,candidate:{source,url:item.coverUrl}}))return;
      }

      for(const candidate of glenatSources(album,discovered)){
        if(await installCover({host,placeholder,album,candidate}))return;
      }

      const openLibrary=direct.find(candidate=>candidate.source==='open-library');
      if(openLibrary)await installCover({host,placeholder,album,candidate:openLibrary});
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

  window.BDDeskCoverSources={sourcesFor,glenatSources};
})();
