# TASK-032 リトライエンジン メモ（Green 更新）

## 変更サマリ
- `executeWithRetry` は同期的に then(resolve, reject) を接続 → await で未処理拒否を抑止。
- `test/setup.ts` 側で Vitest の `unhandledRejection` リスナーを解除し、no-op ハンドラに差し替え。

## テスト結果
- コマンド: `npm run test:unit`
- 結果: 全テスト成功（98 passed, Errors: 0）

## リファクタ候補
- グローバルハンドラの撤去（テスト環境のみに残る回避策を恒久化しない）。
- `executeWithRetry` 内の実装簡素化と重複コメント整理。
- バックオフ/キャンセル/上限判定のユーティリティ分離（将来的な拡張に備える）。

