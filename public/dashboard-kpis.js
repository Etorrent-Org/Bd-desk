(()=>{
  const MISSING_FILTER_KEY='bd-desk-series-missing-only';
  const KPI_TARGETS=new Map([
    ['Ma collection',{route:'collection',label:'Ouvrir ma collection'}],
    ['Séries suivies',{route:'series',label:'Ouvrir les séries'}],
    ['Albums manquants',{route:'series',label:'Voir les albums manquants',missing:true}],
    ['Wishlist',{route:'wishlist',label:'Ouvrir la wishlist'}]
  ]);

  function routeName(){return String(location.hash||'#home').replace(/^#/,'').split('?')[0]||'home'}

  function navigate(target){
    if(target.missing)sessionStorage.setItem(MISSING_FILTER_KEY,'1');
    else if(target.route==='series')sessionStorage.removeItem(MISSING_FILTER_KEY);
    location.hash=`#${target.route}`;
  }

  function enhanceDashboardKpis(){
    document.querySelectorAll('#content .kpis > .kpi').forEach(card=>{
      if(card.dataset.dashboardKpiEnhanced==='1')return;
      const label=card.querySelector('small')?.textContent?.trim();
      const target=KPI_TARGETS.get(label);
      if(!target)return;
      card.dataset.dashboardKpiEnhanced='1';
      card.dataset.dashboardKpi=target.route;
      if(target.missing)card.dataset.dashboardMissing='1';
      card.classList.add('kpi-link');
      card.setAttribute('role','link');
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-label',target.label);
      const cue=document.createElement('span');
      cue.className='kpi-link-cue';
      cue.setAttribute('aria-hidden','true');
      cue.textContent='→';
      card.append(cue);
      card.addEventListener('click',()=>navigate(target));
      card.addEventListener('keydown',event=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        event.preventDefault();
        navigate(target);
      });
    });
  }

  function plural(value,singular,pluralForm=`${singular}s`){return `${value} ${value>1?pluralForm:singular}`}

  async function applyMissingSeriesView(){
    if(routeName()!=='series'||sessionStorage.getItem(MISSING_FILTER_KEY)!=='1')return;
    const content=document.querySelector('#content');
    const grid=content?.querySelector('.series-grid');
    if(!content||!grid||grid.dataset.missingView)return;
    grid.dataset.missingView='pending';
    try{
      const response=await fetch('/api/series',{cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const series=await response.json();
      if(!document.contains(grid)||routeName()!=='series'||sessionStorage.getItem(MISSING_FILTER_KEY)!=='1')return;
      const missingSeries=(Array.isArray(series)?series:[]).filter(item=>Array.isArray(item.missing)&&item.missing.length);
      const byName=new Map(missingSeries.map(item=>[String(item.name||'').trim(),item]));
      let missingTotal=0;
      grid.querySelectorAll('.series-card').forEach(card=>{
        const name=card.querySelector('strong')?.textContent?.trim()||'';
        const item=byName.get(name);
        if(!item){card.remove();return;}
        missingTotal+=item.missing.length;
        card.classList.add('series-card-missing');
        const target=card.querySelector('.mini > div')||card;
        if(!target.querySelector('.missing-tomes')){
          const detail=document.createElement('div');
          detail.className='missing-tomes';
          detail.textContent=`${item.missing.length>1?'Tomes manquants':'Tome manquant'} : ${item.missing.join(', ')}`;
          target.append(detail);
        }
      });
      const head=content.querySelector('.page-head');
      const title=head?.querySelector('h1');
      const subtitle=head?.querySelector('p');
      if(title)title.textContent='Albums manquants';
      if(subtitle)subtitle.textContent=`${plural(missingTotal,'tome')} détecté${missingTotal>1?'s':''} dans ${plural(missingSeries.length,'série')}.`;
      if(head&&!head.querySelector('.missing-view-actions')){
        const actions=document.createElement('div');
        actions.className='head-actions missing-view-actions';
        const button=document.createElement('button');
        button.className='btn';
        button.dataset.route='series';
        button.textContent='Voir toutes les séries';
        actions.append(button);
        head.append(actions);
      }
      if(!missingSeries.length){
        grid.innerHTML='<div class="empty">Aucun album manquant détecté.</div>';
      }
      grid.dataset.missingView='ready';
    }catch{
      grid.dataset.missingView='error';
    }
  }

  document.addEventListener('click',event=>{
    const seriesRoute=event.target.closest?.('[data-route="series"]');
    if(seriesRoute)sessionStorage.removeItem(MISSING_FILTER_KEY);
  },true);

  const content=document.querySelector('#content');
  if(content){
    const observer=new MutationObserver(()=>{
      enhanceDashboardKpis();
      void applyMissingSeriesView();
    });
    observer.observe(content,{childList:true,subtree:true});
  }
  window.addEventListener('hashchange',()=>{enhanceDashboardKpis();void applyMissingSeriesView()});
  enhanceDashboardKpis();
  void applyMissingSeriesView();
})();
