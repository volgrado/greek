import { state } from './state.js';

export const markAsViewed = (id) => {
    state.viewedLessons.add(id);
    localStorage.setItem('viewed', JSON.stringify([...state.viewedLessons]));
};

export const getFlatLessons = () => {
    if (!state.db || !state.db.structure) return [];
    const flat = [];
    for (const section in state.db.structure) {
        flat.push(...state.db.structure[section]);
    }
    return flat;
};

export const normalizeText = (text) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};
