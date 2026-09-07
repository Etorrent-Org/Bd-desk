import { canonicalIsbn } from './isbn.js';
import { imageDimensions } from './metadata-core.js';

const USER_AGENT='BD-Desk/1.0 (+https://github.com/Etorrent-Org/Bd-desk)';
const BASE='https://www.bdbase.fr';
const STATIC_HOST='static.bdbase.fr';
const MAX_IMAGE_BYTES=10*1024*1024;
const MIN_COVER_EDGE=300;
const MAX_PAGES=10;

function decodeHtml(value){return String(value||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function visibleText(value){return decodeHtml(String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim()}
function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' et ').replace(/[^a-z0-9]+/g,' ').trim()}
function tokens(value){return [...new Set(normalize(value).split(' ').filter(word=>word.length>1))]}
function similarity(target,value){
  const wanted=normalize(target),actual=normalize(value);
  if(!wanted)return null;
  if(!actual)return 0;
  if(actual.includes(wanted)||wanted.includes(actual))return 1;
  const wantedTokens=tokens(wanted),actualTokens=new Set(tokens(actual));
  if(!wantedTokens.length)return 0;
  return wantedTokens.filter(token=>actualTokens.has(token)).length/wantedTokens.length;
}
function h1(html){const match=String(html||'').match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);return match?visibleText(match[1]):''}
function shortEdge(dimensions){const w=Number(dimensions?.width||0),h=Number(dimensions?.height||0);return w&&h?Math.min(w,h):w||0}
function trustedImage(value){try{const url=new URL(String(value||''));return url.protocol==='https:'&&url.hostname===STATIC_HOST&&!url.pathname.includes('/thumbs/')&&/\/couvertures\//.test(url.pathname)}catch{return false}}
function fullCoverUrls(html){
  const result=[];
  const seen=new Set();
  const re=/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while((match=re.exec(String(html||'')))){
    let url;
    try{url=new URL(decodeHtml(match[1]),BASE).toString()}catch{continue}
    if(!trustedImage(url)||seen.has(url))continue;
    seen.add(url);result.push({url,index:match.index});
  }
  return result;
}
function flexibleIsbnRegex(isbn){
  const n=canonicalIsbn(isbn);
  if(!n)return null;
  return new RegExp(n.split('').map(char=>char.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[^0-9X]{0,8}'),'i');
}
function coverForIsbn(html,isbn){
  const regex=flexibleIsbnRegex(isbn);
  if(!regex)return null;
  const match=regex.exec(String(html||''));
  if(!match)return null;
  const covers=fullCoverUrls(html).filter(cover=>cover.index<match.index);
  return covers.at(-1)?.url||null;
}
function primaryCover(html){return fullCoverUrls(html)[0]?.url||null}
function pageContainsIsbn(html,isbn){return Boolean(flexibleIsbnRegex(isbn)?.test(String(html||'')))}

async function timedFetch(fetchImpl,url,accept,timeoutMs=9000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(Number(timeoutMs)||9000,3000));
  try{return await fetchImpl(url,{redirect:'follow',headers:{'user-agent':USER_AGENT,accept},signal:controller.signal})}finally{clearTimeout(timer)}
}
async function fetchHtml(fetchImpl,url,timeoutMs){
  try{const response=await timedFetch(fetchImpl,url,'text/html,application/xhtml+xml',timeoutMs);if(!response?.ok)return null;return {url:String(response.url||url),html:await response.text()}}catch{return null}
}
async function inspectImage(fetchImpl,url,timeoutMs){
  try{
    const response=await timedFetch(fetchImpl,url,'image/*',Math.max(Number(timeoutMs)||9000,12000));
    if(!response?.ok)return null;
    const declared=Number(response.headers?.get?.('content-length')||0);if(declared>MAX_IMAGE_BYTES)return null;
    const buffer=Buffer.from(await response.arrayBuffer());if(!buffer.length||buffer.length>MAX_IMAGE_BYTES)return null;
    const dimensions=imageDimensions(buffer);if(!dimensions||shortEdge(dimensions)<MIN_COVER_EDGE)return null;
    return {...dimensions,bytes:buffer.length};
  }catch{return null}
}

function searchLinks(html,album){
  const targetTitle=album?.title||'',targetSeries=album?.series||'',targetNumber=album?.number||'';
  const result=[];const seen=new Set();
  const re=/<a\b[^>]*\bhref=["'](\/(?:bd|comics)\/[^"'#?]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while((match=re.exec(String(html||'')))){
    const path=decodeHtml(match[1]);
    if(path==='/bd/genres'||path.startsWith('/bd/genres/'))continue;
    const url=new URL(path,BASE).toString();if(seen.has(url))continue;seen.add(url);
    const label=visibleText(match[2]);const slug=path.replace(/^\/(?:bd|comics)\//,'').replace(/-/g,' ');
    const titleScore=Math.max(similarity(targetTitle,label)||0,similarity(targetTitle,slug)||0);
    const seriesScore=Math.max(similarity(targetSeries,label)||0,similarity(targetSeries,slug)||0);
    const numberScore=targetNumber&&new RegExp(`(?:tome|volume|vol)?\\s*${String(targetNumber).replace(/[^0-9a-z]/gi,'')}(?:\\b|$)`,'i').test(slug)?1:0;
    const score=titleScore*.62+seriesScore*.28+numberScore*.1;
    result.push({url,score,titleScore,seriesScore});
  }
  return result.sort((a,b)=>b.score-a.score).slice(0,MAX_PAGES);
}
function metadataMatch(album,html,pageTitle){
  const page=`${pageTitle} ${visibleText(html)}`;
  const title=similarity(album?.title,page)??0;
  const series=similarity(album?.series,page)??0;
  const publisher=similarity(album?.publisher,page);
  const number=album?.number?(/(?:tome|volume|vol)\s*0*([0-9]+)/i.exec(normalize(page))?.[1]===String(album.number).replace(/^0+/,'')?1:(new RegExp(`\\b${String(album.number).replace(/[^0-9a-z]/gi,'')}\\b`,'i').test(normalize(page))?.55:0)):null;
  const parts=[[title,.52],[series,.32],[number,.1],[publisher,.06]].filter(([value])=>value!==null);
  const weight=parts.reduce((sum,[,w])=>sum+w,0)||1;
  return Number((parts.reduce((sum,[value,w])=>sum+value*w,0)/weight).toFixed(3));
}
function queries(album){
  const values=[];
  if(album?.isbn)values.push(canonicalIsbn(album.isbn));
  values.push(
    [album?.series,album?.number,album?.title].filter(Boolean).join(' '),
    [album?.series,album?.title].filter(Boolean).join(' '),
    [album?.title,album?.publisher].filter(Boolean).join(' '),
    album?.title||''
  );
  return [...new Set(values.map(value=>String(value||'').trim()).filter(value=>value.length>2))].slice(0,5);
}
function candidate(album,page,imageUrl,quality,{identifierMatch=false,score=0}={}){
  const isbn=canonicalIsbn(album?.isbn);
  return {
    source:'bdbase',sourceId:page.url,sourceUrl:page.url,title:h1(page.html)||album?.title||null,
    identifiers:identifierMatch&&isbn?[isbn]:[],coverIdentifiers:identifierMatch&&isbn?[isbn]:[],coverUrl:imageUrl,
    coverWidth:quality.width,coverHeight:quality.height,coverBytes:quality.bytes,
    confidence:identifierMatch?0.96:Math.min(0.92,0.72+score*.2),
    coverEvidence:{official:false,identifierMatch,bibliographicDatabase:true,bibliographicMatch:!identifierMatch,bibliographicScore:score,sourcePage:page.url,scraped:true}
  };
}

async function exactIsbnCandidate(album,fetchImpl,timeoutMs){
  const isbn=canonicalIsbn(album?.isbn);if(!isbn)return null;
  const search=await fetchHtml(fetchImpl,`${BASE}/recherche?sch=${encodeURIComponent(isbn)}`,timeoutMs);if(!search)return null;
  const links=searchLinks(search.html,{...album,title:album?.title||isbn});
  for(const link of links.length?links:[...searchLinks(search.html,{title:'',series:''})]){
    const page=await fetchHtml(fetchImpl,link.url,timeoutMs);if(!page||!pageContainsIsbn(page.html,isbn))continue;
    const pageTitle=h1(page.html);
    const titleScore=album?.title?similarity(album.title,pageTitle):1;
    // An ISBN reused by a coffret must not force its box cover onto unrelated component titles.
    if(album?.title&&titleScore!==null&&titleScore<.28)continue;
    const imageUrl=coverForIsbn(page.html,isbn)||primaryCover(page.html);if(!imageUrl)continue;
    const quality=await inspectImage(fetchImpl,imageUrl,timeoutMs);if(!quality)continue;
    return candidate(album,page,imageUrl,quality,{identifierMatch:true,score:titleScore||0});
  }
  return null;
}

async function bibliographicCandidates(album,fetchImpl,timeoutMs){
  const seen=new Set();const found=[];
  for(const query of queries({...album,isbn:null})){
    const search=await fetchHtml(fetchImpl,`${BASE}/recherche?sch=${encodeURIComponent(query)}`,timeoutMs);if(!search)continue;
    const links=searchLinks(search.html,album).filter(link=>!seen.has(link.url));links.forEach(link=>seen.add(link.url));
    for(const link of links.slice(0,6)){
      const page=await fetchHtml(fetchImpl,link.url,timeoutMs);if(!page)continue;
      const pageTitle=h1(page.html);const score=metadataMatch(album,page.html,pageTitle);
      const titleScore=similarity(album?.title,pageTitle)??0;
      if(score<.72||(album?.title&&titleScore<.42))continue;
      const imageUrl=primaryCover(page.html);if(!imageUrl)continue;
      const quality=await inspectImage(fetchImpl,imageUrl,timeoutMs);if(!quality)continue;
      found.push(candidate(album,page,imageUrl,quality,{score}));
      if(score>=.96)return found;
    }
    if(found.length)break;
  }
  return found.sort((a,b)=>Number(b.coverEvidence?.bibliographicScore||0)-Number(a.coverEvidence?.bibliographicScore||0)).slice(0,3);
}

export async function fetchBdbaseCoverCandidates(album,opts={}){
  if(!album||(!album.isbn&&!album.title&&!album.series))return [];
  const fetchImpl=opts.fetchImpl||globalThis.fetch;
  const exact=await exactIsbnCandidate(album,fetchImpl,opts.timeoutMs);
  if(exact)return [exact];
  return bibliographicCandidates(album,fetchImpl,opts.timeoutMs);
}
