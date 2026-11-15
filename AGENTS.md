# AGENTS.md

このリポジトリで作業する AI エージェント向けの共通ガイドラインです。作業を開始する前に本ファイルおよび `docs/` 配下のドキュメントを参照してください。

## プロジェクト概要

- **名称**: `dq7r-job-roulette`（DQ7 リイマジンド 職業ルーレット）
- **技術スタック**: Vanilla HTML / CSS / JavaScript (ES Modules)、ビルド工程なし
- **テスト**: Vitest (`vitest`)
- **デプロイ**: GitHub Pages（`.github/workflows/deploy.yml` により `master` への push 時に `npm test` 通過後デプロイ）

## ディレクトリ・主要ファイル構成

- `index.html`: アプリケーションのエントリーポイント（UI 構造）
- `style.css`: スタイル定義
- `logic.js`: 純粋ロジック層（キャラクター・職業データ、転職条件判定、抽選ロジック等。DOM・`localStorage` 非依存）
- `app.js`: UI 層（DOM 操作、イベント制御、`localStorage` 永続化）
- `logic.test.js`: `logic.js` のユニットテスト
- `docs/`: 設計・実装計画などのドキュメント群

## ドキュメント構成と運用ルール（`docs/`）

ドキュメントの詳細は [docs/README.md](docs/README.md) を参照してください。

- **実装計画の配置**: タスクごとの実装計画は `docs/plans/<task-slug>.md` に配置する（例: `docs/plans/history-import-export.md`）。
- **ルート直下の禁止**: リポジトリルート直下に `PLAN.md` などの単発タスク計画ファイルを置かない。
- **既存ドキュメントの確認**: 新規タスクに着手する際は、関連する計画や仕様がないか `docs/plans/` を確認する。

## 開発・テストコマンド

```bash
# ユニットテストの実行
npm test

# テストのウォッチモード
npm run test:watch

# ローカル開発サーバーの起動
npm run dev
```

## 実装ガイドライン

- **責務分離**: 抽選・条件判定などの純粋ロジックは `logic.js` に実装し、DOM やブラウザ API に依存させない。ロジックを変更・追加した場合は `logic.test.js` にテストを追加・更新する。
- **ビルド不要構成の維持**: バンドラやトランスパイラを前提とせず、ブラウザが直接読み込める ES Modules として記述する。
- **動作確認**: 変更後は `npm test` がすべてパスすることを確認する。
- **コミット時の帰属明記**: AI エージェントがコミットを作成する場合は、コミットメッセージ末尾に `Co-authored-by` トレーラーを付与する（例: Antigravity の場合は `Co-authored-by: Antigravity <noreply@google.com>`）。
