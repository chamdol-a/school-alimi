/* 학교알리미 탐색기 · 오프라인 캐시 (자료를 바꾸면 VERSION 숫자를 올릴 것) */
const VERSION = 'v1126-7';
const CORE = ['./', 'index.html', 'assets/app.css', 'assets/themes.css', 'assets/app.js', 'assets/students.js', 'assets/xlsx-lite.js', 'assets/korea-map.js',
  'assets/fonts/GmarketSansMedium.woff', 'assets/fonts/HakgyoansimBareondotumR.woff2', 'assets/fonts/HakgyoansimBareondotumB.woff2',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))   /* 브라우저 임시 저장본이 아닌 최신 파일을 받아 둔다 */).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/data/')) {
    // 자료: 네트워크 먼저(최신), 실패하면 저장본
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true })));
  } else {
    // 화면 파일: 저장본 먼저, 없으면 네트워크
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
      if (res.ok && (url.pathname.endsWith('students-data.js') || url.pathname.endsWith('sgg-map.js'))) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); }
      return res; })));
  }
});
