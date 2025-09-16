# TASK-032 リトライエンジン メモ更新（Red追補: previewDelays）

## 概要
- 目的: 予定バックオフ配列を返す `previewDelays(remaining?: number)` API をTDDで要求定義
- 根拠: architecture.md（バックオフ設定）, dataflow.md（失敗時再試行シーケンス）
- 信頼性: 🟡（既存設計からの妥当な拡張）

## 作成テスト
- ファイル: `src/utils/retry-engine.previewDelays.red.test.ts`
- 内容: base=100, factor=2.0, maxRetries=3 → `[100, 200, 400]` を返すこと
- 現状: 未実装のため失敗（Red）

## 次のフェーズ（Green）
- `RetryEngine` へメソッド追加、`createRetryEngine` 実装で配列生成を提供
- cancel状態では空配列、remaining指定時は件数制限
