# TODO

## TDD: messaging-router（メッセージルータ/プロトコル実装）

- 状態: テストケース洗い出し 完了 ✅（messaging-router-testcases.md 追加）
- メモ: 正常/異常/境界を網羅。既存テストと要件に整合。バックオフ/サニタイズ/即時性を明確化。
- 品質判定: 高品質（分類網羅、期待値明確、TS+Vitest確定、実装可能）
- 変更: `doc/implementation/messaging-router-requirements.md`（要件）に続き `doc/implementation/messaging-router-testcases.md`（テスト）を追加
- 次アクション（Redフェーズ開始）:
  - [/tdd-red] 失敗テストの作成（messaging-router）
  - 優先: PROGRESS_UPDATE 伝搬、IMAGE_READY→DOWNLOAD_IMAGE、未知/不正payload拒否、DL失敗バックオフ上限
  - 備考: storage 関連の未解決テストは別タスクで管理
