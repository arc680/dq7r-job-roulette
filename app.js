/* ============================================
   DQ7 リイマジンド 職業ルーレット - App Logic
   ============================================ */

// ── Data ──────────────────────────────────────

const CHARACTERS = [
  { name: '主人公', emoji: '⚓', uniqueJob: 'ひよっこ漁師', phases: [1, 2, 3] },
  { name: 'マリベル', emoji: '🎀', uniqueJob: 'ひよっこ網元', phases: [1, 2, 3] },
  { name: 'ガボ', emoji: '🐺', uniqueJob: 'オオカミ少年', phases: [1, 2, 3] },
  { name: 'アイラ', emoji: '💃', uniqueJob: 'ユバールの踊り手', phases: [2, 3] },
  { name: 'メルビン', emoji: '🛡️', uniqueJob: '神の兵士', phases: [3] },
];

const JOBS = {
  unique: [], // populated per-character
  basic: [
    '戦士', '武闘家', '魔法使い', '僧侶', '踊り子',
    '盗賊', '吟遊詩人', '船乗り', '羊飼い', '笑わせ師'
  ],
  advanced: [
    'バトルマスター', '魔法戦士', '賢者', 'パラディン',
    'スーパースター', 'まもの使い', '海賊'
  ],
  master: ['ゴッドハンド', '天地雷鳴士', '勇者']
};

// 上級職・マスター職の前提条件
const JOB_PREREQUISITES = {
  'バトルマスター': { type: 'all', requires: ['戦士', '武闘家'] },
  '魔法戦士': { type: 'all', requires: ['戦士', '魔法使い'] },
  '賢者': { type: 'all', requires: ['魔法使い', '僧侶'] },
  'パラディン': { type: 'all', requires: ['武闘家', '僧侶'] },
  'スーパースター': { type: 'all', requires: ['踊り子', '吟遊詩人', '笑わせ師'] },
  'まもの使い': { type: 'all', requires: ['盗賊', '羊飼い'] },
  '海賊': { type: 'all', requires: ['盗賊', '船乗り'] },
  'ゴッドハンド': { type: 'all', requires: ['バトルマスター', 'パラディン'] },
  '天地雷鳴士': { type: 'count', requires: ['賢者', 'スーパースター', '海賊'], count: 2 },
  '勇者': { type: 'advancedCount', count: 3 },
};

const PHASES = {
  1: { label: '転職解放', dualJob: false },
  2: { label: 'アイラ加入', dualJob: true },
  3: { label: 'メルビン加入', dualJob: true },
};

const CATEGORY_LABELS = {
  unique: '固有職',
  basic: '基本職',
  advanced: '上級職',
  master: 'マスター職',
};

const STORAGE_KEY = 'dq7r-job-history';

// ── State ─────────────────────────────────────

let currentPhase = 1;
let isRolling = false;

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
      currentPhase = parseInt(tab.dataset.phase);
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCharacters();
    });
  });
}

// ── Options ───────────────────────────────────

function initOptions() {
  document.getElementById('rouletteBtn').addEventListener('click', startRoulette);
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
  const chars = CHARACTERS.filter(c => c.phases.includes(currentPhase));
  const isDual = PHASES[currentPhase].dualJob;

  grid.innerHTML = chars.map(char => `
    <div class="character-card" data-character="${char.name}">
      <div class="card-header">
        <div class="card-avatar">${char.emoji}</div>
        <div class="card-name">${char.name}</div>
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
}

// ── Mastered Jobs (derived from history) ──────

function computeMasteredJobs() {
  const history = loadHistory();
  const mastered = {};

  history.forEach(entry => {
    if (!entry.assignments) return;
    entry.assignments.forEach(a => {
      a.jobs.forEach(j => {
        const jobName = typeof j === 'string' ? j : j.name;
        const isMastered = typeof j === 'object' && j.mastered === true;
        if (isMastered) {
          if (!mastered[a.character]) mastered[a.character] = [];
          if (!mastered[a.character].includes(jobName)) {
            mastered[a.character].push(jobName);
          }
        }
      });
    });
  });

  return mastered;
}

function toggleMastered(historyIndex, characterName, jobName) {
  const history = loadHistory();
  const entry = history[historyIndex];
  if (!entry) return;

  const assignment = entry.assignments.find(a => a.character === characterName);
  if (!assignment) return;

  const job = assignment.jobs.find(j => {
    const name = typeof j === 'string' ? j : j.name;
    return name === jobName;
  });
  if (!job) return;

  if (typeof job === 'string') {
    const idx = assignment.jobs.indexOf(job);
    assignment.jobs[idx] = { name: job, category: 'basic', mastered: true };
  } else {
    job.mastered = !job.mastered;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory();
}

// ── Previous Jobs (from most recent history) ──

function getPreviousJobs(characterName) {
  const history = loadHistory();
  if (history.length === 0) return [];

  const latest = history[0];
  if (!latest.assignments) return [];

  const assignment = latest.assignments.find(a => a.character === characterName);
  if (!assignment) return [];

  return assignment.jobs.map(j => typeof j === 'string' ? j : j.name);
}

// ── Job Prerequisites ─────────────────────────

function checkPrerequisites(characterName, jobName) {
  const prereq = JOB_PREREQUISITES[jobName];
  if (!prereq) return true;

  const mastered = computeMasteredJobs();
  const charMastered = mastered[characterName] || [];

  switch (prereq.type) {
    case 'all':
      return prereq.requires.every(req => charMastered.includes(req));
    case 'count':
      return prereq.requires.filter(req => charMastered.includes(req)).length >= prereq.count;
    case 'advancedCount':
      return JOBS.advanced.filter(j => charMastered.includes(j)).length >= prereq.count;
    default:
      return true;
  }
}

// ── Job Pool ──────────────────────────────────

function getAvailableJobs(character) {
  const mastered = computeMasteredJobs();
  const charMastered = mastered[character.name] || [];
  const excludePrev = isExcludePrevEnabled();
  const excludeMastered = isExcludeMasteredEnabled();
  const prevJobs = excludePrev ? getPreviousJobs(character.name) : [];

  let jobs = [];

  // 固有職
  const uniqueJob = character.uniqueJob;
  if (!shouldExclude(uniqueJob, prevJobs, charMastered, excludePrev, excludeMastered)) {
    jobs.push({ name: uniqueJob, category: 'unique' });
  }

  // 基本職
  JOBS.basic.forEach(j => {
    if (!shouldExclude(j, prevJobs, charMastered, excludePrev, excludeMastered)) {
      jobs.push({ name: j, category: 'basic' });
    }
  });

  // 上級職（前提条件チェック付き）
  JOBS.advanced.forEach(j => {
    if (checkPrerequisites(character.name, j) &&
      !shouldExclude(j, prevJobs, charMastered, excludePrev, excludeMastered)) {
      jobs.push({ name: j, category: 'advanced' });
    }
  });

  // マスター職（前提条件チェック付き）
  JOBS.master.forEach(j => {
    if (checkPrerequisites(character.name, j) &&
      !shouldExclude(j, prevJobs, charMastered, excludePrev, excludeMastered)) {
      jobs.push({ name: j, category: 'master' });
    }
  });

  return jobs;
}

function shouldExclude(jobName, prevJobs, masteredJobs, excludePrev, excludeMastered) {
  if (excludePrev && prevJobs.includes(jobName)) return true;
  if (excludeMastered && masteredJobs.includes(jobName)) return true;
  return false;
}

function pickRandomJob(pool, exclude = []) {
  const filtered = pool.filter(j => !exclude.includes(j.name));
  if (filtered.length === 0) return pool[Math.floor(Math.random() * pool.length)];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ── Roulette ──────────────────────────────────

async function startRoulette() {
  if (isRolling) return;

  const chars = CHARACTERS.filter(c => c.phases.includes(currentPhase));
  const isDual = PHASES[currentPhase].dualJob;

  isRolling = true;
  document.getElementById('rouletteBtn').disabled = true;

  const assignments = [];

  for (const char of chars) {
    const pool = getAvailableJobs(char);
    if (pool.length === 0) continue;

    const card = document.querySelector(`.character-card[data-character="${char.name}"]`);
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
    assignments.push(charAssignment);
  }

  const timingInput = document.getElementById('timingInput');
  const timing = timingInput.value.trim();
  saveHistory({
    timestamp: Date.now(),
    phase: currentPhase,
    phaseLabel: PHASES[currentPhase].label,
    timing: timing || '',
    assignments,
  });

  isRolling = false;
  document.getElementById('rouletteBtn').disabled = false;

  setTimeout(() => {
    document.querySelectorAll('.character-card.decided').forEach(c => c.classList.remove('decided'));
  }, 2000);
}

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
      toggleMastered(
        parseInt(cb.dataset.historyIndex),
        cb.dataset.character,
        cb.dataset.job
      );
    });
  });
}

function formatTime(timestamp) {
  const d = new Date(timestamp);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
