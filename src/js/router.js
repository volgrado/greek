/**
 * Client-side router: renders the curriculum and lessons, and intercepts
 * navigation via the Navigation API with a hash-routing fallback.
 */

import { state } from './state.js';
import { STRINGS } from './config.js';
import { fetchLessonHTML, prefetchNext } from './data.js';
import { getFlatLessons, getLessonNavigation } from './lesson-utils.js';
import { matchLessonPath } from './route-utils.js';

const app = document.getElementById('app');

// True until the first home render runs. Used to decide whether the
// server-rendered curriculum shell can be reused instead of rebuilt.
let firstHomeRender = true;

/**
 * Persists a section's collapsed/expanded state to localStorage.
 * @param {string} id - The section's data-section-id.
 * @param {boolean} isCollapsed - Whether the section is now collapsed.
 * @returns {void}
 */
const persistCollapseState = (id, isCollapsed) => {
    let current = JSON.parse(localStorage.getItem('collapsedChapters') || '[]');
    if (isCollapsed && !current.includes(id)) {
        current.push(id);
    } else if (!isCollapsed) {
        current = current.filter(cid => cid !== id);
    }
    localStorage.setItem('collapsedChapters', JSON.stringify(current));
};

/**
 * Wires the collapse toggle on a section header.
 * @param {HTMLElement} header - The .section-header element.
 * @param {HTMLElement} section - The owning .curriculum-section element.
 * @returns {void}
 */
const attachSectionToggle = (header, section) => {
    header.addEventListener('click', () => {
        const id = section.getAttribute('data-section-id');
        const isCollapsed = section.classList.toggle('collapsed');
        persistCollapseState(id, isCollapsed);
    });
};

/**
 * Restores saved collapse state on the curriculum sections within a container.
 * @param {HTMLElement} container - Element holding the curriculum sections.
 * @returns {void}
 */
const applyCollapseState = (container) => {
    const collapsedSections = JSON.parse(localStorage.getItem('collapsedChapters') || '[]');
    collapsedSections.forEach(id => {
        container.querySelector(`.curriculum-section[data-section-id="${id}"]`)?.classList.add('collapsed');
    });
};

/**
 * Adopts the pre-rendered curriculum shell already present in the DOM: marks
 * viewed links, wires section toggles, and restores collapse state, without
 * clearing or rebuilding the markup. Used only on the very first home paint.
 * @param {HTMLElement} container - Element holding the pre-rendered shell.
 * @returns {void}
 */
const hydrateCurriculum = (container) => {
    container.querySelectorAll('.curriculum-section').forEach(section => {
        const header = section.querySelector('.section-header');
        if (header) attachSectionToggle(header, section);
    });

    // Mark links for lessons the user has already viewed.
    container.querySelectorAll('.curriculum-link').forEach(link => {
        const id = link.getAttribute('href')?.replace('/lessons/', '');
        if (id && state.viewedLessons.has(id)) {
            link.classList.add('viewed');
        }
    });

    applyCollapseState(container);
};

/**
 * Returns true if #app holds the server-rendered curriculum shell that can be
 * reused as-is. The shell is always pre-rendered in grammar mode, so it is only
 * reusable when the active view mode also resolves to grammar sections.
 * @returns {boolean}
 */
const hasReusableShell = () => {
    if (state.viewMode !== 'grammar') return false;
    const shell = app.querySelector('.curriculum-container');
    if (!shell) return false;
    // Confirm the pre-rendered sections match the grammar view's id scheme.
    return shell.querySelector('.curriculum-section[data-section-id^="grammar-"]') !== null;
};

/**
 * Renders the collapsible curriculum tree for the current view mode into the
 * given container, restoring saved collapse state.
 * @param {HTMLElement} container - Element to render the curriculum into.
 * @returns {void}
 */
export const renderCurriculum = (container) => {
    container.innerHTML = ''; // Clear container

    if (!state.db || !state.db.structure) return;

    const curriculumContainer = document.createElement('div');
    curriculumContainer.className = 'curriculum-container';

    // Logic split: use viewMode to pick the branch
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

        attachSectionToggle(header, section);

        chapterIdx++;
    }

    container.appendChild(curriculumContainer);

    applyCollapseState(container);
};



/**
 * Resolves the current (or overridden) path and renders the matching view:
 * curriculum, a lesson, or an error/404, using a View Transition when available.
 * @param {string|null} [pathOverride] - Path to route to instead of the URL.
 * @returns {Promise<void>}
 */
export const route = async (pathOverride = null) => {
    if (!state.db) return;

    // Determine path based on Navigation API or Hash fallback
    let path = '/';
    if (pathOverride) {
        path = pathOverride;
    } else if (window.navigation) {
        path = new URL(window.navigation.currentEntry.url).pathname;
    } else {
        // Fallback for older browsers: use real pathname or hash migration
        path = window.location.pathname || '/';
        if (window.location.hash.startsWith('#/')) {
            path = window.location.hash.slice(1);
        }
    }

    // Normalize Github Pages or nested paths if needed (assuming root is '/')
    if (path === '' || path === '/index.html') path = '/';

    // 1. Data Prep: If it's a lesson, fetch it BEFORE starting the transition
    let preFetchedLesson = null;
    let lessonId = null;

    // Centralized routing logic
    const lessonMatch = matchLessonPath(path);
    let isLesson = false;
    if (lessonMatch) {
        isLesson = true;
        lessonId = lessonMatch.id;
        preFetchedLesson = await fetchLessonHTML(lessonId);
    }

    const updateDOM = async () => {

        if (path === '/' || path === '/curriculum') {
            // On the first home paint, reuse the server-rendered shell if it is
            // present and matches the active view mode: just wire handlers and
            // restore state instead of clearing and rebuilding. Later
            // navigations and view-mode changes always re-render from scratch.
            if (firstHomeRender && hasReusableShell()) {
                hydrateCurriculum(app);
            } else {
                app.innerHTML = '';
                renderCurriculum(app);
            }
            firstHomeRender = false;
        } else if (isLesson) {
            const id = lessonId;
            const res = preFetchedLesson;

            if (typeof res === 'string') {
                app.innerHTML = res;

                // Authoritative Mounting: router.js adds the nav/meta
                const flatLessons = getFlatLessons(state.db.structure, state.viewMode);
                const nav = getLessonNavigation(flatLessons, id);

                if (nav.current) {
                    app.insertAdjacentHTML('afterbegin', nav.metaHTML);
                    app.insertAdjacentHTML('beforeend', nav.navHTML);
                }

                state.markAsViewed(id);
                prefetchNext(id);
            } else {
                const errorType = res ? res.error : 'NOT_FOUND';
                const strings = STRINGS;
                const isConnError = errorType === 'OFFLINE' || errorType === 'NETWORK';

                const errorTemplate = document.getElementById('error-template');
                if (errorTemplate) {
                    app.innerHTML = '';
                    const errorClone = errorTemplate.content.cloneNode(true);
                    errorClone.querySelector('.error-title').textContent = strings.errorTitle;
                    errorClone.querySelector('.error-message').textContent = isConnError ? strings.errorOffline : strings.errorNotFound;
                    
                    const retryBtn = errorClone.querySelector('.error-retry');
                    if (retryBtn) retryBtn.textContent = strings.errorRetry;

                    const backLink = errorClone.querySelector('.error-back');
                    if (backLink) {
                        backLink.textContent = strings.errorBack;
                        backLink.href = '/';
                    }

                    app.appendChild(errorClone);
                } else {
                    const backHref = window.navigation ? '/' : '#/';
                    app.innerHTML = `
                        <div class="error-container">
                            <h1 class="error-title mb-4">${strings.errorTitle}</h1>
                            <p class="error-message mb-8">${isConnError ? strings.errorOffline : strings.errorNotFound}</p>
                            <a href="${backHref}" class="btn-base">${strings.errorBack}</a>
                        </div>`;
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
        try {
            const transition = document.startViewTransition(async () => {
                await updateDOM();
            });
            // Handle skipped transitions gracefully to avoid unhandled rejections in console
            transition.finished.catch(() => {});
            transition.ready.catch(() => {});
        } catch (e) {
            await updateDOM();
        }
    } else {
        await updateDOM();
    }
};

/**
 * Wires the router: migrates legacy hash URLs, intercepts Navigation API
 * events (with a hashchange fallback), and adds arrow-key lesson navigation.
 * @returns {void}
 */
export const initRouter = () => {
    // Migrate legacy hash-based URLs (#/path) to clean paths
    if (window.navigation && window.location.hash.startsWith('#/')) {
        const cleanPath = window.location.hash.slice(1);
        try {
            window.history.replaceState(null, '', cleanPath);
        } catch (e) {
            console.warn("Migration failed", e);
        }
    }

    // Intercept the Navigation API to route clean URLs client-side
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
