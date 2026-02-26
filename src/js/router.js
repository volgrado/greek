import { state } from './state.js';
import { I18N } from './config.js';
import { fetchLessonHTML, prefetchNext } from './data.js';


const app = document.getElementById('app');

export const renderCurriculum = (container) => {
    container.innerHTML = ''; // Clear container

    const curriculumContainer = document.createElement('div');
    curriculumContainer.className = 'curriculum-container';

    let chapterIdx = 1;
    for (const [sectionName, lessons] of Object.entries(state.db.structure)) {
        const section = document.createElement('section');
        section.className = 'curriculum-section';
        section.setAttribute('data-section-id', chapterIdx.toString());

        // Header
        const header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = `
            <h2>${chapterIdx}. ${sectionName}</h2>
            <span class="toggle-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </span>
        `;

        // Content
        const content = document.createElement('div');
        content.className = 'section-content';

        let lessonIdx = 1;
        for (const l of lessons) {
            const hNum = l.hierarchical_num || `${chapterIdx}.${lessonIdx}`;
            const label = `${hNum}. ${l.title}`;

            const link = document.createElement('a');
            link.href = `#/lessons/${l.id}`;
            link.className = 'curriculum-link';
            if (state.viewedLessons.has(l.id)) {
                link.classList.add('viewed');
            }
            link.innerHTML = `<span>${label}</span><span>→</span>`;

            // Search close logic
            link.addEventListener('click', () => {
                const searchDrawer = document.getElementById('search-drawer');
                if (searchDrawer) searchDrawer.classList.remove('is-open');
                document.body.classList.remove('search-mode');
            });

            content.appendChild(link);
            lessonIdx++;
        }

        section.appendChild(header);
        section.appendChild(content);
        curriculumContainer.appendChild(section);

        // Header click logic
        header.addEventListener('click', () => {
            const id = section.getAttribute('data-section-id');
            const isCollapsed = section.classList.toggle('collapsed');

            let current = JSON.parse(localStorage.getItem('collapsedChapters') || '[]');
            if (isCollapsed && !current.includes(id)) {
                current.push(id);
            } else if (!isCollapsed) {
                current = current.filter(cid => cid !== id);
            }
            localStorage.setItem('collapsedChapters', JSON.stringify(current));
        });

        chapterIdx++;
    }

    container.appendChild(curriculumContainer);

    // Apply saved collapses
    const collapsedSections = JSON.parse(localStorage.getItem('collapsedChapters') || '[]');
    collapsedSections.forEach(id => {
        container.querySelector(`.curriculum-section[data-section-id="${id}"]`)?.classList.add('collapsed');
    });
};



export const route = async () => {
    if (!state.db) return;
    const hash = window.location.hash.slice(1) || '/';

    const skelTemplate = document.getElementById('skeleton-template');
    if (skelTemplate) {
        app.innerHTML = '';
        app.appendChild(skelTemplate.content.cloneNode(true));
    } else {
        app.innerHTML = `
            <div class="skeleton-loader">
                <div class="skeleton-meta"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line" style="width: 60%"></div>
            </div>
        `;
    }

    if (hash === '/' || hash === '/curriculum') {
        renderCurriculum(app);
    } else if (hash.startsWith('/lessons/')) {
        // Ensure that any URL-encoded hashes (spaces, symbols) are correctly mapped against JSON strings
        const id = decodeURIComponent(hash.replace('/lessons/', ''));
        const res = await fetchLessonHTML(id);

        if (typeof res === 'string') {
            // Service Worker (or server) streams the fully constructed HTML directly!
            // Main thread literally does nothing but dump it into the DOM.
            app.innerHTML = res;

            // FALLBACK: If the user bypassed the Service Worker (e.g. Shift+F5 or no SW),
            // the raw HTML from disk won't have the navigation appended. We append it instantly.
            if (!res.includes('class="lesson-nav"')) {
                const flatLessons = state.getFlatLessons();
                const currentIndex = flatLessons.findIndex(l => l.id === id);

                if (currentIndex !== -1) {
                    const l = flatLessons[currentIndex];
                    const chapterName = `${l.cIdx}. ${l.sectionName}`;
                    const lessonNum = l.hierarchical_num;

                    const metaHTML = `
                        <div class="lesson-meta">
                            ${chapterName} ${lessonNum ? `&middot; LESSON ${lessonNum}` : ''}
                        </div>
                    `;

                    let prevLink = '<span></span>';
                    if (currentIndex > 0) {
                        const prev = flatLessons[currentIndex - 1];
                        prevLink = `<a href="#/lessons/${prev.id}">← ${prev.title}</a>`;
                    }

                    let nextLink = '<span></span>';
                    if (currentIndex < flatLessons.length - 1) {
                        const next = flatLessons[currentIndex + 1];
                        nextLink = `<a href="#/lessons/${next.id}">${next.title} →</a>`;
                    }

                    const navHTML = `
                    <div class="lesson-nav">
                        ${prevLink}
                        <a href="#/" class="menu-btn">MENU</a>
                        ${nextLink}
                    </div>`;

                    app.insertAdjacentHTML('afterbegin', metaHTML);
                    app.insertAdjacentHTML('beforeend', navHTML);
                }
            }

            state.markAsViewed(id);
            prefetchNext(id);
        } else {
            const errorType = res ? res.error : 'NOT_FOUND';
            const strings = I18N[state.currentLang];
            const isConnError = errorType === 'OFFLINE' || errorType === 'NETWORK';

            const errorTemplate = document.getElementById('error-template');
            if (errorTemplate) {
                app.innerHTML = '';
                const errorClone = errorTemplate.content.cloneNode(true);

                errorClone.querySelector('.error-title').textContent = strings.errorTitle;
                errorClone.querySelector('.error-message').textContent = isConnError ? strings.errorOffline : strings.errorNotFound;
                errorClone.querySelector('.error-retry').textContent = strings.errorRetry;
                errorClone.querySelector('.error-back').textContent = strings.errorBack;

                app.appendChild(errorClone);
            } else {
                app.innerHTML = `<div style="padding: 5rem; text-align: center"><h1 style="color: #e53e3e">${strings.errorTitle}</h1><a href="#/">${strings.errorBack}</a></div>`;
            }
        }
    } else {
        const errorTemplate = document.getElementById('error-template');
        if (errorTemplate) {
            app.innerHTML = '';
            const errorClone = errorTemplate.content.cloneNode(true);

            errorClone.querySelector('.error-title').textContent = '404';
            errorClone.querySelector('.error-message').textContent = 'Node not found';
            errorClone.querySelector('.error-retry').style.display = 'none';
            errorClone.querySelector('.error-back').textContent = 'Back to Curriculum';

            app.appendChild(errorClone);
        } else {
            app.innerHTML = `
            <div style="padding: 5rem; text-align: center">
                <h1 style="color: #e53e3e">404: Node not found</h1>
                <a href="#/">Back to Curriculum</a>
            </div>`;
        }
    }
    window.scrollTo(0, 0);
};

export const initRouter = () => {
    window.onhashchange = route;

    window.addEventListener('keydown', (e) => {
        if (!window.location.hash.startsWith('#/lessons/')) return;

        if (e.key === 'ArrowRight') {
            // Massive optimization: Read the next link straight from the already-rendered UI 
            // instead of running an array findIndex on the 300+ item database every single keypress
            const nextLink = document.querySelector('.lesson-nav a:last-child');
            if (nextLink && !nextLink.classList.contains('menu-btn') && nextLink.href) {
                window.location.href = nextLink.href;
            }
        } else if (e.key === 'ArrowLeft') {
            const prevLink = document.querySelector('.lesson-nav a:first-child');
            if (prevLink && !prevLink.classList.contains('menu-btn') && prevLink.href) {
                window.location.href = prevLink.href;
            }
        }
    });
};
