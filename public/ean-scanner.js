(()=>{
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
  if(!isIOS&&'BarcodeDetector' in window)return;

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
      let m=(a+b+c)/3;if(rr[i-1]?.bit===0&&rr[i-1].len<m*2)continue;
      const start=rr[i].start;
      for(let j=i+3;j<rr.length-2;j++){
        if(rr[j].bit!==1||rr[j+1].bit!==0||rr[j+2].bit!==1)continue;
        const end=rr[j+2].start+rr[j+2].len,span=end-start,modules=span/m;
        if(modules<86||modules>106)continue;
        const m2=span/95,code=decode95(sample95(bits,start,m2));if(code)return code;
      }
      for(const f of [0.94,0.97,1,1.03,1.06]){const code=decode95(sample95(bits,start,m*f));if(code)return code}
    }
    return null;
  }

  let active=null;
  function closeScanner(){
    if(!active)return;active.stop=true;active.stream?.getTracks().forEach(t=>t.stop());active.root.remove();active=null;
  }
  function deliver(code,origin){
    closeScanner();
    if(origin==='add'){
      const input=document.getElementById('addIsbn');if(input){input.value=code;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()}
    }else if(origin==='discover'){
      const input=document.getElementById('discoverIsbn');if(input){input.value=code;input.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('discoverBtn')?.click()}
    }else{
      const input=document.getElementById('globalSearch');if(input){input.value=code;input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))}
    }
  }
  function manual(origin,root){
    const panel=root.querySelector('.bdscan-manual');panel.hidden=false;root.querySelector('.bdscan-video-wrap').hidden=true;
    const input=panel.querySelector('input');setTimeout(()=>input.focus(),50);
    panel.querySelector('[data-use]').onclick=()=>{const v=input.value.replace(/[^0-9Xx]/g,'');if(v.length>=10)deliver(v,origin)};
  }
  async function openScanner(origin){
    if(active)closeScanner();
    const root=document.createElement('div');root.className='bdscan-root';root.innerHTML=`<style>
      .bdscan-root{position:fixed;inset:0;z-index:10000;background:#05080c;color:white;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column}
      .bdscan-top{display:flex;align-items:center;justify-content:space-between;padding:calc(14px + env(safe-area-inset-top)) 18px 12px;background:rgba(5,8,12,.92)}
      .bdscan-top strong{font-size:18px}.bdscan-close{width:44px;height:44px;border:0;border-radius:50%;background:#ffffff18;color:#fff;font-size:26px}
      .bdscan-video-wrap{position:relative;flex:1;min-height:0;overflow:hidden}.bdscan-video{width:100%;height:100%;object-fit:cover}
      .bdscan-shade{position:absolute;inset:0;background:linear-gradient(#0008 0 28%,transparent 28% 62%,#0009 62%)}
      .bdscan-frame{position:absolute;left:7%;right:7%;top:34%;height:25%;border:2px solid #fff;border-radius:18px;box-shadow:0 0 0 999px rgba(0,0,0,.08)}
      .bdscan-line{position:absolute;left:10%;right:10%;top:50%;height:2px;background:#ff3b30;box-shadow:0 0 10px #ff3b30}
      .bdscan-hint{position:absolute;left:20px;right:20px;bottom:28px;text-align:center;font-size:15px;text-shadow:0 1px 3px #000}
      .bdscan-actions{display:flex;gap:10px;padding:12px 18px calc(14px + env(safe-area-inset-bottom));background:#05080c}.bdscan-actions button,.bdscan-manual button{min-height:48px;border-radius:14px;border:1px solid #ffffff33;background:#ffffff14;color:white;font-size:16px;font-weight:700;padding:0 18px}.bdscan-actions button{flex:1}
      .bdscan-manual{padding:32px 22px;flex:1;background:#111820}.bdscan-manual h2{margin:0 0 8px}.bdscan-manual p{color:#b9c1cc}.bdscan-manual input{width:100%;box-sizing:border-box;height:58px;border-radius:14px;border:1px solid #ffffff33;background:#fff;color:#111;font-size:22px;padding:0 16px;margin:18px 0}.bdscan-manual button{background:#fff;color:#111;width:100%}
    </style><div class="bdscan-top"><strong>Scanner ISBN / EAN</strong><button class="bdscan-close" aria-label="Fermer">×</button></div><div class="bdscan-video-wrap"><video class="bdscan-video" autoplay muted playsinline></video><div class="bdscan-shade"></div><div class="bdscan-frame"></div><div class="bdscan-line"></div><div class="bdscan-hint">Cadrez le code-barres au centre</div></div><div class="bdscan-manual" hidden><h2>Saisie manuelle</h2><p>Entrez l’ISBN/EAN si la caméra ne peut pas le lire.</p><input inputmode="numeric" autocomplete="off" placeholder="978…"><button data-use>Utiliser ce code</button></div><div class="bdscan-actions"><button data-manual>Saisir le code</button></div>`;
    document.body.appendChild(root);root.querySelector('.bdscan-close').onclick=closeScanner;root.querySelector('[data-manual]').onclick=()=>manual(origin,root);
    active={root,stop:false,stream:null};
    if(!navigator.mediaDevices?.getUserMedia){manual(origin,root);return}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
      if(!active||active.root!==root){stream.getTracks().forEach(t=>t.stop());return}active.stream=stream;
      const video=root.querySelector('video');video.srcObject=stream;await video.play();
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});let last=0;
      const scan=ts=>{
        if(!active||active.stop||active.root!==root)return;
        if(ts-last<180){requestAnimationFrame(scan);return}last=ts;
        if(video.readyState>=2&&video.videoWidth){
          const maxW=960,scale=Math.min(1,maxW/video.videoWidth);canvas.width=Math.max(320,Math.round(video.videoWidth*scale));canvas.height=Math.max(240,Math.round(video.videoHeight*scale));ctx.drawImage(video,0,0,canvas.width,canvas.height);
          const img=ctx.getImageData(0,0,canvas.width,canvas.height),ys=[.50,.46,.54,.42,.58].map(v=>Math.round(canvas.height*v));
          for(const y of ys){
            let lo=255,hi=0;for(let x=0,p=y*canvas.width*4;x<canvas.width;x++,p+=4){const g=(img.data[p]*77+img.data[p+1]*150+img.data[p+2]*29)>>8;if(g<lo)lo=g;if(g>hi)hi=g}if(hi-lo<55)continue;
            const bits=rowBits(img.data,canvas.width,y,Math.round((lo+hi)/2));const code=decodeRow(bits)||decodeRow(Uint8Array.from(bits,b=>b?0:1));if(code){navigator.vibrate?.(40);deliver(code,origin);return}
          }
        }
        requestAnimationFrame(scan);
      };requestAnimationFrame(scan);
    }catch{manual(origin,root)}
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#addScan,#discoverScan,#scanBtn');if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    openScanner(b.id==='addScan'?'add':b.id==='discoverScan'?'discover':'global');
  },true);
})();
