import { writeFileSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

console.log('Fetching Quran page metadata from alquran.cloud...');
const res = await fetch('https://api.alquran.cloud/v1/meta');
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const meta = await res.json();
const pageRefs = meta.data.pages.references;
console.log(`Got ${pageRefs.length} page references`);

console.log('Loading Arabic text from quran-json...');
let quranData;
const candidates = [
  'quran-json/dist/quran.json',
  '../node_modules/quran-json/dist/quran.json',
];
for (const c of candidates) {
  try { quranData = require(c); break; } catch { /* try next */ }
}
if (!quranData) throw new Error('Could not load quran-json. Run npm install first.');
console.log(`Loaded ${quranData.length} surahs`);

// Build lookup: surahNum -> { name, verses: { ayahNum: text } }
const surahNames = {};
const verseMap = {};
for (const surah of quranData) {
  // quran-json uses `transliteration` for romanised name
  surahNames[surah.id] = surah.transliteration || surah.name || `Surah ${surah.id}`;
  verseMap[surah.id] = {};
  for (const verse of (surah.verses || [])) {
    // `text` is the Arabic Uthmani text
    verseMap[surah.id][verse.id] = verse.text || '';
  }
}

const pageIndex = pageRefs.map((ref, i) => {
  const pageNum = i + 1;
  const { surah: surahNum, ayah: ayahNum } = ref;
  const surahName = surahNames[surahNum] || `Surah ${surahNum}`;
  const ayahText = verseMap[surahNum]?.[ayahNum] || '';
  // First 5 Arabic words (space-separated tokens)
  const firstWords = ayahText.split(/\s+/).slice(0, 5).join(' ');
  return { page: pageNum, surahNum, surahName, ayahNum, firstWords };
});

// Build surah openings map: surahNum -> first 5 words of ayah 1
const surahOpenings = {};
for (const surah of quranData) {
  const ayah1Text = verseMap[surah.id]?.[1] || '';
  surahOpenings[surah.id] = ayah1Text.split(/\s+/).slice(0, 5).join(' ');
}

const outDir = join(__dirname, '..', 'src', 'data');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'page-index.json');
writeFileSync(outPath, JSON.stringify(pageIndex, null, 2), 'utf8');
console.log(`\u2713 Wrote ${pageIndex.length} pages to ${outPath}`);

const openingsPath = join(outDir, 'surah-openings.json');
writeFileSync(openingsPath, JSON.stringify(surahOpenings, null, 2), 'utf8');
console.log(`\u2713 Wrote ${Object.keys(surahOpenings).length} surah openings to ${openingsPath}`);

// Spot-check
console.log('Page   1:', pageIndex[0]);
console.log('Page 582:', pageIndex[581]);
console.log('Page 604:', pageIndex[603]);
