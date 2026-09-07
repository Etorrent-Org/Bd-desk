import { canonicalIsbn } from './isbn.js';
import { imageDimensions } from './metadata-core.js';
import { fetchBdbaseCoverCandidates } from './bdbase-covers.js';

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
  const normalized=canonicalIsbn(isbn);
  if(!normalized)return false;
  const compact=canonicalText(html);
  return compact.includes(normalized);
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
function normalizedProductUrl(value,baseUrl){
  let absolute;
  try{absolute=new URL(decodeHtml(value),baseUrl)}catch{return null}
  if(!isBdfugueUrl(absolute.toString()))return null;
  const path=absolute.pathname.toLowerCase();
  const blocked=[
    '/catalogsearch/','/customer/','/checkout/','/wishlist/','/sales/','/review/','/catalog/category/',
    '/media/','/serie/','/auteur/','/editeur/','/genre/','/promotions','/nouveautes','/meilleures-ventes',
    '/contact','/magasins','/blog','/catalogue','/livraison','/conditions-generales'
  ];
  if(path==='/'||blocked.some(prefix=>path.startsWith(prefix)))return null;
  if(/\.(?:jpg|jpeg|png|webp|gif|svg|css|js|pdf)$/i.test(path))return null;
  absolute.hash='';
  return absolute.toString();
}
function collectProductLinks(html,baseUrl,{preferredOnly=false}={}){
  const result=[];
  const seen=new Set();
  const pattern=/<a\b([^>]*)\bhref=["']([^"']+)["']([^>]*)>/gi;
  let match;
  while((match=pattern.exec(String(html||'')))){
    const attrs=`${match[1]||''} ${match[3]||''}`;
    const preferred=/\b(?:product-item-link|product-item-photo|product-item-name|product-item-info|product-image-photo)\b/i.test(attrs);
    if(preferredOnly&&!preferred)continue;
    const normalized=normalizedProductUrl(match[2],baseUrl);
    if(!normalized||seen.has(normalized))continue;
    seen.add(normalized);
    result.push(normalized);
    if(result.length>=MAX_PRODUCT_PAGES)break;
  }
  return result;
}
function productLinks(html,baseUrl){
  const preferred=collectProductLinks(html,baseUrl,{preferredOnly:true});
  const generic=collectProductLinks(html,baseUrl);
  return [...new Set([...preferred,...generic])].slice(0,MAX_PRODUCT_PAGES);
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

function normalizeWords(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' et ').replace(/[^a-z0-9]+/g,' ').trim();
}
function visibleText(html){return decodeHtml(String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '))}
function fieldSimilarity(target,page){
  const wanted=normalizeWords(target);
  if(!wanted)return null;
  const haystack=normalizeWords(page);
  if(!haystack)return 0;
  if(haystack.includes(wanted))return 1;
  const tokens=[...new Set(wanted.split(' ').filter(token=>token.length>1))];
  if(!tokens.length)return 0;
  const pageTokens=new Set(haystack.split(' ').filter(Boolean));
  return tokens.filter(token=>pageTokens.has(token)).length/tokens.length;
}
function numberSimilarity(number,page){
  const n=normalizeWords(number);
  if(!n)return null;
  const haystack=` ${normalizeWords(page)} `;
  if(haystack.includes(` tome ${n} `)||haystack.includes(` volume ${n} `)||haystack.includes(` vol ${n} `))return 1;
  return haystack.includes(` ${n} `)?0.6:0;
}
function metadataMatch(album,pageTitle,html){
  const page=`${pageTitle||''} ${visibleText(html)}`;
  const weighted=[
    [fieldSimilarity(album?.title,page),0.45,'title'],
    [fieldSimilarity(album?.series,page),0.35,'series'],
    [numberSimilarity(album?.number,page),0.12,'number'],
    [fieldSimilarity(album?.publisher,page),0.08,'publisher']
  ].filter(([value])=>value!==null);
  if(!weighted.length)return {score:0,evidence:{}};
  const weight=weighted.reduce((sum,[,w])=>sum+w,0);
  const score=weighted.reduce((sum,[value,w])=>sum+value*w,0)/weight;
  const evidence=Object.fromEntries(weighted.map(([value,,name])=>[name,Number(value.toFixed(3))]));
  return {score:Number(score.toFixed(3)),evidence};
}
function metadataQueries(album){
  const values=[
    [album?.series,album?.number,album?.title].filter(Boolean).join(' '),
    [album?.series,album?.title].filter(Boolean).join(' '),
    [album?.title,album?.publisher].filter(Boolean).join(' ')
  ].map(value=>value.trim()).filter(value=>value.length>2);
  return [...new Set(values)].slice(0,3);
}
async function bdfugueCandidateFromMetadataPage(album,response,fetchImpl,timeoutMs){
  if(!response?.ok)return null;
  const finalUrl=String(response.url||'');
  if(!isBdfugueUrl(finalUrl))return null;
  let html;
  try{html=await response.text()}catch{return null}
  const title=meta(html,'og:title')||null;
  const match=metadataMatch(album,title,html);
  const isbn=canonicalIsbn(album?.isbn);
  const identifierMatch=isbn?htmlContainsIsbn(html,isbn):false;
  const minimumScore=isbn&&!identifierMatch?0.9:0.68;
  if(match.score<minimumScore)return {candidate:null,html,finalUrl,score:match.score};
  const image=meta(html,'og:image')||meta(html,'twitter:image');
  if(!image)return {candidate:null,html,finalUrl,score:match.score};
  let imageUrl;
  try{imageUrl=new URL(image,finalUrl).toString()}catch{return {candidate:null,html,finalUrl,score:match.score}}
  if(!imageUrl.startsWith('https://'))return {candidate:null,html,finalUrl,score:match.score};
  const quality=await inspectImage(fetchImpl,imageUrl,timeoutMs);
  if(!quality||shortEdge(quality)<MIN_REAL_COVER_EDGE)return {candidate:null,html,finalUrl,score:match.score};
  const confidence=identifierMatch?0.93:Math.min(0.9,0.68+match.score*0.22);
  return {candidate:{
    source:'bdfugue',sourceId:finalUrl,title,sourceUrl:finalUrl,
    identifiers:identifierMatch&&isbn?[isbn]:[],coverIdentifiers:identifierMatch&&isbn?[isbn]:[],coverUrl:imageUrl,
    coverWidth:quality.width,coverHeight:quality.height,coverBytes:quality.bytes,
    confidence:Number(confidence.toFixed(3)),
    coverEvidence:{official:false,identifierMatch,partnerRetailer:true,sourcePage:finalUrl,scraped:true,bibliographicMatch:true,bibliographicScore:match.score,bibliographicEvidence:match.evidence}
  },html,finalUrl,score:match.score};
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

export async function fetchBdfugueCoverByMetadata(album,opts={}){
  if(!album||(!album.title&&!album.series))return [];
  const fetchImpl=opts.fetchImpl||globalThis.fetch;
  const seenPages=new Set();
  let best=[];
  for(const query of metadataQueries(album)){
    const searchUrl='https://www.bdfugue.com/catalogsearch/result/?q='+encodeURIComponent(query);
    const response=await fetchBdfugueEntry(fetchImpl,searchUrl,opts.timeoutMs);
    if(!response?.ok)continue;
    let html='';
    try{html=await response.text()}catch{continue}
    const links=productLinks(html,response.url||searchUrl).filter(url=>!seenPages.has(url));
    links.forEach(url=>seenPages.add(url));
    if(!links.length)continue;
    const pages=await Promise.all(links.map(async url=>{
      const productResponse=await fetchBdfugueEntry(fetchImpl,url,opts.timeoutMs);
      return bdfugueCandidateFromMetadataPage(album,productResponse,fetchImpl,opts.timeoutMs);
    }));
    const candidates=pages.map(page=>page?.candidate).filter(Boolean).sort((a,b)=>{
      const scoreDiff=Number(b.coverEvidence?.bibliographicScore||0)-Number(a.coverEvidence?.bibliographicScore||0);
      return scoreDiff||shortEdge(b)-shortEdge(a);
    });
    if(candidates.length){
      best=[...best,...candidates].sort((a,b)=>{
        const exact=Number(Boolean(b.coverEvidence?.identifierMatch))-Number(Boolean(a.coverEvidence?.identifierMatch));
        const score=Number(b.coverEvidence?.bibliographicScore||0)-Number(a.coverEvidence?.bibliographicScore||0);
        return exact||score||shortEdge(b)-shortEdge(a);
      });
      if(best[0]?.coverEvidence?.identifierMatch||Number(best[0]?.coverEvidence?.bibliographicScore||0)>=0.96)break;
    }
  }
  return best.slice(0,3);
}

export async function fetchBibliographicCoverCandidates(album,opts={}){
  // A freshly resolved official BnF cover uses the original-image endpoint; avoid a redundant web lookup
  // when that source is already present but does not expose dimensions in its metadata record.
  if(album?.cover_url&&album?.cover_source==='bnf'&&!Number(album?.cover_width||0))return [];
  const bdbase=await fetchBdbaseCoverCandidates(album,opts).catch(()=>[]);
  if(bdbase.length)return bdbase;
  return fetchBdfugueCoverByMetadata(album,opts).catch(()=>[]);
}

export async function fetchOfficialCoverCandidates(isbn,opts={}){
  const settled=await Promise.allSettled([fetchBdfugueCover(isbn,opts)]);
  return settled.flatMap(result=>result.status==='fulfilled'?result.value:[]);
}
