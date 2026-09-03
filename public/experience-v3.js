(()=>{
  const iconSvg={
    home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/></svg>',
    collection:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="16" rx="1"/><rect x="14" y="4" width="6" height="16" rx="1"/></svg>',
    series:'<svg viewBox="0 0 24 24"><path d="M5 5h14M5 12h14M5 19h14"/></svg>',
    albums:'<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18"/></svg>',
    authors:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"/><path d="M6 20c.8-4 3-6 6-6s5.2 2 6 6"/></svg>',
    publishers:'<svg viewBox="0 0 24 24"><path d="M4 20h16M6 20V8l6-4 6 4v12M9 11h2M13 11h2M9 15h2M13 15h2"/></svg>',
    wishlist:'<svg viewBox="0 0 24 24"><path d="M20.5 8.8c0 5-8.5 10.2-8.5 10.2S3.5 13.8 3.5 8.8A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 8.5 1.2Z"/></svg>',
    loans:'<svg viewBox="0 0 24 24"><path d="M4 7h12v11H4z"/><path d="M8 4h12v11M7 11h6"/></svg>',
    history:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2M5 5l-2 3"/></svg>',
    stats:'<svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
    discover:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1A8 8 0 0 0 14.7 6L14.4 3h-4.8L9.3 6a8 8 0 0 0-1.7 1.1l-2.5-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1A8 8 0 0 0 9.3 18l.3 3h4.8l.3-3a8 8 0 0 0 1.7-1.1l2.5 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/></svg>',
    help:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.3 2.2c-.8.4-1.1.9-1.1 1.8M12 17h.01"/></svg>',
    add:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
  };
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const text=v=>String(v??'').trim();
  const esc=s=>text(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hash=s=>{let h=2166136261;for(const c of text(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return Math.abs(h)};
  const variant=s=>1+(hash(s)%6);
  const firstWords=(s,n=6)=>text(s).split(/\s+/).filter(Boolean).slice(0,n).join(' ');

  function route(){
    const r=(location.hash||'#home').slice(1).split('?')[0]||'home';
    document.body.dataset.route=r;
    return r;
  }

  function infoFromHost(host,fallback='BD'){
    const h3=host?.querySelector?.('h3');
    const series=host?.querySelector?.('.series')||host?.querySelector?.('strong');
    const ps=host?[...host.querySelectorAll('p,small')]:[];
    const title=text(ps.find(x=>text(x.textContent)&&!/^tome\s/i.test(text(x.textContent)))?.textContent)||text(h3?.textContent)||fallback;
    return {series:text(h3?.textContent)||text(series?.textContent)||fallback,title,number:text(series?.textContent).match(/tome\s+([^·]+)/i)?.[1]||''};
  }

  function makeCover(node,data={}){
    if(!node)return null;
    const host=node.closest?.('[data-album],.resume,.series-card,.detail-hero')||node.parentElement;
    const guessed=infoFromHost(host,text(node.textContent)||'BD');
    const series=text(data.series)||guessed.series||'BD Desk';
    const title=text(data.title)||guessed.title||series;
    const number=text(data.number)||guessed.number;
    const publisher=text(data.publisher)||'';
    node.classList.add('editorial-cover',`cover-variant-${variant(series+'|'+title)}`);
    node.dataset.enhanced='1';
    node.innerHTML=`<span class="cover-kicker">${esc(publisher||series)}</span><span class="cover-title">${esc(firstWords(title,8))}</span>${series&&series!==title?`<span class="cover-subtitle">${esc(firstWords(series,7))}</span>`:''}${number?`<span class="cover-number">${esc(number)}</span>`:''}`;
    return node;
  }

  async function recoverHost(host,node){
    if(window.BDDeskCoverSources?.recoverHost)return window.BDDeskCoverSources.recoverHost(host,node);
    return makeCover(node);
  }

  function enhancePlaceholders(root=document){
    $$('.placeholder:not([data-enhanced]),.cover-fallback:not([data-enhanced])',root).forEach(node=>{
      makeCover(node);
    });
  }

  function enhanceNav(){
    $$('[data-route]').forEach(b=>{
      const r=b.dataset.route;
      const icon=b.querySelector('.nav-icon')||b.querySelector(':scope > span');
      if(icon&&iconSvg[r]&&!icon.dataset.svg){icon.innerHTML=iconSvg[r];icon.dataset.svg='1'}
    });
  }
  function enhanceKpis(){
    const kinds=['collection','series','missing','wishlist'];
    $$('.kpis .kpi').forEach((k,i)=>{if(!k.dataset.kind)k.dataset.kind=kinds[i]||'metric'});
  }
  function initials(name){return text(name).split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'BD'}
  function enhancePeople(){
    $$('.person-card:not([data-ui])').forEach(card=>{const name=text(card.querySelector('strong')?.textContent);const a=document.createElement('span');a.className='person-avatar';a.textContent=initials(name);card.prepend(a);card.dataset.ui='1'});
  }
  function enhanceSeries(){
    $$('.series-card:not([data-ui])').forEach(card=>{const mini=card.querySelector('.mini');if(mini&&!mini.querySelector('img,.series-art')){const art=document.createElement('div');art.className='series-art';art.textContent=firstWords(card.querySelector('strong')?.textContent||'Série',4);mini.prepend(art)}card.dataset.ui='1'});
  }
  function enhanceThemes(){
    $$('.theme-choice:not([data-ui])').forEach(card=>{const id=card.dataset.themeChoice||'neutral';const p=document.createElement('span');p.className='theme-preview';p.dataset.preview=id;card.prepend(p);card.dataset.ui='1'});
  }
  function enhanceChrome(){
    route();document.body.classList.add('experience-v3');
    enhanceNav();enhanceKpis();enhancePlaceholders();enhancePeople();enhanceSeries();enhanceThemes();
  }

  let raf=0;
  const mo=new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(enhanceChrome)});
  mo.observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('hashchange',enhanceChrome);
  addEventListener('pageshow',enhanceChrome);
  document.addEventListener('DOMContentLoaded',enhanceChrome,{once:true});
  enhanceChrome();

  window.BDDeskExperience={makeCover,infoFromHost,recoverHost};
})();
