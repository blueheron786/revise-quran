import { loadState, todayStr, loadDarkMode, saveDarkMode } from '../lib/storage.js';
import { buildSessionQueue } from '../lib/srs.js';
import { getPagesForJuz } from '../lib/quran.js';
import { navigate } from '../router.js';

export function renderHome(container) {
  const state = loadState();
  if (!state) { navigate('/onboarding'); return; }

  const activePages = Object.values(state.pages).filter(p => p.active !== false).length;
  const fullJuzCount = state.memorizedJuz.filter(juzNum =>
    getPagesForJuz(juzNum).every(p => { const r = state.pages[String(p)]; return r && r.active !== false; })
  ).length;
  const partialJuzCount = state.memorizedJuz.length - fullJuzCount;
  const queue = buildSessionQueue(state);
  const today = todayStr();
  const doneToday = state.streak.lastSessionDate === today;
  const streak = state.streak.current;
  const isDarkMode = loadDarkMode();

  // Apply dark mode class to body
  if (isDarkMode) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }

  container.innerHTML = `
    <div class="home">
      <header class="home-header">
        <h1 class="app-title">Hifz Review</h1>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <button class="dark-mode-toggle" id="dark-mode-toggle" aria-label="Toggle dark mode">
            ${isDarkMode ? '☀️' : '🌙'}
          </button>
          <div class="streak-badge" title="${streak} day streak">
            <span aria-hidden="true">🔥</span>
            <span class="streak-count">${streak}</span>
          </div>
        </div>
      </header>

      <main class="home-main">
        ${doneToday ? `
          <div class="done-today card">
            <div class="done-icon" aria-hidden="true">✓</div>
            <h2>All done for today</h2>
            <p>Come back tomorrow for your next review session.</p>
          </div>
        ` : `
          <div class="review-cta card">
            <h2>Today's Review</h2>
            <p class="quota-info">
              <strong>${queue.length}</strong> to review
            </p>
            <button class="btn-primary btn-large" id="start-review">Start Review</button>
          </div>
        `}

        <div class="home-stats">
          <div class="stat">
            <span class="stat-value">${activePages}</span>
            <span class="stat-label">Pages memorized</span>
          </div>
          <div class="stat">
            <span class="stat-value">${fullJuzCount}</span>
            <span class="stat-label">Juz complete${partialJuzCount > 0 ? `<br><span class="stat-sub">+${partialJuzCount} partial</span>` : ''}</span>
          </div>
        </div>
      </main>

      <nav class="bottom-nav" aria-label="Main navigation">
        <button class="nav-btn active" data-route="/home">Home</button>
        <button class="nav-btn" data-route="/stats">Stats</button>
        <button class="nav-btn" data-route="/settings">Settings</button>
      </nav>
    </div>
  `;

  container.querySelector('#start-review')?.addEventListener('click', () => navigate('/review'));
  container.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });

  container.querySelector('#dark-mode-toggle').addEventListener('click', () => {
    const newDarkMode = !loadDarkMode();
    saveDarkMode(newDarkMode);
    if (newDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    renderHome(container); // Re-render to update icon
  });
}
