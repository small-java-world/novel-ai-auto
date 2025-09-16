# TDD開発メモ更新（Red）: 設定アダプタ経由の生成テストを追加

- 機能名: Retry Engine（指数バックオフ）
- 作成日時: 2025-09-15
- 現在のフェーズ: Red（失敗テスト作成）

## 追加テスト概要
- ファイル: `src/utils/retry-engine.adapter.red.test.ts`
- 目的: `RetrySettings` から `RetryEngine` を生成するアダプタの先行テスト
- 内容: `calculateDelay(0..2)` が `500,1000,2000` になることを検証
- 期待失敗: アダプタ未実装による import 解決エラー

## 次のフェーズへの要求事項（Green）
- `src/utils/retry-engine.adapter.ts` を実装し、`createRetryEngine` に設定値を橋渡し
- 型: `RetrySettings`（src/types.ts）を受け、`RetryEngine` を返す
- 将来の命名差異を吸収できる設計にする
