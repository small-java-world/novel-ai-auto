# TDD開発メモ: messaging-router (REQ-101 異常系 - タブ操作失敗) - Greenフェーズ

## 概要

- 機能名: OPEN_OR_FOCUS_TAB でのタブ操作失敗時のエラーハンドリング
- 開発開始: 2025-09-15
- 現在のフェーズ: Green (最小実装)
- 前フェーズ: Red (失敗するテスト作成) ✅

## Greenフェーズ（最小実装）

### 実装日時

2025-09-15 14:35

### 実装方針

- **最小限実装**: テストを通すための最もシンプルなtry-catch実装
- **エラーハンドリング**: tabs.create/tabs.updateの例外をキャッチしてERROR発行
- **既存機能維持**: 正常系の処理には一切変更を加えない

### 実装コード

**実装ファイル**: `src/router/messagingRouter.ts` (行139-162)

```typescript
try {
  // 【タブ操作実行】: URL解析とタブ検索・操作を実行 🟢
  // 【実装方針】: 既存/新規タブの分岐処理をtry-catchで包み、失敗時はERRORで通知
  const rawUrl: string = msg.payload.url;
  const queryUrl = rawUrl;
  const baseUrl = rawUrl.endsWith('*') ? rawUrl.slice(0, -1) : rawUrl;
  const tabs = await chrome.tabs.query({ url: queryUrl });
  if (tabs && tabs[0] && tabs[0].id != null) {
    // 【既存タブ処理】: 見つかったタブをアクティブ化 🟢
    await chrome.tabs.update(tabs[0].id, { active: true });
  } else {
    // 【新規タブ処理】: 新しいタブを作成してアクティブ化 🟢
    await chrome.tabs.create({ url: baseUrl, active: true });
  }
} catch (error) {
  // 【エラーハンドリング】: タブ操作失敗時にERROR(TAB_OPERATION_FAILED)を発行 🟡
  // 【テスト対応】: REQ-101異常系テストケースを通すための最小実装
  await forwardToRuntime(MESSAGE_TYPES.ERROR, {
    error: {
      code: ERROR_CODES.TAB_OPERATION_FAILED,
      message: `Tab operation failed: ${(error as Error)?.message || error}`,
    },
  });
}
```

### 実装内容の詳細

1. **try-catch ブロック追加**:
   - 既存のタブ操作処理全体をtry-catchで包囲
   - 🟢 信頼性: 既存の動作を完全に保持

2. **エラーキャッチ処理**:
   - `tabs.query`, `tabs.update`, `tabs.create` の例外を統一的にキャッチ
   - 🟡 信頼性: REQ-101異常系要件からの妥当な推測

3. **ERROR メッセージ発行**:
   - 既存の `forwardToRuntime` ヘルパーを活用
   - エラーコード: `ERROR_CODES.TAB_OPERATION_FAILED` (既存定数を使用)
   - エラーメッセージ: 元の例外メッセージを含む安全な形式
   - 🟡 信頼性: テスト要件に基づく最小実装

### テスト結果

**テスト実行日時**: 2025-09-15 14:37

#### ✅ 対象テストケース結果
- **テスト名**: "OPEN_OR_FOCUS_TAB でタブ操作失敗時は ERROR を発行する（REQ-101 異常系）"
- **結果**: ✅ **PASSED**
- **確認事項**:
  - `chrome.runtime.sendMessage` が1回呼び出される ✅
  - メッセージタイプが `'ERROR'` ✅
  - エラーコードが `'TAB_OPERATION_FAILED'` ✅

#### ✅ 回帰テスト結果
- **messaging-router.test.ts 全体**: ✅ **23/23 テスト成功**
- **既存機能**: 影響なし、全て正常動作
- **他の異常系テスト**: 全て継続して成功

### 課題・改善点

以下の点でRefactorフェーズでの改善が望ましい：

1. **エラーメッセージの詳細化** (🟡):
   - 現在は汎用的なメッセージ形式
   - タブ操作の種別（create/update）による分別が可能

2. **型安全性の向上** (🟡):
   - `error as Error` のキャストが必要
   - より厳密な型ガードの導入余地

3. **ログ記録の検討** (🔴):
   - デバッグ時の情報不足の可能性
   - 本番環境での問題調査に有用

4. **リトライ戦略の検討** (🔴):
   - 一時的な権限エラーに対する再試行
   - ただし現段階では要件外のため後回し

### 成功要因

1. **既存実装の理解**:
   - `forwardToRuntime` ヘルパーの活用
   - 既存エラーハンドリングパターンとの整合性維持

2. **最小限実装の徹底**:
   - 余計な機能追加なし
   - テスト要件のみに集中

3. **適切なエラーコード利用**:
   - 既存の `ERROR_CODES.TAB_OPERATION_FAILED` を活用
   - 一貫性のある形式

### 次のフェーズ対応要件

Refactorフェーズで検討すべき事項：

- **エラー分類**: create失敗 vs update失敗の判別
- **型安全性**: Error型のより適切なハンドリング
- **パフォーマンス**: エラー処理のオーバーヘッド確認
- **セキュリティ**: エラーメッセージの情報漏洩リスク

## 品質評価

### ✅ **Green フェーズ品質: 高品質**

- **テスト結果**: 全て成功（23/23） ✅
- **実装品質**: シンプルかつ動作確実 ✅
- **リファクタ箇所**: 明確に特定済み ✅
- **機能的問題**: なし ✅
- **コンパイルエラー**: なし ✅

### 実装指針の遵守状況

- ✅ **最小限実装**: try-catch のみの追加
- ✅ **テスト通過最優先**: 対象テストが確実に成功
- ✅ **既存機能保持**: 回帰なし
- ✅ **日本語コメント**: 適切に記載
- ✅ **信頼性レベル表示**: 🟢🟡🔴 で明示

## 次のステップ

**推奨**: `/tdd-refactor` フェーズに進む

- 実装は動作しており機能的問題なし
- 改善箇所が明確に特定済み
- エラーハンドリングの品質向上余地あり