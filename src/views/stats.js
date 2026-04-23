import { loadState } from '../lib/storage.js';
import { getPagesForJuz } from '../lib/quran.js';
import { navigate } from '../router.js';

export function renderStats(container) {
  const state = loadState();
  if (!state) { navigate('/onboarding'); return; }

  const activePagesList = Object.values(state.pages).filter(p => p.active !== false);
  const activePages = activePagesList.length;
  const bdClean   = activePagesList.filter(p => p.reviewCount > 0 && p.lastRating === 'easy').length;
  const bdHard    = activePagesList.filter(p => p.reviewCount > 0 && p.lastRating === 'hard').length;
  const bdMany    = activePagesList.filter(p => p.reviewCount > 0 && p.lastRating === 'many mistakes').length;
  const bdUnknown = activePagesList.filter(p => p.reviewCount === 0).length;

  const fullJuzCount = state.memorizedJuz.filter(juzNum =>
    getPagesForJuz(juzNum).every(p => { const r = state.pages[String(p)]; return r && r.active !== false; })
  ).length;
  const partialJuzCount = state.memorizedJuz.length - fullJuzCount;
  const sessions = state.sessions || [];

  // Build last 14 days
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    const dateStr = d.toISOString().split('T')[0];
    const session = sessions.find(s => s.date === dateStr);
    return {
      dateStr,
      reviewed: session?.reviewed ?? 0,
      label: d.toLocaleDateString('en', { weekday: 'short' }).charAt(0),
    };
  });
  const maxReviewed = Math.max(...days.map(d => d.reviewed), 1);

  // All-time rating totals
  const totals = sessions.reduce(
    (acc, s) => { acc.easy += s.easy || 0; acc.hard += s.hard || 0; acc['many mistakes'] += s['many mistakes'] || 0; return acc; },
    { easy: 0, hard: 0, 'many mistakes': 0 }
  );

  const totalSessions = sessions.length;
  const totalPagesReviewed = sessions.reduce((a, s) => a + (s.reviewed || 0), 0);
  const avgPerSession = totalSessions ? Math.round(totalPagesReviewed / totalSessions) : 0;

  container.innerHTML = `
    <div class="stats">
      <header class="page-header">
        <h1>Stats</h1>
      </header>

      <div class="stats-overview">
        <div class="stat-card card">
          <span class="stat-big">${state.streak.current}</span>
          <span class="stat-label">Day streak 🔥</span>
        </div>
        <div class="stat-card card">
          <span class="stat-big">${activePages}</span>
          <span class="stat-label">Pages memorized</span>
        </div>
        <div class="stat-card card">
          <span class="stat-big">${fullJuzCount}</span>
          <span class="stat-label">Juz complete${partialJuzCount > 0 ? `<br><span class="stat-sub">+${partialJuzCount} partial</span>` : ''}</span>
        </div>
      </div>

      <div class="page-breakdown card">
        <h2>Page breakdown <span class="chart-subtitle">(${activePages} pages)</span></h2>
        <div class="breakdown-bar" role="img" aria-label="Page memorization quality breakdown">
          ${bdClean   > 0 ? `<div class="bb-seg bb-clean"   style="flex:${bdClean}"   title="${bdClean} clean"></div>`          : ''}
          ${bdHard    > 0 ? `<div class="bb-seg bb-hard"    style="flex:${bdHard}"    title="${bdHard} hard"></div>`            : ''}
          ${bdMany    > 0 ? `<div class="bb-seg bb-many"    style="flex:${bdMany}"    title="${bdMany} many mistakes"></div>`   : ''}
          ${bdUnknown > 0 ? `<div class="bb-seg bb-unknown" style="flex:${bdUnknown}" title="${bdUnknown} not yet reviewed"></div>` : ''}
        </div>
        <div class="breakdown-legend">
          <div class="bd-item">
            <span class="bd-dot bd-clean"></span>
            <span class="bd-num">${bdClean}</span>
            <span class="bd-lbl">Easy</span>
          </div>
          <div class="bd-item">
            <span class="bd-dot bd-hard"></span>
            <span class="bd-num">${bdHard}</span>
            <span class="bd-lbl">Hard</span>
          </div>
          <div class="bd-item">
            <span class="bd-dot bd-many"></span>
            <span class="bd-num">${bdMany}</span>
            <span class="bd-lbl">Mistakes</span>
          </div>
          <div class="bd-item">
            <span class="bd-dot bd-unknown"></span>
            <span class="bd-num">${bdUnknown}</span>
            <span class="bd-lbl">Unknown</span>
          </div>
        </div>
      </div>

      <div class="stats-activity">
        <div class="stat-card card">
          <span class="stat-big">${totalSessions}</span>
          <span class="stat-label">Days reviewed</span>
        </div>
        <div class="stat-card card">
          <span class="stat-big">${totalPagesReviewed}</span>
          <span class="stat-label">Total pages reviewed</span>
        </div>
      </div>

      <div class="chart-section card">
        <h2>Last 14 days <span class="chart-subtitle">(pages reviewed)</span></h2>
        <div class="bar-chart" role="img" aria-label="Bar chart of pages reviewed over the last 14 days">
          ${days.map(d => `
            <div class="bar-col">
              <div class="bar${d.reviewed > 0 ? '' : ' bar-empty'}"
                   style="height:${d.reviewed > 0 ? Math.max(8, Math.round((d.reviewed / maxReviewed) * 80)) : 0}px"
                   title="${d.reviewed} pages on ${d.dateStr}"></div>
              <span class="bar-label">${d.label}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="ratings-section card">
        <h2>Rating breakdown <span class="chart-subtitle">(all time · ${totalSessions} sessions)</span></h2>
        <div class="rating-totals">
          <div class="rating-total easy">
            <span class="rt-num">${totals.easy}</span>
            <span class="rt-label">Easy</span>
          </div>
          <div class="rating-total hard">
            <span class="rt-num">${totals.hard}</span>
            <span class="rt-label">Hard</span>
          </div>
          <div class="rating-total many-mistakes">
            <span class="rt-num">${totals['many mistakes']}</span>
            <span class="rt-label">Many mistakes</span>
          </div>
        </div>
        ${avgPerSession > 0 ? `<p class="avg-note">Avg ${avgPerSession} pages per session</p>` : ''}
      </div>

      <div class="juz-section card">
        <h2>Memorized juz (${state.memorizedJuz.length} / 30)</h2>
        <div class="juz-chips">
          ${state.memorizedJuz.map(j => {
            const isPartial = !getPagesForJuz(j).every(p => { const r = state.pages[String(p)]; return r && r.active !== false; });
            return `<span class="juz-chip${isPartial ? ' juz-chip-partial' : ''}">Juz ${j}${isPartial ? ' *' : ''}</span>`;
          }).join('')}
        </div>
        ${partialJuzCount > 0 ? `<p class="avg-note" style="margin-top:0.5rem">* partial pages selected</p>` : ''}
      </div>

      <nav class="bottom-nav" aria-label="Main navigation">
        <button class="nav-btn" data-route="/home">Home</button>
        <button class="nav-btn active" data-route="/stats">Stats</button>
        <button class="nav-btn" data-route="/settings">Settings</button>
      </nav>
    </div>
  `;

  container.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });
}
