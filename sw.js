const CACHE_NAME = 'greek-zero-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './assets/icon.svg',
    './public/data/el/curriculum.json',
    './public/data/es/curriculum.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', (e) => {
    // Dynamic caching for lesson data (now HTML)
    if (e.request.url.includes('/lessons/')) {
        e.respondWith(
            caches.open('greek-lessons-v2-html').then(async (cache) => {
                const cachedResponse = await cache.match(e.request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                const networkResponse = await fetch(e.request);
                cache.put(e.request, networkResponse.clone());
                return networkResponse;
            })
        );
        return;
    }

    // Static assets strategy (cache first, fallback to network)
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then((response) => response || fetch(e.request))
    );
});

