/**
 * Centralized routing utilities for the Greek project.
 * Shared between SPA (router.js) and Service Worker (sw.js).
 */

/**
 * Matches a path against the lesson pattern.
 * Supports both /lessons/:id and /lessons/:id.html (for SW requests).
 * @param {string} path - The path to match.
 * @returns {Object|null} Match object with { id } or null.
 */
export const matchLessonPath = (path) => {
    if (!path) return null;

    // Use URLPattern if available (modern browsers and SW environments)
    if (typeof URLPattern !== 'undefined') {
        const patterns = [
            new URLPattern({ pathname: '/lessons/:id' }),
            new URLPattern({ pathname: '/lessons/:id.html' })
        ];

        for (const pattern of patterns) {
            const match = pattern.exec({ pathname: path });
            if (match) {
                let id = decodeURIComponent(match.pathname.groups.id);
                // Clean up trailing slash if captured
                if (id.endsWith('/')) id = id.slice(0, -1);
                return { id };
            }
        }
    }

    // Fallback for older browsers
    const lessonMatch = path.match(/\/lessons\/([^/\?#\.]+)(\.html)?\/?$/);
    if (lessonMatch) {
        return { id: decodeURIComponent(lessonMatch[1]) };
    }

    return null;
};
