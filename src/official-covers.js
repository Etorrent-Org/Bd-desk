import { canonicalIsbn } from './isbn.js';
import { imageDimensions } from './metadata-core.js';

const USER_AGENT='BD-Desk/1.0 (+https://github.com/Etorrent-Org/Bd-desk)';
const MAX_IMAGE_BYTES=10*1024*1024;

function decodeHtml(value){return String(value||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function meta(html,key){
  const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const patterns=[
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,'i')
  ];
  for(const pattern of patterns){const match=html.match(pattern);if(match)return decodeHtml(match[1])}
  return null;
}
function canonicalText(value){return String(value||'').replace(/[^0-9X]/gi,'').toUpperCase()}
function htmlContainsIsbn(html,isbn){
  const compact=canonicalText(html);
  return compact.includes(canonicalIsbn(isbn));
}
async function timedFetch(fetchImpl,url,init={},timeoutMs=9000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(Number(timeoutMs)||9000,3000));
  try{return await fetchImpl(url,{...init,signal:controller.signal})}finally{clearTimeout(timer)}
}
async function inspectImage(fetchImpl,url,timeoutMs){
  try{
    const response=await timedFetch(fetchImpl,url,{headers:{'user-agent':USER_AGENT,accept:'image/*'}},Math.max(Number(timeoutMs)||9000,12000));
    if(!response?.ok)return null;
    const buffer=Buffer.from(await response.arrayBuffer());
    if(!buffer.length||buffer.length>MAX_IMAGE_BYTES)return null;
    const dimensions=imageDimensions(buffer);
    return dimensions?{...dimensions,bytes:buffer.length}:null;
  }catch{return null}
}

export async function fetchBdfugueCover(isbn,opts={}){
  const n=canonicalIsbn(isbn);
  const affiliateId=String(opts.affiliateId||process.env.BDFUGUE_AFFILIATE_ID||'').trim();
  if(!n||!affiliateId)return [];
  const fetchImpl=opts.fetchImpl||globalThis.fetch;
  const redirectUrl='https://www.bdfugue.com/a/?ean='+encodeURIComponent(n)+'&ref='+encodeURIComponent(affiliateId);
  let response;
  try{
    response=await timedFetch(fetchImpl,redirectUrl,{redirect:'follow',headers:{'user-agent':USER_AGENT,accept:'text/html,application/xhtml+xml'}},opts.timeoutMs);
  }catch{return []}
  if(!response?.ok)return [];
  const finalUrl=String(response.url||'');
  let finalHost='';
  try{finalHost=new URL(finalUrl).hostname}catch{return []}
  if(finalHost!=='bdfugue.com'&&finalHost!=='www.bdfugue.com')return [];
  const html=await response.text();
  if(!htmlContainsIsbn(html,n))return [];
  const image=meta(html,'og:image')||meta(html,'twitter:image');
  const title=meta(html,'og:title')||null;
  if(!image)return [];
  let imageUrl;
  try{imageUrl=new URL(image,finalUrl).toString()}catch{return []}
  if(!imageUrl.startsWith('https://'))return [];
  const quality=await inspectImage(fetchImpl,imageUrl,opts.timeoutMs);
  if(!quality)return [];
  return [{
    source:'bdfugue',sourceId:finalUrl,title,sourceUrl:finalUrl,
    identifiers:[n],coverIdentifiers:[n],coverUrl:imageUrl,
    coverWidth:quality.width,coverHeight:quality.height,coverBytes:quality.bytes,
    coverEvidence:{official:false,identifierMatch:true,partnerRetailer:true,sourcePage:finalUrl}
  }];
}

export async function fetchOfficialCoverCandidates(isbn,opts={}){
  const settled=await Promise.allSettled([fetchBdfugueCover(isbn,opts)]);
  return settled.flatMap(result=>result.status==='fulfilled'?result.value:[]);
}
