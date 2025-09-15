# TDD Green Phase: DOM セレクタ戦略とフォールバック

**Task**: TASK-020
**Phase**: Green (最小実装)
**Date**: 2025-09-15 00:00
**Status**: 完了 ✅

## 実装結果サマリー

### テスト結果

```
✓ src/utils/dom-selector-strategy.test.ts (9 tests) 505ms

Test Files  1 passed (1)
     Tests  9 passed (9)
  Duration  1.50s
```

**全9テストが成功**: Red フェーズで作成した全テストケースがパス

## 実装された関数

### 1. `findElementWithFallback` 関数

**実装方針**: セレクタ配列を順次試行し、可視要素のみ返却する最小実装

```typescript
export function findElementWithFallback(
  elementType: ElementType,
  config: SelectorConfig
): HTMLElement | null {
  // 入力値検証
  if (!config || !config.selectors || config.selectors.length === 0) {
    return null;
  }

  // セレクタ順次試行
  for (const selector of config.selectors) {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        // 可視性チェック（content.tsパターン）
        if (element.offsetParent !== null) {
          return element;
        }
      }
    } catch (error) {
      continue;
    }
  }

  return null;
}
```

**実装の特徴**:

- ✅ セレクタの優先順位に従った順次試行
- ✅ `element.offsetParent !== null` による可視性チェック
- ✅ エラー耐性（不正セレクタでも継続）
- ✅ シンプルで理解しやすい実装

**テスト対応**:

- ✅ 第1候補優先選択
- ✅ フォールバック機能
- ✅ 全セレクタ失敗時のnull返却
- ✅ 非表示要素の除外
- ✅ 500ms以内での処理完了

### 2. `waitForElementWithTimeout` 関数

**実装方針**: 即座に要素探索を試行し、見つからない場合はタイムアウトエラーを発生

```typescript
export async function waitForElementWithTimeout(
  elementType: ElementType,
  config: SelectorConfig
): Promise<HTMLElement> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const elapsedTime = Date.now() - startTime;
      const error = new DOMSelectorError(
        `要素タイプ '${elementType}' のフォールバック探索がタイムアウトしました (${elapsedTime}ms)`,
        elementType,
        'timeout',
        config.selectors,
        elapsedTime
      );
      reject(error);
    }, config.timeout);

    const element = findElementWithFallback(elementType, config);
    if (element) {
      clearTimeout(timeoutId);
      resolve(element);
    }
    // else: タイムアウトエラーを待機
  });
}
```

**実装の特徴**:

- ✅ Promise ベースの非同期処理
- ✅ 正確な経過時間測定
- ✅ DOMSelectorError による詳細エラー情報
- ✅ タイムアウト管理とクリーンアップ

**テスト対応**:

- ✅ タイムアウト時のDOMSelectorError発生
- ✅ エラーオブジェクトに要素タイプと経過時間を含める
- ✅ フォールバック探索完了後の明確なエラー通知

**制限事項**:

- ⚠️ 動的DOM変更に対応した継続監視機能なし
- ⚠️ 現在は即座に1回のみ探索実行

### 3. `validateElementInteractable` 関数

**実装方針**: disabled属性と可視性をチェックして操作可能性を判定

```typescript
export function validateElementInteractable(element: HTMLElement | null): ElementValidationResult {
  const result: ElementValidationResult = {
    element: element,
    isInteractable: true,
    warnings: [],
  };

  if (!element) {
    result.isInteractable = false;
    result.warnings.push('element not found');
    return result;
  }

  // disabled状態検証
  if ('disabled' in element && (element as any).disabled) {
    result.isInteractable = false;
    result.warnings.push('disabled');
  }

  // 可視性再確認
  if (element.offsetParent === null) {
    result.isInteractable = false;
    result.warnings.push('element not visible');
  }

  return result;
}
```

**実装の特徴**:

- ✅ null要素の適切な処理
- ✅ disabled属性の検出
- ✅ 可視性の再確認
- ✅ 警告メッセージの配列による詳細情報

**テスト対応**:

- ✅ disabled要素の警告付き返却
- ✅ 警告配列に'disabled'文字列の含有

**制限事項**:

- ⚠️ `(element as any).disabled` による型アサーション使用

## 実装品質評価

### ✅ 高品質な実装

- **テスト成功率**: 100% (9/9テスト)
- **処理性能**: 全テスト505ms完了（要件内）
- **エラーハンドリング**: DOMSelectorErrorによる詳細診断情報
- **コード品質**: シンプルで理解しやすい実装

### 日本語コメントの充実

- 🟢 **青信号コメント**: 元資料に基づく実装部分を明示
- 🟡 **黄信号コメント**: 合理的推測による実装部分を明示
- 機能概要、実装方針、テスト対応の3つの観点で文書化

### 既存コードとの整合性

- content.ts の `offsetParent !== null` パターンを踏襲
- REQ-105 (フォールバック探索) とEDGE-001 (エラーハンドリング) 要件に準拠

## 特定された改善点

### 1. 監視機能の不完全性

**問題**: `waitForElementWithTimeout` は即座に1回のみ探索実行
**影響**: 動的DOM変更（AJAX読み込み等）への対応不足
**Refactor案**: MutationObserver または ポーリングによる継続監視

### 2. エラーメッセージのハードコーディング

**問題**: 日本語メッセージの固定化
**影響**: 国際化対応の困難
**Refactor案**: エラーメッセージの外部化または多言語対応

### 3. 型安全性の不足

**問題**: disabled属性アクセスでの型アサーション
**影響**: ランタイムエラーのリスク
**Refactor案**: HTMLFormElement等の型ガード実装

### 4. パフォーマンス最適化の余地

**問題**: セレクタを毎回フルスキャン
**影響**: 大量セレクタでの性能劣化可能性
**Refactor案**: セレクタキャッシュまたは事前検証

## Next Steps

**自動遷移判定**: ✅ 条件満足

- ✅ 全テストが成功確認済み
- ✅ 実装がシンプルで理解しやすい
- ✅ 明確なリファクタリング箇所を特定済み
- ✅ 機能的問題なし

**推奨コマンド**: `/tdd-refactor TASK-020` でRefactorフェーズ（品質改善）に進む

### Refactorフェーズの重点項目

1. `waitForElementWithTimeout` の継続監視機能追加
2. 型安全性の向上（TypeScriptの型ガード活用）
3. エラーメッセージの改善（構造化・多言語対応）
4. パフォーマンス最適化（セレクタ効率化）
5. セキュリティレビュー（XSS対策等）
