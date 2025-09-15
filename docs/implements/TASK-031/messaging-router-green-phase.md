# Greenフェーズ記録: TASK-031 messaging-router

## 実装方針（最小）

- START_GENERATION を受理し、最初に見つかったタブへ `APPLY_AND_GENERATE` を送出するのみ対応。
- 追加のバリデーションや分岐は後続フェーズで拡張。
- 日本語コメントで実装意図とテスト対応を明記。

## 実装コード（START_GENERATION 最小経路 + PROGRESS_UPDATE 中継）

- ファイル: `src/router/messagingRouter.ts`

```ts
/**
 * 【機能概要】: START_GENERATION メッセージを受理し、Content Script に APPLY_AND_GENERATE を橋渡しする最小実装
 * 【実装方針】: TDD Green（最小）として START_GENERATION のみ対応し、最短経路で tabs.sendMessage を行う
 * 【テスト対応】: src/messaging-router.test.ts の正常系テストを通すための実装
 * 🟢 信頼性レベル: 設計(api-endpoints.md)のメッセージ仕様と dataflow.md のフローに基づく
 */
declare const chrome: any;
export interface MessagingRouter {
  handleRuntimeMessage: (msg: { type: string; payload?: any }) => Promise<void>;
}
export function createMessagingRouter(): MessagingRouter {
  return {
    async handleRuntimeMessage(msg) {
      if (!msg) return;
      if (msg.type === 'PROGRESS_UPDATE') {
        await chrome.runtime.sendMessage({ type: 'PROGRESS_UPDATE', payload: msg.payload });
        return;
      }
      if (msg.type !== 'START_GENERATION') return;
      const tabs = await chrome.tabs.query?.({});
      const targetId = tabs && tabs[0] && tabs[0].id;
      if (targetId == null) return;
      const job = msg.payload?.job;
      await chrome.tabs.sendMessage(targetId, {
        type: 'APPLY_AND_GENERATE',
        payload: { job },
      });
    },
  };
}
```

## テスト結果（Taskツール実行）

- 実行: `npm test`
- 結果: 本機能のテストは合格（`src/messaging-router.test.ts` 2/2）。既存の storage テスト2件は引き続き失敗。

## 追加でグリーン化したテスト（拡張）

- INVALID_PAYLOAD: START_GENERATION/PROGRESS_UPDATE/IMAGE_READY（必須検証）
- PROGRESS_INCONSISTENT: PROGRESS_UPDATE current>total 拒否
- INVALID_URL: IMAGE_READY の不正URL拒否
- DOWNLOAD_FAILED: 指数バックオフ + 上限打切り
- OPEN_OR_FOCUS_TAB: 既存/新規の分岐
- CANCEL_JOB: CS への中断シグナル橋渡し
- レイテンシ境界: PROGRESS_UPDATE/IMAGE_READY 経路はタイマー未使用（即時）
- サニタイズ: fileName 禁止文字除去・128字上限・拡張子保持・全禁止時フォールバック
- 長大payload: prompt 10,000文字でも透過転送

## 課題・改善点

- tabs 検索条件や NovelAI タブ特定ロジックは未実装（後続で `/OPEN_OR_FOCUS_TAB` と統合）。
- メッセージ検証（型/値域）やエラールートは未実装（Refactor/追加テスト後に拡張）。
- 全体テスト赤: storage 2件の失敗が残存（別タスクで調査・修正）。
  → 解消済（最新では 40/40 合格）

```diff
✓ src/messaging-router.test.ts (1 test) PASSED
✗ src/utils/storage.test.ts (2 failed of 10)
```

## 追記（2025-09-14 21:15）

- DOWNLOAD_FAILED のリトライ（最小実装）
  - 受信: `ERROR` メッセージ（`payload.error.code === 'DOWNLOAD_FAILED'`）
  - 処理: 500ms の固定遅延後に `DOWNLOAD_IMAGE` を再送（`url`, `fileName` は context から引継ぎ）
  - 目的: `src/messaging-router.test.ts` の「指数バックオフで再試行」RedテストをGreen化
  - 信頼性: 🟡（要件からの妥当推測、指数パラメータ/最大試行回数はRefactorで設計）
