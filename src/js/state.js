class AppState {
    constructor() {
        this._listeners = {};

        this._data = {
            currentLang: localStorage.getItem('lang') || 'el',
            currentTheme: localStorage.getItem('theme'),
            db: null,
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
                    if (changed && target._listeners[prop]) {
                        target._listeners[prop].forEach(fn => fn(value));
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

    markAsViewed(id) {
        this.viewedLessons.add(id);
        localStorage.setItem('viewed', JSON.stringify([...this.viewedLessons]));
    }

    getFlatLessons() {
        if (!this.db || !this.db.structure) return [];
        const flat = [];
        for (const section in this.db.structure) {
            flat.push(...this.db.structure[section]);
        }
        return flat;
    }

    normalizeText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }
}

export const state = new AppState();
