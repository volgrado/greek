/**
 * Shared utility for lesson processing and navigation.
 * Used by both the main SPA (router.js) and the Service Worker (sw.js).
 */

/**
 * Flattens the nested curriculum structure into a linear list of lessons.
 * @param {Object} structure - The curriculum structure from curriculum.json
 * @param {string} [viewMode] - Optional view mode (grammar, vocabulary, etc.)
 * @returns {Array} List of lesson objects with section and chapter info.
 */
export const getFlatLessons = (structure, viewMode = null) => {
    if (!structure) return [];

    // If viewMode is provided, pick that branch if possible
    const branch = (viewMode && structure[viewMode]) ? structure[viewMode] : structure;
    
    // If the branch is actually the whole DB (with searchIndex etc), dive into 'structure'
    const actualStructure = branch.structure || branch;

    const flat = [];
    let cIdx = 1;

    for (const section in actualStructure) {
        if (!Array.isArray(actualStructure[section])) continue;
        flat.push(...actualStructure[section].map(l => ({ ...l, sectionName: section, cIdx })));
        cIdx++;
    }

    return flat;
};

/**
 * Generates navigation data and HTML for a specific lesson.
 * @param {Array} flatLessons - The flattened list of lessons.
 * @param {string} lessonId - The ID of the lesson to generate navigation for.
 * @returns {Object} { metaHTML, navHTML, prev, next, current }
 */
export const getLessonNavigation = (flatLessons, lessonId) => {
    const currentIndex = flatLessons.findIndex(l => l.id === lessonId);
    
    if (currentIndex === -1) {
        return { metaHTML: '', navHTML: '', prev: null, next: null, current: null };
    }

    const current = flatLessons[currentIndex];
    const chapterName = `${current.cIdx}. ${current.sectionName}`;
    const lessonNum = current.hierarchical_num;

    const metaHTML = `
        <div class="lesson-meta">
            ${chapterName} ${lessonNum ? `&middot; LESSON ${lessonNum}` : ''}
        </div>
    `;

    const prev = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
    const next = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

    const prevLink = prev ? `<a href="/lessons/${prev.id}">← ${prev.title}</a>` : '<span></span>';
    const nextLink = next ? `<a href="/lessons/${next.id}">${next.title} →</a>` : '<span></span>';

    const navHTML = `
        <div class="lesson-nav">
            ${prevLink}
            <a href="/" class="menu-btn">MENU</a>
            ${nextLink}
        </div>
    `;

    return { metaHTML, navHTML, prev, next, current };
};
