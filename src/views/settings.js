import { loadState, saveState, clearState, todayStr } from '../lib/storage.js';
import { getPagesForJuz, getSurahGroupsForJuz, juzMap } from '../lib/quran.js';
import { navigate } from '../router.js';

// ── Panel renderer (add a new juz OR manage an existing one) ──
function renderPanel(container, juzNum, isManage) {
  const state = loadState();
  const getJuzMode = (n) =>
    state.juzSettings?.[String(n)]?.reviewMode ?? (n >= 28 ? 'surah' : 'page');

  const juzInfo = juzMap.find(j => j.juz === juzNum);
  const allPages = getPagesForJuz(juzNum);
  const surahGroups = getSurahGroupsForJuz(juzNum);
  const today = todayStr();

  let panelMode = getJuzMode(juzNum);
  let panelChecked = new Set();

  const selectAllPages = () => {
    if (panelMode === 'surah') {
      surahGroups.forEach(g => g.pages.forEach(p => panelChecked.add(p)));
    } else {
      allPages.forEach(p => panelChecked.add(p));
    }
  };

  // initialise checkedSet
  if (isManage) {
    panelChecked = new Set(
      allPages.filter(p => {
        const rec = state.pages[String(p)];
        return rec && rec.active !== false;
      })
    );
  } else {
    selectAllPages();
  }

    const renderPanelUI = () => {
      const isSurah = panelMode === 'surah';
      const selectorHTML = isSurah
        ? surahGroups.map(g => {
            const allChecked = g.pages.every(p => panelChecked.has(p));
            const pageRange = g.pages.length > 1
              ? `pp. ${g.pages[0]}–${g.pages[g.pages.length - 1]}`
              : `p. ${g.pages[0]}`;
            return `
              <label class="selector-row">
                <input type="checkbox" class="item-check" data-pages="${g.pages.join(',')}" ${allChecked ? 'checked' : ''}>
                <div class="selector-info">
                  <span class="selector-name">${g.surahName}</span>
                  <span class="selector-sub">${pageRange}</span>
                </div>
              </label>`;
          }).join('')
        : allPages.map(p => {
            const checked = panelChecked.has(p);
            const rec = state.pages[String(p)];
            const isReviewed = rec && rec.reviewCount > 0;
            return `
              <label class="page-check-label">
                <input type="checkbox" class="item-check" data-pages="${p}" ${checked ? 'checked' : ''}>
                <span class="page-check-num">${p}</span>
                ${isReviewed ? '<span class="page-reviewed-dot" title="Already reviewed"></span>' : ''}
              </label>`;
          }).join('');

      const checkedPageCount = panelChecked.size;
      const btnLabel = isManage
        ? `Save changes`
        : `Add ${checkedPageCount} page${checkedPageCount !== 1 ? 's' : ''}`;

      container.innerHTML = `
        <div class="settings">
          <header class="page-header panel-header">
            <button class="btn-back" id="panel-back">← Back</button>
            <div>
              <h1>Juz ${juzNum}</h1>
              <span class="panel-surah-hint">${juzInfo?.firstSurah} · pp. ${juzInfo?.pageStart}–${juzInfo?.pageEnd}</span>
            </div>
          </header>

          <div class="panel-body">
            <div class="panel-mode-row">
              <span class="panel-mode-label">Review mode</span>
              <div class="mode-toggle-group">
                <button class="mode-btn${panelMode === 'surah' ? ' active' : ''}" data-mode="surah">By surah</button>
                <button class="mode-btn${panelMode === 'page' ? ' active' : ''}" data-mode="page">By page</button>
              </div>
            </div>

            <div class="selector-grid ${isSurah ? 'selector-surah' : 'selector-pages'}">
              ${selectorHTML}
            </div>

            <div class="panel-actions">
              <label class="select-all-row">
                <input type="checkbox" id="select-all" ${checkedPageCount === allPages.length ? 'checked' : checkedPageCount === 0 ? '' : 'indeterminate'}>
                Select all
              </label>
              <button class="btn-primary" id="panel-confirm" ${checkedPageCount === 0 ? 'disabled' : ''}>${btnLabel}</button>
            </div>
          </div>
        </div>
      `;

      // indeterminate state
      const selectAllEl = container.querySelector('#select-all');
      if (selectAllEl && checkedPageCount > 0 && checkedPageCount < allPages.length) {
        selectAllEl.indeterminate = true;
      }

      container.querySelector('#panel-back').addEventListener('click', () => {
        renderSettings(container);
      });

      container.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          panelMode = btn.dataset.mode;
          panelChecked.clear();
          selectAllPages();
          renderPanelUI();
        });
      });

      container.querySelectorAll('.item-check').forEach(cb => {
        cb.addEventListener('change', () => {
          const pages = cb.dataset.pages.split(',').map(Number);
          if (cb.checked) pages.forEach(p => panelChecked.add(p));
          else pages.forEach(p => panelChecked.delete(p));
          renderPanelUI();
        });
      });

      container.querySelector('#select-all').addEventListener('change', (e) => {
        if (e.target.checked) selectAllPages();
        else panelChecked.clear();
        renderPanelUI();
      });

      container.querySelector('#panel-confirm').addEventListener('click', () => {
        const s = loadState();
        const selectedPages = [...panelChecked];

        if (isManage) {
          // Toggle active on existing pages; add new pages
          for (const pageNum of allPages) {
            const key = String(pageNum);
            const isSelected = panelChecked.has(pageNum);
            if (s.pages[key]) {
              s.pages[key].active = isSelected ? true : false;
            } else if (isSelected) {
              s.pages[key] = { interval: 1, easeFactor: 2.5, dueDate: today, reviewCount: 0, lastRating: null, juz: juzNum };
            }
          }
        } else {
          // Add new juz
          if (!s.memorizedJuz.includes(juzNum)) {
            s.memorizedJuz = [...s.memorizedJuz, juzNum].sort((a, b) => a - b);
          }
          for (const pageNum of selectedPages) {
            const key = String(pageNum);
            if (!s.pages[key]) {
              s.pages[key] = { interval: 1, easeFactor: 2.5, dueDate: today, reviewCount: 0, lastRating: null, juz: juzNum };
            }
          }
        }

        // Save review mode
        s.juzSettings = s.juzSettings || {};
        s.juzSettings[String(juzNum)] = { reviewMode: panelMode };
        saveState(s);

        renderSettings(container);
      });
    };

    renderPanelUI();
}

export function renderSettings(container) {
  const state = loadState();
  if (!state) { navigate('/onboarding'); return; }

  const getJuzMode = (juzNum) =>
    state.juzSettings?.[String(juzNum)]?.reviewMode ?? (juzNum >= 28 ? 'surah' : 'page');

  const unmemorizedJuz = juzMap.filter(j => !state.memorizedJuz.includes(j.juz));

  container.innerHTML = `
    <div class="settings">
      <header class="page-header">
        <h1>Settings</h1>
      </header>

      ${state.memorizedJuz.length > 0 ? `
        <section class="settings-section card">
          <h2>Memorized juz</h2>
          <p>Manage which pages are active and how each juz is reviewed.</p>
          <div class="memorized-juz-list">
            ${state.memorizedJuz.map(juzNum => {
              const juzInfo = juzMap.find(j => j.juz === juzNum);
              const mode = getJuzMode(juzNum);
              const activeCount = Object.values(state.pages).filter(p => p.juz === juzNum && p.active !== false).length;
              const totalCount = getPagesForJuz(juzNum).length;
              return `
                <div class="memorized-juz-row">
                  <div class="mem-juz-info">
                    <span class="mem-juz-name">Juz ${juzNum} <span class="mem-juz-surah">${juzInfo?.firstSurah}</span></span>
                    <span class="mem-juz-meta">${activeCount}/${totalCount} pages · <span class="mode-badge">${mode === 'surah' ? 'By surah' : 'By page'}</span></span>
                  </div>
                  <button class="btn-manage" data-juz="${juzNum}">Manage</button>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <section class="settings-section card">
        <h2>Add memorized juz</h2>
        ${unmemorizedJuz.length === 0
          ? `<p>You have memorized all 30 juz — masha'Allah! <span aria-hidden="true">🎉</span></p>`
          : `<p>Tap a juz to choose which pages to add and how to review it.</p>
             <div class="add-juz-grid">
               ${unmemorizedJuz.map(j => `
                 <button class="juz-add-tile" data-juz="${j.juz}" aria-label="Add Juz ${j.juz}">
                   <span class="tile-num">Juz ${j.juz}</span>
                   <span class="tile-sub">${j.firstSurah}</span>
                   <span class="tile-pages">${j.pageStart}–${j.pageEnd}</span>
                 </button>
               `).join('')}
             </div>`
        }
      </section>

      <section class="settings-section card danger-zone">
        <h2>Reset data</h2>
        <p>Deletes all progress and review history. This cannot be undone.</p>
        <button class="btn-danger" id="reset-btn">Reset all data</button>
      </section>

      <nav class="bottom-nav" aria-label="Main navigation">
        <button class="nav-btn" data-route="/home">Home</button>
        <button class="nav-btn" data-route="/stats">Stats</button>
        <button class="nav-btn active" data-route="/settings">Settings</button>
      </nav>
    </div>
  `;

  container.querySelectorAll('.btn-manage').forEach(btn => {
    btn.addEventListener('click', () => {
      renderPanel(container, Number(btn.dataset.juz), true);
    });
  });

  container.querySelectorAll('.juz-add-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      renderPanel(container, Number(tile.dataset.juz), false);
    });
  });

  container.querySelector('#reset-btn')?.addEventListener('click', () => {
    // eslint-disable-next-line no-alert
    if (window.confirm('Reset all data? This will delete your entire progress and history.')) {
      clearState();
      navigate('/onboarding');
    }
  });

  container.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });
}

