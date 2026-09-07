import { canonicalIsbn } from './isbn.js';
import { imageDimensions } from './metadata-core.js';

const USER_AGENT='BD-Desk/1.0 (+https://github.com/Etorrent-Org/Bd-desk)';
const MAX_IMAGE_BYTES=10*1024*1024;
const MIN_REAL_COVER_EDGE=300;
const MAX_PRODUCT_PAGES=12;
const BDFUGUE_HOSTS=new Set(['bdfugue.com','www.bdfugue.com']);

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
function isBdfugueUrl(value){
  try{return new URL(String(value||'')).protocol==='https:'&&BDFUGUE_HOSTS.has(new URL(String(value||'')).hostname)}catch{return false}
}
function shortEdge(value){
  const width=Number(value?.width||value?.coverWidth||0);
  const height=Number(value?.height||value?.coverHeight||0);
  if(width>0&&height>0)return Math.min(width,height);
  return width>0?width:0;
}
function productLinks(html,baseUrl){
  const result=[];
  const seen=new Set();
  const pattern=/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
  let match;
  while((match=pattern.exec(String(html||'')))&&result.length<MAX_PRODUCT_PAGES){
    let absolute;
    try{absolute=new URL(decodeHtml(match[1]),baseUrl).toString()}catch{continue}
    if(!isBdfugueUrl(absolute)||seen.has(absolute))continue;
    const url=new URL(absolute);
    const path=url.pathname.toLowerCase();
    if(path==='/'||path.startsWith('/catalogsearch/')||path.startsWith('/customer/')||path.startsWith('/checkout/')||path.startsWith('/wishlist/')||path.startsWith('/sales/')||path.startsWith('/review/')||path.startsWith('/catalog/category/')||path.startsWith('/media/'))continue;
    url.hash='';
    const normalized=url.toString();
    if(seen.has(normalized))continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
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
async function bdfugueCandidateFromPage(isbn,response,fetchImpl,timeoutMs){
  if(!response?.ok)return null;
  const finalUrl=String(response.url||'');
  if(!isBdfugueUrl(finalUrl))return null;
  let html;
  try{html=await response.text()}catch{return null}
  if(!htmlContainsIsbn(html,isbn))return {candidate:null,html,finalUrl};
  const image=meta(html,'og:image')||meta(html,'twitter:image');
  const title=meta(html,'og:title')||null;
  if(!image)return {candidate:null,html,finalUrl};
  let imageUrl;
  try{imageUrl=new URL(image,finalUrl).toString()}catch{return {candidate:null,html,finalUrl}}
  if(!imageUrl.startsWith('https://'))return {candidate:null,html,finalUrl};
  const quality=await inspectImage(fetchImpl,imageUrl,timeoutMs);
  if(!quality||shortEdge(quality)<MIN_REAL_COVER_EDGE)return {candidate:null,html,finalUrl};
  return {candidate:{
    source:'bdfugue',sourceId:finalUrl,title,sourceUrl:finalUrl,
    identifiers:[isbn],coverIdentifiers:[isbn],coverUrl:imageUrl,
    coverWidth:quality.width,coverHeight:quality.height,coverBytes:quality.bytes,
    coverEvidence:{official:false,identifierMatch:true,partnerRetailer:true,sourcePage:finalUrl,scraped:true}
  },html,finalUrl};
}

async function fetchBdfugueEntry(fetchImpl,url,timeoutMs){
  try{return await timedFetch(fetchImpl,url,{redirect:'follow',headers:{'user-agent':USER_AGENT,accept:'text/html,application/xhtml+xml'}},timeoutMs)}catch{return null}
}

export async function fetchBdfugueCover(isbn,opts={}){
  const n=canonicalIsbn(isbn);
  if(!n)return [];
  const fetchImpl=opts.fetchImpl||globalThis.fetch;
  const affiliateId=String(opts.affiliateId||process.env.BDFUGUE_AFFILIATE_ID||'').trim();
  const entryUrls=[];
  if(affiliateId)entryUrls.push('https://www.bdfugue.com/a/?ean='+encodeURIComponent(n)+'&ref='+encodeURIComponent(affiliateId));
  entryUrls.push(
    'https://www.bdfugue.com/catalogsearch/result/?q='+encodeURIComponent(n),
    'https://www.bdfugue.com/catalogsearch/result/index/?q='+encodeURIComponent(n)
  );

  for(const entryUrl of entryUrls){
    const response=await fetchBdfugueEntry(fetchImpl,entryUrl,opts.timeoutMs);
    if(!response?.ok)continue;
    const inspected=await bdfugueCandidateFromPage(n,response,fetchImpl,opts.timeoutMs);
    if(inspected?.candidate)return [inspected.candidate];
    const links=productLinks(inspected?.html||'',inspected?.finalUrl||entryUrl);
    if(!links.length)continue;
    const pages=await Promise.all(links.map(async url=>{
      const productResponse=await fetchBdfugueEntry(fetchImpl,url,opts.timeoutMs);
      return bdfugueCandidateFromPage(n,productResponse,fetchImpl,opts.timeoutMs);
    }));
    const candidates=pages.map(page=>page?.candidate).filter(Boolean).sort((a,b)=>shortEdge(b)-shortEdge(a));
    if(candidates.length)return [candidates[0]];
  }
  return [];
}

export async function fetchOfficialCoverCandidates(isbn,opts={}){
  const settled=await Promise.allSettled([fetchBdfugueCover(isbn,opts)]);
  return settled.flatMap(result=>result.status==='fulfilled'?result.value:[]);
}
