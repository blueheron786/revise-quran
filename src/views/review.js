import { loadState, saveState, todayStr, loadDarkMode } from '../lib/storage.js';
import { buildSessionQueue, scheduleReview } from '../lib/srs.js';
import { getPage } from '../lib/quran.js';
import { navigate } from '../router.js';

export function renderReview(container) {
  const state = loadState();
  if (!state) { navigate('/onboarding'); return; }

  // Apply dark mode class to body
  const isDarkMode = loadDarkMode();
  if (isDarkMode) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }

  const queue = buildSessionQueue(state);

  if (queue.length === 0) {
    container.innerHTML = `
      <div class="review">
        <div class="review-card card" style="text-align:center;padding:2rem">
          <p>No pages to review right now.</p>
          <button class="btn-primary" style="margin-top:1rem" id="back">Back to Home</button>
        </div>
      </div>`;
    container.querySelector('#back').addEventListener('click', () => navigate('/home'));
    return;
  }

  let currentIdx = 0;
  const sessionResults = { easy: 0, hard: 0, 'many mistakes': 0 };
  let sessionFinalized = false;

  const finalizeSession = (reviewedCount) => {
    if (sessionFinalized || reviewedCount === 0) return;
    sessionFinalized = true;

    const today = todayStr();
    const s = loadState();

    // Update streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const last = s.streak.lastSessionDate;

    if (last === today) {
      // Already counted today — no change
    } else if (last === yesterdayStr) {
      s.streak.current += 1;
    } else {
      s.streak.current = 1;
    }
    s.streak.lastSessionDate = today;

    // Save session entry (replace if today already exists)
    const entry = { date: today, reviewed: reviewedCount, ...sessionResults };
    s.sessions = s.sessions || [];
    const idx = s.sessions.findIndex(x => x.date === today);
    if (idx >= 0) s.sessions[idx] = entry;
    else s.sessions.push(entry);
    s.sessions = s.sessions.slice(-90); // keep 90 days

    saveState(s);
  };

  const renderCard = () => {
    if (currentIdx >= queue.length) {
      finalizeSession(queue.length);
      showCompletion();
      return;
    }

    const item = queue[currentIdx];
    const isSurah = item.type === 'surah';

    // For page items, look up the page-index entry for meta info
    const pageInfo = isSurah ? null : getPage(item.num);
    const firstWords = isSurah ? item.firstWords : (pageInfo?.firstWords ?? '');

    const badgeHTML = isSurah
      ? `<div class="surah-badge">${item.surahName}</div>`
      : `<div class="page-badge">Page ${item.num}</div>`;

    const metaHTML = isSurah
      ? `<div class="page-meta">Pages ${item.pageNums[0]}${item.pageNums.length > 1 ? '–' + item.pageNums[item.pageNums.length - 1] : ''} · Juz ${item.juz}</div>`
      : `<div class="page-meta">${pageInfo ? `${pageInfo.surahName} · Ayah ${pageInfo.ayahNum}` : ''}</div>`;

    const hintText = isSurah
      ? 'Recite this surah from memory, then reveal the opening words to check yourself.'
      : 'Recite this page from memory, then reveal the opening words to check yourself.';

    container.innerHTML = `
      <div class="review">
        <div class="review-progress">
          <div class="progress-bar" role="progressbar" aria-valuenow="${currentIdx}" aria-valuemax="${queue.length}">
            <div class="progress-fill" style="width:${(currentIdx / queue.length) * 100}%"></div>
          </div>
          <span class="progress-text">${currentIdx + 1} / ${queue.length}</span>
        </div>

        <div class="review-card card">
          ${badgeHTML}
          ${metaHTML}

          <div class="hint-area">
            <p class="hint-instruction">${hintText}</p>
            <button class="btn-hint" id="show-hint">Show opening words</button>
            <div class="arabic-text" id="arabic-text" dir="rtl" lang="ar" hidden>${firstWords}</div>
          </div>

          <div class="rating-area">
            <p class="rating-prompt">How did it go?</p>
            <div class="rating-buttons">
              <button class="btn-rating btn-easy" data-rating="easy">
                <span class="rating-label">Easy</span>
                <span class="rating-sub">No mistakes</span>
              </button>
              <button class="btn-rating btn-hard" data-rating="hard">
                <span class="rating-label">Hard</span>
                <span class="rating-sub">Some mistakes</span>
              </button>
              <button class="btn-rating btn-many-mistakes" data-rating="many mistakes">
                <span class="rating-label">Many mistakes</span>
                <span class="rating-sub">Needed lots of help</span>
              </button>
            </div>
          </div>
        </div>

        <button class="btn-quit" id="quit-review">End session early</button>
      </div>
    `;

    container.querySelector('#show-hint').addEventListener('click', () => {
      container.querySelector('#arabic-text').hidden = false;
      container.querySelector('#show-hint').hidden = true;
    });

    container.querySelectorAll('.btn-rating').forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = btn.dataset.rating;
        sessionResults[rating] = (sessionResults[rating] || 0) + 1;

        // Persist updated schedule — apply rating to all pages in this item
        const s = loadState();
        const pageNums = isSurah ? item.pageNums : [item.num];
        for (const pageNum of pageNums) {
          const key = String(pageNum);
          if (s.pages[key]) s.pages[key] = scheduleReview(s.pages[key], rating);
        }
        saveState(s);

        currentIdx++;
        renderCard();
      });
    });

    container.querySelector('#quit-review').addEventListener('click', () => {
      finalizeSession(currentIdx);
      if (currentIdx > 0) {
        showCompletion();
      } else {
        navigate('/home');
      }
    });
  };

  const showCompletion = () => {
    const total = sessionResults.easy + sessionResults.hard + sessionResults['many mistakes'];
    container.innerHTML = `
      <div class="review review-complete">
        <div class="complete-card card">
          <div class="complete-icon" aria-hidden="true">✓</div>
          <h2>Session complete!</h2>
          <p>You reviewed <strong>${total}</strong> item${total !== 1 ? 's' : ''}</p>
          <div class="session-breakdown">
            <span class="rating-pill easy">${sessionResults.easy} easy</span>
            <span class="rating-pill hard">${sessionResults.hard} hard</span>
            <span class="rating-pill many-mistakes">${sessionResults['many mistakes']} many mistakes</span>
          </div>
        </div>
        <button class="btn-primary" id="back-home">Back to Home</button>
      </div>
    `;
    container.querySelector('#back-home').addEventListener('click', () => navigate('/home'));
  };

  renderCard();
}

