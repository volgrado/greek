import { state } from './state.js';
import { I18N } from './config.js';


export const loadData = async () => {
    try {
        const r = await fetch(`${I18N[state.currentLang].dataFile}?v=${Date.now()}`);
        if (!r.ok) throw new Error('Data fetch failed');
        state.db = await r.json();
    } catch (e) {
        console.warn("Curriculum fetch failed, trying cache...", e);
        // The Service Worker should handle the fallback if we've been here before
        const r = await fetch(I18N[state.currentLang].dataFile);
        state.db = await r.json();
    }
};

export const loadSearchIndex = async () => {
    // The search index is now embedded directly in the curriculum.json!
    // This eliminates an entire network HTTP request on startup.
    if (state.db && state.db.searchIndex) {
        state.searchIndex = state.db.searchIndex;
        state.invertedIndex = state.db.invertedIndex || {};
    }
};

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
