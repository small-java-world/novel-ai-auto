# NovelAI Auto Generator

NovelAIのWeb UIを自動化し、事前定義されたプロンプトで複数の画像を生成・保存するChrome拡張機能

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-brightgreen)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/small-java-world/novel-ai-auto)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## ✨ 主な機能

### 🎨 プロンプト合成機能 (TASK-101)

- **共通プロンプト + プリセット**の自動合成
- **カスタムテンプレート**による柔軟な合成ルール
- **リアルタイムプレビュー**で結果を事前確認
- **文字数制限チェック**と警告表示
- **NovelAIへのワンクリック適用**

### 📁 新フォーマット対応・メタデータ管理 (TASK-102)

- **v1.0フォーマット**の完全サポート
- **レガシーフォーマット**からの自動変換
- **メタデータ管理**（名前、説明、作者、タグ、日付）
- **タグベースフィルタリング**と検索機能
- **JSON Schema v7準拠**の検証

### 🎭 キャラクター別プロンプト管理

- **プリセット管理**によるキャラクター別プロンプト
- **カテゴリ分類**（アニメ、リアル、ファンタジー等）
- **スタイル統一**と品質管理
- **カスタムプロンプト**の追加・編集

### 🔄 自動画像生成

- **バッチ処理**による複数画像の一括生成
- **進捗表示**とリアルタイム監視
- **自動ダウンロード**とファイル管理
- **エラーハンドリング**とリトライ機能

## 🚀 インストール

### 前提条件

- **Google Chrome** バージョン 96 以上
- **NovelAIアカウント**（有料プラン推奨）
- **インターネット接続**

### インストール手順

#### 1. リポジトリのダウンロード

```bash
git clone https://github.com/small-java-world/novel-ai-auto.git
cd novel-ai-auto
```

#### 2. Chrome拡張機能としてインストール

1. Chromeで `chrome://extensions/` を開く
2. **「デベロッパーモード」**を有効化（右上のトグルスイッチ）
3. **「パッケージ化されていない拡張機能を読み込む」**をクリック
4. ダウンロードしたプロジェクトフォルダを選択
5. 拡張機能が読み込まれることを確認

#### 3. 権限の確認

インストール時に以下の権限が要求されます：

- **NovelAI.net**へのアクセス権限
  - NovelAIのWebページでの自動化に必要
- **ダウンロード**機能
  - 生成された画像の自動保存に必要
- **ストレージ**アクセス
  - 設定とプリセットの保存に必要
- **タブ**アクセス
  - NovelAIページの検出と制御に必要

## 📖 使用方法

### 基本的な使用フロー

1. **NovelAIにログイン**
   - [NovelAI](https://novelai.net/) にアクセスしてログイン
   - 画像生成ページに移動

2. **拡張機能を起動**
   - Chromeの拡張機能アイコンをクリック
   - NovelAI Auto Generatorのポップアップが開く

3. **プロンプトを設定**
   - プリセットから選択、またはカスタムプロンプトを入力
   - 生成枚数やパラメータを調整

4. **生成開始**
   - 「生成開始」ボタンをクリック
   - 進捗バーで生成状況を確認

5. **自動ダウンロード**
   - 生成完了後、自動的にダウンロードフォルダに保存
   - ファイル名は `{日付}_{プロンプト}_{シード}_{番号}.png` 形式

### プロンプト合成機能

#### 1. 基本合成

1. **「プロンプト合成」セクション**で以下を設定：
   - 共通プロンプト（ポジティブ・ネガティブ）
   - 合成ルールの選択
   - カスタムテンプレート（オプション）

2. **「プレビュー更新」**ボタンで結果を確認

3. **「NovelAIに適用」**ボタンで自動適用

#### 2. 合成ルールの例

```javascript
// デフォルトルール（共通 + プリセット）
'{commonPositive} {presetPositive}';

// プリセット優先ルール
'{presetPositive}, {commonPositive}';

// カスタムルール
'{commonPositive}, {presetPositive}, masterpiece, best quality';
```

### 新フォーマット対応

#### 1. ファイル読み込み

1. **「新フォーマット対応」セクション**で以下を選択：
   - フォーマット形式（既存形式/新形式/自動検出）
   - JSONファイルのアップロード

2. **「ファイル読み込み」**ボタンで処理開始

3. **メタデータ表示**で内容確認

#### 2. サポートフォーマット

**既存形式 (Legacy)**

```json
{
  "presets": [
    {
      "id": "preset1",
      "name": "プリセット1",
      "positive": "1girl, solo",
      "negative": "lowres, bad anatomy"
    }
  ]
}
```

**新形式 (v1.0)**

```json
{
  "version": "1.0",
  "metadata": {
    "name": "プロンプトセット名",
    "description": "説明",
    "author": "作者名",
    "tags": ["anime", "girl"],
    "created": "2025-01-01T00:00:00Z",
    "modified": "2025-01-01T00:00:00Z"
  },
  "presets": [
    {
      "id": "preset1",
      "name": "プリセット1",
      "positive": "1girl, solo",
      "negative": "lowres, bad anatomy",
      "settings": {
        "steps": 28,
        "scale": 5,
        "sampler": "k_euler"
      }
    }
  ]
}
```

**キャラクター形式 (Characters)**

```json
{
  "characters": {
    "anime_girl_1": {
      "name": "アニメ少女1",
      "selectorProfile": "character-anime",
      "prompts": {
        "positive": "1girl, solo, beautiful, anime style",
        "negative": "lowres, bad anatomy, bad hands"
      },
      "settings": {
        "steps": 28,
        "scale": 5,
        "sampler": "k_euler"
      }
    }
  }
}
```

### キャラクター別プロンプト管理

#### 1. プリセットの種類

**アニメキャラクター**

```json
{
  "id": "anime_girl_1",
  "name": "アニメ少女1",
  "positive": "1girl, solo, beautiful, anime style, detailed face, colorful eyes",
  "negative": "lowres, bad anatomy, bad hands, text, error, missing fingers",
  "category": "anime",
  "tags": ["anime", "girl", "beautiful"]
}
```

**リアル系キャラクター**

```json
{
  "id": "realistic_portrait",
  "name": "リアルポートレート",
  "positive": "portrait, realistic, detailed face, professional photography, high quality",
  "negative": "anime, cartoon, lowres, bad anatomy, bad hands",
  "category": "realistic",
  "tags": ["realistic", "portrait", "photography"]
}
```

**ファンタジーキャラクター**

```json
{
  "id": "fantasy_knight",
  "name": "ファンタジー騎士",
  "positive": "fantasy knight, armor, medieval, detailed costume, epic pose",
  "negative": "modern, casual clothes, lowres, bad anatomy",
  "category": "fantasy",
  "tags": ["fantasy", "knight", "medieval", "armor"]
}
```

#### 2. プリセットの使用方法

1. **プリセット選択**: ドロップダウンからキャラクターを選択
2. **カスタマイズ**: 必要に応じてプロンプトを編集
3. **合成適用**: 共通プロンプトと組み合わせて合成
4. **一括生成**: 複数キャラクターでバッチ生成

### 自動画像生成

#### 1. 生成フロー

1. NovelAIのWebページでログイン
2. 拡張機能でプロンプトを設定・適用
3. **「生成開始」**ボタンで自動生成開始
4. 進捗バーで生成状況を確認
5. 完了後、自動的にダウンロードフォルダに保存

#### 2. 進捗監視

- **リアルタイム進捗**: 現在の生成枚数と全体の進捗
- **ETA表示**: 残り時間の推定
- **ログ表示**: 生成状況とエラーメッセージ
- **キャンセル機能**: 生成中の停止

## ⚙️ 設定

### 基本設定

- **生成枚数**: 1-100枚の範囲で設定可能
- **ダウンロード先**: デフォルトは「NovelAI」フォルダ
- **ファイル名テンプレート**: カスタマイズ可能
  - 利用可能な変数: `{date}`, `{prompt}`, `{seed}`, `{idx}`

### 高度な設定

- **リトライ回数**: エラー時の再試行回数（デフォルト: 3回）
- **タイムアウト**: 生成待機時間（デフォルト: 30秒）
- **ログレベル**: デバッグ情報の詳細度
- **セレクタープロファイル**: UI要素の検出方法（自動/手動選択）

### ファイル名テンプレート

デフォルト: `{date}_{prompt}_{seed}_{idx}`

例:
- `20250120_1girl_solo_12345_1.png`
- `20250120_anime_girl_67890_2.png`

## 🔧 トラブルシューティング

### よくある問題

#### 1. NovelAIに適用されない

**症状**: プロンプトがNovelAIの入力欄に反映されない

**解決策**:
- NovelAIページでログインしているか確認
- ページをリロードしてから再試行
- 拡張機能の権限設定を確認
- セレクタープロファイルを手動で変更

#### 2. ファイルが読み込めない

**症状**: JSONファイルの読み込みに失敗する

**解決策**:
- JSONファイルの形式が正しいか確認
- ファイルサイズが制限内か確認（10MB以下）
- 文字エンコーディングがUTF-8か確認
- ファイルの拡張子が `.json` か確認

#### 3. 生成が開始されない

**症状**: 「生成開始」ボタンを押しても反応しない

**解決策**:
- NovelAIの生成ボタンが利用可能か確認
- ブラウザの権限設定を確認
- 拡張機能が有効になっているか確認
- コンソールでエラーメッセージを確認

#### 4. ダウンロードが失敗する

**症状**: 画像がダウンロードされない

**解決策**:
- ダウンロードフォルダの権限を確認
- ディスク容量が十分か確認
- Chromeのダウンロード設定を確認
- ウイルス対策ソフトの干渉を確認

#### 5. 進捗が更新されない

**症状**: 進捗バーが動かない

**解決策**:
- ページをリロードしてから再試行
- 拡張機能を無効化→有効化
- ブラウザのキャッシュをクリア

### ログの確認

#### 1. 拡張機能のログ

1. Chromeの開発者ツールを開く（F12）
2. **Console**タブでエラーメッセージを確認
3. **Network**タブで通信状況を確認

#### 2. 拡張機能のデバッグ

1. `chrome://extensions/` を開く
2. NovelAI Auto Generatorの「詳細」をクリック
3. **「バックグラウンドページを検査」**をクリック
4. 開発者ツールでログを確認

### パフォーマンスの問題

#### 1. 生成が遅い

**原因と対策**:
- NovelAIサーバーの負荷: 時間を置いて再試行
- ネットワーク接続: 接続速度を確認
- ブラウザのメモリ使用量: 他のタブを閉じる

#### 2. メモリ使用量が多い

**対策**:
- 生成枚数を減らす
- ブラウザを再起動
- 他の拡張機能を無効化

## 🛠️ 開発者向け情報

### 技術スタック

- **Chrome Extension Manifest V3**
- **TypeScript** + **JavaScript**
- **Vitest** (テストフレームワーク)
- **Playwright** (E2Eテスト)

### プロジェクト構造

```
novelai-auto-generator/
├── manifest.json          # 拡張機能マニフェスト
├── background.js          # Service Worker
├── content.js            # Content Script
├── popup/
│   ├── popup.html        # ポップアップUI
│   ├── popup.js          # ポップアップロジック
│   └── popup.css         # スタイル
├── src/
│   ├── popup/
│   │   ├── prompt-synthesis.ts      # プロンプト合成機能
│   │   ├── metadata-manager.ts      # メタデータ管理
│   │   ├── format-converter.ts      # 形式変換
│   │   └── integration-manager.ts   # 統合管理
│   └── types/
│       └── metadata.ts              # 型定義
├── config/
│   ├── prompts.json      # プロンプト設定
│   ├── samplers.json     # サンプラー設定
│   └── dom-selectors.json # DOMセレクター設定
└── tests/                # テストファイル
```

### 開発環境セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/small-java-world/novel-ai-auto.git
cd novel-ai-auto

# 依存関係のインストール
npm install

# テストの実行
npm test

# ビルド
npm run build
```

### テスト

```bash
# ユニットテスト
npm run test:unit

# E2Eテスト
npm run test:e2e

# 全テスト
npm test

# カバレッジレポート
npm run test:coverage
```

## 📋 既知の制約

### 技術的制約

1. **Chrome Extension Manifest V3**
   - Service Workerの制限により、一部の機能が制限される
   - バックグラウンド処理の継続性に制約がある

2. **NovelAI Web UI依存**
   - NovelAIのUI変更により機能が影響を受ける可能性
   - 非公式APIを使用していないため、制限がある

3. **ブラウザ制限**
   - ダウンロード機能はブラウザの制限に依存
   - ストレージ容量はChromeの制限に従う

### 機能制約

1. **生成制限**
   - NovelAIの利用制限に依存
   - 同時生成数は1枚まで（NovelAIの制限）

2. **ファイル形式**
   - サポート形式: PNG, JPEG
   - 最大ファイルサイズ: 10MB

3. **プロンプト制限**
   - 最大文字数: 2000文字
   - 特殊文字の制限あり

### 互換性

1. **ブラウザサポート**
   - Chrome 96以上
   - 他のChromium系ブラウザ（Edge, Brave等）で動作する可能性

2. **OSサポート**
   - Windows, macOS, Linux
   - モバイル版Chromeは非対応

## 🤝 貢献

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 貢献ガイドライン

- コードはTypeScriptで記述
- テストカバレッジ80%以上を維持
- ESLint/Prettierの設定に従う
- コミットメッセージは英語で記述

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- [NovelAI](https://novelai.net/) - AI画像生成サービス
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) - 拡張機能開発プラットフォーム

## 📞 サポート

### 問題報告

問題や質問がある場合は、[Issues](https://github.com/small-java-world/novel-ai-auto/issues)で報告してください。

### 報告時の情報

以下の情報を含めて報告してください：

1. **環境情報**
   - Chrome バージョン
   - OS
   - 拡張機能バージョン

2. **問題の詳細**
   - 発生した問題の説明
   - 再現手順
   - 期待される動作

3. **ログ情報**
   - コンソールのエラーメッセージ
   - 拡張機能のログ

---

## 🚀 AI駆動開発環境

このプロジェクトでは、**Tsumiki**というAI駆動開発支援フレームワークを使用して、要件定義から実装まで効率的に開発を進めます。

### 📋 対応ツール

#### 1. **Claude Code** (推奨)

- Tsumikiの公式サポート対象
- `.claude/commands/`に21個のコマンドが配置済み
- 直接的なスラッシュコマンド（`/kairo-requirements`など）が利用可能

#### 2. **Codex CLI** (正式サポート)

- バージョン0.34.0以降でカスタムスラッシュコマンドが正式サポート
- `.codex/commands/`ディレクトリにコマンドファイルを配置
- 直接的なスラッシュコマンド（`/kairo-requirements`など）が利用可能

### 🎯 利用可能なコマンド

#### 包括的開発フロー (Kairo)

- `/kairo-requirements` - 要件定義
- `/kairo-design` - 設計文書生成
- `/kairo-tasks` - タスク分割
- `/kairo-implement` - 実装実行

#### TDDコマンド

- `/tdd-red` - テスト実装（Red）
- `/tdd-green` - 最小実装（Green）
- `/tdd-refactor` - リファクタリング

#### リバースエンジニアリング

- `/rev-tasks` - 既存コードからタスク一覧を逆生成
- `/rev-design` - 既存コードから設計文書を逆生成

### 📚 参考資料

- [Tsumiki GitHub](https://github.com/classmethod/tsumiki) - AI駆動開発支援フレームワーク
- [Codex CLI GitHub](https://github.com/openai/codex-cli) - OpenAIのローカル開発エージェント
- [rulesync GitHub](https://github.com/rulesync/rulesync) - コマンド変換ツール