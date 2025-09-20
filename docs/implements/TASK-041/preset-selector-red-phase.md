# TDD Red Phase - プロンプトプリセット読み込み/選択UI

## Red Phase 概要

**実行日時**: 2025-09-16
**対象機能**: TASK-041 プロンプトプリセット読み込み/選択UI
**フェーズ目標**: 失敗するテストを作成し、実装すべき機能の設計を明確化

## 作成したテストファイル

**ファイルパス**: `src/popup/preset-selector.red.test.ts`

### テスト設計方針

- **テスト対象**: 存在しない`PresetSelector`クラスを意図的にインポート
- **失敗条件**: モジュール解決エラーの発生
- **設計意図**: プリセット選択UI機能の責務を単一クラスに集約

### 実装したテストケース

#### 1. TC-002: HTMLSelectElementへのプリセット選択肢表示
```typescript
test('TC-002: HTMLSelectElementへのプリセット選択肢表示', () => {
  // プリセット配列 → select要素のoption生成
  presetSelector.loadPresets(mockPresets);
  expect(mockElements.promptSelect.options).toHaveLength(2);
  expect(mockElements.promptSelect.options[1].textContent).toBe('テストプリセット');
});
```

#### 2. TC-003: START_GENERATIONメッセージ送信
```typescript
test('TC-003: プリセット選択後のSTART_GENERATIONメッセージ送信', () => {
  // プリセット選択 → メッセージ構築
  const message = presetSelector.buildStartGenerationMessage(selectedPreset, settings);
  expect(message.type).toBe('START_GENERATION');
  expect(message.prompt).toBe('beautiful landscape, scenic view, natural lighting, high quality, detailed');
});
```

#### 3. TC-004: プリセット検索・フィルタ機能
```typescript
test('TC-004: プリセット検索・フィルタ機能', () => {
  // 検索文字列による動的フィルタリング
  presetSelector.filterPresets('風景');
  expect(mockElements.promptSelect.options).toHaveLength(3); // 「美しい風景」「風景画」のみ
});
```

#### 4. TC-005: エラーハンドリング
```typescript
test('TC-005: プリセットファイル読み込み失敗時のエラーハンドリング', () => {
  // エラー処理とシステム継続性
  const result = presetSelector.handleLoadError(loadError);
  expect(result.success).toBe(false);
  expect(result.continueOperation).toBe(true);
});
```

#### 5. TC-008: 境界値テスト
```typescript
test('TC-008: プリセット数の境界値テスト（1個および50個）', () => {
  // 性能要件テスト（200ms以内）
  expect(endTime2 - startTime2).toBeLessThan(200);
});
```

## テスト実行結果

### 失敗メッセージ
```
Error: Failed to resolve import "./preset-selector" from "src/popup/preset-selector.red.test.ts". Does the file exist?
```

### 失敗の意図性確認
✅ **期待通りの失敗**: `PresetSelector`モジュールが存在しないため、正常に失敗

## Green Phase への移行要件

### 実装すべきAPI設計

```typescript
export class PresetSelector {
  constructor(elements: Record<string, HTMLElement>);

  // プリセット読み込みとUI表示
  loadPresets(presets: Preset[]): void;

  // 選択されたプリセットの取得
  getSelectedPreset(): Preset | null;

  // START_GENERATIONメッセージ構築
  buildStartGenerationMessage(
    preset: Preset,
    settings: GenerationSettings
  ): StartGenerationMessage;

  // 検索・フィルタ機能
  filterPresets(searchTerm: string): void;

  // エラーハンドリング
  handleLoadError(error: Error): ErrorResult;
}
```

### 必要な型定義

```typescript
interface StartGenerationMessage {
  type: 'START_GENERATION';
  prompt: string;
  parameters: {
    steps: number;
    cfgScale: number;
    sampler: string;
    seed: number;
    count: number;
  };
  settings: {
    imageCount: number;
    seed: number;
    filenameTemplate: string;
  };
}

interface ErrorResult {
  success: boolean;
  errorMessage: string;
  continueOperation: boolean;
}
```

### 性能要件

- **プリセット読み込み**: 200ms以内（境界値テストで検証）
- **最大プリセット数**: 50個まで対応
- **メモリ効率**: DOM操作の最小化

### DOM操作要件

1. **select要素操作**
   - option要素の動的追加・削除
   - プリセット名の表示とvalue設定
   - 初期状態（"プロンプトを選択してください"）の保持

2. **エラー時の表示制御**
   - 読み込み失敗時の代替メッセージ
   - システム継続性の保証

3. **検索・フィルタ**
   - リアルタイム絞り込み表示
   - 部分一致による検索

## 品質判定

✅ **Red Phase 高品質**:
- **テスト実行**: 成功（期待通りに失敗）
- **期待値**: 明確で具体的（5つのテストケースで網羅）
- **アサーション**: 適切（DOM操作、メッセージ形状、性能要件）
- **実装方針**: 明確（API設計と型定義が確定）

## 次のステップ

**Green Phase 実装要件**:
1. `src/popup/preset-selector.ts`ファイル作成
2. `PresetSelector`クラス実装（最小限の機能）
3. すべてのテストケースを通す最小実装
4. DOM操作とメッセージ構築の基本機能

**実行コマンド**: `/tdd-green` でGreenフェーズ（最小実装）を開始