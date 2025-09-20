# TASK-101: プロンプト合成機能 要件定義書

## 概要

NovelAI Auto Generatorに共通プロンプトとキャラクター固有プロンプトを自動合成する機能を実装し、効率的なプロンプト管理を実現する。

## ユーザーストーリー

### ストーリー1: 効率的なプロンプト作成
- **である** プロンプト作成者 **として**
- **私は** 共通部分とキャラクター固有部分を分けて管理 **をしたい**
- **そうすることで** 共通部分の再利用により入力時間を大幅に短縮できる

### ストーリー2: プロンプトの組み合わせ
- **である** NovelAIユーザー **として**
- **私は** 異なるキャラクターに同じ基本設定を適用 **をしたい**
- **そうすることで** 一貫した品質で複数のキャラクター画像を生成できる

## 機能要件（EARS記法）

### 通常要件

- **REQ-101-001**: システムは共通プロンプトとプリセット固有プロンプトを自動合成 **しなければならない**
- **REQ-101-002**: システムは合成結果をリアルタイムでプレビュー表示 **しなければならない**
- **REQ-101-003**: システムは合成ルールをカスタマイズ可能 **にしなければならない**
- **REQ-101-004**: システムは合成前後の文字数を表示 **しなければならない**
- **REQ-101-005**: システムは合成結果をNovelAI UIに適用 **しなければならない**

### 条件付き要件

- **REQ-101-101**: 合成後の文字数が制限を超える場合、システムは警告を表示 **しなければならない**
- **REQ-101-102**: 共通プロンプトが未設定の場合、システムはプリセット固有プロンプトのみを使用 **しなければならない**
- **REQ-101-103**: プリセット固有プロンプトが未設定の場合、システムは共通プロンプトのみを使用 **しなければならない**
- **REQ-101-104**: 合成ルールが無効な場合、システムはデフォルトルールを使用 **しなければならない**

### 制約要件

- **REQ-101-401**: システムはNovelAIのプロンプト文字数制限（2000文字）を遵守 **しなければならない**
- **REQ-101-402**: システムはプロンプトの重複を適切に処理 **しなければならない**
- **REQ-101-403**: システムは特殊文字のエスケープ処理を実行 **しなければならない**

## 非機能要件

### パフォーマンス
- **NFR-101-001**: プロンプト合成処理は100ms以内に完了 **しなければならない**
- **NFR-101-002**: プレビュー更新は50ms以内に反映 **しなければならない**
- **NFR-101-003**: メモリ使用量は合成データサイズの1.5倍以下 **でなければならない**

### 信頼性
- **NFR-101-101**: 合成処理の成功率は99%以上 **でなければならない**
- **NFR-101-102**: 文字数制限の検出率は100% **でなければならない**
- **NFR-101-103**: エラー発生時は詳細なログを記録 **しなければならない**

### 保守性
- **NFR-101-201**: 合成ルールは設定ファイルで管理可能 **でなければならない**
- **NFR-101-202**: 合成処理は単体テスト可能な設計 **でなければならない**
- **NFR-101-203**: テストカバレッジは85%以上 **でなければならない**

## Edgeケース

### エラー処理
- **EDGE-101-001**: 空のプロンプト文字列の処理
- **EDGE-101-002**: 特殊文字を含むプロンプトの処理
- **EDGE-101-003**: 極端に長いプロンプトの処理
- **EDGE-101-004**: 無効な合成ルールの処理

### 異常系
- **EDGE-101-101**: 同時に複数の合成処理が実行された場合
- **EDGE-101-102**: 合成中にプロンプトが変更された場合
- **EDGE-101-103**: メモリ不足による合成失敗
- **EDGE-101-104**: 合成結果の文字エンコーディング問題

## 受け入れ基準

### 機能テスト
- [ ] 共通プロンプトとプリセット固有プロンプトの正常合成
- [ ] 合成結果のリアルタイムプレビュー表示
- [ ] 合成ルールのカスタマイズ機能
- [ ] 文字数制限の適切な検出と警告
- [ ] 合成結果のNovelAI UIへの適用
- [ ] 空プロンプトの適切な処理
- [ ] 特殊文字の適切なエスケープ

### 非機能テスト
- [ ] パフォーマンス要件の達成（100ms以内）
- [ ] プレビュー更新の高速化（50ms以内）
- [ ] 合成処理の高信頼性（99%以上）
- [ ] 文字数制限検出の完全性（100%）

### 統合テスト
- [ ] ファイル選択機能との正常な連携
- [ ] NovelAI UIとの正常な統合
- [ ] エラー発生時の適切な回復

## 技術仕様

### プロンプト合成ルール
```typescript
interface SynthesisRule {
  id: string;
  name: string;
  description: string;
  template: string;
  parameters: {
    separator: string;        // 区切り文字（デフォルト: ", "）
    order: 'common-first' | 'preset-first' | 'custom';
    customTemplate?: string;  // カスタムテンプレート
  };
}

interface SynthesisResult {
  positive: string;
  negative: string;
  characterCount: {
    positive: number;
    negative: number;
    total: number;
  };
  warnings: string[];
  appliedRule: SynthesisRule;
}
```

### 合成処理の実装
```typescript
class PromptSynthesizer {
  private rules: Map<string, SynthesisRule>;
  
  constructor() {
    this.loadDefaultRules();
  }
  
  synthesize(
    common: CommonPrompts,
    preset: PresetData,
    ruleId?: string
  ): SynthesisResult;
  
  preview(
    common: CommonPrompts,
    preset: PresetData,
    ruleId?: string
  ): SynthesisResult;
  
  validateResult(result: SynthesisResult): ValidationResult;
  
  applyToNovelAI(result: SynthesisResult): Promise<ApplicationResult>;
}
```

### UI要素
```html
<div class="synthesis-panel">
  <div class="synthesis-preview">
    <h4>合成結果プレビュー</h4>
    <div class="prompt-display">
      <label>ポジティブプロンプト:</label>
      <textarea id="synthesizedPositive" readonly></textarea>
      <span class="char-count" id="positiveCharCount">0/2000</span>
    </div>
    <div class="prompt-display">
      <label>ネガティブプロンプト:</label>
      <textarea id="synthesizedNegative" readonly></textarea>
      <span class="char-count" id="negativeCharCount">0/2000</span>
    </div>
  </div>
  
  <div class="synthesis-controls">
    <label for="synthesisRule">合成ルール:</label>
    <select id="synthesisRule">
      <option value="default">デフォルト（共通 + 固有）</option>
      <option value="preset-first">固有優先（固有 + 共通）</option>
      <option value="custom">カスタム</option>
    </select>
    
    <div id="customRulePanel" style="display: none;">
      <label for="customTemplate">カスタムテンプレート:</label>
      <input type="text" id="customTemplate" placeholder="{common}, {preset}">
    </div>
    
    <button id="applySynthesis">NovelAIに適用</button>
  </div>
</div>
```

## 実装計画

### Phase 1: 基本合成機能
1. デフォルト合成ルールの実装
2. 基本的な合成処理の実装
3. 合成結果の表示機能

### Phase 2: プレビュー機能
1. リアルタイムプレビューの実装
2. 文字数カウント機能の追加
3. 警告表示機能の実装

### Phase 3: カスタマイズ機能
1. 合成ルールのカスタマイズ機能
2. 設定の永続化機能
3. 高度な合成オプション

## 品質判定

### ✅ 高品質要件
- **要件の曖昧さ**: なし - 具体的な合成ルールと実装仕様を定義
- **入出力定義**: 完全 - 入力プロンプト、合成ルール、出力結果の明確化
- **制約条件**: 明確 - パフォーマンス、文字数制限、信頼性の具体的数値を設定
- **実装可能性**: 確実 - 既存のプロンプト処理機能を拡張する形で実装

### 実装優先度
1. **最優先**: 基本的な合成機能（REQ-101-001〜005）
2. **高優先度**: プレビュー機能（REQ-101-002）
3. **中優先度**: カスタマイズ機能（REQ-101-003）
4. **低優先度**: 高度な合成オプション

## 次のステップ

**次のお勧めステップ**: `/tdd-testcases TASK-101` でテストケースの洗い出しを行います。

TASK-101の要件定義が完了し、TDD開発サイクルの次のフェーズ（テストケース洗い出し）に進む準備が整いました！
