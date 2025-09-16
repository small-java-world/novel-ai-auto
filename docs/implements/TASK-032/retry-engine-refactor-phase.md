# TASK-032 リトライエンジン（指数バックオフ） Refactor フェーズ

## 目的
- 機能同等性を維持したまま内部実装を簡潔化
- テスト専用の未処理拒否抑止（global unhandledRejection）を撤去
- 実装側での恒久対策（同期的なハンドラ接続）を徹底

## 設計・実装方針
- APIは不変（RetryEngine/RetryConfig の型・公開関数・挙動とも現状維持）
- executeWithRetry
  - 直接 `await operation()` を `try/catch` で包むシンプル構成
  - 同期タイミングでハンドラが接続されるため、pre-rejected Promise でも未処理拒否を発生させない
  - 失敗時は指数バックオフ `delay = baseDelay * factor^attempts` で待機し再試行
- executeWithDelay
  - `setTimeout` 登録時にIDを保持し、キャンセル時は実行を抑止
- その他
  - グローバルの `process.on('unhandledRejection', ...)` は一切使用しない
  - 日本語コメントは主要関数に残し、機能概要/実装方針/テスト適合/信頼性の観点を記述

## 変更ファイル
- src/utils/retry-engine.ts
  - executeWithRetry の内部を簡潔化（await/try-catch）
  - コメントを整理（機能概要/実装方針/テスト適合/信頼性）
- test/setup.ts
  - グローバル `unhandledRejection` 抑止を撤去

## テスト結果（要約）
- 実行コマンド
  - `npm run test:unit` → 成功（99 tests passed）
  - `npm run test:coverage` → 成功（閾値維持）。utils/retry-engine.ts の行カバレッジ: 約 99.6%
- Unhandled Errors/Unhandled Rejection: 0（Vitest 実行ログに未出力）
- PromiseRejectionHandledWarning: 発生なし

## 代替案と評価
- 代替案A: `new Promise + then(resolve, reject)` で明示的に同期接続
  - 効果は同等だが、`await/try-catch` の方が読みやすく保守性が高い
- 代替案B: ジッター（Jitter）導入で輻輳緩和
  - 本タスク範囲外。拡張案として将来対応（`baseDelay` に±乱数を加味）
- 代替案C: グローバルで `unhandledRejection` 抑止
  - 本番不要・警告誘発リスクあり。採用しない

## 今後の拡張（メモ）
- Jitter（Full/Equal/Decorrelated）対応のオプション化
- 失敗理由に応じた再試行ポリシの切替（即時中断 vs バックオフ）
- メトリクスフック（試行回数・最終エラーの採取）

## 結論
- 仕様・挙動は不変、実装は簡潔化。
- グローバル抑止に依存せず、未処理拒否ゼロを達成しテストはグリーンを維持。
