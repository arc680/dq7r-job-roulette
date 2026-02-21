/* ============================================
   DQ7 リイマジンド 職業ルーレット - UI Layer
   ============================================ */

import {
  CHARACTERS, JOBS, PHASES, CATEGORY_LABELS,
  getCharactersForPhase, computeMasteredJobs, toggleMasteredInHistory,
  getPreviousJobs, getAvailableJobs, pickRandomJob, formatTime,
} from './logic.js';

const STORAGE_KEY = 'dq7r-job-history';

// ── State ─────────────────────────────────────

let currentPhase = 1;
let isRolling = false;
let pendingAssignments = new Map(); // characterName → assignment object

// ── Init ──────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  localStorage.removeItem('dq7r-mastered-jobs');
  initPhaseTabs();
  initOptions();
  renderCharacters();
  renderHistory();
});

// ── Phase Tabs ────────────────────────────────

function initPhaseTabs() {
  const tabs = document.querySelectorAll('.phase-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (isRolling) return;
      pendingAssignments.clear();
      currentPhase = parseInt(tab.dataset.phase);
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCharacters();
    });
  });
}

// ── Options ───────────────────────────────────

function initOptions() {
  document.getElementById('rouletteBtn').addEventListener('click', confirmSession);
  document.getElementById('clearHistoryBtn').addEventListener('click', confirmClearHistory);
}

function isExcludePrevEnabled() {
  return document.getElementById('excludePrevCheck').checked;
}

function isExcludeMasteredEnabled() {
  return document.getElementById('excludeMasteredCheck').checked;
}

// ── Characters ────────────────────────────────

function renderCharacters() {
  const grid = document.getElementById('charactersGrid');
  const chars = getCharactersForPhase(currentPhase);
  const isDual = PHASES[currentPhase].dualJob;

  grid.innerHTML = chars.map(char => `
    <div class="character-card" data-character="${char.name}">
      <div class="card-header">
        <div class="card-avatar">${char.emoji}</div>
        <div class="card-name">${char.name}</div>
        <button class="char-spin-btn" data-character="${char.name}" title="${char.name}のみスピン">🎲</button>
      </div>
      <div class="job-slots">
        <div class="job-slot" data-slot="1">
          <span class="slot-label">${isDual ? 'メイン' : ''}</span>
          <span class="job-text">―</span>
        </div>
        ${isDual ? `
        <div class="job-slot" data-slot="2">
          <span class="slot-label">サブ</span>
          <span class="job-text">―</span>
        </div>` : ''}
      </div>
    </div>
  `).join('');

  initCharSpinButtons();
  updateConfirmButton();
}

// ── Character Spin Buttons ────────────────────

function initCharSpinButtons() {
  const chars = getCharactersForPhase(currentPhase);
  document.querySelectorAll('.char-spin-btn').forEach(btn => {
    const char = chars.find(c => c.name === btn.dataset.character);
    if (char) btn.addEventListener('click', () => startCharacterRoulette(char));
  });
}

// ── Per-Character Roulette ────────────────────

async function startCharacterRoulette(char) {
  if (isRolling) return;

  const isDual = PHASES[currentPhase].dualJob;
  const history = loadHistory();
  const masteredJobs = computeMasteredJobs(history);
  const excludePrev = isExcludePrevEnabled();
  const excludeMastered = isExcludeMasteredEnabled();
  const prevJobs = excludePrev ? getPreviousJobs(char.name, history) : [];
  const pool = getAvailableJobs(char, {
    masteredJobs, excludePrev, excludeMastered, prevJobs, historyLength: history.length,
  });
  if (pool.length === 0) return;

  isRolling = true;
  setSpinButtonsDisabled(true);

  const card = document.querySelector(`.character-card[data-character="${char.name}"]`);
  card.classList.remove('decided');
  card.classList.add('rolling');
  const slots = card.querySelectorAll('.job-slot');

  const job1 = await animateSlot(slots[0], pool);
  const charAssignment = { character: char.name, jobs: [{ ...job1, mastered: false }] };

  if (isDual && slots[1]) {
    const job2 = await animateSlot(slots[1], pool, [job1.name]);
    charAssignment.jobs.push({ ...job2, mastered: false });
  }

  card.classList.remove('rolling');
  card.classList.add('decided');
  pendingAssignments.set(char.name, charAssignment);

  isRolling = false;
  setSpinButtonsDisabled(false);
  updateConfirmButton();
}

// ── Confirm Session ───────────────────────────

function confirmSession() {
  if (pendingAssignments.size === 0) return;

  const assignments = Array.from(pendingAssignments.values());
  const timing = document.getElementById('timingInput').value.trim();
  saveHistory({
    timestamp: Date.now(),
    phase: currentPhase,
    phaseLabel: PHASES[currentPhase].label,
    timing: timing || '',
    assignments,
  });

  pendingAssignments.clear();
  document.querySelectorAll('.character-card.decided').forEach(c => c.classList.remove('decided'));
  updateConfirmButton();
}

// ── Button State Helpers ──────────────────────

function updateConfirmButton() {
  document.getElementById('rouletteBtn').disabled = pendingAssignments.size === 0;
}

function setSpinButtonsDisabled(disabled) {
  document.querySelectorAll('.char-spin-btn').forEach(btn => btn.disabled = disabled);
}

// ── Animation ─────────────────────────────────

async function animateSlot(slotEl, pool, exclude = []) {
  slotEl.classList.add('rolling');
  const textEl = slotEl.querySelector('.job-text');

  const totalFrames = 20 + Math.floor(Math.random() * 10);
  const baseDelay = 40;

  for (let i = 0; i < totalFrames; i++) {
    const randomJob = pool[Math.floor(Math.random() * pool.length)];
    textEl.textContent = randomJob.name;
    const delay = i > totalFrames - 5
      ? baseDelay + (i - (totalFrames - 5)) * 60
      : baseDelay;
    await sleep(delay);
  }

  const result = pickRandomJob(pool, exclude);
  textEl.innerHTML = `${result.name}<span class="job-category-tag">${CATEGORY_LABELS[result.category]}</span>`;

  slotEl.classList.remove('rolling');
  slotEl.classList.add('decided');

  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Local Storage ─────────────────────────────

function saveHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > 50) history.length = 50;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory();
}

function loadHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function deleteHistoryItem(index) {
  const history = loadHistory();
  history.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

function handleToggleMastered(historyIndex, characterName, jobName) {
  const history = loadHistory();
  const updated = toggleMasteredInHistory(history, historyIndex, characterName, jobName);
  if (updated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    renderHistory();
  }
}

function confirmClearHistory() {
  const history = loadHistory();
  if (history.length === 0) return;

  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <p>履歴とマスター状況を全て削除しますか？</p>
      <div class="confirm-actions">
        <button class="confirm-yes">削除</button>
        <button class="confirm-no">キャンセル</button>
      </div>
    </div>
  `;

  overlay.querySelector('.confirm-yes').addEventListener('click', () => {
    clearHistory();
    overlay.remove();
  });
  overlay.querySelector('.confirm-no').addEventListener('click', () => {
    overlay.remove();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

// ── History Rendering ─────────────────────────

function renderHistory() {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  const history = loadHistory();

  if (history.length === 0) {
    if (empty) empty.style.display = 'block';
    list.querySelectorAll('.history-item').forEach(el => el.remove());
    return;
  }

  if (empty) empty.style.display = 'none';

  list.innerHTML = (empty ? empty.outerHTML : '') + history.map((entry, historyIndex) => {
    const time = formatTime(entry.timestamp);
    const assignmentsHtml = entry.assignments.map(a => {
      const jobsHtml = a.jobs.map(j => {
        const jobName = typeof j === 'string' ? j : j.name;
        const mastered = typeof j === 'object' && j.mastered === true;
        return `
          <div class="history-job-item ${mastered ? 'mastered' : ''}">
            <label class="master-toggle" title="マスター済みにする">
              <input type="checkbox" ${mastered ? 'checked' : ''}
                data-history-index="${historyIndex}"
                data-character="${a.character}"
                data-job="${jobName}">
              <span class="master-check">${mastered ? '★' : '☆'}</span>
            </label>
            <span class="history-job-name">${jobName}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="history-assignment">
          <span class="history-char-name">${a.character}</span>
          <span class="history-job-arrow">→</span>
          <div class="history-jobs-list">${jobsHtml}</div>
        </div>
      `;
    }).join('');

    const timingHtml = entry.timing
      ? `<span class="history-timing">📍 ${entry.timing}</span>`
      : '';

    return `
      <div class="history-item">
        <div class="history-item-header">
          <div class="history-meta">
            <span class="history-time">${time}</span>
            <span class="history-phase">${entry.phaseLabel || 'Phase ' + entry.phase}</span>
            ${timingHtml}
          </div>
          <button class="history-delete-btn" data-index="${historyIndex}" title="削除">✕</button>
        </div>
        <div class="history-assignments">
          ${assignmentsHtml}
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.history-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteHistoryItem(parseInt(btn.dataset.index));
    });
  });

  list.querySelectorAll('.master-toggle input').forEach(cb => {
    cb.addEventListener('change', () => {
      handleToggleMastered(
        parseInt(cb.dataset.historyIndex),
        cb.dataset.character,
        cb.dataset.job
      );
    });
  });
}
