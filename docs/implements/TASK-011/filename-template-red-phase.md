# TASK-011: ファイル名テンプレート/サニタイズ - Redフェーズ

## 実装日時

2025-09-14

## テストケース設計

### 対象機能

- ファイル名テンプレート展開機能
- ファイル名サニタイズ機能

### テスト対象関数

1. `generateFileName(template: string, context: FileNameTemplateContext): string`
2. `sanitizeFileName(input: string, options?: FileNameSanitizeOptions): string`

## テストコード詳細

### ファイル構成

- テストファイル: `src/utils/fileNameTemplate.test.ts`
- 実装ファイル: `src/utils/fileNameTemplate.ts` (未作成)
- 型定義: `src/types.ts` (拡張済み)

### テストスイート構造

```
ファイル名テンプレート機能（TASK-011）
├── 基本的なテンプレート展開 (3テスト)
│   ├── 基本テンプレート "{date}_{prompt}_{seed}_{idx}" の展開
│   ├── オプショナルトークン未定義時のデフォルト処理
│   └── 未知トークンの空文字解決
├── サニタイズ機能 (3テスト)
│   ├── Windows禁止文字の適切な置換
│   ├── 連続禁止文字の単一置換文字への集約
│   └── 末尾ピリオド・空白の除去
├── 長さ制御 (2テスト)
│   ├── 255文字超過時の適切な切り詰め
│   └── 拡張子保持での切り詰め
├── エラーケース (4テスト)
│   ├── 空結果時の "untitled" フォールバック
│   ├── 無効テンプレート時のエラー発生
│   ├── 非文字列入力時のバリデーションエラー
│   └── maxLength <= 0 時のバリデーションエラー
└── 衝突回避機能 (1テスト)
    └── 重複時のサフィックス付与機能
```

### 信頼性レベル評価

- 🟢 **青信号**: 11テスト（要件定義書に直接対応）
- 🟡 **黄信号**: 2テスト（要件から妥当な推測）
- 🔴 **赤信号**: 0テスト（推測なし）

## 期待される失敗結果

### メイン失敗

```
Error: Failed to resolve import "./fileNameTemplate" from "src/utils/fileNameTemplate.test.ts". Does the file exist?
```

### 原因分析

- `src/utils/fileNameTemplate.ts` ファイルが存在しない
- `generateFileName` 関数が未定義
- `sanitizeFileName` 関数が未定義

### 実装後の期待失敗パターン

1. `ReferenceError: generateFileName is not defined`
2. `ReferenceError: sanitizeFileName is not defined`
3. `TypeError: generateFileName is not a function`
4. 各テストケースでの具体的な動作不一致

## 実装要求仕様

### generateFileName関数

**シグネチャ**: `generateFileName(template: string, context: FileNameTemplateContext): string`

**処理要件**:

1. テンプレートトークンの展開
   - `{date}` → context.date
   - `{prompt}` → context.prompt
   - `{seed}` → context.seed || ''
   - `{idx}` → context.idx || 1
2. 未知トークンは空文字で解決
3. 全て空の場合は "untitled" を返す
4. 無効テンプレート（未閉括弧）はエラー

### sanitizeFileName関数

**シグネチャ**: `sanitizeFileName(input: string, options?: FileNameSanitizeOptions): string`

**処理要件**:

1. Windows禁止文字 `<>:"/\\|?*` を `_` で置換
2. 連続する置換文字を単一の `_` に集約
3. 末尾の `.` と空白を除去
4. maxLength (デフォルト255) で切り詰め
5. 拡張子がある場合は保持
6. collisionResolver コールバック実行

## テスト実行コマンド

```bash
npm run test -- src/utils/fileNameTemplate.test.ts
```

## 品質判定

**✅ 高品質**:

- テスト実行: 成功（期待通り失敗）
- 期待値: 明確で具体的
- アサーション: 適切で包括的
- 実装方針: EARS要件から明確に導出

## 次のステップ

**次のお勧めステップ**: `/tdd-green` でGreenフェーズ（最小実装）を開始します。
