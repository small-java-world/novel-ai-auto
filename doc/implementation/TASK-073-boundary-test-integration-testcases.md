# TASK-073: 境界値テスト統合（文字数/枚数システム全体） - テストケース定義書

## 概要

**機能名**: 境界値テスト統合（文字数/枚数システム全体）
**作成日**: 2025-09-18
**対象要件**: EDGE-101, EDGE-102, EDGE-104
**テストカテゴリ**: 統合境界値テスト

## 開発環境・フレームワーク

### 技術スタック
- **プログラミング言語**: TypeScript
- **テストフレームワーク**: Vitest 1.6.0
- **DOM環境**: happy-dom 14.12.0
- **モック**: vi (Vitest内蔵)

### 選択理由
- **TypeScript**: 既存プロジェクトとの一貫性、型安全性による境界値検証の確実性
- **Vitest**: 既存プロジェクトで使用中、高速実行、Chrome API モック対応
- **happy-dom**: Chrome拡張機能のDOM操作テストに適した環境

## テストケース一覧

### 1. 正常系テストケース（境界値内での正常動作）

#### TC-073-001: プロンプト文字数上限（2000文字）での正常処理
**🟢 信頼性レベル**: EDGE-101要件定義に明記された動作

**テスト目的**:
- EDGE-101要件のプロンプト文字数2000文字ちょうどでの警告表示と処理継続確認

**入力値**:
```typescript
{
  promptText: "a".repeat(2000),  // 上限ちょうど
  imageCount: 10,
  retrySettings: { maxRetries: 5, baseDelay: 500, factor: 2.0 }
}
```

**期待される結果**:
```typescript
{
  success: true,
  warnings: ["プロンプトが2000文字の上限に達しています"],
  results: {
    promptApplication: {
      status: 'warning',
      processedLength: 2000,
      originalLength: 2000
    }
  }
}
```

**確認ポイント**:
- 警告メッセージの正確な表示
- 処理継続性の確認
- 文字数の保持（切り詰めなし）

---

#### TC-073-002: 画像生成枚数最大値（100枚）での正常処理
**🟢 信頼性レベル**: EDGE-102要件定義と既存バリデーション制約に基づく

**テスト目的**:
- EDGE-102要件の画像枚数100枚での正常動作確認

**入力値**:
```typescript
{
  promptText: "test prompt",
  imageCount: 100,  // 最大値
  retrySettings: { maxRetries: 3, baseDelay: 1000, factor: 1.5 }
}
```

**期待される結果**:
```typescript
{
  success: true,
  warnings: [],
  results: {
    imageGeneration: {
      status: 'pass',
      requestedCount: 100,
      validatedCount: 100
    }
  }
}
```

**確認ポイント**:
- エラー・警告の発生なし
- 正常な処理実行の確認
- 枚数設定の正確な適用

---

#### TC-073-003: リトライ設定最大値での正常動作
**🟡 信頼性レベル**: EDGE-104要件と既存制約から推測される動作

**テスト目的**:
- EDGE-104要件のリトライ設定上限値での動作確認

**入力値**:
```typescript
{
  promptText: "test prompt",
  imageCount: 5,
  retrySettings: {
    maxRetries: 10,    // 最大値
    baseDelay: 5000,   // 最大値
    factor: 3.0        // 最大値
  }
}
```

**期待される結果**:
```typescript
{
  success: true,
  warnings: [],
  results: {
    retryProcessing: {
      status: 'pass',
      settingsValid: true,
      retriesExecuted: 0  // 成功時はリトライ不要
    }
  }
}
```

**確認ポイント**:
- 最大値設定の正常適用
- リトライロジックの待機状態確認

### 2. 異常系テストケース（境界値超過・無効値）

#### TC-073-101: プロンプト文字数超過（2001文字）での切り詰め処理
**🟢 信頼性レベル**: EDGE-101要件定義に明記された動作

**テスト目的**:
- EDGE-101要件の文字数上限超過時の自動切り詰め処理確認

**入力値**:
```typescript
{
  promptText: "a".repeat(2001),  // 上限超過
  imageCount: 5,
  retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 }
}
```

**期待される結果**:
```typescript
{
  success: true,
  warnings: ["プロンプトが2000文字を超過したため切り詰めました"],
  results: {
    promptApplication: {
      status: 'warning',
      processedLength: 2000,
      originalLength: 2001,
      processedPrompt: "a".repeat(2000)
    }
  }
}
```

**確認ポイント**:
- 自動切り詰め機能の動作
- 切り詰め通知メッセージの表示
- 処理継続性の確認

**実際の発生シナリオ**: ユーザーが長いプロンプトをコピー&ペーストした場合

---

#### TC-073-102: 画像生成枚数無効値（0枚）でのエラー処理
**🟢 信頼性レベル**: EDGE-102要件と既存エラーメッセージ定義に基づく

**テスト目的**:
- EDGE-102要件の最小値未満でのエラー処理確認

**入力値**:
```typescript
{
  promptText: "test prompt",
  imageCount: 0,  // 無効値
  retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 }
}
```

**期待される結果**:
```typescript
{
  success: false,
  errors: ["画像生成数は1以上100以下の値を入力してください"],
  results: {
    imageGeneration: {
      status: 'fail',
      invalidValue: 0,
      validRange: { min: 1, max: 100 }
    }
  }
}
```

**確認ポイント**:
- 適切なエラーメッセージの表示
- 処理停止の確認
- 有効範囲の明示

**実際の発生シナリオ**: UI設定ミスやAPIパラメータの初期化忘れ

---

#### TC-073-103: 画像生成枚数超過（101枚）でのエラー処理
**🟢 信頼性レベル**: EDGE-102要件と既存制約に基づく

**テスト目的**:
- EDGE-102要件の最大値超過時のエラー処理確認

**入力値**:
```typescript
{
  promptText: "test prompt",
  imageCount: 101,  // 上限超過
  retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 }
}
```

**期待される結果**:
```typescript
{
  success: false,
  errors: ["画像生成数は1以上100以下の値を入力してください"],
  results: {
    imageGeneration: {
      status: 'fail',
      invalidValue: 101,
      validRange: { min: 1, max: 100 }
    }
  }
}
```

**確認ポイント**:
- 最小値エラーと同じメッセージでの一貫性
- 過大な処理負荷の防止
- システム保護機能の動作

**実際の発生シナリオ**: ユーザーの設定ミスや大量生成の誤入力

---

#### TC-073-104: リトライ上限到達での確実な失敗確定
**🟢 信頼性レベル**: EDGE-104要件定義に明記された動作

**テスト目的**:
- EDGE-104要件のリトライ上限到達時の失敗確定処理確認

**入力値**:
```typescript
{
  promptText: "test prompt",
  imageCount: 5,
  retrySettings: { maxRetries: 0, baseDelay: 500, factor: 2.0 },
  simulateFailure: true  // テスト用：意図的に失敗状況を作成
}
```

**期待される結果**:
```typescript
{
  success: false,
  errors: ["リトライ回数上限に達したため処理を停止しました"],
  results: {
    retryProcessing: {
      status: 'fail',
      retriesAttempted: 0,
      maxRetriesReached: true,
      finalFailure: true
    }
  }
}
```

**確認ポイント**:
- リトライ上限到達の確実な検出
- 失敗確定処理の実行
- 無限リトライの防止

**実際の発生シナリオ**: ネットワーク障害やAPI制限による連続失敗

### 3. 境界値テストケース（組み合わせ境界値）

#### TC-073-201: 複数境界値同時超過での適切なエラー優先度
**🟡 信頼性レベル**: 要件から推測される適切なエラー優先度設計

**テスト目的**:
- 複数制限値同時超過時の統合エラー処理と優先度確認

**入力値**:
```typescript
{
  promptText: "a".repeat(2001),  // 文字数超過
  imageCount: 101,               // 枚数超過
  retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 }
}
```

**期待される結果**:
```typescript
{
  success: false,
  errors: [
    "画像生成数は1以上100以下の値を入力してください"  // 高優先度（処理停止）
  ],
  warnings: [
    "プロンプトが2000文字を超過したため切り詰めました"   // 低優先度（警告扱い）
  ],
  results: {
    systemIntegration: {
      status: 'fail',
      errorPriority: 'imageCount',
      multipleIssues: true
    }
  }
}
```

**確認ポイント**:
- エラー優先度の適切な判定
- 複数問題の統合処理
- システム安定性の確保

**実際の使用場面**: ユーザーの設定ミスや一括設定での複数エラー

---

#### TC-073-202: プロンプト上限と最大枚数の組み合わせでの正常処理
**🟡 信頼性レベル**: 各境界値要件から推測される統合動作

**テスト目的**:
- システム最大負荷境界での統合動作確認

**入力値**:
```typescript
{
  promptText: "a".repeat(2000),  // 上限ちょうど
  imageCount: 100,               // 上限ちょうど
  retrySettings: { maxRetries: 10, baseDelay: 5000, factor: 3.0 }  // 全て上限
}
```

**期待される結果**:
```typescript
{
  success: true,
  warnings: ["プロンプトが2000文字の上限に達しています"],
  results: {
    systemIntegration: {
      status: 'pass',
      maxLoadConfiguration: true,
      promptLength: 2000,
      imageCount: 100,
      retrySettingsValid: true
    }
  }
}
```

**確認ポイント**:
- 最大負荷設定での安定動作
- 警告表示と正常処理の両立
- システムリソース使用の最適化

**実際の使用場面**: ヘビーユーザーによる最大設定での使用

---

#### TC-073-203: 最小値組み合わせでの正常処理
**🟡 信頼性レベル**: 各制約の最小値から推測される統合動作

**テスト目的**:
- システム最小負荷境界での統合動作確認

**入力値**:
```typescript
{
  promptText: "a",               // 最小（1文字）
  imageCount: 1,                 // 最小枚数
  retrySettings: { maxRetries: 1, baseDelay: 100, factor: 1.1 }  // 全て最小
}
```

**期待される結果**:
```typescript
{
  success: true,
  warnings: [],
  results: {
    systemIntegration: {
      status: 'pass',
      minLoadConfiguration: true,
      promptLength: 1,
      imageCount: 1,
      estimatedProcessingTime: "< 1s"
    }
  }
}
```

**確認ポイント**:
- 最小設定での確実な動作
- 高速処理の実現
- 基本機能の動作保証

**実際の使用場面**: ライトユーザーやテスト用途での最小設定

---

#### TC-073-204: ゼロ組み合わせでの一括エラー処理
**🟡 信頼性レベル**: 各エラーケースから推測される統合エラー処理

**テスト目的**:
- 全パラメータ無効時の統合エラー処理確認

**入力値**:
```typescript
{
  promptText: "",                // 空プロンプト
  imageCount: 0,                 // 無効枚数
  retrySettings: { maxRetries: 0, baseDelay: 0, factor: 1.0 }  // 無効設定
}
```

**期待される結果**:
```typescript
{
  success: false,
  errors: [
    "プロンプトを入力してください",
    "画像生成数は1以上100以下の値を入力してください",
    "リトライ設定が無効です"
  ],
  results: {
    systemIntegration: {
      status: 'fail',
      allParametersInvalid: true,
      configurationRequired: true
    }
  }
}
```

**確認ポイント**:
- 全無効設定の包括的検出
- 適切なユーザー指示の提供
- 設定ガイダンスの表示

**実際の使用場面**: 設定の初期化忘れや設定ファイルの破損

## テスト実装時の日本語コメント指針

### テストケース開始時のコメント
```typescript
// 【テスト目的】: EDGE-101要件のプロンプト文字数上限2000文字での警告表示と処理継続確認
// 【テスト内容】: 2000文字ちょうどのプロンプトで境界値テスト実行、警告表示と処理継続を検証
// 【期待される動作】: 警告メッセージ表示、切り詰めなし、正常な処理継続
// 🟢 EDGE-101要件定義に明記された確実な動作仕様
```

### Given（準備フェーズ）のコメント
```typescript
// 【テストデータ準備】: プロンプト文字数境界値（2000文字）での統合テスト用データセット作成
// 【初期条件設定】: Chrome API モック、DOM要素初期化、境界値設定適用
// 【前提条件確認】: システム初期状態、依存モジュール（TASK-021, TASK-034）の動作確認
```

### When（実行フェーズ）のコメント
```typescript
// 【実際の処理実行】: ensureBoundaryTestIntegration関数呼び出し、境界値統合テスト実行
// 【処理内容】: プロンプト適用→画像生成設定→リトライ設定の統合境界値検証
// 【実行タイミング】: 全パラメータ設定完了後の統合境界値テスト実行
```

### Then（検証フェーズ）のコメント
```typescript
// 【結果検証】: 境界値での警告表示、処理継続性、統合動作の正確性確認
// 【期待値確認】: EDGE-101要件準拠の警告メッセージと処理結果の整合性
// 【品質保証】: システム境界値での安定動作とユーザー体験の品質確保
```

### 各expectステートメントのコメント
```typescript
// 【確認内容】: 境界値テスト全体の成功可否判定
expect(result.success).toBe(true);

// 【確認内容】: EDGE-101要件準拠の警告メッセージ表示確認
expect(result.warnings).toContain("プロンプトが2000文字の上限に達しています");

// 【確認内容】: プロンプト処理結果の境界値適合性確認
expect(result.results.promptApplication.status).toBe('warning');
```

## 品質保証基準

### 実装完了基準
- [ ] 全11個のテストケースが実装済み
- [ ] 各テストケースに適切な日本語コメント付与
- [ ] EDGE-101, EDGE-102, EDGE-104要件の完全網羅
- [ ] 正常系・異常系・境界値の分類別実装

### テスト実行基準
- [ ] 全テストケースがVitest環境で実行可能
- [ ] Chrome API モックが適切に設定済み
- [ ] 境界値での期待動作が正確に検証済み
- [ ] エラーケースでの適切な例外処理確認済み

### 統合品質基準
- [ ] 既存のTASK-021, TASK-034実装との整合性確認
- [ ] システム全体の境界値での安定動作確認
- [ ] ユーザー体験の品質保証（適切なメッセージ表示等）
- [ ] パフォーマンス要件（5秒以内実行）の達成

---

**作成者**: Claude Code TDD TestCases Generator
**承認者**: [承認者名]
**最終更新**: 2025-09-18