import {googleBooksUrl,openLibraryUrl,bnfSruUrl,parseGoogleBooks,parseOpenLibrary,parseBnfDublinCore} from '../src/metadata.js';

const isbn=process.argv[2]||'9782203237766';
const tests=[
  ['Google Books',googleBooksUrl(isbn,process.env.GOOGLE_BOOKS_API_KEY||''),'json',parseGoogleBooks],
  ['Open Library',openLibraryUrl(isbn),'json',parseOpenLibrary],
  ['BnF SRU',bnfSruUrl(isbn),'text',parseBnfDublinCore]
];

let available=0;
let matched=0;
for(const [name,url,type,parse] of tests){
  const started=Date.now();
  try{
    const r=await fetch(url,{headers:{'user-agent':'BD-Desk/1.0','accept':'application/json, application/xml, text/xml;q=0.9, */*;q=0.8'},signal:AbortSignal.timeout(15000)});
    const raw=await r.text();
    if(!r.ok){
      console.log(`${name}: HTTP ${r.status} · ${Date.now()-started} ms · provider unavailable/throttled`);
      continue;
    }
    available++;
    let payload=raw;
    if(type==='json'){
      try{payload=JSON.parse(raw)}catch{
        console.log(`${name}: HTTP ${r.status} · ${Date.now()-started} ms · non-JSON response`);
        continue;
      }
    }
    const records=parse(payload);
    if(records.length>0) matched++;
    console.log(`${name}: HTTP ${r.status} · ${Date.now()-started} ms · ${records.length} record(s) · ${records.length?'OK':'NO MATCH'}`);
  }catch(e){
    console.log(`${name}: ERROR ${e.message} · provider unavailable`);
  }
}

// Live providers are third-party dependencies: one healthy source is enough to
// validate network/parsing. A total outage remains a hard CI failure.
if(available===0){
  console.error('No metadata provider was reachable.');
  process.exitCode=1;
}else if(matched===0){
  console.error('Providers were reachable but none returned a record for the reference ISBN.');
  process.exitCode=1;
}else{
  console.log(`External metadata quorum: ${matched}/${available} reachable provider(s) returned a match.`);
}
