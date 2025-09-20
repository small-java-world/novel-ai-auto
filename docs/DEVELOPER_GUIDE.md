# NovelAI Auto Generator 開発者ガイド

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [技術スタック](#技術スタック)
3. [プロジェクト構造](#プロジェクト構造)
4. [開発環境セットアップ](#開発環境セットアップ)
5. [アーキテクチャ](#アーキテクチャ)
6. [主要コンポーネント](#主要コンポーネント)
7. [テスト](#テスト)
8. [ビルドとデプロイ](#ビルドとデプロイ)
9. [コントリビューション](#コントリビューション)

## プロジェクト概要

NovelAI Auto Generatorは、NovelAIのWeb UIを自動化するChrome拡張機能です。TDD（テスト駆動開発）とAI駆動開発フレームワーク（Tsumiki）を使用して開発されています。

### 主要機能

- **プロンプト合成機能 (TASK-101)**: 共通プロンプトとプリセットの自動合成
- **新フォーマット対応 (TASK-102)**: v1.0フォーマットとメタデータ管理
- **自動画像生成**: バッチ処理による複数画像の一括生成

## 技術スタック

### フロントエンド

- **Chrome Extension Manifest V3**
- **TypeScript** (型安全性)
- **JavaScript** (ES2020+)
- **HTML5/CSS3** (モダンUI)

### テスト

- **Vitest** (ユニットテスト)
- **Playwright** (E2Eテスト)
- **Chrome Extension Testing** (拡張機能テスト)

### 開発ツール

- **Tsumiki** (AI駆動開発フレームワーク)
- **ESLint** (コード品質)
- **Prettier** (コードフォーマット)
- **Husky** (Git hooks)

## プロジェクト構造

```
novelai-auto-generator/
├── manifest.json                    # 拡張機能マニフェスト
├── background.js                    # Service Worker
├── content.js                       # Content Script
├── popup/
│   ├── popup.html                   # ポップアップUI
│   ├── popup.js                     # ポップアップロジック
│   └── popup.css                    # スタイル
├── src/
│   ├── popup/
│   │   ├── prompt-synthesis.ts      # プロンプト合成機能
│   │   ├── prompt-synthesis.test.ts # プロンプト合成テスト
│   │   ├── metadata-manager.ts      # メタデータ管理
│   │   ├── metadata-manager.test.ts # メタデータ管理テスト
│   │   ├── format-converter.ts      # 形式変換
│   │   ├── format-converter.test.ts # 形式変換テスト
│   │   ├── integration-manager.ts   # 統合管理
│   │   └── integration-manager.test.ts # 統合管理テスト
│   ├── types/
│   │   └── metadata.ts              # 型定義
│   └── utils/
│       ├── dom-helper.js            # DOM操作ユーティリティ
│       └── storage.js               # ストレージ管理
├── config/
│   └── prompts.json                 # プロンプト設定
├── tests/
│   ├── e2e/                         # E2Eテスト
│   └── fixtures/                    # テストデータ
├── docs/                            # ドキュメント
│   ├── USER_GUIDE.md               # ユーザーガイド
│   ├── DEVELOPER_GUIDE.md          # 開発者ガイド
│   ├── implementation/              # 要件定義
│   ├── spec/                        # 仕様書
│   └── tasks/                       # タスク管理
├── .claude/                         # Claude Code設定
├── .codex/                          # Codex CLI設定
├── package.json                     # 依存関係
├── vitest.config.ts                 # テスト設定
├── playwright.config.ts             # E2Eテスト設定
└── tsconfig.json                    # TypeScript設定
```

## 開発環境セットアップ

### 前提条件

- Node.js 18.0.0 以上
- Google Chrome 88 以上
- Git

### セットアップ手順

1. **リポジトリのクローン**

   ```bash
   git clone https://github.com/small-java-world/novel-ai-auto.git
   cd novel-ai-auto
   ```

2. **依存関係のインストール**

   ```bash
   npm install
   ```

3. **開発サーバーの起動**

   ```bash
   npm run dev
   ```

4. **Chrome拡張機能の読み込み**
   - Chromeで `chrome://extensions/` を開く
   - 「デベロッパーモード」を有効化
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - プロジェクトフォルダを選択

### 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# テスト実行
npm test

# ユニットテスト
npm run test:unit

# E2Eテスト
npm run test:e2e

# ビルド
npm run build

# リント
npm run lint

# フォーマット
npm run format
```

## アーキテクチャ

### 全体構成

```
┌─────────────────────────────────────────┐
│         Chrome Extension                 │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────┐ │
│  │   Popup UI   │  │ Background/SW   │ │
│  │              │  │                 │ │
│  │ - 設定画面   │  │ - メッセージ中継 │ │
│  │ - 実行ボタン │  │ - ダウンロード   │ │
│  │ - 進捗表示   │  │ - 設定管理      │ │
│  └──────────────┘  └─────────────────┘ │
│           ↓                ↓            │
│  ┌─────────────────────────────────┐   │
│  │      Content Script              │   │
│  │                                   │   │
│  │  - DOM操作（プロンプト入力）      │   │
│  │  - 生成ボタンクリック             │   │
│  │  - 画像検出                      │   │
│  │  - ループ制御                    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                    ↓
         [NovelAI Web Interface]
```

### データフロー

```
User Input → Popup UI → Background Script → Content Script → NovelAI UI
     ↓              ↓              ↓              ↓              ↓
Settings → Message → Processing → DOM Manipulation → Image Generation
     ↓              ↓              ↓              ↓              ↓
Storage ← Download ← Monitoring ← Detection ← Result
```

## 主要コンポーネント

### 1. PromptSynthesizer (TASK-101)

プロンプト合成機能の中核となるクラス。

```typescript
export class PromptSynthesizer {
  // 共通プロンプトとプリセットを合成
  synthesizePrompts(
    commonPrompts: CommonPrompts,
    preset: PresetData,
    rule: SynthesisRule
  ): SynthesisResult;
}
```

**主要メソッド**:

- `synthesizePrompts()`: プロンプト合成
- `validateTemplate()`: テンプレート検証
- `calculateCharacterCount()`: 文字数計算

### 2. MetadataManager (TASK-102)

新フォーマットのメタデータ管理を行うクラス。

```typescript
export class MetadataManager {
  // v1.0フォーマットファイルの読み込み
  loadPromptFile(file: PromptFileV1): NormalizedMetadata;

  // メタデータの正規化
  normalizeMetadata(metadata: MetadataV1): NormalizedMetadata;

  // メタデータの検証
  validateMetadata(metadata: MetadataV1): ValidationResult;
}
```

**主要メソッド**:

- `loadPromptFile()`: ファイル読み込み
- `normalizeMetadata()`: メタデータ正規化
- `validateMetadata()`: メタデータ検証
- `extractTags()`: タグ抽出
- `filterByTags()`: タグフィルタリング

### 3. FormatConverter (TASK-102)

フォーマット間の変換を行うクラス。

```typescript
export class FormatConverter {
  // レガシーからv1.0への変換
  convertLegacyToV1(legacyFile: LegacyPromptFile): ConversionResult;

  // v1.0からレガシーへの変換
  convertV1ToLegacy(v1File: PromptFileV1): ConversionResult;
}
```

**主要メソッド**:

- `convertLegacyToV1()`: レガシー→v1.0変換
- `convertV1ToLegacy()`: v1.0→レガシー変換
- `validateConversion()`: 変換検証
- `generateDefaultMetadata()`: デフォルトメタデータ生成

### 4. IntegrationManager (TASK-102)

各コンポーネントの統合を管理するクラス。

```typescript
export class IntegrationManager {
  // v1.0ファイルの統合読み込み
  integrateV1File(fileContent: any, options: IntegrationOptions): IntegrationResult;

  // レガシーファイルの統合変換
  integrateLegacyFile(legacyFileContent: any, options: IntegrationOptions): IntegrationResult;
}
```

**主要メソッド**:

- `integrateV1File()`: v1.0ファイル統合
- `integrateLegacyFile()`: レガシーファイル統合
- `processIntegrationOptions()`: 統合オプション処理
- `handleIntegrationError()`: 統合エラーハンドリング

## テスト

### テスト戦略

- **ユニットテスト**: 各コンポーネントの個別テスト
- **統合テスト**: コンポーネント間の連携テスト
- **E2Eテスト**: ユーザーシナリオのテスト

### テスト実行

```bash
# 全テスト実行
npm test

# ユニットテストのみ
npm run test:unit

# E2Eテストのみ
npm run test:e2e

# カバレッジ付きテスト
npm run test:coverage
```

### テストファイル構成

```
tests/
├── e2e/
│   ├── basic-flow.spec.ts          # 基本フローテスト
│   ├── integration.spec.ts         # 統合テスト
│   ├── performance.spec.ts         # パフォーマンステスト
│   └── error-handling.spec.ts      # エラーハンドリングテスト
├── fixtures/
│   ├── test-prompts.json           # テスト用プロンプト
│   └── test-config.json            # テスト設定
└── src/
    └── popup/
        ├── prompt-synthesis.test.ts
        ├── metadata-manager.test.ts
        ├── format-converter.test.ts
        └── integration-manager.test.ts
```

### テストカバレッジ

- **目標カバレッジ**: 80%以上
- **必須カバレッジ**: 主要機能100%
- **推奨カバレッジ**: エラーハンドリング90%以上

## ビルドとデプロイ

### ビルドプロセス

1. **TypeScriptコンパイル**
2. **テスト実行**
3. **リントチェック**
4. **パッケージング**

### ビルドコマンド

```bash
# 開発ビルド
npm run build:dev

# 本番ビルド
npm run build:prod

# パッケージング
npm run package
```

### デプロイメント

1. **Chrome Web Store**
   - パッケージファイルの作成
   - ストア申請
   - 審査通過後の公開

2. **GitHub Releases**
   - タグの作成
   - リリースノートの作成
   - パッケージファイルのアップロード

## コントリビューション

### 開発フロー

1. **Issue作成**: バグ報告や機能要求
2. **ブランチ作成**: `feature/issue-number` 形式
3. **実装**: TDDでテストから作成
4. **テスト**: 全テストが通ることを確認
5. **プルリクエスト**: 詳細な説明とテスト結果

### コーディング規約

- **TypeScript**: 厳密な型チェック
- **ESLint**: コード品質の維持
- **Prettier**: 統一されたフォーマット
- **命名規則**: camelCase（変数）、PascalCase（クラス）

### コミットメッセージ

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメント更新
test: テスト追加・修正
refactor: リファクタリング
style: コードスタイル修正
chore: その他の変更
```

### プルリクエストテンプレート

```markdown
## 概要

<!-- 変更内容の概要 -->

## 変更内容

<!-- 具体的な変更点 -->

## テスト

<!-- テスト結果 -->

## チェックリスト

- [ ] テストが追加されている
- [ ] 既存のテストが通る
- [ ] ドキュメントが更新されている
- [ ] コードレビューが完了している
```

## パフォーマンス最適化

### メモリ管理

- **オブジェクトプール**: 頻繁に作成されるオブジェクトの再利用
- **イベントリスナー**: 適切なクリーンアップ
- **DOM操作**: 最小限の操作で効率化

### 実行速度

- **非同期処理**: Promise/async-awaitの活用
- **バッチ処理**: 複数操作の一括実行
- **キャッシュ**: 頻繁にアクセスされるデータのキャッシュ

### 監視とメトリクス

```typescript
// パフォーマンス測定
const startTime = performance.now();
// 処理実行
const duration = performance.now() - startTime;
console.log(`処理時間: ${duration}ms`);

// メモリ使用量
const memoryUsage = performance.memory;
console.log(`メモリ使用量: ${memoryUsage.usedJSHeapSize / 1024 / 1024}MB`);
```

## セキュリティ

### データ保護

- **最小権限**: 必要最小限の権限のみ要求
- **データ暗号化**: 機密データの暗号化
- **サニタイゼーション**: ユーザー入力の検証

### 脆弱性対策

- **CSP**: Content Security Policyの設定
- **XSS対策**: 入力値のエスケープ
- **CSRF対策**: トークンベースの認証

## デバッグ

### 開発者ツール

1. **Chrome DevTools**
   - Console: ログ出力
   - Network: 通信監視
   - Sources: デバッグ

2. **拡張機能専用ツール**
   - `chrome://extensions/`
   - バックグラウンドページの検査
   - コンテンツスクリプトのデバッグ

### ログ出力

```typescript
// デバッグログ
console.debug('デバッグ情報:', data);

// エラーログ
console.error('エラー発生:', error);

// パフォーマンスログ
console.time('処理時間');
// 処理実行
console.timeEnd('処理時間');
```

---

## 📚 参考資料

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)

---

_このガイドは開発の進行に合わせて随時更新されます。_
