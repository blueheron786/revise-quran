import { loadState, todayStr } from '../lib/storage.js';
import { buildSessionQueue } from '../lib/srs.js';
import { navigate } from '../router.js';

export function renderHome(container) {
  const state = loadState();
  if (!state) { navigate('/onboarding'); return; }

  const memorizedCount = Object.keys(state.pages).length;
  const queue = buildSessionQueue(state);
  const today = todayStr();
  const overdueCount = Object.values(state.pages).filter(p => p.active !== false && p.dueDate <= today).length;
  const doneToday = state.streak.lastSessionDate === today;
  const streak = state.streak.current;

  container.innerHTML = `
    <div class="home">
      <header class="home-header">
        <h1 class="app-title">Hifz Review</h1>
        <div class="streak-badge" title="${streak} day streak">
          <span aria-hidden="true">🔥</span>
          <span class="streak-count">${streak}</span>
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
              ${overdueCount > 0 ? `<span class="overdue-badge">${overdueCount} overdue</span>` : ''}
            </p>
            <button class="btn-primary btn-large" id="start-review">Start Review</button>
          </div>
        `}

        <div class="home-stats">
          <div class="stat">
            <span class="stat-value">${memorizedCount}</span>
            <span class="stat-label">Pages memorized</span>
          </div>
          <div class="stat">
            <span class="stat-value">${state.memorizedJuz.length}</span>
            <span class="stat-label">Juz complete</span>
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
}
