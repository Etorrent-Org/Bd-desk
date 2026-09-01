import {googleBooksUrl,openLibraryUrl,bnfSruUrl,parseGoogleBooks,parseOpenLibrary,parseBnfDublinCore} from '../src/metadata.js';
const isbn=process.argv[2]||'9782203237766';
const tests=[
  ['Google Books',googleBooksUrl(isbn,process.env.GOOGLE_BOOKS_API_KEY||''),'json',parseGoogleBooks],
  ['Open Library',openLibraryUrl(isbn),'json',parseOpenLibrary],
  ['BnF SRU',bnfSruUrl(isbn),'text',parseBnfDublinCore]
];
let failed=0;
for(const [name,url,type,parse] of tests){
  const started=Date.now();
  try{
    const r=await fetch(url,{headers:{'user-agent':'BD-Desk/1.0'},signal:AbortSignal.timeout(15000)});
    const payload=type==='json'?await r.json():await r.text();
    const records=r.ok?parse(payload):[];
    const ok=r.ok&&records.length>0;
    console.log(`${name}: HTTP ${r.status} · ${Date.now()-started} ms · ${records.length} record(s) · ${ok?'OK':'KO'}`);
    if(!ok) failed++;
  }catch(e){console.log(`${name}: ERROR ${e.message}`);failed++}
}
process.exitCode=failed?1:0;
