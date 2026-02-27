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
        resetConfirm: 'Confirm Reset?'
    },
    es: {
        label: 'ES',
        symbol: 'Ñ',
        title: 'SPANISH',
        themeToggle: 'Change Theme',
        downloadToggle: 'Download Offline',
        langToggle: 'Change Course',
        footer: '&copy; 2026 / SPANISH PROJECT',
        dataFile: '/public/data/es/curriculum.json',
        lessonsPath: '/public/data/es/lessons/',
        errorTitle: 'Oops!',
        errorOffline: 'You are offline and this lesson hasn\'t been downloaded.',
        errorNotFound: 'Lesson content not found.',
        errorRetry: 'Retry',
        errorBack: 'Back to Curriculum',
        resetProgress: 'Reset Progress',
        resetConfirm: 'Confirm Reset?'
    }
};
