/**
 * Reactive application state: a Proxy-based signal store with cross-tab sync,
 * viewed-lesson tracking, and offline download-status checks.
 */

import { getFlatLessons } from './lesson-utils.js';
import { CONFIG } from './config.js';

/**
 * Central reactive store. Property reads/writes go through a Proxy that
 * notifies subscribers and broadcasts changes to other tabs.
 */
class AppState {
    constructor() {
        this._listeners = {};

        // Cross-tab state sync via BroadcastChannel
        this.syncChannel = new BroadcastChannel(CONFIG.SYNC_CHANNEL_NAME);

        this.syncChannel.onmessage = (e) => this._handleSyncMessage(e);

        this._data = {
            currentTheme: localStorage.getItem('theme'),
            // 'exercises' was renamed to 'practice'; migrate any stored value
            viewMode: (localStorage.getItem('viewMode') === 'exercises' ? 'practice' : localStorage.getItem('viewMode')) || CONFIG.DEFAULT_VIEW_MODE,
            db: null,
            isDownloaded: false,
            lessonCache: {},
            viewedLessons: new Set(JSON.parse(localStorage.getItem('viewed') || '[]'))
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

    /**
     * Registers a callback to run whenever the given state property changes.
     * @param {string} key - The state property name to watch.
     * @param {Function} callback - Invoked with the new value on change.
     * @returns {void}
     */
    subscribe(key, callback) {
        if (!this._listeners[key]) this._listeners[key] = [];
        this._listeners[key].push(callback);
    }

    /**
     * Marks a lesson as viewed, persisting it and optionally broadcasting to
     * other tabs.
     * @param {string} id - The lesson id.
     * @param {boolean} [broadcast] - Whether to notify other tabs.
     * @returns {void}
     */
    markAsViewed(id, broadcast = true) {
        if (!this._data.viewedLessons.has(id)) {
            this._data.viewedLessons.add(id);
            localStorage.setItem('viewed', JSON.stringify([...this._data.viewedLessons]));
            if (broadcast) {
                this.syncChannel.postMessage({ type: 'SYNC_VIEWED', id });
            }
        }
    }

    /**
     * Clears all viewed-lesson progress, optionally broadcasting to other tabs.
     * @param {boolean} [broadcast] - Whether to notify other tabs.
     * @returns {void}
     */
    clearViewed(broadcast = true) {
        this._data.viewedLessons.clear();
        localStorage.removeItem('viewed');
        if (broadcast) {
            this.syncChannel.postMessage({ type: 'SYNC_RESET_PROGRESS' });
        }
    }

    /**
     * Flattens the current curriculum for the active view mode.
     * @returns {Array} The flattened list of lesson objects.
     */
    getFlatLessons() {
        return getFlatLessons(this._data.db?.structure || this._data.db, this._data.viewMode);
    }

    /**
     * Checks whether every lesson is present in the offline lesson cache.
     * @returns {Promise<boolean>} True if all lessons are cached.
     */
    async checkDownloadStatus() {
        if (!this._data.db || !this._data.db.structure) return false;

        const lessons = this.getFlatLessons();
        const lang = CONFIG.DEFAULT_LANG;
        const cacheName = `${CONFIG.LESSON_CACHE_PREFIX}${lang}-${CONFIG.LESSON_CACHE_VERSION}`;

        try {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            const cachedUrls = new Set(keys.map(k => new URL(k.url, location.origin).pathname));

            const requiredCount = lessons.length;
            if (requiredCount === 0) return false;

            let foundCount = 0;
            // Get the relative path from the app root
            const lessonsPath = `/public/data/${lang}/lessons/`;

            for (const l of lessons) {
                // Check if the HTML version is in the lesson cache
                if (cachedUrls.has(lessonsPath + l.id + '.html')) {
                    foundCount++;
                }
            }

            return foundCount >= requiredCount;
        } catch (e) {
            console.error("[State] Check status failed", e);
            return false;
        }
    }

    /**
     * Normalizes text for accent-insensitive comparison (strips diacritics,
     * lowercases).
     * @param {string} text - The input text.
     * @returns {string} The normalized text.
     */
    normalizeText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }
}

/** Shared singleton application state instance. */
export const state = new AppState();
