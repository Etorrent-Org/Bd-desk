(()=>{
  window.__BD_EAN_SCANNER_VERSION='2026-09-02.1';

  const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
  const R=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
  const PARITY={LLLLLL:'0',LLGLGG:'1',LLGGLG:'2',LLGGGL:'3',LGLLGG:'4',LGGLLG:'5',LGGGLL:'6',LGLGLG:'7',LGLGGL:'8',LGGLGL:'9'};
  const ham=(a,b)=>{let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n};
  const nearest=(bits,patterns,max=1)=>{let best=-1,dist=99;for(let i=0;i<patterns.length;i++){const d=ham(bits,patterns[i]);if(d<dist){dist=d;best=i}}return dist<=max?[best,dist]:null};
  const checksum=s=>{if(!/^\d{13}$/.test(s))return false;let sum=0;for(let i=0;i<12;i++)sum+=Number(s[i])*(i%2===0?1:3);return (10-sum%10)%10===Number(s[12])};

  function decode95(bits){
    if(bits.length!==95)return null;
    if(ham(bits.slice(0,3),'101')>1||ham(bits.slice(45,50),'01010')>1||ham(bits.slice(92),'101')>1)return null;
    let left='',par='';
    for(let i=0;i<6;i++){
      const chunk=bits.slice(3+i*7,10+i*7),l=nearest(chunk,L),g=nearest(chunk,G);
      if(!l&&!g)return null;
      if(l&&(!g||l[1]<=g[1])){left+=l[0];par+='L'}else{left+=g[0];par+='G'}
    }
    const first=PARITY[par];if(first==null)return null;
    let right='';
    for(let i=0;i<6;i++){const n=nearest(bits.slice(50+i*7,57+i*7),R);if(!n)return null;right+=n[0]}
    const code=first+left+right;return checksum(code)?code:null;
  }
  function rowBits(data,w,y,threshold){
    const out=new Uint8Array(w);let p=y*w*4;
    for(let x=0;x<w;x++,p+=4){const g=(data[p]*77+data[p+1]*150+data[p+2]*29)>>8;out[x]=g<threshold?1:0}
    return out;
  }
  function runs(bits){
    const out=[];let bit=bits[0],start=0;
    for(let i=1;i<=bits.length;i++)if(i===bits.length||bits[i]!==bit){out.push({bit,start,len:i-start});if(i<bits.length){bit=bits[i];start=i}}
    return out;
  }
  function sample95(bits,start,module){
    let s='';for(let i=0;i<95;i++){const x=Math.max(0,Math.min(bits.length-1,Math.round(start+(i+.5)*module)));s+=bits[x]?'1':'0'}return s;
  }
  function decodeRow(bits){
    const rr=runs(bits);
    for(let i=1;i<rr.length-5;i++){
      if(rr[i].bit!==1||rr[i+1].bit!==0||rr[i+2].bit!==1)continue;
      const a=rr[i].len,b=rr[i+1].len,c=rr[i+2].len,min=Math.min(a,b,c),max=Math.max(a,b,c);
      if(min<1||max/min>2.25)continue;
      const m=(a+b+c)/3;if(rr[i-1]?.bit===0&&rr[i-1].len<m*2)continue;
      const start=rr[i].start;
      for(let j=i+3;j<rr.length-2;j++){
        if(rr[j].bit!==1||rr[j+1].bit!==0||rr[j+2].bit!==1)continue;
        const end=rr[j+2].start+rr[j+2].len,span=end-start,modules=span/m;
        if(modules<86||modules>106)continue;
        const code=decode95(sample95(bits,start,span/95));if(code)return code;
      }
      for(const f of [0.92,0.95,0.98,1,1.02,1.05,1.08]){const code=decode95(sample95(bits,start,m*f));if(code)return code}
    }
    return null;
  }
  function decodeCanvas(canvas){
    const ctx=canvas.getContext('2d',{willReadFrequently:true}),img=ctx.getImageData(0,0,canvas.width,canvas.height);
    const ys=[.30,.35,.40,.45,.50,.55,.60,.65,.70].map(v=>Math.max(0,Math.min(canvas.height-1,Math.round(canvas.height*v))));
    for(const y of ys){
      let lo=255,hi=0;for(let x=0,p=y*canvas.width*4;x<canvas.width;x++,p+=4){const g=(img.data[p]*77+img.data[p+1]*150+img.data[p+2]*29)>>8;if(g<lo)lo=g;if(g>hi)hi=g}
      if(hi-lo<35)continue;
      for(const ratio of [.42,.48,.52,.58]){
        const threshold=Math.round(lo+(hi-lo)*ratio),bits=rowBits(img.data,canvas.width,y,threshold);
        const code=decodeRow(bits)||decodeRow(Uint8Array.from(bits,b=>b?0:1));if(code)return code;
      }
    }
    return null;
  }

  let active=null;
  function closeScanner(){if(!active)return;active.stop=true;active.stream?.getTracks().forEach(t=>t.stop());active.root.remove();active=null}
  function deliver(code,origin){
    closeScanner();
    if(origin==='add'){
      if(typeof window.BDDeskAddLookup==='function'){window.BDDeskAddLookup(code);return;}
      const input=document.getElementById('addIsbn');if(input){input.value=code;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()}
    }else if(origin==='discover'){
      const input=document.getElementById('discoverIsbn');if(input){input.value=code;input.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('discoverBtn')?.click()}
    }else{
      const input=document.getElementById('globalSearch');if(input){input.value=code;input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))}
    }
  }
  function showFallback(origin,root,reason='Caméra indisponible'){
    root.querySelector('.bdscan-video-wrap').hidden=true;
    const p=root.querySelector('.bdscan-fallback');p.hidden=false;
    root.querySelector('.bdscan-reason').textContent=reason;
    const manual=p.querySelector('[data-manual-input]');
    p.querySelector('[data-use]').onclick=()=>{const v=manual.value.replace(/[^0-9Xx]/g,'');if(v.length>=10)deliver(v,origin)};
    p.querySelector('[data-retry]').onclick=()=>startCamera(origin,root,true);
    p.querySelector('[data-photo]').onchange=async e=>{
      const file=e.target.files?.[0];if(!file)return;
      const status=root.querySelector('.bdscan-photo-status');status.textContent='Analyse de la photo…';
      try{
        const bmp=await createImageBitmap(file),maxW=1400,scale=Math.min(1,maxW/bmp.width),canvas=document.createElement('canvas');
        canvas.width=Math.max(320,Math.round(bmp.width*scale));canvas.height=Math.max(240,Math.round(bmp.height*scale));canvas.getContext('2d').drawImage(bmp,0,0,canvas.width,canvas.height);
        const code=decodeCanvas(canvas);if(code){deliver(code,origin);return}status.textContent='Code non détecté. Reprenez la photo de plus près, bien à plat.';
      }catch{status.textContent='Photo illisible. Essayez à nouveau.'}
      e.target.value='';
    };
  }
  async function startCamera(origin,root,retry=false){
    const fallback=root.querySelector('.bdscan-fallback'),videoWrap=root.querySelector('.bdscan-video-wrap');fallback.hidden=true;videoWrap.hidden=false;
    root.querySelector('.bdscan-hint').textContent=retry?'Nouvel essai caméra…':'Cadrez le code-barres au centre';
    if(!navigator.mediaDevices?.getUserMedia){showFallback(origin,root,'API caméra absente dans ce navigateur');return}
    let stream=null,error=null;
    for(const constraints of [
      {audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}},
      {audio:false,video:{facingMode:'environment'}},
      {audio:false,video:true}
    ]){
      try{stream=await navigator.mediaDevices.getUserMedia(constraints);break}catch(e){error=e}
    }
    if(!stream){
      const name=error?.name||'Erreur caméra';
      const reason=name==='NotAllowedError'?'Accès caméra refusé par Brave/iOS':name==='NotFoundError'?'Aucune caméra accessible':name==='NotReadableError'?'Caméra déjà utilisée ou indisponible':`${name}${error?.message?` · ${error.message}`:''}`;
      showFallback(origin,root,reason);return;
    }
    if(!active||active.root!==root){stream.getTracks().forEach(t=>t.stop());return}active.stream=stream;
    const video=root.querySelector('video');video.srcObject=stream;
    try{await video.play()}catch(e){showFallback(origin,root,`Lecture caméra impossible · ${e.name||'erreur'}`);return}
    const canvas=document.createElement('canvas');let last=0;
    const scan=ts=>{
      if(!active||active.stop||active.root!==root)return;
      if(ts-last<160){requestAnimationFrame(scan);return}last=ts;
      if(video.readyState>=2&&video.videoWidth){
        const maxW=960,scale=Math.min(1,maxW/video.videoWidth);canvas.width=Math.max(320,Math.round(video.videoWidth*scale));canvas.height=Math.max(240,Math.round(video.videoHeight*scale));canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
        const code=decodeCanvas(canvas);if(code){navigator.vibrate?.(40);deliver(code,origin);return}
      }
      requestAnimationFrame(scan);
    };requestAnimationFrame(scan);
  }
  async function openScanner(origin){
    if(active)closeScanner();
    const root=document.createElement('div');root.className='bdscan-root';root.innerHTML=`<style>
      .bdscan-root{position:fixed;inset:0;z-index:10000;background:#05080c;color:white;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column}
      .bdscan-top{display:flex;align-items:center;justify-content:space-between;padding:calc(14px + env(safe-area-inset-top)) 18px 12px;background:rgba(5,8,12,.94)}
      .bdscan-top strong{font-size:18px}.bdscan-close{width:44px;height:44px;border:0;border-radius:50%;background:#ffffff18;color:#fff;font-size:26px}
      .bdscan-video-wrap{position:relative;flex:1;min-height:0;overflow:hidden}.bdscan-video{width:100%;height:100%;object-fit:cover}
      .bdscan-shade{position:absolute;inset:0;background:linear-gradient(#0008 0 28%,transparent 28% 62%,#0009 62%)}
      .bdscan-frame{position:absolute;left:7%;right:7%;top:34%;height:25%;border:2px solid #fff;border-radius:18px}.bdscan-line{position:absolute;left:10%;right:10%;top:50%;height:2px;background:#ff3b30;box-shadow:0 0 10px #ff3b30}
      .bdscan-hint{position:absolute;left:20px;right:20px;bottom:28px;text-align:center;font-size:15px;text-shadow:0 1px 3px #000}
      .bdscan-fallback{flex:1;padding:28px 22px;background:#111820;overflow:auto}.bdscan-fallback h2{margin:0 0 8px}.bdscan-fallback p{color:#c4cad3;line-height:1.45}.bdscan-reason{display:block;margin:15px 0;padding:12px;border-radius:12px;background:#ff453a22;border:1px solid #ff453a66;color:#ffd6d2}
      .bdscan-fallback button,.bdscan-photo-label{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:100%;min-height:50px;border-radius:14px;border:1px solid #ffffff33;background:#ffffff14;color:white;font-size:16px;font-weight:750;padding:0 16px;margin:10px 0;text-align:center}.bdscan-photo-label{background:#fff;color:#111}.bdscan-photo-label input{display:none}
      .bdscan-manual-label{display:block;margin-top:22px;color:#c4cad3}.bdscan-fallback input[data-manual-input]{width:100%;box-sizing:border-box;height:56px;border-radius:14px;border:1px solid #ffffff33;background:#fff;color:#111;font-size:21px;padding:0 16px;margin:8px 0}.bdscan-photo-status{min-height:22px;color:#c4cad3}
    </style><div class="bdscan-top"><strong>Scanner ISBN / EAN</strong><button class="bdscan-close" aria-label="Fermer">×</button></div><div class="bdscan-video-wrap"><video class="bdscan-video" autoplay muted playsinline></video><div class="bdscan-shade"></div><div class="bdscan-frame"></div><div class="bdscan-line"></div><div class="bdscan-hint">Cadrez le code-barres au centre</div></div><div class="bdscan-fallback" hidden><h2>Caméra non disponible</h2><span class="bdscan-reason"></span><button data-retry>Réessayer la caméra</button><label class="bdscan-photo-label">Prendre une photo du code-barres<input data-photo type="file" accept="image/*" capture="environment"></label><div class="bdscan-photo-status"></div><label class="bdscan-manual-label">Ou saisir l’ISBN / EAN</label><input data-manual-input inputmode="numeric" autocomplete="off" placeholder="978…"><button data-use>Utiliser ce code</button></div>`;
    document.body.appendChild(root);root.querySelector('.bdscan-close').onclick=closeScanner;active={root,stop:false,stream:null};startCamera(origin,root);
  }

  window.BDDeskScanner={version:window.__BD_EAN_SCANNER_VERSION,open:openScanner,close:closeScanner};
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#addScan,#mobileAddScan,#discoverScan,#scanBtn');if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const origin=(b.id==='addScan'||b.id==='mobileAddScan')?'add':b.id==='discoverScan'?'discover':'global';
    openScanner(origin);
  },true);
})();
