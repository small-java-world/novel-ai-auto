# TDD開発メモ: プロンプト/パラメータ適用ロジック

## 概要

- 機能名: プロンプト/パラメータ適用ロジック (TASK-021)
- 開発開始: 2025-09-15
- 現在のフェーズ: Red（失敗するテスト作成）

## 関連ファイル

- 要件定義: `docs/spec/novelai-auto-generator-requirements.md` (REQ-001, REQ-002)
- テストケース定義: `docs/tasks/novelai-auto-generator-tasks.md`
- 実装ファイル: `src/utils/prompt-parameter-applicator.ts` (未作成)
- テストファイル: `src/utils/prompt-parameter-applicator.test.ts` (作成済み)

## Redフェーズ（失敗するテスト作成）

### 作成日時

2025-09-15

### テストケース

以下の7つのテストケースを作成:

1. **プロンプト値をDOM要素に正常に適用できる**
   - プロンプト文字列がNovelAI UIのプロンプト入力欄に設定されることを確認
   - 🟡 信頼性レベル: 要件REQ-001に基づくが実装詳細は推測

2. **生成パラメータ（steps/cfgScale/sampler）をDOM要素に正常に適用できる**
   - steps、cfgScale、samplerパラメータが各入力欄に設定されることを確認
   - 🟡 信頼性レベル: 要件REQ-002に基づくが実装詳細は推測

3. **完全なプリセット（プロンプト+パラメータ）を一括適用できる**
   - config/prompts.jsonのプリセット構造に基づく一括適用をテスト
   - 🟢 信頼性レベル: 既存のconfig/prompts.jsonの構造と要件REQ-001に基づく

4. **プロンプト文字数上限超過時に警告を表示する（EDGE-101）**
   - 2500文字のプロンプトで2000文字上限超過時の警告処理をテスト
   - 🟡 信頼性レベル: 要件EDGE-101に基づくが具体的な上限値は推測

5. **DOM要素が見つからない場合にエラーを返す**
   - プロンプト入力欄が存在しない場合のエラーハンドリングをテスト
   - 🟡 信頼性レベル: 一般的なエラーハンドリング要件に基づく

6. **入力欄が読み取り専用の場合にエラーを返す**
   - readonly属性が設定された要素への書き込み試行時のエラー処理をテスト
   - 🟡 信頼性レベル: 一般的なUI状態管理に基づく推測

7. **無効なパラメータ値（範囲外）の場合に警告を表示する**
   - steps > 100、cfgScale > 30、無効サンプラー時の警告処理をテスト
   - 🟡 信頼性レベル: 一般的なバリデーション要件に基づく推測

### テストコード

`src/utils/prompt-parameter-applicator.test.ts`に実装済み
- Vitest + TypeScriptを使用
- beforeEach/afterEachでDOM状態の初期化・復元
- 各テストケースに詳細な日本語コメント付き
- 信頼性レベル（🟢🟡🔴）をコメントで明示

### 期待される失敗

以下の関数が未実装のため、全7テストが失敗する:
- `applyPromptToDOM(prompt: string)` → "applyPromptToDOM関数はまだ実装されていません"
- `applyParametersToDOM(parameters: any)` → "applyParametersToDOM関数はまだ実装されていません"
- `applyPresetToDOM(preset: any)` → "applyPresetToDOM関数はまだ実装されていません"

### 次のフェーズへの要求事項

Greenフェーズで実装すべき内容:

1. **DOM要素選択機能**
   - 既存の`dom-selector-strategy.ts`を活用
   - ElementType: 'prompt-input', 'steps-input', 'cfg-scale-input', 'sampler-select'

2. **プロンプト適用機能**
   - プロンプト入力欄への文字列設定
   - 文字数上限チェック（2000文字と仮定）
   - readonly状態のチェック

3. **パラメータ適用機能**
   - steps: 1-100の範囲チェック
   - cfgScale: 1-30の範囲チェック
   - sampler: 許可リストとの照合

4. **エラーハンドリング**
   - DOM要素未検出時のエラー返却
   - 読み取り専用要素への書き込み試行エラー
   - 範囲外パラメータ値の警告とクランプ処理

5. **戻り値インターフェース**
   ```typescript
   interface ApplicationResult {
     success: boolean;
     appliedPrompt?: string;
     appliedParameters?: {
       steps: number;
       cfgScale: number;
       sampler: string;
     };
     appliedPreset?: any;
     warnings: string[];
     error?: string;
   }
   ```

## Greenフェーズ（最小実装）

### 実装日時

2025-09-15

### 実装方針

最小限の実装でテストを通すことを優先し、以下の戦略で実装:

1. **段階的実装**: 一つずつテストケースを通すことを重視
2. **既存パターン活用**: `src/types.ts`の型定義を活用
3. **シンプル設計**: 複雑なロジックは避け、明確で理解しやすい実装
4. **エラーハンドリング重視**: テストで期待されるエラーメッセージを正確に実装
5. **日本語コメント充実**: 実装意図と信頼性レベルを明確に記述

### 実装コード

`src/utils/prompt-parameter-applicator.ts`に以下の3つの関数を実装:

#### 1. applyPromptToDOM関数
- プロンプト文字列のDOM要素への適用
- 2000文字上限チェックと切り詰め処理
- DOM要素未検出・読み取り専用エラーハンドリング

#### 2. applyParametersToDOM関数
- steps (1-100)、cfgScale (1-30)、sampler範囲検証
- 無効値の警告生成とクランプ処理
- 戻り値でappliedParametersを返却

#### 3. applyPresetToDOM関数
- プリセット一括適用（プロンプト+パラメータ）
- 既存関数の組み合わせによる実装
- 統合された警告管理

#### インターフェース定義
```typescript
interface ApplicationResult {
  success: boolean;
  appliedPrompt?: string;
  appliedParameters?: {
    steps: number;
    cfgScale: number;
    sampler: string;
  };
  appliedPreset?: PromptData;
  warnings: string[];
  error?: string;
}
```

### テスト結果

**✅ 全7テスト合格**

1. ✅ プロンプト値DOM適用テスト
2. ✅ 生成パラメータDOM適用テスト
3. ✅ 完全プリセット一括適用テスト
4. ✅ 文字数上限超過警告テスト (EDGE-101)
5. ✅ DOM要素未検出エラーテスト
6. ✅ 読み取り専用要素エラーテスト
7. ✅ 無効パラメータ値警告テスト

**テスト実行確認**: Taskツールによる自動テスト実行で全テスト通過を確認済み

### 課題・改善点

#### Refactorフェーズで改善すべき点:

1. **DOM操作の簡略化**:
   - 現在はquerySelectorの直接呼び出し
   - 既存の`dom-selector-strategy.ts`との統合が必要

2. **ハードコーディングの除去**:
   - 文字数上限 (2000) の設定ファイル化
   - パラメータ範囲の設定ファイル化
   - 許可サンプラーリストの`config/samplers.json`からの読み込み

3. **エラーハンドリングの詳細化**:
   - より具体的なエラーメッセージ
   - エラーコードの導入
   - ログ出力機能の追加

4. **型安全性の向上**:
   - より厳密な型定義
   - 入力値検証の強化

5. **パフォーマンス最適化**:
   - DOM要素キャッシュ機能
   - 不要な処理の削減

6. **セキュリティ強化**:
   - XSS対策の追加
   - 入力値サニタイズの実装

#### 現在の実装の強み:
- テストケース完全対応
- 明確なエラーメッセージ
- 豊富な日本語コメント
- 型安全な実装
- 段階的拡張可能な設計

## Refactorフェーズ（品質改善）

### リファクタ日時

[未実施]

### 改善内容

[未実施]

### セキュリティレビュー

[未実施]

### パフォーマンスレビュー

[未実施]

### 最終コード

[未実施]

### 品質評価

[未実施]