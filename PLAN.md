# 履歴インポート・エクスポート 実装計画

## 概要

localStorageに保存されている履歴データを JSON ファイルとしてエクスポート・インポートできる機能を追加する。

---

## 対象ファイル

| ファイル | 変更内容 |
|---|---|
| `index.html` | エクスポート・インポートボタンの追加 |
| `app.js` | エクスポート・インポートのロジック追加 |
| `style.css` | 新規ボタンのスタイル追加 |

---

## ステップ1: UI の変更 (`index.html`)

履歴セクションのヘッダー部分（現在の「全クリア」ボタン横）に2つのボタンを追加：

```html
<!-- 変更前 -->
<div class="history-header">
  <h2 class="section-title">履歴</h2>
  <button class="clear-btn" id="clearHistoryBtn">...</button>
</div>

<!-- 変更後 -->
<div class="history-header">
  <h2 class="section-title">履歴</h2>
  <div class="history-actions">
    <button class="import-btn" id="importHistoryBtn">📥 インポート</button>
    <button class="export-btn" id="exportHistoryBtn">📤 エクスポート</button>
    <button class="clear-btn" id="clearHistoryBtn">🗑️ 全クリア</button>
  </div>
</div>

<!-- ファイル選択用（非表示） -->
<input type="file" id="importFileInput" accept=".json" style="display:none">
```

---

## ステップ2: エクスポートロジック (`app.js`)

### 実装内容

```javascript
function exportHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    // 履歴が空の場合は何もしない or アラート
    return;
  }

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    history: history,
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // タイムスタンプ付きファイル名 例: dq7r-history-2026-02-21.json
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dq7r-history-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## ステップ3: インポートロジック (`app.js`)

### バリデーション

インポート前に以下を検証：

1. 有効な JSON であること
2. `history` フィールド（配列）が存在すること
3. 各エントリに `timestamp`・`phase`・`assignments` が存在すること
4. 不正なエントリは除外し、有効分のみインポート

### マージ戦略

既存の履歴がある場合、確認ダイアログを表示して選択させる：

- **追加（マージ）**: 既存 + インポート分を timestamp でソートし、重複（同一 timestamp）はインポート側を優先。50件の上限は維持。
- **置き換え**: 既存を削除し、インポートしたデータで上書き。

```javascript
function importHistory(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const imported = validateImportData(parsed);
      if (imported.length === 0) {
        showImportError('有効な履歴データが見つかりませんでした');
        return;
      }
      const existing = loadHistory();
      if (existing.length > 0) {
        showImportMergeDialog(existing, imported);
      } else {
        applyImport(imported);
      }
    } catch {
      showImportError('JSONの読み込みに失敗しました');
    }
  };
  reader.readAsText(file);
}

function validateImportData(parsed) {
  const arr = Array.isArray(parsed) ? parsed : parsed?.history;
  if (!Array.isArray(arr)) return [];
  return arr.filter(entry =>
    typeof entry.timestamp === 'number' &&
    typeof entry.phase === 'number' &&
    Array.isArray(entry.assignments)
  );
}
```

### マージ・置き換えダイアログ

既存の `confirmClearHistory()` と同様のオーバーレイUIを使用：

```
┌─────────────────────────────────────────┐
│  X件の履歴をインポートします             │
│  既存のY件の履歴はどうしますか？         │
│                                          │
│  [追加する]   [置き換える]   [キャンセル] │
└─────────────────────────────────────────┘
```

---

## ステップ4: スタイル追加 (`style.css`)

既存の `.clear-btn` に近いスタイルで、エクスポート・インポートボタンを追加：

- `history-actions`: ボタンをまとめるフレックスコンテナ
- `.export-btn`: エクスポートボタン（既存ボタンと同系統のデザイン）
- `.import-btn`: インポートボタン（同上）

---

## ステップ5: イベント登録 (`app.js` の `initOptions()`)

```javascript
function initOptions() {
  document.getElementById('rouletteBtn').addEventListener('click', confirmSession);
  document.getElementById('clearHistoryBtn').addEventListener('click', confirmClearHistory);
  document.getElementById('exportHistoryBtn').addEventListener('click', exportHistory);
  document.getElementById('importHistoryBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  document.getElementById('importFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importHistory(file);
    e.target.value = ''; // 同じファイルを再選択できるようリセット
  });
}
```

---

## エラーハンドリング

| 状況 | 対応 |
|---|---|
| 履歴が空の状態でエクスポート | ボタンを無効化 or メッセージ表示 |
| 無効な JSON ファイル | エラーメッセージをオーバーレイ表示 |
| 構造が不正なファイル | バリデーションで弾き、有効データのみ使用 |
| インポート後の件数が 50 件超 | 新しい順に 50 件に切り詰め |

---

## 実装順序

1. `index.html` にボタンと隠しファイル入力を追加
2. `app.js` にエクスポート関数を実装・登録
3. `app.js` にインポート関数・バリデーション・ダイアログを実装・登録
4. `style.css` にボタンスタイルを追加
5. 動作確認（エクスポート → インポート → マージ・置き換えの両方）
6. コミット・プッシュ

---

## 考慮しないこと（スコープ外）

- CSV 形式でのエクスポート（JSON のみ）
- クラウド同期・共有機能
- 暗号化・パスワード保護
- バージョン間の自動マイグレーション（v1 形式のみサポート）
