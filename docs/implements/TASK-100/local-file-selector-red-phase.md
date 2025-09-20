# TASK-100 ローカルファイル選択機能 - Redフェーズ実装詳細

## Redフェーズ概要

**作成日時**: 2025-09-20
**フェーズ目的**: 失敗するテストを作成し、実装すべき機能の仕様を明確化

## 作成ファイル一覧

### 1. テストファイル
- **ファイル**: `src/popup/local-file-selector.red.test.ts`
- **行数**: 434行
- **テストケース数**: 11ケース
- **カバレッジ**: 正常系3、異常系4、境界値4

### 2. 型定義追加
- **ファイル**: `src/types.ts`
- **追加interface**: `LocalFileLoadResult`
- **既存型との関連**: `PromptData[]`との互換性確保

### 3. 実装スタブ
- **ファイル**: `src/popup/local-file-selector.ts`
- **実装関数**: 4関数（すべて意図的な失敗実装）
- **失敗メッセージ**: 「not implemented yet - TDD Red phase」

### 4. テスト実行設定
- **ファイル**: `vitest.red.config.ts`
- **目的**: Redフェーズ専用テスト実行環境

## テストケース詳細

### 正常系テストケース（3ケース）

#### TC-001-001: 有効なJSONファイルからプロンプトデータの正常読み込み
```typescript
// 【テスト目的】: .jsonファイルの選択・読み込み・パース・検証の一連の処理を確認
// 【テスト内容】: 標準的なPromptData[]形式のJSONファイルが正常に読み込まれることを検証
// 【期待される動作】: ファイル内容がPromptData[]形式で正常に読み込まれ、適切なレスポンスが返される
```

**入力データ**: 標準的なconfig/prompts.json互換形式
**検証項目**: success=true, データ形式正確性, UI統合準備

#### TC-001-002: .naipromptsファイルの読み込み成功
```typescript
// 【テスト目的】: .naiprompts拡張子のファイル受け入れと処理を確認
// 【テスト内容】: .json以外の拡張子でも同じ形式であれば正常読み込みされることを検証
// 【期待される動作】: ファイル内容による判定により、拡張子に依存しない設計を確認
```

**入力データ**: .naiprompts拡張子での同一内容
**検証項目**: 拡張子非依存設計, 内容ベース判定

#### TC-001-003: 複数プリセット含有ファイルの読み込み
```typescript
// 【テスト目的】: 配列形式での複数プリセット同時読み込み機能を確認
// 【テスト内容】: 全てのプリセットが個別に認識され、適切な順序で処理されることを検証
// 【期待される動作】: バッチ処理効率性とユーザビリティ向上を実現
```

**入力データ**: 5個のPromptDataを含む配列
**検証項目**: 順序保持, 重複チェック, 全数処理

### 異常系テストケース（4ケース）

#### TC-002-001: ファイルサイズ制限超過エラー
```typescript
// 【テスト目的】: ファイルサイズが制限を超えた場合の検出と処理を確認
// 【期待される結果】: 「ファイルサイズが制限(10MB)を超えています」
```

**テストデータ**: 10MB+1バイトのダミーファイル
**信頼性レベル**: 🟢（要件定義書明記）

#### TC-002-002: 不正なJSON形式のエラーハンドリング
```typescript
// 【テスト目的】: JSON.parse失敗時のエラー検出と復旧を確認
// 【期待される結果】: 「ファイル形式が不正です。JSONファイルを確認してください」
```

**テストデータ**: クォート不整合JSON
**信頼性レベル**: 🟢（セキュリティ要件明記）

#### TC-002-003: 必須フィールド欠如データの検証エラー
```typescript
// 【テスト目的】: 必須フィールド（name, prompt）が不足している場合の検証を確認
// 【期待される結果】: 「プリセット名(name)が設定されていないデータがあります」
```

**テストデータ**: nameフィールド欠如データ
**信頼性レベル**: 🟢（型定義準拠）

#### TC-002-004: ファイル読み込み失敗時のエラーハンドリング
```typescript
// 【テスト目的】: ブラウザレベルでのファイル読み込み失敗時の適切な処理を確認
// 【期待される結果】: 「ファイルの読み込みに失敗しました。ファイルの状態を確認してください」
```

**テストデータ**: FileReader APIエラーシミュレーション
**信頼性レベル**: 🟡（Chrome Extension制約推測）

### 境界値テストケース（4ケース）

#### TC-003-001: ファイルサイズ制限境界値テスト（10MB丁度）
```typescript
// 【テスト目的】: システム制約の正確な境界での動作保証を確認
// 【期待される結果】: 正常な読み込み完了、エラーなし
```

**テストデータ**: 10MB * 1024 * 1024バイト丁度
**信頼性レベル**: 🟢（制約条件明記）

#### TC-003-002: 空ファイルの処理
```typescript
// 【テスト目的】: 最小ファイルサイズでの動作と空データでのエラーハンドリングを確認
// 【期待される結果】: 「ファイルにデータが含まれていません」エラー
```

**テストデータ**: 0バイトの空ファイル
**信頼性レベル**: 🟡（エッジケース推測）

#### TC-003-003: 単一プリセットファイルの処理
```typescript
// 【テスト目的】: 最小有効データでの処理確認と配列の最小要素数での動作を確認
// 【期待される結果】: 1個のプリセットが正常に読み込まれる
```

**テストデータ**: 1個のPromptDataを含む配列
**信頼性レベル**: 🟡（データ構造推測）

#### TC-003-004: 最大長プロンプトテキストの処理
```typescript
// 【テスト目的】: プロンプトテキスト長の実用限界での性能と安定性確認
// 【期待される結果】: 正常読み込み、必要に応じて警告表示
```

**テストデータ**: 2000文字程度の長大プロンプト
**信頼性レベル**: 🟡（NovelAI制約推測）

## テスト実行結果

### 実行環境
- **設定ファイル**: `vitest.red.config.ts`
- **実行コマンド**: `npx vitest run --config vitest.red.config.ts`
- **フィルター**: `**/*.red.test.ts`のみ実行

### 実行結果詳細
```
❯ src/popup/local-file-selector.red.test.ts (11 tests | 11 failed) 49ms
  ❯ TC-001-001: 有効なJSONファイルからプロンプトデータの正常読み込み
    → loadLocalPromptFile is not implemented yet - TDD Red phase
  ❯ TC-001-002: .naipromptsファイルの読み込み成功
    → loadLocalPromptFile is not implemented yet - TDD Red phase
  ❯ TC-001-003: 複数プリセット含有ファイルの読み込み
    → loadLocalPromptFile is not implemented yet - TDD Red phase
  ❯ TC-002-001: ファイルサイズ制限超過エラー
    → loadLocalPromptFile is not implemented yet - TDD Red phase
  ❯ TC-002-002: 不正なJSON形式のエラーハンドリング
    → loadLocalPromptFile is not implemented yet - TDD Red phase
  ❯ TC-002-003: 必須フィールド欠如データの検証エラー
    → loadLocalPromptFile is not implemented yet - TDD Red phase
  ❯ TC-002-004: ファイル読み込み失敗時のエラーハンドリング
    → loadLocalPromptFile is not implemented yet - TDD Red phase
  ❯ TC-003-001: ファイルサイズ制限境界値テスト（10MB丁度）
    → loadLocalPromptFile is not implemented yet - TDD Red phase
  ❯ TC-003-002: 空ファイルの処理
    → loadLocalPromptFile is not implemented yet - TDD Red phase
  ❯ TC-003-003: 単一プリセットファイルの処理
    → loadLocalPromptFile is not implemented yet - TDD Red phase
  ❯ TC-003-004: 最大長プロンプトテキストの処理
    → loadLocalPromptFile is not implemented yet - TDD Red phase
```

### 期待結果との比較
- **期待失敗数**: 11/11
- **実際失敗数**: 11/11 ✅
- **統一エラーメッセージ**: すべて同一メッセージで失敗 ✅
- **実行時間**: 49ms（高速） ✅

## 品質評価

### 設計品質
- **テストケース網羅性**: 正常系・異常系・境界値を網羅 ✅
- **信頼性レベル明示**: 各テストに🟢🟡🔴で根拠レベル表示 ✅
- **日本語コメント充実**: 全テストケースに目的・内容・期待動作を記載 ✅
- **既存パターン準拠**: TASK-041との整合性確保 ✅

### 技術品質
- **型安全性**: TypeScript strict mode対応 ✅
- **テストフレームワーク**: Vitest + Chrome Extension APIモック ✅
- **実行環境**: 専用設定での分離実行 ✅
- **エラーハンドリング**: セキュリティ・パフォーマンス考慮 ✅

### 実装準備
- **関数シグネチャ**: 明確な入出力定義 ✅
- **エラーメッセージ**: ユーザーフレンドリーな文言定義 ✅
- **制約条件**: 10MB制限、Chrome Extension MV3制約明確化 ✅
- **互換性**: 既存PromptData[]形式との完全互換 ✅

## Greenフェーズへの移行準備

### 実装すべき主要機能
1. `loadLocalPromptFile()` - メイン関数
2. `selectLocalFile()` - ファイル選択UI
3. `validateFileSize()` - サイズ検証
4. `validatePromptData()` - データ検証

### 技術要件
- FileReader API活用
- JSON.parse例外処理
- PromptData[]型検証
- Chrome Extension制約遵守

### 品質要件
- 全11テストケース合格
- 2秒以内ファイル処理
- メモリリーク防止
- XSS攻撃防止

---

**Redフェーズ完了**: すべてのテストが期待通りに失敗し、Greenフェーズの実装要件が明確化されました。

**次のステップ**: `/tdd-green TASK-100` でGreenフェーズ（最小実装）を開始