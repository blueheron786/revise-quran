import { navigate } from '../router.js';
import { initState, saveState, loadDarkMode } from '../lib/storage.js';
import { getPagesForJuz, juzMap } from '../lib/quran.js';

export function renderOnboarding(container) {
  // Apply dark mode class to body
  const isDarkMode = loadDarkMode();
  if (isDarkMode) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }

  const selected = new Set();
  // per-juz review mode; default 'surah' for juz 28+, 'page' otherwise
  const selectedModes = {};
  const getMode = (juzNum) => selectedModes[juzNum] ?? 'page';

  const countPages = () => {
    let total = 0;
    for (const j of selected) total += getPagesForJuz(j).length;
    return total;
  };

  const render = () => {
    const sortedSelected = [...selected].sort((a, b) => a - b);

    container.innerHTML = `
      <div class="onboarding">
        <h1>Hifz Review</h1>
        <p class="subtitle">Select the juz you have memorized</p>
        <div class="juz-grid">
          ${juzMap.map(j => `
            <button class="juz-tile${selected.has(j.juz) ? ' selected' : ''}" data-juz="${j.juz}" aria-pressed="${selected.has(j.juz)}">
              <span class="juz-num">Juz ${j.juz}</span>
              <span class="juz-surah">${j.firstSurah}</span>
              <span class="juz-pages">${j.pageStart}–${j.pageEnd}</span>
            </button>
          `).join('')}
        </div>

        ${sortedSelected.length > 0 ? `
          <div class="mode-section">
            <p class="mode-section-label">Review mode per juz</p>
            ${sortedSelected.map(juzNum => {
              const mode = getMode(juzNum);
              return `
                <div class="mode-row" data-juz="${juzNum}">
                  <span class="mode-juz-label">Juz ${juzNum}</span>
                  <div class="mode-toggle-group">
                    <button class="mode-btn${mode === 'surah' ? ' active' : ''}" data-juz="${juzNum}" data-mode="surah">By surah</button>
                    <button class="mode-btn${mode === 'page' ? ' active' : ''}" data-juz="${juzNum}" data-mode="page">By page</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <div class="onboarding-footer">
          <p class="selection-info">
            ${selected.size > 0 ? `${selected.size} juz · ${countPages()} pages selected` : 'Select at least one juz to begin'}
          </p>
          <button class="btn-primary" id="begin-btn" ${selected.size === 0 ? 'disabled' : ''}>Begin</button>
        </div>
      </div>
    `;

    container.querySelectorAll('.juz-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const juz = Number(tile.dataset.juz);
        if (selected.has(juz)) selected.delete(juz);
        else selected.add(juz);
        render();
      });
    });

    container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const juzNum = Number(btn.dataset.juz);
        selectedModes[juzNum] = btn.dataset.mode;
        render();
      });
    });

    container.querySelector('#begin-btn')?.addEventListener('click', () => {
      const memorizedJuz = [...selected].sort((a, b) => a - b);
      const pagesByJuz = [];
      for (const juzNum of memorizedJuz) {
        for (const page of getPagesForJuz(juzNum)) {
          pagesByJuz.push([page, juzNum]);
        }
      }
      const juzSettings = {};
      for (const juzNum of memorizedJuz) {
        juzSettings[String(juzNum)] = { reviewMode: getMode(juzNum) };
      }
      saveState(initState(memorizedJuz, pagesByJuz, juzSettings));
      navigate('/home');
    });
  };

  render();
}
