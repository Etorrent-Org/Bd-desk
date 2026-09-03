(()=>{
  const PHONE_SHORT_SIDE=600;
  const TABLET_SHORT_SIDE=1024;
  const body=document.body;
  const root=document.documentElement;
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];

  function shortSide(){
    const sw=Number(window.screen?.width)||window.innerWidth;
    const sh=Number(window.screen?.height)||window.innerHeight;
    return Math.min(sw,sh);
  }

  function coarsePointer(){
    return window.matchMedia?.('(pointer: coarse)').matches||navigator.maxTouchPoints>1;
  }

  function deviceMode(){
    const short=shortSide();
    if(window.innerWidth<=600||(coarsePointer()&&short<=PHONE_SHORT_SIDE)) return 'phone';
    if(window.innerWidth<=1100||(coarsePointer()&&short<=TABLET_SHORT_SIDE)) return 'tablet';
    return 'desktop';
  }

  function orientationMode(){
    return window.innerWidth>window.innerHeight?'landscape':'portrait';
  }

  function closeSearch(){
    body.classList.remove('mobile-search-open');
    $('#mobileSearchBtn')?.setAttribute('aria-expanded','false');
  }

  function closeHeadActions(except){
    $$('.page-head.mobile-actions-open').forEach(head=>{
      if(head===except) return;
      head.classList.remove('mobile-actions-open');
      head.querySelector('.mobile-more-actions')?.setAttribute('aria-expanded','false');
    });
  }

  function enhanceHeadActions(){
    const isPhone=body.dataset.device==='phone';
    $$('.page-head').forEach(head=>{
      const actions=head.querySelector('.head-actions');
      const existing=head.querySelector('.mobile-more-actions');
      if(!isPhone||!actions){
        head.classList.remove('mobile-has-actions','mobile-actions-open');
        existing?.remove();
        return;
      }
      head.classList.add('mobile-has-actions');
      if(existing) return;
      const button=document.createElement('button');
      button.type='button';
      button.className='mobile-more-actions';
      button.setAttribute('aria-label','Actions de la page');
      button.setAttribute('aria-expanded','false');
      button.innerHTML='<span aria-hidden="true">•••</span>';
      head.append(button);
    });
  }

  function applyMode(){
    body.dataset.device=deviceMode();
    body.dataset.orientation=orientationMode();
    root.dataset.device=body.dataset.device;
    root.dataset.orientation=body.dataset.orientation;
    if(body.dataset.device!=='phone'){
      closeSearch();
      closeHeadActions();
    }
    enhanceHeadActions();
  }

  let frame=0;
  function scheduleMode(){
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(applyMode);
  }

  $('#mobileSearchBtn')?.addEventListener('click',()=>{
    const open=!body.classList.contains('mobile-search-open');
    body.classList.toggle('mobile-search-open',open);
    $('#mobileSearchBtn')?.setAttribute('aria-expanded',String(open));
    if(open) requestAnimationFrame(()=>$('#globalSearch')?.focus());
  });

  document.addEventListener('click',event=>{
    const more=event.target.closest('.mobile-more-actions');
    if(more){
      const head=more.closest('.page-head');
      const open=!head.classList.contains('mobile-actions-open');
      closeHeadActions(head);
      head.classList.toggle('mobile-actions-open',open);
      more.setAttribute('aria-expanded',String(open));
      return;
    }

    if(event.target.closest('[data-route]')){
      closeSearch();
      closeHeadActions();
      return;
    }

    if(!event.target.closest('.head-actions')) closeHeadActions();
    if(body.classList.contains('mobile-search-open')&&!event.target.closest('.search')&&!event.target.closest('#mobileSearchBtn')) closeSearch();
  });

  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape') return;
    closeSearch();
    closeHeadActions();
  });

  new MutationObserver(()=>enhanceHeadActions()).observe($('#content')||body,{childList:true,subtree:true});
  window.addEventListener('resize',scheduleMode,{passive:true});
  window.addEventListener('orientationchange',scheduleMode,{passive:true});
  applyMode();
})();
