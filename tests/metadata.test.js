import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  openLibraryCover,
  googleBooksUrl,
  openLibraryUrl,
  bnfSruUrl,
  bnfIntermarcUrl,
  bnfCoverUrl,
  hachetteSearchUrl,
  hachetteSearchBody,
  parseGoogleBooks,
  parseOpenLibrary,
  parseBnfDublinCore,
  parseBnfIntermarc,
  parseHachetteSearch,
  scoreCandidate,
  resolveCandidates,
  mergeCandidates,
  fetchMetadata
} from '../src/metadata.js';

const isbn='9782203237766';
const sweetIsbn='9782344059814';
const fixture=name=>fs.readFileSync(new URL('./fixtures/metadata/'+name,import.meta.url),'utf8');
const sweetHachette=JSON.parse(fixture('sweet-revenge-hachette.json'));

test('URLs fournisseurs exactes',()=>{
  assert.match(openLibraryCover(isbn),/covers\.openlibrary\.org/);
  assert.match(googleBooksUrl(isbn),/q=isbn%3A9782203237766/);
  assert.equal(new URL(openLibraryUrl(isbn)).searchParams.get('isbn'),isbn);
  assert.equal(new URL(bnfSruUrl(isbn)).searchParams.get('query'),'bib.isbn adj "9782203237766"');
  assert.equal(new URL(bnfIntermarcUrl(isbn)).searchParams.get('recordSchema'),'intermarcXchange');
  assert.match(bnfCoverUrl(sweetIsbn),/EAN=9782344059814/);
  assert.equal(hachetteSearchUrl(),'https://api.hachette.fr/search');
  assert.equal(hachetteSearchBody(sweetIsbn).source.query.multi_match.query,sweetIsbn);
});

test('parse Google Books conserve une couverture issue du record',()=>{
  const x=parseGoogleBooks({items:[{id:'x',volumeInfo:{title:'T',authors:['A'],publisher:'P',imageLinks:{thumbnail:'http://x'},industryIdentifiers:[{type:'ISBN_13',identifier:isbn}]}}]});
  assert.deepEqual(x[0].authors,['A']);
  assert.equal(x[0].coverUrl,'https://x');
  assert.deepEqual(x[0].identifiers,[isbn]);
});

test('parse Google Books structure série et tome',()=>{
  const x=parseGoogleBooks({items:[{id:'x',volumeInfo:{title:'Valhalla Bunker - Tome 01 - Sweet revenge',publisher:'Glénat'}}]});
  assert.equal(x[0].title,'Sweet revenge');
  assert.equal(x[0].series,'Valhalla Bunker');
  assert.equal(x[0].seriesNumber,'1');
});

test('parse OpenLibrary normalise les identifiants',()=>{
  const x=parseOpenLibrary({docs:[{key:'/works/1',edition_key:['OL1M'],title:'T',publisher:['P'],author_name:['A'],first_publish_year:2022,isbn:[isbn],cover_i:42,series:['Valhalla Bunker #1']}]});
  assert.equal(x[0].publisher,'P');
  assert.equal(x[0].sourceId,'OL1M');
  assert.deepEqual(x[0].authors,['A']);
  assert.equal(x[0].series,'Valhalla Bunker');
  assert.equal(x[0].seriesNumber,'1');
  assert.match(x[0].coverUrl,/covers\.openlibrary\.org/);
  assert.deepEqual(x[0].identifiers,[isbn]);
  assert.deepEqual(parseOpenLibrary({error:'x'}),[]);
});

test('parse OpenLibrary fiche directe',()=>{
  const x=parseOpenLibrary({key:'/books/OL1M',title:'Saga - Tome 02 - Le retour',publishers:['editions exemple'],publish_date:'2024',number_of_pages:48,authors:[{name:'Auteur Exemple'}],isbn_13:[isbn],series:['Saga tome 02'],covers:[99]});
  assert.equal(x[0].title,'Le retour');
  assert.equal(x[0].series,'Saga');
  assert.equal(x[0].seriesNumber,'2');
  assert.deepEqual(x[0].authors,['Auteur Exemple']);
  assert.deepEqual(x[0].identifiers,[isbn]);
  assert.match(x[0].coverUrl,/\/b\/id\/99-L\.jpg/);
});

test('parse BnF Dublin Core expose ISBN et couverture BnF',()=>{
  const x=parseBnfDublinCore(fixture('sweet-revenge-bnf.xml'));
  assert.equal(x[0].title,'Sweet revenge');
  assert.equal(x[0].publisher,'Glénat');
  assert.equal(x[0].collection,'Comix Buro');
  assert.equal(x[0].series,'Valhalla Bunker');
  assert.equal(x[0].seriesNumber,'1');
  assert.deepEqual(x[0].identifiers,[sweetIsbn]);
  assert.match(x[0].coverUrl,/openapi\.bnf\.fr\/couverture/);
  assert.deepEqual(parseBnfDublinCore('<srw:numberOfRecords>0</srw:numberOfRecords>'),[]);
});

test('parse BnF Intermarc extrait les champs éditoriaux de la fiche réelle',()=>{
  const x=parseBnfIntermarc(fixture('sweet-revenge-intermarc.xml'));
  assert.equal(x[0].title,'Sweet revenge');
  assert.equal(x[0].series,'Valhalla Bunker');
  assert.equal(x[0].seriesNumber,'1');
  assert.equal(x[0].collection,'Comix Buro');
  assert.equal(x[0].publisher,'Glénat');
  assert.equal(x[0].publishedDate,'2024');
  assert.equal(x[0].pageCount,64);
  assert.equal(x[0].format,'32 cm');
  assert.deepEqual(x[0].authors,['Fabien Bedouel']);
  assert.deepEqual(x[0].identifiers,[sweetIsbn]);
});

test('parse BnF Intermarc fallback 290 et 410',()=>{
  const xml='<srw:numberOfRecords>1</srw:numberOfRecords><record><datafield tag="290"><subfield code="a">Saga Test</subfield><subfield code="h">Tome 02</subfield></datafield><datafield tag="410"><subfield code="t">Collection Test</subfield></datafield></record>';
  const x=parseBnfIntermarc(xml);
  assert.equal(x[0].series,'Saga Test');
  assert.equal(x[0].seriesNumber,'2');
  assert.equal(x[0].collection,'Collection Test');
});

test('parse catalogue officiel Hachette/Glénat pour Sweet Revenge',()=>{
  const x=parseHachetteSearch(sweetHachette);
  assert.equal(x.length,1);
  assert.equal(x[0].title,'Sweet revenge');
  assert.equal(x[0].series,'Valhalla Bunker');
  assert.equal(x[0].seriesNumber,'1');
  assert.equal(x[0].publisher,'Glénat');
  assert.equal(x[0].collection,'Comix Buro');
  assert.equal(x[0].publishedDate,'2024-08-21');
  assert.equal(x[0].pageCount,64);
  assert.equal(x[0].format,'24 × 32 cm');
  assert.deepEqual(x[0].authors,['Fabien Bedouel']);
  assert.deepEqual(x[0].identifiers,[sweetIsbn]);
  assert.match(x[0].coverUrl,/images\.hachette-livre\.fr/);
  assert.equal(x[0].coverEvidence.official,true);
});

test('résolution rejette une fiche titre seule ou un ISBN contradictoire',()=>{
  const titleOnly={source:'google-books',sourceId:'title-only',title:'Sweet revenge',coverUrl:'https://books.google.com/title-only.jpg'};
  const foreign={source:'google-books',sourceId:'foreign',title:'Sweet revenge',identifiers:['9782203237766'],coverUrl:'https://books.google.com/foreign.jpg'};
  assert.equal(scoreCandidate(titleOnly,{isbn:sweetIsbn}).eligible,false);
  assert.equal(scoreCandidate(foreign,{isbn:sweetIsbn}).identifierConflict,true);
  const resolution=resolveCandidates(sweetIsbn,[titleOnly,foreign,parseHachetteSearch(sweetHachette)[0]]);
  assert.equal(resolution.cover.source,'hachette');
  assert.equal(resolution.fields.title.value,'Sweet revenge');
  assert.equal(resolution.fields.number.value,'1');
  assert.ok(resolution.candidates.find(x=>x.sourceId==='foreign').match.eligible===false);
});

test('fusion conserve données utilisateur et ne génère pas de couverture mécanique',()=>{
  const exact=parseHachetteSearch(sweetHachette)[0];
  const x=mergeCandidates({isbn:sweetIsbn,title:'Mon titre',publisher:null,series:null,number:null,cover_url:null},[exact]);
  assert.equal(x.album.title,'Mon titre');
  assert.equal(x.album.publisher,'Glénat');
  assert.equal(x.album.series,'Valhalla Bunker');
  assert.equal(x.album.number,'1');
  assert.equal(x.album.collectionName,'Comix Buro');
  assert.equal(x.album.writer,'Fabien Bedouel');
  assert.equal(x.album.coverUrl,exact.coverUrl);
  const noEvidence=mergeCandidates({isbn:sweetIsbn,title:'Mon titre',cover_url:null},[{source:'open-library',title:'Sweet revenge'}]);
  assert.equal(noEvidence.album.coverUrl,undefined);
});

test('fetchMetadata isole les pannes et interroge cinq fournisseurs en parallèle',async()=>{
  let n=0;
  const fake=async url=>{
    n++;
    if(url.includes('api.hachette'))return{ok:true,json:async()=>sweetHachette};
    if(url.includes('googleapis'))return{ok:true,json:async()=>({items:[{id:'g',volumeInfo:{title:'Google',industryIdentifiers:[{identifier:sweetIsbn}]}}]})};
    if(url.includes('openlibrary'))throw new Error('down');
    if(url.includes('intermarcXchange'))return{ok:true,text:async()=>fixture('sweet-revenge-intermarc.xml')};
    return{ok:true,text:async()=>fixture('sweet-revenge-bnf.xml')};
  };
  const out=await fetchMetadata(sweetIsbn,{fetchImpl:fake});
  assert.equal(n,5);
  assert.equal(out.length,4);
  assert.ok(out.some(x=>x.source==='hachette'));
});

test('fetchMetadata ignore les réponses HTTP en erreur',async()=>{
  let n=0;
  const out=await fetchMetadata(isbn,{fetchImpl:async()=>{n++;return{ok:false}}});
  assert.equal(n,5);
  assert.deepEqual(out,[]);
});

test('adapters tolèrent les records partiels ou mal formés',()=>{
  const partial=parseHachetteSearch({hits:[{source:{
    product__ean:[sweetIsbn],
    product__publisher:['Editeur brut'],
    product__titre_de_couverture:['Titre simple'],
    product__decoupled_render:'not-json'
  }}]});
  assert.equal(partial[0].publisher,'Editeur Brut');
  assert.equal(partial[0].sourceUrl,null);
  const objectRender=parseHachetteSearch({hits:{hits:[{_source:{
    product__ean:[sweetIsbn],
    product__titre_de_couverture:['Saga'],
    product__decoupled_render:'{"sous_titre_de_couverture":"Sous-titre","numero_de_tome":"02"}'
  }}]}});
  assert.equal(objectRender[0].title,'Sous-titre');
  assert.equal(objectRender[0].seriesNumber,'2');
  assert.deepEqual(parseHachetteSearch({hits:{hits:[]}}),[]);
});

test('résolution déterministe départage deux records équivalents',()=>{
  const candidates=['b','a'].map(id=>({source:'google-books',sourceId:id,title:'Sweet revenge',identifiers:[sweetIsbn],coverUrl:'https://books.google.com/'+id+'.jpg',coverEvidence:{apiRecord:true}}));
  const resolution=resolveCandidates(sweetIsbn,candidates);
  assert.equal(resolution.winner.sourceId,'a');
  assert.equal(resolution.cover.candidateId,'a');
});
