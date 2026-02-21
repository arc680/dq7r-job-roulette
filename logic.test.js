import { describe, it, expect } from 'vitest';
import {
  CHARACTERS, JOBS, PHASES, JOB_PREREQUISITES,
  getCharactersForPhase,
  computeMasteredJobs,
  toggleMasteredInHistory,
  getPreviousJobs,
  checkPrerequisites,
  getAvailableJobs,
  shouldExclude,
  pickRandomJob,
  formatTime,
} from './logic.js';

// ── getCharactersForPhase ─────────────────────

describe('getCharactersForPhase', () => {
  it('Phase 1: 3人（主人公, マリベル, ガボ）', () => {
    const chars = getCharactersForPhase(1);
    expect(chars).toHaveLength(3);
    expect(chars.map(c => c.name)).toEqual(['主人公', 'マリベル', 'ガボ']);
  });

  it('Phase 2: 4人（+アイラ）', () => {
    const chars = getCharactersForPhase(2);
    expect(chars).toHaveLength(4);
    expect(chars.map(c => c.name)).toContain('アイラ');
  });

  it('Phase 3: 5人（+メルビン）', () => {
    const chars = getCharactersForPhase(3);
    expect(chars).toHaveLength(5);
    expect(chars.map(c => c.name)).toContain('メルビン');
  });
});

// ── computeMasteredJobs ───────────────────────

describe('computeMasteredJobs', () => {
  it('空履歴 → 空オブジェクト', () => {
    expect(computeMasteredJobs([])).toEqual({});
  });

  it('マスター済みフラグなし → 空オブジェクト', () => {
    const history = [{
      assignments: [{
        character: '主人公',
        jobs: [{ name: '戦士', category: 'basic', mastered: false }]
      }]
    }];
    expect(computeMasteredJobs(history)).toEqual({});
  });

  it('マスター済みフラグあり → 該当キャラ・職業を返す', () => {
    const history = [{
      assignments: [{
        character: '主人公',
        jobs: [{ name: '戦士', category: 'basic', mastered: true }]
      }]
    }];
    expect(computeMasteredJobs(history)).toEqual({ '主人公': ['戦士'] });
  });

  it('同一職業の重複排除', () => {
    const history = [
      {
        assignments: [{
          character: '主人公',
          jobs: [{ name: '戦士', category: 'basic', mastered: true }]
        }]
      },
      {
        assignments: [{
          character: '主人公',
          jobs: [{ name: '戦士', category: 'basic', mastered: true }]
        }]
      },
    ];
    expect(computeMasteredJobs(history)).toEqual({ '主人公': ['戦士'] });
  });

  it('複数キャラの独立管理', () => {
    const history = [{
      assignments: [
        { character: '主人公', jobs: [{ name: '戦士', category: 'basic', mastered: true }] },
        { character: 'マリベル', jobs: [{ name: '僧侶', category: 'basic', mastered: true }] },
      ]
    }];
    const result = computeMasteredJobs(history);
    expect(result['主人公']).toEqual(['戦士']);
    expect(result['マリベル']).toEqual(['僧侶']);
  });
});

// ── toggleMasteredInHistory ───────────────────

describe('toggleMasteredInHistory', () => {
  it('未マスター → マスターに切り替え', () => {
    const history = [{
      assignments: [{
        character: '主人公',
        jobs: [{ name: '戦士', category: 'basic', mastered: false }]
      }]
    }];
    const updated = toggleMasteredInHistory(history, 0, '主人公', '戦士');
    expect(updated[0].assignments[0].jobs[0].mastered).toBe(true);
  });

  it('マスター → 未マスターに切り替え', () => {
    const history = [{
      assignments: [{
        character: '主人公',
        jobs: [{ name: '戦士', category: 'basic', mastered: true }]
      }]
    }];
    const updated = toggleMasteredInHistory(history, 0, '主人公', '戦士');
    expect(updated[0].assignments[0].jobs[0].mastered).toBe(false);
  });

  it('元の履歴を変更しない（イミュータブル）', () => {
    const history = [{
      assignments: [{
        character: '主人公',
        jobs: [{ name: '戦士', category: 'basic', mastered: false }]
      }]
    }];
    toggleMasteredInHistory(history, 0, '主人公', '戦士');
    expect(history[0].assignments[0].jobs[0].mastered).toBe(false);
  });

  it('存在しないインデックス → null', () => {
    expect(toggleMasteredInHistory([], 5, '主人公', '戦士')).toBeNull();
  });

  it('存在しないキャラ → null', () => {
    const history = [{
      assignments: [{
        character: '主人公',
        jobs: [{ name: '戦士', category: 'basic', mastered: false }]
      }]
    }];
    expect(toggleMasteredInHistory(history, 0, '存在しない', '戦士')).toBeNull();
  });

  it('文字列ジョブ → オブジェクトに変換してmastered=true', () => {
    const history = [{
      assignments: [{
        character: '主人公',
        jobs: ['戦士']
      }]
    }];
    const updated = toggleMasteredInHistory(history, 0, '主人公', '戦士');
    expect(updated[0].assignments[0].jobs[0]).toEqual({
      name: '戦士', category: 'basic', mastered: true
    });
  });
});

// ── getPreviousJobs ───────────────────────────

describe('getPreviousJobs', () => {
  it('空履歴 → 空配列', () => {
    expect(getPreviousJobs('主人公', [])).toEqual([]);
  });

  it('直前の履歴からキャラの職業名を返す', () => {
    const history = [{
      assignments: [{
        character: '主人公',
        jobs: [{ name: '戦士', category: 'basic', mastered: false }]
      }]
    }];
    expect(getPreviousJobs('主人公', history)).toEqual(['戦士']);
  });

  it('掛け持ちの場合は2つ返す', () => {
    const history = [{
      assignments: [{
        character: '主人公',
        jobs: [
          { name: '戦士', category: 'basic', mastered: false },
          { name: '僧侶', category: 'basic', mastered: false },
        ]
      }]
    }];
    expect(getPreviousJobs('主人公', history)).toEqual(['戦士', '僧侶']);
  });

  it('該当キャラなし → 空配列', () => {
    const history = [{
      assignments: [{
        character: 'マリベル',
        jobs: [{ name: '僧侶', category: 'basic', mastered: false }]
      }]
    }];
    expect(getPreviousJobs('主人公', history)).toEqual([]);
  });
});

// ── checkPrerequisites ────────────────────────

describe('checkPrerequisites', () => {
  it('基本職（前提なし）→ true', () => {
    expect(checkPrerequisites('主人公', '戦士', {})).toBe(true);
  });

  it('all型: 全前提マスター済み → true', () => {
    const mastered = { '主人公': ['戦士', '武闘家'] };
    expect(checkPrerequisites('主人公', 'バトルマスター', mastered)).toBe(true);
  });

  it('all型: 一部不足 → false', () => {
    const mastered = { '主人公': ['戦士'] };
    expect(checkPrerequisites('主人公', 'バトルマスター', mastered)).toBe(false);
  });

  it('all型: マスターなし → false', () => {
    expect(checkPrerequisites('主人公', 'バトルマスター', {})).toBe(false);
  });

  it('count型（天地雷鳴士）: 2/3マスター → true', () => {
    const mastered = { '主人公': ['賢者', 'スーパースター'] };
    expect(checkPrerequisites('主人公', '天地雷鳴士', mastered)).toBe(true);
  });

  it('count型（天地雷鳴士）: 1/3マスター → false', () => {
    const mastered = { '主人公': ['賢者'] };
    expect(checkPrerequisites('主人公', '天地雷鳴士', mastered)).toBe(false);
  });

  it('advancedCount型（勇者）: 上級職3つ → true', () => {
    const mastered = { '主人公': ['バトルマスター', '賢者', '海賊'] };
    expect(checkPrerequisites('主人公', '勇者', mastered)).toBe(true);
  });

  it('advancedCount型（勇者）: 上級職2つ → false', () => {
    const mastered = { '主人公': ['バトルマスター', '賢者'] };
    expect(checkPrerequisites('主人公', '勇者', mastered)).toBe(false);
  });

  it('advancedCount型: マスター職はカウントしない', () => {
    const mastered = { '主人公': ['バトルマスター', '賢者', 'ゴッドハンド'] };
    expect(checkPrerequisites('主人公', '勇者', mastered)).toBe(false);
  });

  it('キャラ独立: 他キャラのマスターは影響しない', () => {
    const mastered = { 'マリベル': ['戦士', '武闘家'] };
    expect(checkPrerequisites('主人公', 'バトルマスター', mastered)).toBe(false);
  });
});

// ── shouldExclude ─────────────────────────────

describe('shouldExclude', () => {
  it('両方OFF → false', () => {
    expect(shouldExclude('戦士', ['戦士'], ['戦士'], false, false)).toBe(false);
  });

  it('excludePrev=true, 直前に含まれる → true', () => {
    expect(shouldExclude('戦士', ['戦士'], [], true, false)).toBe(true);
  });

  it('excludePrev=true, 直前に含まれない → false', () => {
    expect(shouldExclude('僧侶', ['戦士'], [], true, false)).toBe(false);
  });

  it('excludeMastered=true, マスター済み → true', () => {
    expect(shouldExclude('戦士', [], ['戦士'], false, true)).toBe(true);
  });

  it('excludeMastered=true, 未マスター → false', () => {
    expect(shouldExclude('僧侶', [], ['戦士'], false, true)).toBe(false);
  });
});

// ── getAvailableJobs ──────────────────────────

describe('getAvailableJobs', () => {
  const hero = { name: '主人公', uniqueJob: 'ひよっこ漁師' };

  it('初回（履歴なし） → 固有職は含まれない', () => {
    const jobs = getAvailableJobs(hero, { masteredJobs: {}, historyLength: 0 });
    const names = jobs.map(j => j.name);
    expect(names).not.toContain('ひよっこ漁師');
    expect(jobs.every(j => j.category !== 'unique')).toBe(true);
  });

  it('2回目以降 → 固有職が含まれる', () => {
    const jobs = getAvailableJobs(hero, { masteredJobs: {}, historyLength: 1 });
    const names = jobs.map(j => j.name);
    expect(names).toContain('ひよっこ漁師');
  });

  it('マスターなし → 基本職+固有職のみ（上級職なし）', () => {
    const jobs = getAvailableJobs(hero, { masteredJobs: {}, historyLength: 1 });
    const categories = [...new Set(jobs.map(j => j.category))];
    expect(categories).toContain('unique');
    expect(categories).toContain('basic');
    expect(categories).not.toContain('advanced');
    expect(categories).not.toContain('master');
  });

  it('前提達成 → 上級職が候補に入る', () => {
    const mastered = { '主人公': ['戦士', '武闘家'] };
    const jobs = getAvailableJobs(hero, { masteredJobs: mastered, historyLength: 1 });
    const advancedNames = jobs.filter(j => j.category === 'advanced').map(j => j.name);
    expect(advancedNames).toContain('バトルマスター');
    expect(advancedNames).not.toContain('賢者'); // 魔法使い+僧侶が未マスター
  });

  it('excludePrev=true → 直前職を除外', () => {
    const jobs = getAvailableJobs(hero, {
      masteredJobs: {},
      excludePrev: true,
      prevJobs: ['戦士', '僧侶'],
      historyLength: 1,
    });
    const names = jobs.map(j => j.name);
    expect(names).not.toContain('戦士');
    expect(names).not.toContain('僧侶');
    expect(names).toContain('武闘家');
  });

  it('excludeMastered=true → マスター済み職を除外', () => {
    const mastered = { '主人公': ['戦士'] };
    const jobs = getAvailableJobs(hero, {
      masteredJobs: mastered,
      excludeMastered: true,
      historyLength: 1,
    });
    const names = jobs.map(j => j.name);
    expect(names).not.toContain('戦士');
    expect(names).toContain('武闘家');
  });

  it('固有職も除外対象', () => {
    const jobs = getAvailableJobs(hero, {
      masteredJobs: {},
      excludePrev: true,
      prevJobs: ['ひよっこ漁師'],
      historyLength: 1,
    });
    const names = jobs.map(j => j.name);
    expect(names).not.toContain('ひよっこ漁師');
  });
});

// ── pickRandomJob ─────────────────────────────

describe('pickRandomJob', () => {
  const pool = [
    { name: '戦士', category: 'basic' },
    { name: '僧侶', category: 'basic' },
    { name: '魔法使い', category: 'basic' },
  ];

  it('除外なし → プールから選択', () => {
    const result = pickRandomJob(pool);
    expect(pool.map(j => j.name)).toContain(result.name);
  });

  it('除外あり → 除外後のプールから選択', () => {
    const result = pickRandomJob(pool, ['戦士', '僧侶']);
    expect(result.name).toBe('魔法使い');
  });

  it('全除外 → フォールバックでプールから選択', () => {
    const result = pickRandomJob(pool, ['戦士', '僧侶', '魔法使い']);
    expect(pool.map(j => j.name)).toContain(result.name);
  });
});

// ── formatTime ────────────────────────────────

describe('formatTime', () => {
  it('タイムスタンプをフォーマットする', () => {
    // 2026/02/21 20:30
    const ts = new Date(2026, 1, 21, 20, 30).getTime();
    expect(formatTime(ts)).toBe('2026/02/21 20:30');
  });

  it('1桁の月日時分をゼロ埋めする', () => {
    const ts = new Date(2026, 0, 5, 9, 3).getTime();
    expect(formatTime(ts)).toBe('2026/01/05 09:03');
  });
});

// ── Data Integrity ────────────────────────────

describe('データ整合性', () => {
  it('全上級職に前提条件が定義されている', () => {
    JOBS.advanced.forEach(job => {
      expect(JOB_PREREQUISITES[job]).toBeDefined();
    });
  });

  it('全マスター職に前提条件が定義されている', () => {
    JOBS.master.forEach(job => {
      expect(JOB_PREREQUISITES[job]).toBeDefined();
    });
  });

  it('基本職には前提条件がない', () => {
    JOBS.basic.forEach(job => {
      expect(JOB_PREREQUISITES[job]).toBeUndefined();
    });
  });

  it('全キャラに固有職がある', () => {
    CHARACTERS.forEach(c => {
      expect(c.uniqueJob).toBeTruthy();
    });
  });

  it('全フェーズが定義されている', () => {
    [1, 2, 3].forEach(p => {
      expect(PHASES[p]).toBeDefined();
      expect(PHASES[p].label).toBeTruthy();
    });
  });
});

// ── getPreviousJobs - 部分的なキャラのみを含む履歴エントリ ────────

describe('getPreviousJobs - 部分的なキャラのみを含む履歴エントリ', () => {
  it('最新エントリに対象キャラがいない場合は空配列を返す', () => {
    const history = [
      { assignments: [{ character: 'マリベル', jobs: [{ name: '踊り子', category: 'basic', mastered: false }] }] },
      { assignments: [{ character: '主人公', jobs: [{ name: '戦士', category: 'basic', mastered: false }] }] },
    ];
    expect(getPreviousJobs('主人公', history)).toEqual([]);
  });

  it('最新エントリに対象キャラがいれば正しく返す（部分エントリ）', () => {
    const history = [
      { assignments: [{ character: '主人公', jobs: [{ name: '戦士', category: 'basic', mastered: false }] }] },
    ];
    expect(getPreviousJobs('主人公', history)).toEqual(['戦士']);
  });
});
