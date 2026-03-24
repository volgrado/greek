import { getFlatLessons } from './lesson-utils.js';
import { CONFIG } from './config.js';

class AppState {
    constructor() {
        this._listeners = {};

        // 📡 Genius Sync: Telepathic Broadcast Channel
        this.syncChannel = new BroadcastChannel(CONFIG.SYNC_CHANNEL_NAME);

        this.syncChannel.onmessage = (e) => this._handleSyncMessage(e);

        this._data = {
            currentLang: localStorage.getItem('lang') || CONFIG.DEFAULT_LANG,
            currentTheme: localStorage.getItem('theme'),
            viewMode: localStorage.getItem('viewMode') || CONFIG.DEFAULT_VIEW_MODE,
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
                    if (changed) {
                        target._data[prop] = value;
                        this._notify(prop, value, true);
                    }
                    return true;
                }
                target[prop] = value;
                return true;
            }
        });
    }

    _handleSyncMessage(e) {
        const { type, prop, value, id } = e.data;
        if (type === 'SYNC_PROP') {
            if (this._data[prop] !== value) {
                this._data[prop] = value;
                this._notify(prop, value, false);
            }
        } else if (type === 'SYNC_VIEWED') {
            this._data.viewedLessons.add(id);
            const link = document.querySelector(`a[href="/lessons/${id}"]`);
            if (link) link.classList.add('viewed');
        } else if (type === 'SYNC_RESET_PROGRESS') {
            this._data.viewedLessons.clear();
            document.querySelectorAll('.curriculum-link.viewed').forEach(el => el.classList.remove('viewed'));
        }
    }

    _notify(prop, value, broadcast = false) {
        if (broadcast) {
            this.syncChannel.postMessage({ type: 'SYNC_PROP', prop, value });
        }

        if (this._listeners[prop]) {
            const run = () => this._listeners[prop].forEach(fn => fn(value));
            if (document.startViewTransition) {
                document.startViewTransition(run);
            } else {
                run();
            }
        }
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
        return getFlatLessons(this._data.db?.structure || this._data.db, this._data.viewMode);
    }

    async checkDownloadStatus() {
        if (!this._data.db || !this._data.db.structure) return false;

        const lessons = this.getFlatLessons();
        const cacheName = `${CONFIG.LESSON_CACHE_PREFIX}${this._data.currentLang}-${CONFIG.LESSON_CACHE_VERSION}`;

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
