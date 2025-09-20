# TDD要件定義・機能仕様 - TASK-042 設定UI

**【機能名】**: TASK-042 設定UI（seed/count/テンプレート/リトライ）

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🟢 **青信号**: Chrome Extension用の設定UIで、画像生成パラメータとリトライ設定を管理する機能
- 🟢 **何をする機能か**: ユーザーが画像生成時のシード値、生成枚数、ファイル名テンプレート、リトライ設定を入力・保存・復元できるUI
- 🟢 **どのような問題を解決するか**: 毎回手動で設定値を入力する手間を省き、一貫した設定で画像生成を実行可能にする
- 🟢 **想定されるユーザー**: NovelAI Auto Generatorの利用者（As a ユーザー）
- 🟢 **システム内での位置づけ**: Popup UI内の設定セクション、ストレージサブシステムと連携
- **参照したEARS要件**: REQ-005, REQ-301, REQ-303
- **参照した設計文書**: docs/design/novelai-auto-generator/architecture.md の Popup UI セクション

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

- 🟡 **黄信号**: 設計仕様と実装で一部のプロパティ名に不整合あり（要調整）

### 入力パラメータ（型、範囲、制約）
```typescript
interface SettingsInput {
  imageCount: number;        // 1-100の範囲
  seedMode: "random" | "fixed";
  seedValue?: number;        // fixed時のみ、0以上2^32-1以下
  filenameTemplate: string;  // 1-255文字、禁止文字 `<>:|?` 除外
  retrySettings: {
    maxRetries: number;      // 1-10の範囲
    baseDelay: number;       // 100-5000ms の範囲
    factor: number;          // 1.1-3.0の範囲
  };
}
```

### 出力値（型、形式、例）
```typescript
interface SettingsOutput {
  success: boolean;
  data?: GenerationSettings;
  errors?: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
}
```

### データフロー
1. 初期化: chrome.storage → UI表示
2. 入力検証: リアルタイムバリデーション
3. 保存: 検証成功 → chrome.storage.local.set
4. 復元: ページリロード時に保存値を復元

- **参照したEARS要件**: REQ-005, REQ-301, REQ-303
- **参照した設計文書**: src/types.ts の GenerationSettings インターフェース

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

- 🟢 **青信号**: 明確な制約条件が定義済み

### パフォーマンス要件
- **NFR-002**: 設定の保存・復元は500ms以内に完了
- **リアルタイムバリデーション**: ユーザー入力に対する応答は100ms以内

### セキュリティ要件
- **入力サニタイゼーション**: XSS攻撃防止のためHTMLエスケープ
- **データサイズ制限**: chrome.storage制限内（数KB程度）

### 互換性要件
- **Chrome Extension MV3**: manifest_version 3準拠
- **Chrome 96+**: サポートブラウザ範囲

### アーキテクチャ制約
- **Message Passing Pattern**: runtime.sendMessage を使用
- **Storage Pattern**: chrome.storage.local の名前空間管理
- **指数バックオフ**: baseDelay=500ms, factor=2.0, maxRetries=5

- **参照したEARS要件**: NFR-001, NFR-002, NFR-201
- **参照した設計文書**: docs/design/novelai-auto-generator/architecture.md

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

- 🟢 **青信号**: 包括的なテストケースが定義済み（11ケース）

### 基本的な使用パターン
1. **初回起動**: デフォルト値で初期化、ユーザーが設定値を調整
2. **設定保存**: 入力値をバリデーション後、chrome.storageに保存
3. **設定復元**: 拡張機能再起動時に保存済み設定を復元
4. **設定リセット**: デフォルト値への復元

### エッジケース
- **EDGE-101**: ファイル名テンプレートに禁止文字が含まれる場合
- **EDGE-102**: 生成枚数が0、1、または上限値の場合
- **EDGE-103**: シード値が範囲外の場合の自動修正

### エラーケース
1. **バリデーション失敗**: 不正な入力値に対するエラー表示
2. **ストレージエラー**: chrome.storage操作失敗時の処理
3. **データ破損**: 保存データが不正な場合のデフォルト値復元

- **参照したEARS要件**: EDGE-101, EDGE-102, EDGE-103
- **参照した設計文書**: src/popup/settings-ui.red.test.ts の 11テストケース

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- **設定管理**: "As a ユーザー, I want to 設定値を保存 So that 毎回入力する手間を省ける"

### 参照した機能要件
- **REQ-005**: システムは設定値（待機枚数・シード・ファイル名テンプレート等）を保存・取得しなければならない
- **REQ-301**: システムはシード値の固定・ランダム選択をサポートしてもよい
- **REQ-303**: システムはユーザー定義のファイル名テンプレートをサポートしてもよい

### 参照した非機能要件
- **NFR-001**: 各種設定から画像生成・ダウンロード完了まで30秒以内
- **NFR-002**: 進捗表示・ログ更新は500ms以内の周期
- **NFR-201**: 進捗の画面数・残り完了時間・直近のエラーを正確に表示

### 参照したEdgeケース
- **EDGE-101**: プロンプト文字数が上限範囲の場合でも安定に適用し、必要に応じ警告
- **EDGE-102**: 生成枚数が0/1/最大設定でも正しく動作
- **EDGE-103**: ファイル名無効・重複文字の際に自動回避（インデックス付与）

### 参照した設計文書
- **アーキテクチャ**: docs/design/novelai-auto-generator/architecture.md の Popup UI セクション
- **型定義**: src/types.ts の GenerationSettings インターフェース
- **ストレージ**: src/utils/storage.ts のストレージパターン
- **テストケース**: src/popup/settings-ui.red.test.ts の 11テストケース

## 品質判定

✅ **高品質**:
- 要件の曖昧さ: なし（EARS要件と既存実装から明確に定義）
- 入出力定義: 完全（TypeScript型定義済み）
- 制約条件: 明確（性能・セキュリティ・アーキテクチャ制約すべて定義済み）
- 実装可能性: 確実（既存テストケースと実装パターンが参照可能）

**次のお勧めステップ**: `/tdd-testcases` でテストケースの洗い出しを行います。