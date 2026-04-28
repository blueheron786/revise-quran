import { todayStr } from './storage.js';
import { getSurahGroupsForJuz } from './quran.js';

/**
 * SM-2 adapted for Hifz review.
 * Ratings: 'easy' (q=5), 'hard' (q=3), 'many mistakes' (q=0)
 *
 * @param {object} page  - current page record from state
 * @param {'easy'|'hard'|'many mistakes'} rating
 * @returns {object} updated page record
 */
export function scheduleReview(page, rating) {
  const q = rating === 'easy' ? 5 : rating === 'hard' ? 3 : 0;
  const { interval, easeFactor, reviewCount } = page;

  // SM-2 ease factor update: clamped to [1.3, 2.5]
  const efDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  const newEase = Math.min(2.5, Math.max(1.3, easeFactor + efDelta));

  let newInterval;
  if (q < 3) {
    // Failed: reset to 1 day
    newInterval = 1;
  } else if (reviewCount === 0) {
    // First ever review: come back tomorrow regardless
    newInterval = 1;
  } else if (reviewCount === 1) {
    // Second review: short ramp-up
    newInterval = q >= 4 ? 6 : 3;
  } else {
    // Steady state
    if (q >= 4) {
      newInterval = Math.round(interval * newEase);
    } else {
      // Hard: grow slowly (at least 1 extra day)
      newInterval = Math.max(interval + 1, Math.round(interval * 1.2));
    }
  }

  const due = new Date();
  due.setDate(due.getDate() + newInterval);
  const dueDate = due.toISOString().split('T')[0];

  return { ...page, interval: newInterval, easeFactor: newEase, dueDate, reviewCount: reviewCount + 1, lastRating: rating };
}

/**
 * Returns up to `quota` pages sorted by dueDate ascending (most overdue first).
 * Excludes pages with active === false.
 *
 * @param {object} pages  - state.pages map
 * @param {number} quota
 * @returns {Array<{num: number, ...}>}
 */
export function getSessionQueue(pages, quota) {
  return Object.entries(pages)
    .filter(([, data]) => data.active !== false)
    .map(([num, data]) => ({ num: Number(num), ...data }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, quota);
}

/**
 * Builds a session queue that handles both page-mode and surah-mode juz.
 * Items are typed: { type:'page', num, ... } or { type:'surah', surahNum, surahName, pageNums, firstWords, dueDate, juz }
 *
 * @param {object} state - full app state
 * @returns {Array}
 */
export function buildSessionQueue(state) {
  const juzSettings = state.juzSettings || {};
  const surahModeJuz = new Set(
    Object.entries(juzSettings)
      .filter(([, s]) => s.reviewMode === 'surah')
      .map(([k]) => Number(k))
  );

  const items = [];

  // Surah-mode juz: group active pages by surah
  for (const juzNum of surahModeJuz) {
    if (!state.memorizedJuz?.includes(juzNum)) continue;
    const groups = getSurahGroupsForJuz(juzNum);
    for (const g of groups) {
      const activePages = g.pages
        .map(p => ({ p, rec: state.pages[String(p)] }))
        .filter(({ rec }) => rec && rec.active !== false);
      if (activePages.length === 0) continue;
      const dueDate = activePages.reduce(
        (min, { rec }) => (rec.dueDate < min ? rec.dueDate : min),
        '9999-99-99'
      );
      items.push({
        type: 'surah',
        juz: juzNum,
        surahNum: g.surahNum,
        surahName: g.surahName,
        pageNums: activePages.map(({ p }) => p),
        firstWords: g.firstWords,
        dueDate,
      });
    }
  }

  // Page-mode juz: individual active pages
  for (const [num, data] of Object.entries(state.pages)) {
    if (!surahModeJuz.has(data.juz) && data.active !== false) {
      items.push({ type: 'page', num: Number(num), ...data });
    }
  }

  const quota = calcQuota(
    items.reduce((sum, item) => sum + (item.type === 'surah' ? item.pageNums.length : 1), 0)
  );
  const sortedItems = items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Select items until we've reached the page quota
  const selectedItems = [];
  let pageCount = 0;
  for (const item of sortedItems) {
    const itemPages = item.type === 'surah' ? item.pageNums.length : 1;
    if (pageCount + itemPages > quota && pageCount > 0) break;
    selectedItems.push(item);
    pageCount += itemPages;
  }

  return selectedItems;
}

/**
 * Daily review quota: 10% of total review units (pages or surah groups), minimum 1.
 */
export function calcQuota(memorizedPageCount) {
  return Math.max(1, Math.ceil(memorizedPageCount * 0.1));
}
