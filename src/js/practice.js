/**
 * Practice layer: spaced-repetition flashcards built from vocabulary lessons.
 *
 * Zero-dependency and offline: cards are parsed from the rendered lesson DOM and
 * scheduling state is persisted in localStorage. A "Review" call-to-action is
 * injected into vocabulary lessons; clicking it opens a flashcard session that
 * uses a Leitner box schedule (Again resets, Good advances one box, Easy two).
 */

const SRS_KEY = 'practice-srs';
const DAY_MS = 86400000;
// Box index -> days until the card is due again.
const BOX_INTERVALS_DAYS = [0, 1, 2, 4, 8, 16];
const SESSION_LIMIT = 20;

/** @returns {Object<string, {box: number, due: number}>} Stored SRS records. */
function loadSrs() {
    try {
        return JSON.parse(localStorage.getItem(SRS_KEY)) || {};
    } catch {
        return {};
    }
}

/** @param {Object} srs - SRS record map to persist. */
function saveSrs(srs) {
    localStorage.setItem(SRS_KEY, JSON.stringify(srs));
}

/**
 * Advances a card's schedule from a rating.
 * @param {{box: number}|undefined} rec - Existing record, if any.
 * @param {'again'|'good'|'easy'} rating - The user's self-assessment.
 * @param {number} now - Current epoch milliseconds.
 * @returns {{box: number, due: number}} The new record.
 */
function schedule(rec, rating, now) {
    let box = rec ? rec.box : 0;
    if (rating === 'again') box = 0;
    else if (rating === 'good') box = Math.min(box + 1, BOX_INTERVALS_DAYS.length - 1);
    else box = Math.min(box + 2, BOX_INTERVALS_DAYS.length - 1);
    return { box, due: now + BOX_INTERVALS_DAYS[box] * DAY_MS };
}

/**
 * Extracts flashcards from a rendered lesson's vocabulary list items.
 * Handles both `**Greek** *(pron)* = English` and the
 * `<span class="lang-el">…</span> <span class="meaning">(…)</span>` shapes.
 * @param {HTMLElement} scope - Element to search within.
 * @param {string} lessonId - Current lesson id, used to namespace card keys.
 * @returns {Array<{key: string, greek: string, pron: string, english: string}>}
 */
function extractCards(scope, lessonId) {
    const cards = [];
    const seen = new Set();
    scope.querySelectorAll('li').forEach((li) => {
        let greek = '', pron = '', english = '';
        const text = li.textContent.replace(/\s+/g, ' ').trim();
        const strong = li.querySelector('strong');
        const eq = text.indexOf(' = ');

        if (strong && eq !== -1) {
            // Dominant vocab shape: **Greek** *(pron)* = English. Parse from text
            // (not from spans) because the build's phrase-list pass can split
            // inline markup on items ending in parentheses.
            greek = strong.textContent.trim();
            english = text.slice(eq + 3).trim();
            const pm = text.slice(0, eq).match(/\(([^)]*)\)/);
            if (pm) pron = pm[1].trim();
        } else if (!text.includes('=')) {
            // Glossary shape: <span class="lang-el">Target</span> (English).
            const langEl = li.querySelector('.lang-el');
            const meaning = li.querySelector('.meaning');
            if (langEl && meaning) {
                greek = langEl.textContent.trim();
                english = meaning.textContent.replace(/^\(|\)$/g, '').trim();
            }
        }

        if (greek && english) {
            const key = `${lessonId}::${greek}`;
            if (!seen.has(key)) {
                seen.add(key);
                cards.push({ key, greek, pron, english });
            }
        }
    });
    return cards;
}

/**
 * Orders a session: due cards first (oldest due first), then unseen cards.
 * @param {Array} cards - All cards for the lesson.
 * @param {Object} srs - SRS record map.
 * @param {number} now - Current epoch milliseconds.
 * @returns {Array} Ordered, capped session queue.
 */
function buildQueue(cards, srs, now) {
    const due = [], fresh = [];
    for (const c of cards) {
        const rec = srs[c.key];
        if (!rec) fresh.push(c);
        else if (rec.due <= now) due.push({ c, due: rec.due });
    }
    due.sort((a, b) => a.due - b.due);
    return [...due.map((d) => d.c), ...fresh].slice(0, SESSION_LIMIT);
}

const el = (tag, cls, html) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
};

/**
 * Opens the flashcard session overlay for a queue of cards.
 * @param {Array} queue - Ordered cards to review.
 */
function runSession(queue) {
    const srs = loadSrs();
    let index = 0;
    let reviewed = 0;

    const overlay = el('div', 'practice-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Vocabulary review');

    const close = () => {
        document.removeEventListener('keydown', onKey);
        overlay.remove();
    };

    function renderCard() {
        if (index >= queue.length) return renderDone();
        const card = queue[index];
        overlay.innerHTML = '';
        const panel = el('div', 'practice-card');
        panel.appendChild(el('div', 'practice-progress', `${index + 1} / ${queue.length}`));
        panel.appendChild(el('div', 'practice-front', card.greek));
        const back = el('div', 'practice-back');
        back.appendChild(el('div', 'practice-pron', card.pron || ''));
        back.appendChild(el('div', 'practice-english', card.english));
        back.hidden = true;
        panel.appendChild(back);

        const actions = el('div', 'practice-actions');
        const reveal = el('button', 'practice-btn practice-reveal', 'Show answer');
        reveal.addEventListener('click', () => {
            back.hidden = false;
            reveal.replaceWith(ratingRow());
        });
        actions.appendChild(reveal);
        panel.appendChild(actions);

        const closeBtn = el('button', 'practice-close', '&times;');
        closeBtn.setAttribute('aria-label', 'Close review');
        closeBtn.addEventListener('click', close);
        panel.appendChild(closeBtn);

        overlay.appendChild(panel);

        function ratingRow() {
            const row = el('div', 'practice-rating');
            for (const [label, rating] of [['Again', 'again'], ['Good', 'good'], ['Easy', 'easy']]) {
                const b = el('button', `practice-btn rate-${rating}`, label);
                b.addEventListener('click', () => rate(rating));
                row.appendChild(b);
            }
            return row;
        }
    }

    function rate(rating) {
        const card = queue[index];
        srs[card.key] = schedule(srs[card.key], rating, Date.now());
        saveSrs(srs);
        reviewed++;
        index++;
        renderCard();
    }

    function renderDone() {
        overlay.innerHTML = '';
        const panel = el('div', 'practice-card practice-done');
        panel.appendChild(el('div', 'practice-front', 'Done'));
        panel.appendChild(el('div', 'practice-english', `${reviewed} card${reviewed === 1 ? '' : 's'} reviewed`));
        const b = el('button', 'practice-btn practice-reveal', 'Close');
        b.addEventListener('click', close);
        const actions = el('div', 'practice-actions');
        actions.appendChild(b);
        panel.appendChild(actions);
        overlay.appendChild(panel);
    }

    function onKey(e) {
        if (e.key === 'Escape') return close();
        const back = overlay.querySelector('.practice-back');
        if (e.key === ' ' && back && back.hidden) {
            e.preventDefault();
            overlay.querySelector('.practice-reveal')?.click();
        } else if (back && !back.hidden) {
            if (e.key === '1') overlay.querySelector('.rate-again')?.click();
            if (e.key === '2') overlay.querySelector('.rate-good')?.click();
            if (e.key === '3') overlay.querySelector('.rate-easy')?.click();
        }
    }

    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    renderCard();
}

/**
 * Injects the "Review" call-to-action into the current lesson if it contains
 * extractable vocabulary and one is not already present. Idempotent.
 */
function enhance() {
    const app = document.getElementById('app');
    if (!app) return;
    const match = location.pathname.match(/\/lessons\/([^/]+)/);
    if (!match) return;
    if (app.querySelector('.practice-cta')) return;

    const lessonId = match[1];
    const cards = extractCards(app, lessonId);
    if (cards.length < 3) return;

    const srs = loadSrs();
    const now = Date.now();
    const dueCount = cards.filter((c) => srs[c.key] && srs[c.key].due <= now).length;
    const newCount = cards.filter((c) => !srs[c.key]).length;

    const cta = el('div', 'practice-cta');
    const label = dueCount > 0
        ? `Review ${dueCount} due word${dueCount === 1 ? '' : 's'}`
        : `Review ${cards.length} word${cards.length === 1 ? '' : 's'}`;
    const btn = el('button', 'practice-btn', label);
    btn.addEventListener('click', () => runSession(buildQueue(cards, loadSrs(), Date.now())));
    cta.appendChild(btn);
    if (newCount > 0 && dueCount > 0) {
        cta.appendChild(el('span', 'practice-cta-meta', `${newCount} new`));
    }
    app.appendChild(cta);
}

/** Wires the practice layer: re-runs after every lesson render. */
export const initPractice = () => {
    const app = document.getElementById('app');
    if (!app) return;
    let timer;
    const obs = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(enhance, 50);
    });
    obs.observe(app, { childList: true });
    enhance();
};
