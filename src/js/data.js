// Imports removed for classic script compatibility


const loadData = async () => {
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

const fetchLessonHTML = async (id) => {
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

const prefetchNext = async (currentId) => {
    const lessons = state.getFlatLessons();
    const idx = lessons.findIndex(l => l.id === currentId);
    if (idx !== -1 && idx < lessons.length - 1) {
        const nextId = lessons[idx + 1].id;
        if (!state.lessonCache[nextId]) {
            fetchLessonHTML(nextId);
        }
    }
};
