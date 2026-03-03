class AppState {
    constructor() {
        this._listeners = {};

        // 📡 Genius Sync: Telepathic Broadcast Channel
        this.syncChannel = new BroadcastChannel('greek_app_sync');

        this.syncChannel.onmessage = (e) => {
            const { type, prop, value, id } = e.data;
            if (type === 'SYNC_PROP') {
                if (this._data[prop] !== value) {
                    this._data[prop] = value;
                    if (this._listeners[prop]) {
                        if (document.startViewTransition) {
                            document.startViewTransition(() => {
                                this._listeners[prop].forEach(fn => fn(value));
                            });
                        } else {
                            this._listeners[prop].forEach(fn => fn(value));
                        }
                    }
                }
            } else if (type === 'SYNC_VIEWED') {
                this._data.viewedLessons.add(id);
                // Blindly attempt to check the UI if curriculum is open
                const link = document.querySelector(`a[href="/lessons/${id}"]`);
                if (link) link.classList.add('viewed');
            } else if (type === 'SYNC_RESET_PROGRESS') {
                this._data.viewedLessons.clear();
                document.querySelectorAll('.curriculum-link.viewed').forEach(el => el.classList.remove('viewed'));
            }
        };

        this._data = {
            currentLang: localStorage.getItem('lang') || 'el',
            currentTheme: localStorage.getItem('theme'),
            viewMode: localStorage.getItem('viewMode') || 'grammar',
            db: null,
            isDownloaded: false,
            lessonCache: {},
            viewedLessons: new Set(JSON.parse(localStorage.getItem('viewed') || '[]')),
            searchIndex: {},
            invertedIndex: {}
        };

        if (!this._data.currentTheme) {
            this._data.currentTheme = localStorage.getItem('dark-mode') === 'true' ? 'dark' : 'light';
        }

        return new Proxy(this, {
            get: (target, prop) => {
                if (prop in target._data) return target._data[prop];
                if (typeof target[prop] === 'function') return target[prop].bind(target);
                return target[prop];
            },
            set: (target, prop, value) => {
                if (prop in target._data) {
                    const changed = target._data[prop] !== value;
                    target._data[prop] = value;
                    if (changed) {
                        // Broadcast the change to other tabs magically
                        target.syncChannel.postMessage({ type: 'SYNC_PROP', prop, value });

                        if (target._listeners[prop]) {
                            if (document.startViewTransition) {
                                document.startViewTransition(() => {
                                    target._listeners[prop].forEach(fn => fn(value));
                                });
                            } else {
                                target._listeners[prop].forEach(fn => fn(value));
                            }
                        }
                    }
                    return true;
                }
                target[prop] = value;
                return true;
            }
        });
    }

    subscribe(key, callback) {
        if (!this._listeners[key]) this._listeners[key] = [];
        this._listeners[key].push(callback);
    }

    markAsViewed(id, broadcast = true) {
        if (!this._data.viewedLessons.has(id)) {
            this._data.viewedLessons.add(id);
            localStorage.setItem('viewed', JSON.stringify([...this._data.viewedLessons]));
            if (broadcast) {
                this.syncChannel.postMessage({ type: 'SYNC_VIEWED', id });
            }
        }
    }

    clearViewed(broadcast = true) {
        this._data.viewedLessons.clear();
        localStorage.removeItem('viewed');
        if (broadcast) {
            this.syncChannel.postMessage({ type: 'SYNC_RESET_PROGRESS' });
        }
    }

    getFlatLessons() {
        if (!this._data.db) return [];

        // Logic split by viewMode (grammar vs vocabulary)
        const structure = this._data.db.structure[this._data.viewMode] || this._data.db.structure || this._data.db;
        const flat = [];
        let cIdx = 1;

        for (const section in structure) {
            if (!Array.isArray(structure[section])) continue;
            flat.push(...structure[section].map(l => ({ ...l, sectionName: section, cIdx })));
            cIdx++;
        }

        return flat;
    }

    async checkDownloadStatus() {
        if (!this._data.db || !this._data.db.structure) return false;

        const lessons = this.getFlatLessons();
        const cacheName = `pwa-lessons-${this._data.currentLang}-v2`;

        try {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            const cachedUrls = new Set(keys.map(k => new URL(k.url).pathname));

            const requiredCount = lessons.length;
            let foundCount = 0;

            const lessonsPath = '/public/data/' + this._data.currentLang + '/lessons/';

            for (const l of lessons) {
                if (cachedUrls.has(lessonsPath + l.id + '.html')) {
                    foundCount++;
                }
            }

            const isFullyDownloaded = foundCount >= requiredCount && requiredCount > 0;
            return isFullyDownloaded;
        } catch (e) {
            return false;
        }
    }

    normalizeText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }
}

export const state = new AppState();
