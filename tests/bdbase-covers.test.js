import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchBdbaseCoverCandidates } from '../src/bdbase-covers.js';
import { fetchBibliographicCoverCandidates } from '../src/official-covers.js';
import { openDatabase, persistCoverDecision } from '../src/db.js';

function png(width=900,height=1400){
  const buffer=Buffer.alloc(24);
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(buffer,0);
  buffer.writeUInt32BE(width,16);
  buffer.writeUInt32BE(height,20);
  return buffer;
}
function htmlResponse(html,url){return {ok:true,url,text:async()=>html}}
function imageResponse(width=900,height=1400){return {ok:true,headers:{get:()=>null},arrayBuffer:async()=>png(width,height)}}

test('BDbase retrouve Trafika par ISBN exact et prend la couverture non miniature',async()=>{
  const fetchImpl=async url=>{
    const value=String(url);
    if(value.includes('/recherche?sch=9782919069910'))return htmlResponse(`<div class="book"><a href="/bd/trafika" class="card-link"><div class="card-title">Trafika</div></a></div>`,value);
    if(value==='https://www.bdbase.fr/bd/trafika')return htmlResponse(`<html><h1>Trafika</h1><img src="https://static.bdbase.fr/images/books/08/couvertures/302708.jpg" alt="Couverture de l'album Trafika"><div>ISBN</div><div>9782919069910 / 2919069918</div></html>`,value);
    if(value==='https://static.bdbase.fr/images/books/08/couvertures/302708.jpg')return imageResponse(900,1215);
    return {ok:false,url:value};
  };
  const candidates=await fetchBdbaseCoverCandidates({isbn:'9782919069910',series:'Trafika',title:'Trafika',publisher:"Des Bulles dans l'Océan"},{fetchImpl});
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].source,'bdbase');
  assert.equal(candidates[0].coverUrl,'https://static.bdbase.fr/images/books/08/couvertures/302708.jpg');
  assert.equal(candidates[0].coverEvidence.identifierMatch,true);
  assert.equal(candidates[0].coverWidth,900);
});

test('BDbase associe le bon visuel à la bonne édition quand une page contient plusieurs ISBN',async()=>{
  const fetchImpl=async url=>{
    const value=String(url);
    if(value.includes('/recherche?sch=9782724294798'))return htmlResponse(`<a href="/bd/les-bidochon-double" class="card-link">Les Bidochon Tomes 5 et 6</a>`,value);
    if(value==='https://www.bdbase.fr/bd/les-bidochon-double')return htmlResponse(`<html><h1>Les Bidochon Tomes 5 et 6 Ragots intimes / En voyage organisé</h1>
      <img src="https://static.bdbase.fr/images/books/56/couvertures/20056.jpg"><div>ISBN 9782724252675</div>
      <h3>Édition 1996</h3><img src="https://static.bdbase.fr/images/books/11/couvertures/142111.jpg"><div>ISBN 9782724294798</div></html>`,value);
    if(value.endsWith('/142111.jpg'))return imageResponse(800,1100);
    if(value.endsWith('/20056.jpg'))return imageResponse(800,1100);
    return {ok:false,url:value};
  };
  const candidates=await fetchBdbaseCoverCandidates({isbn:'9782724294798',series:'Les Bidochon',title:'Ragots intimes / En voyage organisé',publisher:'France Loisirs'},{fetchImpl});
  assert.equal(candidates[0].coverUrl,'https://static.bdbase.fr/images/books/11/couvertures/142111.jpg');
});

test('BDbase retrouve Chihuahua Pearl sans ISBN grâce à la série et au titre',async()=>{
  const fetchImpl=async url=>{
    const value=String(url);
    if(value.includes('/recherche?sch='))return htmlResponse(`<section id="tab-pane-books">
      <a href="/bd/blueberry" class="card-link"><div class="card-title">Blueberry</div></a>
      <a href="/bd/blueberry-tome-13-chihuahua-pearl" class="card-link"><div class="card-title">Blueberry Tome 13 Chihuahua Pearl</div></a>
      <a href="/bd/chihuahua" class="card-link"><div class="card-title">Chihuahua</div></a>
    </section>`,value);
    if(value==='https://www.bdbase.fr/bd/blueberry')return htmlResponse(`<html><h1>Blueberry</h1><img src="https://static.bdbase.fr/images/books/thumbs/15/couvertures/22315.jpg"></html>`,value);
    if(value==='https://www.bdbase.fr/bd/blueberry-tome-13-chihuahua-pearl')return htmlResponse(`<html><h1>Blueberry Tome 13 Chihuahua Pearl</h1><img src="https://static.bdbase.fr/images/books/15/couvertures/22315.jpg"><div>Série Blueberry</div><div>Dargaud</div><div>Tome 13</div></html>`,value);
    if(value==='https://www.bdbase.fr/bd/chihuahua')return htmlResponse(`<html><h1>Chihuahua</h1></html>`,value);
    if(value==='https://static.bdbase.fr/images/books/15/couvertures/22315.jpg')return imageResponse(900,1200);
    return {ok:false,url:value};
  };
  const album={series:'Blueberry',number:'13',title:'Chihuahua Pearl',publisher:'Dargaud'};
  const candidates=await fetchBdbaseCoverCandidates(album,{fetchImpl});
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].source,'bdbase');
  assert.equal(candidates[0].coverEvidence.bibliographicMatch,true);
  assert.match(candidates[0].sourceUrl,/blueberry-tome-13-chihuahua-pearl/);
  const aggregated=await fetchBibliographicCoverCandidates(album,{fetchImpl});
  assert.equal(aggregated[0].source,'bdbase');
});

test('BDbase refuse une image trop petite',async()=>{
  const fetchImpl=async url=>{
    const value=String(url);
    if(value.includes('/recherche?sch='))return htmlResponse(`<a href="/bd/trafika" class="card-link">Trafika</a>`,value);
    if(value==='https://www.bdbase.fr/bd/trafika')return htmlResponse(`<h1>Trafika</h1><img src="https://static.bdbase.fr/images/books/08/couvertures/302708.jpg"><div>9782919069910</div>`,value);
    if(value.includes('302708.jpg'))return imageResponse(120,180);
    return {ok:false,url:value};
  };
  assert.deepEqual(await fetchBdbaseCoverCandidates({isbn:'9782919069910',title:'Trafika',series:'Trafika'},{fetchImpl}),[]);
});

test('la base persiste une couverture BDbase vérifiée',()=>{
  const db=openDatabase(':memory:');
  const id=db.prepare('INSERT INTO albums(isbn,series,title) VALUES(?,?,?) RETURNING id').get('9782919069910','Trafika','Trafika').id;
  const decision=persistCoverDecision(db,id,{url:'https://static.bdbase.fr/images/books/08/couvertures/302708.jpg',source:'bdbase',confidence:.96,width:900,height:1215,bytes:150000,decision:'verified-source'});
  assert.equal(decision.updated,true);
  assert.equal(decision.album.cover_origin,'machine');
  assert.equal(decision.album.cover_source,'bdbase');
  assert.equal(decision.album.cover_status,'verified');
});
