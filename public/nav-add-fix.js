(()=>{
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-route="add"]');
    if(!button)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if(typeof window.openAdd==='function') window.openAdd();
  },true);
})();
