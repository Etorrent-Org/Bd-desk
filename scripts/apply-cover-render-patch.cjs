const fs=require('fs');

function replace(path,from,to){
  const before=fs.readFileSync(path,'utf8');
  if(!before.includes(from))throw new Error(`Pattern not found in ${path}: ${from.slice(0,120)}`);
  fs.writeFileSync(path,before.replace(from,to));
}

replace('src/app.js',
  "const COVER_HOSTS=new Set(['openapi.bnf.fr','covers.openlibrary.org','books.google.com','books.googleusercontent.com','images.hachette-livre.fr','inventaire.io','bdfugue.com','www.bdfugue.com']);",
  "const COVER_HOSTS=new Set(['openapi.bnf.fr','covers.openlibrary.org','books.google.com','books.googleusercontent.com','images.hachette-livre.fr','inventaire.io','bdfugue.com','www.bdfugue.com','bdi.dlpdomain.com','static.bdbase.fr']);");

replace('src/app.js',
`        const a=getAlbum(db,m[1]);
        if(!a||!['machine','partner'].includes(a.cover_origin)||!isTrustedCoverUrl(a.cover_url))return json(res,404,{error:'Couverture machine introuvable'});
        const cover=await fetchCover(coverFetcher,a.cover_url);
        if(!cover)return json(res,502,{error:'Source de couverture indisponible'});`,
`        const a=getAlbum(db,m[1]);
        if(!a||!['machine','partner'].includes(a.cover_origin))return json(res,404,{error:'Couverture machine introuvable'});
        if(!isTrustedCoverUrl(a.cover_url)){
          db.prepare("UPDATE albums SET cover_url=NULL,cover_origin=NULL,cover_source=NULL,cover_confidence=NULL,cover_width=NULL,cover_height=NULL,cover_bytes=NULL,cover_checked_at=NULL,cover_decision='proxy-source-untrusted',cover_status='missing',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(a.id);
          return json(res,404,{error:'Source de couverture non approuvée',recoverable:true});
        }
        const cover=await fetchCover(coverFetcher,a.cover_url);
        if(!cover){
          db.prepare("UPDATE albums SET cover_url=NULL,cover_origin=NULL,cover_source=NULL,cover_confidence=NULL,cover_width=NULL,cover_height=NULL,cover_bytes=NULL,cover_checked_at=NULL,cover_decision='proxy-source-unavailable',cover_status='missing',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(a.id);
          return json(res,502,{error:'Source de couverture indisponible',recoverable:true});
        }`);

replace('public/cover-sources.js',
  "const trustedProxyUrl=src=>{try{const host=new URL(src,location.origin).hostname;return host==='openapi.bnf.fr'||host==='books.google.com'||host==='books.googleusercontent.com'||host==='images.hachette-livre.fr'||host.endsWith('.hachette-livre.fr')||host==='bdfugue.com'||host==='www.bdfugue.com'||host.endsWith('.bdfugue.com')}catch{return false}};",
  "const trustedProxyUrl=src=>{try{const host=new URL(src,location.origin).hostname;return host==='openapi.bnf.fr'||host==='covers.openlibrary.org'||host==='books.google.com'||host==='books.googleusercontent.com'||host==='images.hachette-livre.fr'||host==='inventaire.io'||host==='bdi.dlpdomain.com'||host==='static.bdbase.fr'||host.endsWith('.hachette-livre.fr')||host==='bdfugue.com'||host==='www.bdfugue.com'||host.endsWith('.bdfugue.com')}catch{return false}};");

replace('public/cover-sources.js',
`  mo.observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('pageshow',()=>scan());`,
`  mo.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('error',event=>{
    const image=event.target;
    if(!(image instanceof HTMLImageElement)||!image.classList.contains('cover-image'))return;
    void recoverImage(image);
  },true);
  addEventListener('pageshow',()=>scan());`);

const workflow='.github/workflows/live-cover-recovery.yml';
const wf=fs.readFileSync(workflow,'utf8');
const marker='      - name: Final cover audit\n';
if(!wf.includes(marker))throw new Error('Final cover audit marker missing');
const audit=`      - name: Verify every stored cover is renderable
        run: |
          curl -fsS --retry 5 --retry-delay 2 "$PREVIEW_URL/api/albums?limit=500" > /tmp/albums-render.json
          node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/tmp/albums-render.json','utf8'));const ids=(d.items||[]).filter(a=>['machine','partner'].includes(a.cover_origin)&&a.cover_url).map(a=>a.id);fs.writeFileSync('/tmp/render-ids.txt',ids.join('\\n'));console.log('RENDER_CHECK_COUNT='+ids.length);"
          : > /tmp/render-failures.txt
          if [ -s /tmp/render-ids.txt ]; then
            xargs -r -P6 -I{} sh -c 'code=$(curl -sS --retry 1 --max-time 20 -o /dev/null -w "%{http_code}" "$0/api/albums/$1/cover/image" || true); [ "$code" = 200 ] || echo "$1" >> /tmp/render-failures.txt' "$PREVIEW_URL" {} < /tmp/render-ids.txt
          fi
          FIRST=$(wc -l < /tmp/render-failures.txt | tr -d ' ')
          echo "RENDER_FAILURES_FIRST_PASS=$FIRST"
          if [ "$FIRST" -gt 0 ]; then
            sort -u /tmp/render-failures.txt > /tmp/render-failures-unique.txt
            xargs -r -P4 -I{} sh -c 'curl -fsS --retry 2 --request POST "$0/api/albums/$1/cover/resolve" >/dev/null || true' "$PREVIEW_URL" {} < /tmp/render-failures-unique.txt
            sleep 12
            : > /tmp/render-failures-final.txt
            xargs -r -P4 -I{} sh -c 'code=$(curl -sS --retry 1 --max-time 20 -o /dev/null -w "%{http_code}" "$0/api/albums/$1/cover/image" || true); [ "$code" = 200 ] || echo "$1" >> /tmp/render-failures-final.txt' "$PREVIEW_URL" {} < /tmp/render-failures-unique.txt
            FINAL=$(wc -l < /tmp/render-failures-final.txt | tr -d ' ')
          else
            FINAL=0
          fi
          echo "RENDER_FAILURES_FINAL=$FINAL"
          test "$FINAL" -eq 0

`;
fs.writeFileSync(workflow,wf.replace(marker,audit+marker));

fs.writeFileSync('tests/cover-render-pipeline.test.js',`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openDatabase } from '../src/db.js';
import { createBdDeskApp } from '../src/app.js';

function insertMachine(db,{url,source='media-participations'}){
  return db.prepare("INSERT INTO albums(isbn,series,title,cover_url,cover_origin,cover_source,cover_width,cover_height,cover_checked_at,cover_status) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,'verified') RETURNING id").get('9782205208412','Murailles invisibles (Les)','Tome 2',url,'machine',source,900,1200).id;
}

async function withServer(db,coverFetchImpl,fn){
  const server=createBdDeskApp({dbPath:':memory:',seedCsvPath:null,licenseSecret:'secret',googleBooksApiKey:'',webhookSigningSecret:'hook',allowedOrigins:[],edition:'free'},{db,seed:false,coverFetchImpl});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{return await fn('http://127.0.0.1:'+server.address().port)}finally{await new Promise(resolve=>server.close(resolve))}
}

for(const [source,url] of [['media-participations','https://bdi.dlpdomain.com/cover.jpg'],['bdbase','https://static.bdbase.fr/couvertures/cover.jpg']]){
  test('le proxy sert les couvertures '+source,async()=>{
    const db=openDatabase(':memory:');
    const id=insertMachine(db,{url,source});
    let fetched='';
    await withServer(db,async value=>{fetched=String(value);return new Response(new Uint8Array([255,216,255,0]),{status:200,headers:{'content-type':'image/jpeg'}})},async base=>{
      const response=await fetch(base+'/api/albums/'+id+'/cover/image');
      assert.equal(response.status,200);
      assert.equal(fetched,url);
    });
  });
}

test('une URL de couverture morte est invalidée au lieu de rester comptée comme trouvée',async()=>{
  const db=openDatabase(':memory:');
  const id=insertMachine(db,{url:'https://bdi.dlpdomain.com/dead.jpg'});
  await withServer(db,async()=>new Response('down',{status:503}),async base=>{
    const response=await fetch(base+'/api/albums/'+id+'/cover/image');
    assert.equal(response.status,502);
  });
  const album=db.prepare('SELECT cover_url,cover_checked_at,cover_decision,cover_status FROM albums WHERE id=?').get(id);
  assert.equal(album.cover_url,null);
  assert.equal(album.cover_checked_at,null);
  assert.equal(album.cover_decision,'proxy-source-unavailable');
  assert.equal(album.cover_status,'missing');
});

test('le récupérateur navigateur intercepte les erreurs image et connaît les CDN éditeur/BDbase',()=>{
  const js=fs.readFileSync(new URL('../public/cover-sources.js',import.meta.url),'utf8');
  assert.match(js,/document\\.addEventListener\\('error'/);
  assert.match(js,/void recoverImage\\(image\\)/);
  assert.match(js,/bdi\\.dlpdomain\\.com/);
  assert.match(js,/static\\.bdbase\\.fr/);
});
`);
