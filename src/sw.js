/** @type {string} */
const CACHE_NAME = 'greek-zero-v11';
/** @type {string[]} */
const LESSON_CACHES = ['pwa-lessons-el-v2', 'pwa-lessons-es-v2'];

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/css/variables.css',
    '/css/base.css',
    '/css/typography.css',
    '/css/layout.css',
    '/css/components.css',
    '/css/lessons.css',
    '/css/errors.css',
    '/css/transitions.css',
    '/js/main.js',
    '/js/config.js',
    '/js/state.js',
    '/js/data.js',
    '/js/theme.js',
    '/js/i18n.js',
    '/js/search.js',
    '/js/router.js',
    '/js/pwa.js',
    '/manifest.json',
    '/assets/icon.svg',
    '/public/data/el/curriculum.json',
    '/public/data/es/curriculum.json'
];

/**
 * Service Worker Install Event
 * Caches static assets for offline use
 * @param {ExtendableEvent} e 
 */
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
});

/**
 * Service Worker Activate Event
 * Cleans up old caches to ensure the latest version is used
 * @param {ExtendableEvent} e 
 */
self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
    const WHITELIST = [CACHE_NAME, 'pwa-fonts-v1', ...LESSON_CACHES];
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (!WHITELIST.includes(key)) {
                    console.log('[Service Worker] Deleting old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

/**
 * Service Worker Fetch Event
 * Implements caching strategies for static and dynamic assets
 * @param {FetchEvent} e 
 */
self.addEventListener('fetch', (e) => {
    // Font caching strategy for Google Fonts
    if (e.request.url.startsWith('https://fonts.googleapis.com') ||
        e.request.url.startsWith('https://fonts.gstatic.com')) {
        e.respondWith(
            caches.match(e.request).then(cached => {
                return cached || fetch(e.request).then(response => {
                    const clone = response.clone();
                    caches.open('pwa-fonts-v1').then(cache => cache.put(e.request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // Dynamic caching for lesson data (specifically HTML fragments in data folder)
    if (e.request.url.includes('/data/') && e.request.url.includes('/lessons/')) {
        const lang = e.request.url.includes('/el/') ? 'el' : 'es';
        const cacheName = `pwa-lessons-${lang}-v2`;

        e.respondWith((async () => {
            const cache = await caches.open(cacheName);
            let response = await cache.match(e.request);

            if (!response) {
                try {
                    response = await fetch(e.request);
                    cache.put(e.request, response.clone());
                } catch (error) {
                    return new Response(`
                        <div style="padding: 5rem; text-align: center; font-family: sans-serif; line-height: 1.5;">
                            <h1 style="color: #e53e3e; margin-bottom: 1rem;">You are Offline</h1>
                            <p style="color: #757575;">This lesson hasn't been downloaded for offline use.</p>
                            <a href="/" style="color: inherit; text-decoration: underline; margin-top: 2rem; display: inline-block;">Back to Curriculum</a>
                        </div>
                    `, {
                        headers: {
                            'Content-Type': 'text/html',
                            'X-Offline-Fallback': 'true'
                        }
                    });
                }
            }

            // Client-Side Server: The Service Worker constructs the full HTML!
            const lessonHTML = await response.text();

            // 🛣️ Genius Router: Extract lesson securely using URLPattern where available
            let lessonId = '';
            if ('URLPattern' in self) {
                const pattern = new URLPattern({ pathname: '/lessons/:id.html' });
                const match = pattern.exec(e.request.url);
                if (match) lessonId = decodeURIComponent(match.pathname.groups.id);
            }

            // Fallback
            if (!lessonId) {
                const reqUrl = new URL(e.request.url);
                const pathParts = reqUrl.pathname.split('/');
                lessonId = decodeURIComponent(pathParts[pathParts.length - 1].replace('.html', ''));
            }

            let metaHTML = '';
            let navHTML = '';

            try {
                // 1. Get Curriculum to build headers/footers
                const curriculumUrl = e.request.url.split('?')[0].replace(/\/lessons\/.*$/, '/curriculum.json');
                let curriculumRes = await caches.match(curriculumUrl);
                if (!curriculumRes) {
                    curriculumRes = await fetch(curriculumUrl);
                }
                const curriculum = await curriculumRes.json();

                // 2. Flatten DB
                const flatLessons = [];
                let cIdx = 1;
                const structure = curriculum.structure || curriculum;
                for (const section in structure) {
                    if (!Array.isArray(structure[section])) continue;
                    for (const l of structure[section]) {
                        flatLessons.push({ ...l, sectionName: section, cIdx });
                    }
                    cIdx++;
                }

                // 3. Find current lesson context
                const currentIndex = flatLessons.findIndex(l => l.id === lessonId);

                if (currentIndex !== -1) {
                    const l = flatLessons[currentIndex];
                    const chapterName = `${l.cIdx}. ${l.sectionName}`;
                    const lessonNum = l.hierarchical_num;

                    metaHTML = `
                        <div class="lesson-meta">
                            ${chapterName} ${lessonNum ? `&middot; LESSON ${lessonNum}` : ''}
                        </div>
                    `;

                    let prevLink = '<span></span>';
                    if (currentIndex > 0) {
                        const prev = flatLessons[currentIndex - 1];
                        prevLink = `<a href="/lessons/${prev.id}">← ${prev.title}</a>`;
                    }

                    let nextLink = '<span></span>';
                    if (currentIndex < flatLessons.length - 1) {
                        const next = flatLessons[currentIndex + 1];
                        nextLink = `<a href="/lessons/${next.id}">${next.title} →</a>`;
                    }

                    navHTML = `
                    <div class="lesson-nav">
                        ${prevLink}
                        <a href="/" class="menu-btn">MENU</a>
                        ${nextLink}
                    </div>`;
                }
            } catch (err) {
                console.error("[SW] Error building nav strings:", err);
            }



            // 4. Stitch it together exactly like a server would
            const fullHTML = metaHTML + lessonHTML + navHTML;

            return new Response(fullHTML, {
                headers: { 'Content-Type': 'text/html' }
            });
        })());
        return;
    }

    // Static assets strategy (cache first, fallback to network)
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then((response) => response || fetch(e.request))
    );
});
