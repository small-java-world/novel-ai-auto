# TASK-021 Redフェーズ設計書

## 概要

TASK-021「プロンプト/パラメータ適用ロジック」のTDD Redフェーズで作成した失敗するテストの設計詳細です。

## テスト設計方針

### 基本要件
- **要件リンク**: REQ-001（プロンプト適用）、REQ-002（パラメータ適用）
- **エッジケース**: EDGE-101（文字数上限超過警告）
- **テストフレームワーク**: Vitest + TypeScript
- **信頼性評価**: 各テストケースに🟢🟡🔴レベルで明示

### テストケース設計

#### 1. プロンプト値DOM適用テスト
```typescript
test('プロンプト値をDOM要素に正常に適用できる')
```
- **テスト目的**: プロンプト文字列のDOM要素への設定確認
- **入力**: "beautiful landscape, scenic view, natural lighting, high quality, detailed"
- **期待結果**: `result.success = true`, `result.appliedPrompt = 入力値`
- **信頼性**: 🟡（REQ-001基づくが実装詳細は推測）

#### 2. 生成パラメータDOM適用テスト
```typescript
test('生成パラメータ（steps/cfgScale/sampler）をDOM要素に正常に適用できる')
```
- **テスト目的**: steps、cfgScale、samplerパラメータの各入力欄への設定確認
- **入力**: `{steps: 28, cfgScale: 7.5, sampler: "euler_a"}`
- **期待結果**: 各パラメータ値が正確に適用
- **信頼性**: 🟡（REQ-002基づくが実装詳細は推測）

#### 3. プリセット一括適用テスト
```typescript
test('完全なプリセット（プロンプト+パラメータ）を一括適用できる')
```
- **テスト目的**: config/prompts.json構造のプリセット全体の一括適用確認
- **入力**: 実際のconfig/prompts.json「美しい風景」プリセット
- **期待結果**: プロンプト+ネガティブ+全パラメータの正確な適用
- **信頼性**: 🟢（既存設定ファイル構造に基づく具体的テスト）

#### 4. 文字数上限超過警告テスト
```typescript
test('プロンプト文字数上限超過時に警告を表示する（EDGE-101）')
```
- **テスト目的**: EDGE-101要件の文字数上限超過時警告処理確認
- **入力**: 2500文字の長いプロンプト（"a".repeat(2500)）
- **期待結果**: 警告メッセージ+2000文字以内への切り詰め
- **信頼性**: 🟡（EDGE-101基づくが具体的上限値は推測）

#### 5. DOM要素未検出エラーテスト
```typescript
test('DOM要素が見つからない場合にエラーを返す')
```
- **テスト目的**: プロンプト入力欄不存在時のエラーハンドリング確認
- **初期条件**: 空のDOM（document.body.innerHTML = ''）
- **期待結果**: `result.success = false` + 具体的エラーメッセージ
- **信頼性**: 🟡（一般的エラーハンドリング要件基づく推測）

#### 6. 読み取り専用要素エラーテスト
```typescript
test('入力欄が読み取り専用の場合にエラーを返す')
```
- **テスト目的**: readonly属性要素への書き込み試行時のエラー処理確認
- **初期条件**: readonly=trueのtextarea要素
- **期待結果**: `result.success = false` + 読み取り専用エラーメッセージ
- **信頼性**: 🟡（一般的UI状態管理基づく推測）

#### 7. 無効パラメータ値警告テスト
```typescript
test('無効なパラメータ値（範囲外）の場合に警告を表示する')
```
- **テスト目的**: 範囲外パラメータ値の警告処理とクランプ動作確認
- **入力**: `{steps: 150, cfgScale: 50, sampler: "invalid_sampler"}`
- **期待結果**: 各無効値に対する個別警告メッセージ
- **信頼性**: 🟡（一般的バリデーション要件基づく推測）

## 実装インターフェース設計

### 戻り値型定義
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

### 未実装関数（意図的失敗用）
```typescript
function applyPromptToDOM(prompt: string): ApplicationResult
function applyParametersToDOM(parameters: any): ApplicationResult
function applyPresetToDOM(preset: any): ApplicationResult
```

## テスト実行結果

### 確認済み失敗状況
- **全7テスト失敗**: ✅ 期待通り
- **エラーメッセージ**: "〜関数はまだ実装されていません" ✅ 明確
- **テスト構造**: 各テストが独立して実行可能 ✅
- **日本語コメント**: 全テストに詳細説明付き ✅

## 品質判定

### ✅ 高品質達成項目
- **テスト実行**: 成功（失敗することを確認）
- **期待値**: 明確で具体的
- **アサーション**: 適切
- **実装方針**: 明確
- **日本語ドキュメント**: 完備

### 次フェーズ準備完了
- DOM要素選択戦略（既存dom-selector-strategy.ts活用）
- パラメータ値範囲検証ロジック
- エラーハンドリング分岐処理
- 戻り値インターフェース実装

## 依存関係

### 活用予定の既存モジュール
- `src/utils/dom-selector-strategy.ts`: ElementType定義、要素探索
- `config/prompts.json`: プリセット構造
- `config/samplers.json`: 許可サンプラー一覧

### Greenフェーズでの実装優先順位
1. 基本的なDOM要素取得と値設定
2. パラメータ値範囲検証とクランプ処理
3. エラーハンドリングと警告メッセージ生成
4. プリセット一括適用ロジック