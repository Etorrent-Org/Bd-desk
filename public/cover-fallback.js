(()=>{
  const attempted=new WeakSet();
  const text=value=>String(value??'').trim();

  function localCover(im,data={}){
    const p=document.createElement('div');
    p.className='placeholder cover-fallback';
    const host=im.closest?.('[data-album],.resume,.detail-hero');
    const guessed=window.BDDeskExperience?.infoFromHost?.(host,'BD')||{};
    const payload={
      series:data.series||guessed.series||'BD Desk',
      title:data.title||guessed.title||text(im.alt).replace(/^Couverture(?: de)?\s*/i,'')||'Album',
      number:data.number||guessed.number||'',
      publisher:data.publisher||''
    };
    im.replaceWith(p);
    if(window.BDDeskExperience?.makeCover)window.BDDeskExperience.makeCover(p,payload);
    else{p.textContent=payload.title;p.dataset.enhanced='1'}
    return p;
  }

  async function recover(im){
    if(!(im instanceof HTMLImageElement)||attempted.has(im))return;
    attempted.add(im);
    const resolver=window.BDDeskCoverSources?.recoverImage;
    if(resolver){
      try{
        const recovered=await resolver(im);
        if(recovered)return;
      }catch{}
    }
    if(im.isConnected)localCover(im);
  }

  document.addEventListener('error',event=>{
    const image=event.target;
    if(image instanceof HTMLImageElement&&image.classList.contains('cover-image'))recover(image);
  },true);
})();
