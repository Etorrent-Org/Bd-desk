import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchBdbaseCoverCandidates } from '../src/bdbase-covers.js';

function png(width=650,height=900){
  const buffer=Buffer.alloc(24);
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(buffer,0);
  buffer.writeUInt32BE(width,16);
  buffer.writeUInt32BE(height,20);
  return buffer;
}

function mockFetch(ean,tome){
  return async url=>{
    const value=String(url);
    if(value.includes('/recherche?sch='))return {
      ok:true,url:value,text:async()=>`<a href="/comics/rags-${tome}">Rags ${tome}</a>`
    };
    if(value===`https://www.bdbase.fr/comics/rags-${tome}`)return {
      ok:true,url:value,text:async()=>`<h1>Rags ${tome}</h1><img src="https://static.bdbase.fr/couvertures/rags-${tome}.png"><p>Série Rags</p><p>ISBN ${ean}</p>`
    };
    if(value===`https://static.bdbase.fr/couvertures/rags-${tome}.png`)return {
      ok:true,headers:{get:()=>null},arrayBuffer:async()=>png()
    };
    return {ok:false,url:value,text:async()=>'',headers:{get:()=>null},arrayBuffer:async()=>Buffer.alloc(0)};
  };
}

for(const [ean,tome] of [['3770013604065','1'],['3770013604577','2']]){
  test(`Rags tome ${tome} accepte l'EAN exact même si le titre BDGest est générique`,async()=>{
    const candidates=await fetchBdbaseCoverCandidates({isbn:ean,series:'Rags',number:tome,title:`Tome ${tome}`,publisher:'Alayone Comics'},{fetchImpl:mockFetch(ean,tome)});
    assert.equal(candidates.length,1);
    assert.equal(candidates[0].source,'bdbase');
    assert.equal(candidates[0].coverEvidence.identifierMatch,true);
    assert.equal(candidates[0].coverWidth,650);
  });
}

test('une couverture BDbase déjà présente sous 700 px laisse la main à BDfugue / éditeur',async()=>{
  const ean='3770013604065';
  const candidates=await fetchBdbaseCoverCandidates({
    isbn:ean,series:'Rags',number:'1',title:'Tome 1',publisher:'Alayone Comics',
    cover_source:'bdbase',cover_width:650,cover_height:900
  },{fetchImpl:mockFetch(ean,'1')});
  assert.deepEqual(candidates,[]);
});
