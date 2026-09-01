document.addEventListener('error',e=>{
  const im=e.target;
  if(!(im instanceof HTMLImageElement)||!im.classList.contains('cover-image')) return;
  const alt=(im.getAttribute('alt')||'').replace(/^Couverture\s*/i,'').trim();
  const label=alt||'BD';
  const p=document.createElement('div');
  p.className='placeholder cover-fallback';
  p.innerHTML=`<span>${label.slice(0,28)}</span>`;
  im.replaceWith(p);
},true);
