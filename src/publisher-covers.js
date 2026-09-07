import { canonicalIsbn } from './isbn.js';
import { imageDimensions } from './metadata-core.js';

const USER_AGENT='BD-Desk/1.0 (+https://github.com/Etorrent-Org/Bd-desk)';
const MAX_IMAGE_BYTES=10*1024*1024;
const MIN_COVER_EDGE=300;

export function mediaParticipationsCoverUrls(isbn){
  const n=canonicalIsbn(isbn);
  if(!n)return [];
  return [
    `https://bdi.dlpdomain.com/album/${n}-couv-M700x1200.jpg`,
    `https://bdi.dlpdomain.com/album/${n}-couv.jpg`
  ];
}

function shortEdge(dimensions){
  const width=Number(dimensions?.width||0),height=Number(dimensions?.height||0);
  if(width>0&&height>0)return Math.min(width,height);
  return width>0?width:0;
}

async function fetchImage(fetchImpl,url,timeoutMs=10000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(Number(timeoutMs)||10000,3000));
  try{
    const response=await fetchImpl(url,{headers:{'user-agent':USER_AGENT,accept:'image/*'},signal:controller.signal});
    if(!response?.ok)return null;
    const declared=Number(response.headers?.get?.('content-length')||0);
    if(declared>MAX_IMAGE_BYTES)return null;
    const buffer=Buffer.from(await response.arrayBuffer());
    if(!buffer.length||buffer.length>MAX_IMAGE_BYTES)return null;
    const dimensions=imageDimensions(buffer);
    if(!dimensions||shortEdge(dimensions)<MIN_COVER_EDGE)return null;
    return {...dimensions,bytes:buffer.length};
  }catch{return null}
  finally{clearTimeout(timer)}
}

export async function fetchMediaParticipationsCover(isbn,opts={}){
  const n=canonicalIsbn(isbn);
  if(!n)return [];
  const fetchImpl=opts.fetchImpl||globalThis.fetch;
  for(const url of mediaParticipationsCoverUrls(n)){
    const quality=await fetchImage(fetchImpl,url,opts.timeoutMs);
    if(!quality)continue;
    return [{
      source:'media-participations',
      sourceId:n,
      sourceUrl:url,
      identifiers:[n],
      coverIdentifiers:[n],
      coverUrl:url,
      coverWidth:quality.width,
      coverHeight:quality.height,
      coverBytes:quality.bytes,
      coverEvidence:{official:true,identifierMatch:true,directPublisherAsset:true,identifiers:[n]}
    }];
  }
  return [];
}
