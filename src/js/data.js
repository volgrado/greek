/**
 * Curriculum and lesson data loading, caching, and prefetching.
 */

import { state } from './state.js';
import { I18N } from './config.js';

/**
 * Loads the curriculum index for the current language into state.
 * On a network failure it retries once so the Service Worker cache can serve it.
 * @returns {Promise<void>}
 */
export const loadData = async () => {
    try {
        const r = await fetch(I18N[state.currentLang].dataFile);
        if (!r.ok) throw new Error('Data fetch failed');
        state.db = await r.json();
    } catch (e) {
        console.warn("Curriculum fetch failed, trying cache...", e);
        // The Service Worker should handle the fallback if we've been here before
        const r = await fetch(I18N[state.currentLang].dataFile);
        state.db = await r.json();
    }
};

/**
 * Fetches the rendered HTML for a lesson, using an in-memory cache.
 * @param {string} id - The lesson id (filename stem).
 * @returns {Promise<string|{error: string}>} The HTML string, or an error
 *   object with a code of NOT_FOUND, OFFLINE, or NETWORK.
 */
export const fetchLessonHTML = async (id) => {
    if (state.lessonCache[id]) return state.lessonCache[id];
    try {
        const r = await fetch(`${I18N[state.currentLang].lessonsPath}${id}.html`);
        if (!r.ok) return { error: 'NOT_FOUND' };

        // Detect offline fallback from Service Worker
        if (r.headers.has('X-Offline-Fallback')) return { error: 'OFFLINE' };

        const html = await r.text();
        state.lessonCache[id] = html;
        return html;
    } catch (e) {
        return { error: 'NETWORK' };
    }
};

/**
 * Warms the cache with the lesson that follows the given one, if any.
 * @param {string} currentId - The id of the currently viewed lesson.
 * @returns {Promise<void>}
 */
export const prefetchNext = async (currentId) => {
    const lessons = state.getFlatLessons();
    const idx = lessons.findIndex(l => l.id === currentId);
    if (idx !== -1 && idx < lessons.length - 1) {
        const nextId = lessons[idx + 1].id;
        if (!state.lessonCache[nextId]) {
            fetchLessonHTML(nextId);
        }
    }
};
