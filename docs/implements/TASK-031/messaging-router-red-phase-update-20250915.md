# Redフェーズ追加: START_GENERATION のタブ未存在時に OPEN_OR_FOCUS_TAB を発行

## 概要

- 機能名: messaging-router
- 開発開始: 2025-09-15
- 現在のフェーズ: Red（失敗テスト作成）

## 関連ファイル
- 実装ファイル: `src/router/messagingRouter.ts`
- テストファイル: `src/messaging-router.red.test.ts`
- 参照資料: `docs/design/novelai-auto-generator/architecture.md`, `docs/spec/novelai-auto-generator-requirements.md`（REQ-101）, 既存 `OPEN_OR_FOCUS_TAB` の設計・テスト

## Redフェーズ（失敗するテスト作成）

### 作成日時
- 2025-09-15

### テストケース（対象）
- START_GENERATION: タブ未存在時に OPEN_OR_FOCUS_TAB を発行してから適用へ進む
  - 期待: `chrome.runtime.sendMessage({ type: 'OPEN_OR_FOCUS_TAB', payload: { url: 'https://novelai.net/*' } })`
  - 根拠: REQ-101（タブが存在しない場合に新規作成/アクティブ化）に準拠したルーティング設計
  - 信頼性: 🟡（要件+既存メッセージ型からの妥当推測）

### テストコード（抜粋）
```ts
await router.handleRuntimeMessage({ type: MESSAGE_TYPES.START_GENERATION, payload: { job } } as any);
const openMsg = (chrome.runtime.sendMessage as any).mock.calls
  .map((c: any[]) => c[0])
  .find((m: any) => m?.type === MESSAGE_TYPES.OPEN_OR_FOCUS_TAB);
expect(openMsg).toBeTruthy();
expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
```

### 期待される失敗
- 現状実装では START_GENERATION でタブ未存在時に何もせず return するため、`OPEN_OR_FOCUS_TAB` が検出されずに失敗
- 典型メッセージ例: `Expected: truthy, Received: undefined`（OPEN_OR_FOCUS_TAB が送られていない）

### 次のフェーズへの要求事項（Green）
- START_GENERATION ハンドリング内で、`pickTargetTabId()` が未取得の場合に `runtime.sendMessage({ type: OPEN_OR_FOCUS_TAB, payload: { url: 'https://novelai.net/*' } })` を送信
- 可能であれば、タブ起動完了後に APPLY_AND_GENERATE を送るシーケンスへ拡張（将来テスト）

