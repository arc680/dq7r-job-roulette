/* ============================================
   DQ7 リイマジンド 職業ルーレット - Pure Logic
   ============================================ */

// ── Data ──────────────────────────────────────

export const CHARACTERS = [
  { name: '主人公', emoji: '⚓', uniqueJob: 'ひよっこ漁師' },
  { name: 'マリベル', emoji: '🎀', uniqueJob: 'ひよっこ網元' },
  { name: 'ガボ', emoji: '🐺', uniqueJob: 'オオカミ少年' },
  { name: 'アイラ', emoji: '💃', uniqueJob: 'ユバールの踊り手' },
  { name: 'メルビン', emoji: '🛡️', uniqueJob: '神の兵士' },
];

export const JOBS = {
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

export const JOB_PREREQUISITES = {
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

export const CATEGORY_LABELS = {
  unique: '固有職',
  basic: '基本職',
  advanced: '上級職',
  master: 'マスター職',
};

// ── Mastered Jobs ─────────────────────────────

/**
 * 履歴データからキャラごとのマスター済み職業を算出する（純粋関数）
 * @param {Array} history - 履歴エントリの配列
 * @returns {Object} { キャラ名: [職業名, ...] }
 */
export function computeMasteredJobs(history) {
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

/**
 * 履歴エントリ内の特定ジョブの mastered フラグを切り替えた新しい履歴を返す
 * @param {Array} history - 現在の履歴
 * @param {number} historyIndex - 対象エントリのインデックス
 * @param {string} characterName - キャラ名
 * @param {string} jobName - 職業名
 * @returns {Array|null} 更新後の履歴（変更なしの場合null）
 */
export function toggleMasteredInHistory(history, historyIndex, characterName, jobName) {
  const updated = JSON.parse(JSON.stringify(history)); // deep copy
  const entry = updated[historyIndex];
  if (!entry) return null;

  const assignment = entry.assignments.find(a => a.character === characterName);
  if (!assignment) return null;

  const jobIdx = assignment.jobs.findIndex(j => {
    const name = typeof j === 'string' ? j : j.name;
    return name === jobName;
  });
  if (jobIdx === -1) return null;

  const job = assignment.jobs[jobIdx];
  if (typeof job === 'string') {
    assignment.jobs[jobIdx] = { name: job, category: 'basic', mastered: true };
  } else {
    job.mastered = !job.mastered;
  }

  return updated;
}

/**
 * マスター済みジョブのトグル（純粋関数）
 * @param {Object} masteredJobs - { キャラ名: [職業名, ...] }
 * @param {string} characterName
 * @param {string} jobName
 * @returns {Object} 更新後の masteredJobs
 */
export function toggleJobMastery(masteredJobs, characterName, jobName) {
  const updated = { ...masteredJobs };
  const charJobs = updated[characterName] ? [...updated[characterName]] : [];
  const idx = charJobs.indexOf(jobName);
  if (idx >= 0) {
    charJobs.splice(idx, 1);
  } else {
    charJobs.push(jobName);
  }
  if (charJobs.length === 0) {
    delete updated[characterName];
  } else {
    updated[characterName] = charJobs;
  }
  return updated;
}

// ── Previous Jobs ─────────────────────────────

/**
 * 直前の履歴エントリから特定キャラの職業名一覧を取得する
 * @param {string} characterName - キャラ名
 * @param {Array} history - 履歴
 * @returns {string[]} 職業名の配列
 */
export function getPreviousJobs(characterName, history) {
  if (history.length === 0) return [];

  for (const entry of history) {
    if (!entry.assignments) continue;
    const assignment = entry.assignments.find(a => a.character === characterName);
    if (assignment) {
      return assignment.jobs.map(j => typeof j === 'string' ? j : j.name);
    }
  }

  return [];
}

// ── Job Prerequisites ─────────────────────────

/**
 * 前提条件を満たしているかチェックする
 * @param {string} characterName - キャラ名
 * @param {string} jobName - 職業名
 * @param {Object} masteredJobs - { キャラ名: [職業名, ...] }
 * @returns {boolean}
 */
export function checkPrerequisites(characterName, jobName, masteredJobs) {
  const prereq = JOB_PREREQUISITES[jobName];
  if (!prereq) return true;

  const charMastered = masteredJobs[characterName] || [];

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

/**
 * 除外すべきかどうか判定する
 */
export function shouldExclude(jobName, prevJobs, masteredJobs, excludePrev, excludeMastered) {
  if (excludePrev && prevJobs.includes(jobName)) return true;
  if (excludeMastered && masteredJobs.includes(jobName)) return true;
  return false;
}

/**
 * キャラクターの利用可能な職業プールを取得する
 * @param {Object} character - { name, uniqueJob }
 * @param {Object} options
 * @param {Object} options.masteredJobs - computeMasteredJobs の結果
 * @param {boolean} options.excludePrev - 直前の職を除外するか
 * @param {boolean} options.excludeMastered - マスター済みを除外するか
 * @param {string[]} options.prevJobs - 直前の職業名一覧
 * @param {number} options.historyLength - 現在の履歴件数（0なら初回）
 * @returns {Array<{name: string, category: string}>}
 */
export function getAvailableJobs(character, options) {
  const {
    masteredJobs = {},
    excludePrev = false,
    excludeMastered = false,
    prevJobs = [],
    historyLength = 0,
  } = options;

  const charMastered = masteredJobs[character.name] || [];
  let jobs = [];

  // 固有職（初回は除外）
  if (historyLength > 0 &&
    !shouldExclude(character.uniqueJob, prevJobs, charMastered, excludePrev, excludeMastered)) {
    jobs.push({ name: character.uniqueJob, category: 'unique' });
  }

  // 基本職
  JOBS.basic.forEach(j => {
    if (!shouldExclude(j, prevJobs, charMastered, excludePrev, excludeMastered)) {
      jobs.push({ name: j, category: 'basic' });
    }
  });

  // 上級職（前提条件チェック付き）
  JOBS.advanced.forEach(j => {
    if (checkPrerequisites(character.name, j, masteredJobs) &&
      !shouldExclude(j, prevJobs, charMastered, excludePrev, excludeMastered)) {
      jobs.push({ name: j, category: 'advanced' });
    }
  });

  // マスター職（前提条件チェック付き）
  JOBS.master.forEach(j => {
    if (checkPrerequisites(character.name, j, masteredJobs) &&
      !shouldExclude(j, prevJobs, charMastered, excludePrev, excludeMastered)) {
      jobs.push({ name: j, category: 'master' });
    }
  });

  return jobs;
}

/**
 * プールからランダムに1つ選ぶ。exclude に含まれる名前は除外。
 */
export function pickRandomJob(pool, exclude = []) {
  const filtered = pool.filter(j => !exclude.includes(j.name));
  if (filtered.length === 0) return pool[Math.floor(Math.random() * pool.length)];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ── Utility ───────────────────────────────────

export function formatTime(timestamp) {
  const d = new Date(timestamp);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
