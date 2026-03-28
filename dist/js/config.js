/**
 * @typedef {Object} Lesson
 * @property {string} id - Unique identifier for the lesson
 * @property {string} title - Human-readable title
 * @property {string} [num] - Optional lesson number
 */

/**
 * @typedef {Object} Database
 * @property {string} home - Raw HTML for the home screen
 * @property {Object.<string, Lesson[]>} structure - Curriculum structure organized by sections
 */

/** 
 * i18n Configuration
 */
export const I18N = {
    el: {
        label: 'EL',
        symbol: 'Ω',
        title: 'GREEK',
        themeToggle: 'Change Theme',
        downloadToggle: 'Download Offline',
        langToggle: 'Change Course',
        footer: '&copy; 2026 / GREEK PROJECT',
        dataFile: '/public/data/el/curriculum.json',
        lessonsPath: '/public/data/el/lessons/',
        errorTitle: 'Oops!',
        errorOffline: 'You are offline and this lesson hasn\'t been downloaded.',
        errorNotFound: 'Lesson content not found.',
        errorRetry: 'Retry',
        errorBack: 'Back to Curriculum',
        resetProgress: 'Reset Progress',
        resetConfirm: 'Confirm Reset?',
        grammar: 'G',
        vocabulary: 'L',
        exercises: 'P',
        courseName: 'GREEK LANGUAGE COURSE'
    }
};

/**
 * App global constants
 */
export const CONFIG = {
    APP_CACHE_NAME: 'greek-v12',
    LESSON_CACHE_PREFIX: 'pwa-lessons-',
    LESSON_CACHE_VERSION: 'v2',
    SYNC_CHANNEL_NAME: 'greek_app_sync',
    DEFAULT_LANG: 'el',
    DEFAULT_VIEW_MODE: 'grammar'
};
