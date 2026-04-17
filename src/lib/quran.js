import pageIndex from '../data/page-index.json';
import juzMap from '../data/juz-map.json';

/** @returns {{ page, surahNum, surahName, ayahNum, firstWords } | null} */
export function getPage(pageNum) {
  return pageIndex[pageNum - 1] || null;
}

/** @returns {number[]} array of page numbers for this juz */
export function getPagesForJuz(juzNum) {
  const juz = juzMap.find(j => j.juz === juzNum);
  if (!juz) return [];
  const pages = [];
  for (let p = juz.pageStart; p <= juz.pageEnd; p++) pages.push(p);
  return pages;
}

/** @returns {object | null} juz entry from juz-map */
export function getJuz(juzNum) {
  return juzMap.find(j => j.juz === juzNum) || null;
}

/**
 * Groups the pages of a juz into surah-based units.
 * Consecutive pages that share the same starting surahNum are grouped together.
 * @returns {Array<{surahNum, surahName, pages: number[], firstWords: string}>}
 */
export function getSurahGroupsForJuz(juzNum) {
  const juz = juzMap.find(j => j.juz === juzNum);
  if (!juz) return [];
  const groups = [];
  let current = null;
  for (let p = juz.pageStart; p <= juz.pageEnd; p++) {
    const info = pageIndex[p - 1];
    if (!current || current.surahNum !== info?.surahNum) {
      current = {
        surahNum: info?.surahNum,
        surahName: info?.surahName ?? '',
        pages: [p],
        firstWords: info?.firstWords ?? '',
      };
      groups.push(current);
    } else {
      current.pages.push(p);
    }
  }
  return groups;
}

export { juzMap };
