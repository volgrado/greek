const CACHE_NAME = 'greek-zero-v1';
const ASSETS = [
    './',
    './greek.html',
    './data.json',
    './manifest.json',
    './assets/icon.svg'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
