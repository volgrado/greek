import { state } from './state.js';
import { I18N } from './config.js';
import { fetchLessonHTML, prefetchNext } from './data.js';


const app = document.getElementById('app');

export const renderCurriculum = (container) => {
    container.innerHTML = ''; // Clear container

    if (!state.db || !state.db.structure) return;

    const curriculumContainer = document.createElement('div');
    curriculumContainer.className = 'curriculum-container';

    // 🎯 Logic split: use viewMode to pick the branch
    const structure = state.db.structure[state.viewMode] || state.db.structure;

    let chapterIdx = 1;
    for (const [sectionName, lessons] of Object.entries(structure)) {
        const section = document.createElement('section');
        section.className = 'curriculum-section';
        section.setAttribute('data-section-id', `${state.viewMode}-${chapterIdx}`);

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
            link.href = `/lessons/${l.id}`;
            link.className = 'curriculum-link';
            if (state.viewedLessons.has(l.id)) {
                link.classList.add('viewed');
            }
            link.innerHTML = `<span>${label}</span><span>→</span>`;

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



export const route = async (pathOverride = null) => {
    if (!state.db) return;

    // Determine path based on Navigation API or Hash fallback
    let path = '/';
    if (pathOverride) {
        path = pathOverride;
    } else if (window.navigation) {
        path = new URL(window.navigation.currentEntry.url).pathname;
    } else {
        path = window.location.hash.slice(1) || '/';
    }

    // Normalize Github Pages or nested paths if needed (assuming root is '/')
    if (path === '' || path === '/index.html') path = '/';

    // 1. Data Prep: If it's a lesson, fetch it BEFORE starting the transition
    let preFetchedLesson = null;
    let lessonId = null;

    // 🛣️ Genius Router: Native URLPattern API
    let isLesson = false;

    // We try to use the modern URLPattern, catching if it's not supported in older browsers
    if ('URLPattern' in window) {
        const pattern = new URLPattern({ pathname: '/lessons/:id' });
        const match = pattern.exec({ pathname: path });

        if (match) {
            isLesson = true;
            lessonId = decodeURIComponent(match.pathname.groups.id);
            // Just in case there's a trailing slash captured
            if (lessonId.endsWith('/')) lessonId = lessonId.slice(0, -1);
            preFetchedLesson = await fetchLessonHTML(lessonId);
        }
    } else {
        // Fallback
        isLesson = path.includes('/lessons/');
        if (isLesson) {
            const parts = path.split('/lessons/');
            lessonId = decodeURIComponent(parts[parts.length - 1]);
            if (lessonId.endsWith('/')) lessonId = lessonId.slice(0, -1);
            preFetchedLesson = await fetchLessonHTML(lessonId);
        }
    }

    const updateDOM = async () => {
        // Ensure search panel is closed during transition if navigating
        const searchDrawer = document.getElementById('search-drawer');
        if (searchDrawer && searchDrawer.hidePopover) {
            try { searchDrawer.hidePopover(); } catch (e) { }
        }
        document.body.classList.remove('search-mode');

        if (path === '/' || path === '/curriculum') {
            app.innerHTML = '';
            renderCurriculum(app);
        } else if (isLesson) {
            const id = lessonId;
            const res = preFetchedLesson;

            if (typeof res === 'string') {
                app.innerHTML = res;

                // FALLBACK: If the user bypassed the Service Worker (e.g. Shift+F5 or no SW)
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
                            prevLink = `<a href="/lessons/${prev.id}">← ${prev.title}</a>`;
                        }

                        let nextLink = '<span></span>';
                        if (currentIndex < flatLessons.length - 1) {
                            const next = flatLessons[currentIndex + 1];
                            nextLink = `<a href="/lessons/${next.id}">${next.title} →</a>`;
                        }

                        const navHTML = `
                        <div class="lesson-nav">
                            ${prevLink}
                            <a href="/" class="menu-btn">MENU</a>
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

                    const backLink = errorClone.querySelector('.error-back');
                    backLink.textContent = strings.errorBack;
                    backLink.href = '/';

                    app.appendChild(errorClone);
                } else {
                    const backHref = window.navigation ? '/' : '#/';
                    app.innerHTML = `<div style="padding: 5rem; text-align: center"><h1 style="color: #e53e3e">${strings.errorTitle}</h1><a href="${backHref}">${strings.errorBack}</a></div>`;
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

                const backLink = errorClone.querySelector('.error-back');
                backLink.textContent = 'Back to Curriculum';
                backLink.href = window.navigation ? '/' : '#/';

                app.appendChild(errorClone);
            } else {
                const backHref = window.navigation ? '/' : '#/';
                app.innerHTML = `
                <div style="padding: 5rem; text-align: center">
                    <h1 style="color: #e53e3e">404: Node not found</h1>
                    <a href="${backHref}">Back to Curriculum</a>
                </div>`;
            }
        }
        window.scrollTo(0, 0);
    };

    if (document.startViewTransition) {
        document.startViewTransition(async () => {
            await updateDOM();
        });
    } else {
        await updateDOM();
    }
};

export const initRouter = () => {
    // 🧭 Genius Migration: If we have a hash from the old system, migrate to clean URLs
    if (window.navigation && window.location.hash.startsWith('#/')) {
        const cleanPath = window.location.hash.slice(1);
        try {
            window.history.replaceState(null, '', cleanPath);
        } catch (e) {
            console.warn("Migration failed", e);
        }
    }

    // 🧭 Genius Move: Native Navigation API interception
    if (window.navigation) {
        window.navigation.addEventListener('navigate', (event) => {
            // Ignore cross-origin, downloads, or targets outside current window
            if (!event.canIntercept || event.hashChange || event.downloadRequest || event.info === 'ignore') {
                return;
            }

            const url = new URL(event.destination.url);

            // Intercept and handle routing gracefully using View Transitions
            event.intercept({
                async handler() {
                    await route(url.pathname);
                }
            });
        });

        // Log activation for dev awareness
        console.log("🧭 Native Navigation API active. Clean URLs enabled.");
    } else {
        // Fallback for older browsers
        window.onhashchange = () => route();
        console.warn("⚠️ Native Navigation API not supported. Falling back to Hash routing.");
    }

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
        const path = window.navigation ? new URL(window.navigation.currentEntry.url).pathname : window.location.hash;
        if (!path.includes('/lessons/')) return;

        if (e.key === 'ArrowRight') {
            const links = document.querySelectorAll('.lesson-nav a');
            if (links.length > 0) {
                const nextLink = links[links.length - 1];
                if (nextLink && !nextLink.classList.contains('menu-btn') && nextLink.href) {
                    if (window.navigation) window.navigation.navigate(nextLink.href);
                    else window.location.href = nextLink.href;
                }
            }
        } else if (e.key === 'ArrowLeft') {
            const links = document.querySelectorAll('.lesson-nav a');
            if (links.length > 0) {
                const prevLink = links[0];
                if (prevLink && !prevLink.classList.contains('menu-btn') && prevLink.href) {
                    if (window.navigation) window.navigation.navigate(prevLink.href);
                    else window.location.href = prevLink.href;
                }
            }
        }
    });
};
