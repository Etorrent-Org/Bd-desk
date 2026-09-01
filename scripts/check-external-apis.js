import {googleBooksUrl,openLibraryUrl,bnfSruUrl,parseGoogleBooks,parseOpenLibrary,parseBnfDublinCore} from '../src/metadata.js';

const referenceIsbn=process.argv[2]||'9782203237766';
const googleKey=process.env.GOOGLE_BOOKS_API_KEY||'';
const strict=process.env.STRICT_EXTERNAL_APIS==='1';
const googleIsbn=process.env.GOOGLE_BOOKS_TEST_ISBN||referenceIsbn;
// Use a provider-known reference so Live QA checks the endpoint/parser rather
// than the catalog coverage of one French BD edition.
const openLibraryIsbn=process.env.OPEN_LIBRARY_TEST_ISBN||'9780140328721';
const bnfIsbn=process.env.BNF_TEST_ISBN||referenceIsbn;
const tests=[
  ['Google Books',googleBooksUrl(googleIsbn,googleKey),'json',parseGoogleBooks],
  ['Open Library',openLibraryUrl(openLibraryIsbn),'json',parseOpenLibrary],
  ['BnF SRU',bnfSruUrl(bnfIsbn),'text',parseBnfDublinCore]
];
let failed=0;
for(const [name,url,type,parse] of tests){
  const started=Date.now();
  try{
    const r=await fetch(url,{headers:{
      'user-agent':'BD-Desk/1.0 (+https://github.com/Etorrent-Org/Bd-desk)',
      'accept':type==='json'?'application/json':'application/xml,text/xml;q=0.9,*/*;q=0.8'
    },signal:AbortSignal.timeout(15000)});
    const raw=await r.text();
    let records=[];
    let parseError=null;
    if(r.ok){
      try{
        const payload=type==='json'?JSON.parse(raw):raw;
        records=parse(payload);
      }catch(e){parseError=e;}
    }
    const ok=r.ok&&!parseError&&records.length>0;
    const googleThrottle=name==='Google Books'&&r.status===429&&!googleKey&&!strict;
    if(googleThrottle){
      console.log(`${name}: HTTP 429 · ${Date.now()-started} ms · DEGRADED (quota anonyme; configurer GOOGLE_BOOKS_API_KEY)`);
      continue;
    }
    if(parseError){
      console.log(`${name}: HTTP ${r.status} · ${Date.now()-started} ms · PARSE ERROR ${parseError.message}`);
      failed++;
      continue;
    }
    console.log(`${name}: HTTP ${r.status} · ${Date.now()-started} ms · ${records.length} record(s) · ${ok?'OK':'KO'}`);
    if(!ok) failed++;
  }catch(e){console.log(`${name}: ERROR ${e.message}`);failed++;}
}
process.exitCode=failed?1:0;
