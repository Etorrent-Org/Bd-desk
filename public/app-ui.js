export function escapeHtml(s=''){
  return String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

function trustedCoverUrl(src){
  try{
    const host=new URL(src,location.origin).hostname;
    return host==='openapi.bnf.fr'
      || host==='covers.openlibrary.org'
      || host==='books.google.com'
      || host==='books.googleusercontent.com'
      || host==='images.hachette-livre.fr'
      || host.endsWith('.hachette-livre.fr');
  }catch{
    return false;
  }
}

export function coverSrc(a){
  const src=a.cover_url||a.coverUrl;
  const id=a.id||a.albumId;
  const machine=a.cover_origin!=='user'
    && a.coverOrigin!=='user'
    && (a.cover_origin==='machine'||a.coverOrigin==='machine'||trustedCoverUrl(src));
  return src&&machine&&id?`/api/albums/${encodeURIComponent(id)}/cover/image`:src;
}

export function img(a,cls=''){
  const src=coverSrc(a);
  return src
    ? `<img class="cover-image ${cls}" src="${escapeHtml(src)}" loading="lazy" alt="Couverture ${escapeHtml(a.title||a.series||'album')}">`
    : `<div class="placeholder">${escapeHtml(a.series||a.title||'BD')}</div>`;
}

export function coverCard(a){
  return `<article class="album-card" data-album="${a.id}"><div class="cover-wrap">${img(a)}</div><h3>${escapeHtml(a.series||a.title)}</h3><p class="series">${escapeHtml(a.number?`Tome ${a.number}`:a.title)}</p><p>${escapeHtml(a.title===a.series?'':a.title||'')}</p></article>`;
}

export function header(title,sub='',action=''){
  return `<div class="page-head"><div><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>${action}</div>`;
}

export function euro(v){
  return Number(v||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
}
