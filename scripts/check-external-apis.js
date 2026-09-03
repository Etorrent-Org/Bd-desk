import {
  googleBooksUrl,
  openLibraryUrl,
  bnfSruUrl,
  bnfIntermarcUrl,
  hachetteSearchUrl,
  hachetteSearchBody,
  parseGoogleBooks,
  parseOpenLibrary,
  parseBnfDublinCore,
  parseBnfIntermarc,
  parseHachetteSearch
} from '../src/metadata.js';

const referenceIsbn=process.argv[2]||'9782203237766';
const googleKey=process.env.GOOGLE_BOOKS_API_KEY||'';
const strict=process.env.STRICT_EXTERNAL_APIS==='1';
const googleIsbn=process.env.GOOGLE_BOOKS_TEST_ISBN||referenceIsbn;
const hachetteIsbn=process.env.HACHETTE_TEST_ISBN||'9782344059814';
const openLibraryIsbn=process.env.OPEN_LIBRARY_TEST_ISBN||'9780140328721';
const bnfIsbn=process.env.BNF_TEST_ISBN||referenceIsbn;

const tests=[
  {
    name:'Hachette / catalogue Glénat',
    url:hachetteSearchUrl(),
    type:'json',
    parse:parseHachetteSearch,
    init:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(hachetteSearchBody(hachetteIsbn))}
  },
  {name:'Google Books',url:googleBooksUrl(googleIsbn,googleKey),type:'json',parse:parseGoogleBooks},
  {name:'Open Library',url:openLibraryUrl(openLibraryIsbn),type:'json',parse:parseOpenLibrary},
  {name:'BnF SRU Dublin Core',url:bnfSruUrl(bnfIsbn),type:'text',parse:parseBnfDublinCore},
  {name:'BnF SRU Intermarc',url:bnfIntermarcUrl(bnfIsbn),type:'text',parse:parseBnfIntermarc}
];

let failed=0;
for(const provider of tests){
  const started=Date.now();
  try{
    const r=await fetch(provider.url,{...provider.init,headers:{
      'user-agent':'BD-Desk/1.0 (+https://github.com/Etorrent-Org/Bd-desk)',
      accept:provider.type==='json'?'application/json':'application/xml,text/xml;q=0.9,*/*;q=0.8',
      ...(provider.init?.headers||{})
    },signal:AbortSignal.timeout(15000)});
    const raw=await r.text();
    let records=[];
    let parseError=null;
    if(r.ok){
      try{
        const payload=provider.type==='json'?JSON.parse(raw):raw;
        records=provider.parse(payload);
      }catch(error){parseError=error}
    }
    const ok=r.ok&&!parseError&&records.length>0;
    const googleThrottle=provider.name==='Google Books'&&r.status===429&&!googleKey&&!strict;
    if(googleThrottle){
      console.log(provider.name+': HTTP 429 · '+(Date.now()-started)+' ms · DEGRADED (quota anonyme; configurer GOOGLE_BOOKS_API_KEY)');
      continue;
    }
    if(parseError){
      console.log(provider.name+': HTTP '+r.status+' · '+(Date.now()-started)+' ms · PARSE ERROR '+parseError.message);
      failed++;
      continue;
    }
    console.log(provider.name+': HTTP '+r.status+' · '+(Date.now()-started)+' ms · '+records.length+' record(s) · '+(ok?'OK':'KO'));
    if(!ok)failed++;
  }catch(error){
    console.log(provider.name+': ERROR '+error.message);
    failed++;
  }
}
process.exitCode=failed?1:0;
