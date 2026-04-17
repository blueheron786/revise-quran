const STORAGE_KEY = 'hifz-v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * @param {number[]} memorizedJuz - sorted array of juz numbers
 * @param {Array<[number, number]>} pagesByJuz - [[pageNum, juzNum], ...]
 * @param {object} juzSettings - per-juz settings, e.g. { "30": { reviewMode: "surah" } }
 */
export function initState(memorizedJuz, pagesByJuz, juzSettings = {}) {
  const today = todayStr();
  const pages = {};
  for (const [pageNum, juzNum] of pagesByJuz) {
    pages[String(pageNum)] = {
      interval: 1,
      easeFactor: 2.5,
      dueDate: today,
      reviewCount: 0,
      lastRating: null,
      juz: juzNum,
    };
  }
  return {
    memorizedJuz,
    pages,
    streak: { current: 0, lastSessionDate: null },
    sessions: [],
    juzSettings,
  };
}

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}
