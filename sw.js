const CACHE_NAME = 'greek-zero-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
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
                try {
                    const networkResponse = await fetch(e.request);
                    cache.put(e.request, networkResponse.clone());
                    return networkResponse;
                } catch (error) {
                    return new Response(`
                        <div style="padding: 5rem; text-align: center; font-family: sans-serif; line-height: 1.5;">
                            <h1 style="color: #e53e3e; margin-bottom: 1rem;">You are Offline</h1>
                            <p style="color: #757575;">This lesson hasn't been downloaded for offline use.</p>
                            <a href="#/" style="color: inherit; text-decoration: underline; margin-top: 2rem; display: inline-block;">Back to Curriculum</a>
                        </div>
                    `, {
                        headers: { 'Content-Type': 'text/html' }
                    });
                }
            })
        );
        return;
    }

    // Static assets strategy (cache first, fallback to network)
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then((response) => response || fetch(e.request))
    );
});

