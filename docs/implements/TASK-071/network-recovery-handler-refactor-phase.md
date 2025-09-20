# TDD Refactorフェーズ: TASK-071 Network Recovery Handler

## 目的

- null/undefined入力時のskip処理を共通化して重複ロジックを削減
- コメントと定数を整理し、仕様根拠とのトレーサビリティを強化

## 実施内容

1. `NULL_SAFE_SKIP_ACTION` 定数を追加し、skipアクション文字列を一元管理
2. `markSkipProcessing` ヘルパーを実装して3箇所の null 安全処理を共通化
3. `detectNetworkStateChange` のコメントと分岐を整理し、TC-071-001/204 への対応を明記

## セキュリティレビュー

- ヘルパー化による入力検証強化を確認し、重大な脆弱性は検出されず 🟢
- skipアクションの定数化によりタイプミスでの意図しないアクション発火を抑止

## パフォーマンスレビュー

- 条件分岐とヘルパー呼び出しのみのためO(1)のコストを維持 🟢
- 非オブジェクト入力時の早期returnで余計なプロパティ代入を回避

## テスト

- `npm test`（Vitest 全体）: 19 ファイル / 155 テスト成功

## 次のステップ

- `/tdd-verify-complete network-recovery-handler` を実行し、完全性検証ドキュメントを作成
