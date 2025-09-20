# TASK-040: UIスケルトン/状態管理 — Redフェーズ（2025-09-18）

## 追加の失敗テスト（Red）

- テスト名: ETA を二桁ゼロ埋め(分:秒)で表示する
  - 目的: 視認性と一貫性を高めるため、`残り時間: 2分05秒` のように秒を二桁表記
  - 入力: `updateProgress({ current:3, total:10, eta:125 })`
  - 期待: `etaText.textContent === '残り時間: 2分05秒'`
  - 現状: `2分5秒` となる実装のため失敗（Red）
  - 🟡 信頼性: 既存の日本語表記を踏襲しつつゼロ埋め仕様を追加定義（妥当な推測）

## ファイル
- 追加: `src/popup/ui-state-manager.eta-format.red.test.ts`

## 次アクション
- Greenフェーズ: `formatDuration` のゼロ埋め対応（分<10/秒<10 の 0 パディング）
- 影響範囲: `updateProgress()` の ETA 表示のみ（他の表示/ロジックに影響なし）

## 実行メモ
- デフォルト設定では `**/*.red.test.ts` は除外。個別に実行する場合:
  - `npx vitest run src/popup/ui-state-manager.eta-format.red.test.ts`

次のお勧めステップ: `/tdd-green` でGreenフェーズ（最小実装）に進みます。
