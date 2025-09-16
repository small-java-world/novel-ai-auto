# TDD開発メモ: messaging-router (REQ-101 異常系 - タブ操作失敗)

## 概要

- 機能名: OPEN_OR_FOCUS_TAB でのタブ操作失敗時のエラーハンドリング
- 開発開始: 2025-09-15
- 現在のフェーズ: Red (失敗するテスト作成)

## 関連ファイル

- 要件定義: `docs/spec/novelai-auto-generator-requirements.md` (REQ-101)
- テストケース定義: `doc/implementation/messaging-router-testcases.md`
- 実装ファイル: `src/router/messagingRouter.ts`
- テストファイル: `src/messaging-router.test.ts`

## Redフェーズ（失敗するテスト作成）

### 作成日時

2025-09-15 14:30

### テストケース

- **テスト名**: `OPEN_OR_FOCUS_TAB でタブ操作失敗時は ERROR を発行する（REQ-101 異常系）`
- **テスト目的**: tabs.create や tabs.update が失敗した場合にERROR(TAB_OPERATION_FAILED)を発行すること
- **対象要件**: REQ-101 異常系（タブ操作の例外処理）

### テストコード

```typescript
test('OPEN_OR_FOCUS_TAB でタブ操作失敗時は ERROR を発行する（REQ-101 異常系）', async () => {
  // 【テスト目的】: tabs.create や tabs.update が失敗した場合に ERROR(TAB_OPERATION_FAILED) を発行すること
  // 【テスト内容】: tabs.create が例外を投げる状況をモックし、ERROR メッセージが送出されることを検証
  // 【期待される動作】: chrome.runtime.sendMessage で ERROR(TAB_OPERATION_FAILED) が1回送信される
  // 🟡 信頼性レベル: REQ-101 異常系の要件からの妥当な推測（具体的なエラーコードは実装判断）

  // 【テストデータ準備】: タブが存在しない状況でタブ作成が失敗するシナリオを設定
  // 【初期条件設定】: tabs.query は空配列（タブなし）、tabs.create は例外を投げるモック
  mockChrome.tabs.query.mockResolvedValue([]); // タブなし
  mockChrome.tabs.create.mockRejectedValue(new Error('Permission denied')); // タブ作成失敗

  // 【実際の処理実行】: OPEN_OR_FOCUS_TAB を処理してタブ作成失敗を発生させる
  // 【処理内容】: ルータがタブ作成失敗をキャッチして ERROR メッセージを発行する
  const router = createMessagingRouter();
  await router.handleRuntimeMessage({
    type: 'OPEN_OR_FOCUS_TAB',
    payload: { url: 'https://novelai.net/generate' },
  } as any);

  // 【結果検証】: ERROR メッセージが1回送信されること
  // 【期待値確認】: エラーコードが TAB_OPERATION_FAILED またはそれに相当するコードであること
  expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1); // 【確認内容】: エラー通知が1回行われたことを確認 🟡
  const sent = mockChrome.runtime.sendMessage.mock.calls[0][0];
  expect(sent.type).toBe('ERROR'); // 【確認内容】: エラー種別のメッセージであることを確認 🟡
  expect(sent.payload?.error?.code).toBe('TAB_OPERATION_FAILED'); // 【確認内容】: タブ操作失敗を示すエラーコードであることを確認 🟡
});
```

### 期待される失敗

現在の実装では、`tabs.create` が例外を投げた場合にその例外がキャッチされず、テスト実行時にも例外が伝播してテストが失敗する。

具体的な失敗内容：
```
Error: Permission denied
❯ src/messaging-router.test.ts:498:46
```

### 信頼性レベル評価

- 🟡 **黄信号**: REQ-101 異常系の要件から妥当な推測
  - エラーコード名 `TAB_OPERATION_FAILED` は実装判断
  - タブ操作失敗の検出とERROR発行は要件にて適切と考えられる

### 次のフェーズへの要求事項

Greenフェーズで実装すべき内容：

1. **エラーハンドリング実装**:
   - `OPEN_OR_FOCUS_TAB` 処理内で `try-catch` ブロックを追加
   - `tabs.create` および `tabs.update` の例外をキャッチ

2. **エラーコード追加**:
   - `src/shared/errors.ts` に `TAB_OPERATION_FAILED` を追加 ✅ (完了)

3. **ERROR メッセージ発行**:
   - キャッチした例外を `ERROR(TAB_OPERATION_FAILED)` として `runtime.sendMessage` で送信
   - エラーメッセージには原因となった例外情報を含める

### 品質基準

✅ **テスト実行**: 成功（失敗することを確認）
✅ **期待値**: 明確で具体的（ERROR タイプ、TAB_OPERATION_FAILED コード）
✅ **アサーション**: 適切（呼び出し回数、メッセージ構造）
✅ **実装方針**: 明確（try-catch によるエラーハンドリング）

## 技術的詳細

### 対象実装箇所

`src/router/messagingRouter.ts` の `OPEN_OR_FOCUS_TAB` 処理部分（行128-149）:

```typescript
// 【タブ操作】: OPEN_OR_FOCUS_TAB を処理（既存/新規） 🟢
if (msg.type === MESSAGE_TYPES.OPEN_OR_FOCUS_TAB) {
  // ... 現在の実装
  const tabs = await chrome.tabs.query({ url: queryUrl });
  if (tabs && tabs[0] && tabs[0].id != null) {
    await chrome.tabs.update(tabs[0].id, { active: true }); // ←例外発生箇所
  } else {
    await chrome.tabs.create({ url: baseUrl, active: true }); // ←例外発生箇所
  }
  return;
}
```

### 実装アプローチ

```typescript
// 【改善後のイメージ】
if (msg.type === MESSAGE_TYPES.OPEN_OR_FOCUS_TAB) {
  try {
    // ... 既存の処理
    const tabs = await chrome.tabs.query({ url: queryUrl });
    if (tabs && tabs[0] && tabs[0].id != null) {
      await chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      await chrome.tabs.create({ url: baseUrl, active: true });
    }
  } catch (error) {
    await forwardToRuntime(MESSAGE_TYPES.ERROR, {
      error: {
        code: ERROR_CODES.TAB_OPERATION_FAILED,
        message: `Tab operation failed: ${error.message}`
      },
    });
  }
  return;
}
```

## 次のステップ

次のお勧めステップ: `/tdd-green` でGreenフェーズ（最小実装）を開始します。