(()=>{
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  const original=history.replaceState.bind(history);
  history.replaceState=function(...args){
    const before=location.hash;
    const result=original(...args);
    if(location.hash!==before) requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
    return result;
  };
  window.addEventListener('hashchange',()=>requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'})));
})();
