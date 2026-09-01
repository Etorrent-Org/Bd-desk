const CACHE='bd-desk-v10'; const CORE=['/','/styles.css','/mobile-fixes.css','/route-scroll.js','/cover-fallback.js','/detail-enhance.js','/nav-add-fix.js','/ean-scanner.js','/app.js','/manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET'||new URL(e.request.url).pathname.startsWith('/api/'))return; e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));});
