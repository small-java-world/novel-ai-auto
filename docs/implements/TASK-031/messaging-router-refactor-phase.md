# Refactor 記録: TASK-031 messaging-router

## 改善ポイント一覧（🟢=資料準拠/🟡=妥当推測）

- 🟢 定数抽出: メッセージ種別を `MESSAGE_TYPES` に集約（誤字防止/IDE補完）
- 🟢 ヘルパー分割: タブ選定 `pickTargetTabId` と メッセージ生成 `buildApplyAndGenerate`
- 🟡 URL安全チェック: http/https のみ許可（DOWNLOAD_IMAGE前に使用）
- 🟢 エラー定数/生成: `ERROR_CODES`, `createError` を整備（今後の利用前提）
- 🟢 コメント強化: 日本語JSDocを追加（目的/設計/性能/保守性）

## 改善コード抜粋

- `src/router/messagingRouter.ts`（ルータ最小実装の可読性向上）
- `src/shared/messages.ts`（メッセージ定数/型ガード）
- `src/shared/errors.ts`（エラーコード/ファクトリ）

### 追加の小改善（今回）

- 送信共通化: `forwardToRuntime(type, payload)` を導入し、`runtime.sendMessage` 呼び出しをDRY化 🟢
- PROGRESS_UPDATE/IMAGE_READY/ERROR 分岐で共通化ヘルパーを適用 🟢

## 設計観点

- 単一責任: 受信処理/タブ選定/メッセージ生成を分離
- 疎結合: 共有ヘルパーは純粋関数で副作用なし
- 段階的検証: まず浅い検証でGreen維持、将来zod等で強化

## セキュリティ観点（🟢）

- 型とメッセージ種別の明確化で不正入力を抑制
- 危険スキーム拒否（helpers側）

## パフォーマンス観点（🟢）

- O(1)の判定 + 1回のtabs.query/送信のみ
- 余計なオブジェクト生成を最小化

## 影響範囲と互換性

- 既存テストに影響なし（routerテスト継続合格）
- 他の失敗（storage）は本変更と独立

## テスト結果

- `src/messaging-router.test.ts`: 合格（4/4: START_GENERATION, PROGRESS_UPDATE, IMAGE_READY, UNKNOWN→ERROR）
- `src/utils/storage.test.ts`: 既存の2件が引き続き失敗（対象外）

## 次アクション

- NovelAI タブ特定/生成（OPEN_OR_FOCUS_TAB）の組込み
- 受信メッセージの型/値域検証の段階的強化
- DOWNLOAD_IMAGE 失敗時の再試行（指数バックオフ）追加（REQ-104, NFR-002）
