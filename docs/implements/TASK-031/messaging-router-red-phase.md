# Redフェーズ記録: TASK-031 messaging-router

## 対象テストケース

- START_GENERATION メッセージを受理し、ジョブ登録後に CS へ APPLY_AND_GENERATE を送出する（正常系）
  - 🟢 信頼性: api-endpoints.md と interfaces.ts の仕様に準拠

## テストファイル

- `src/messaging-router.test.ts`

## テストコード（抜粋）

```ts
import { createMessagingRouter } from './router/messagingRouter';

// ...省略...
const router = createMessagingRouter();
await router.handleRuntimeMessage({ type: 'START_GENERATION', payload: { job } });
expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
  type: 'APPLY_AND_GENERATE',
  payload: { job },
});
```

## 期待される失敗

- 実装未提供のためモジュール解決に失敗、または関数未定義で失敗
  - 例: `Cannot find module './router/messagingRouter'` / `createMessagingRouter is not a function`

---

## 追加: PROGRESS_UPDATE ブロードキャスト（今回のRed）

### テストケース

- PROGRESS_UPDATE を受理して Popup へブロードキャストする（正常系）
  - 🟢 信頼性: api-endpoints.md の PROGRESS_UPDATE と dataflow.md の進捗フローに準拠

### テストファイル

- `src/messaging-router.test.ts`（同ファイルに追記）

### 期待される失敗

- ルータが PROGRESS_UPDATE を未実装のため、`chrome.runtime.sendMessage` が呼ばれず失敗
  - 例: expected "spy" to be called 1 times, but got 0 times

### 次フェーズへの要求事項（Green）

- `handleRuntimeMessage` に PROGRESS_UPDATE 分岐を追加し、`chrome.runtime.sendMessage({ type:'PROGRESS_UPDATE', payload })` を1回送出

## 次フェーズへの要求事項（Green）

- `src/router/messagingRouter.ts` を新規作成し、`createMessagingRouter().handleRuntimeMessage(...)` を最小実装
- START_GENERATION → APPLY_AND_GENERATE の最短経路のみ対応（他メッセージは未対応で構わない）
