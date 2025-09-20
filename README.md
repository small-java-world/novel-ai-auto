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

### 🔄 自動画像生成

- **バッチ処理**による複数画像の一括生成
- **進捗表示**とリアルタイム監視
- **自動ダウンロード**とファイル管理
- **エラーハンドリング**とリトライ機能

## 🚀 インストール

### 1. Chrome拡張機能としてインストール

1. このリポジトリをクローンまたはダウンロード
2. Chromeで `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. プロジェクトフォルダを選択

### 2. 必要な権限

- **NovelAI.net**へのアクセス権限
- **ダウンロード**機能
- **ストレージ**アクセス

## 📖 使用方法

### プロンプト合成機能

1. **拡張機能アイコン**をクリックしてポップアップを開く
2. **「プロンプト合成」セクション**で以下を設定：
   - 共通プロンプト（ポジティブ・ネガティブ）
   - 合成ルールの選択
   - カスタムテンプレート（オプション）
3. **「プレビュー更新」**ボタンで結果を確認
4. **「NovelAIに適用」**ボタンで自動適用

#### 合成ルールの例

```javascript
// デフォルトルール
'{commonPositive} {presetPositive}';

// カスタムルール
'{commonPositive}, {presetPositive}, masterpiece, best quality';
```

### 新フォーマット対応

1. **「新フォーマット対応」セクション**で以下を選択：
   - フォーマット形式（既存形式/新形式/自動検出）
   - JSONファイルのアップロード
2. **「ファイル読み込み」**ボタンで処理開始
3. **メタデータ表示**で内容確認
4. **「形式変換」**でフォーマット変換（必要に応じて）
5. **「ファイルエクスポート」**で結果保存

#### サポートフォーマット

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

### 自動画像生成

1. NovelAIのWebページでログイン
2. 拡張機能でプロンプトを設定・適用
3. **「生成開始」**ボタンで自動生成開始
4. 進捗バーで生成状況を確認
5. 完了後、自動的にダウンロードフォルダに保存

## ⚙️ 設定

### 基本設定

- **生成枚数**: 1-100枚の範囲で設定可能
- **ダウンロード先**: デフォルトは「NovelAI」フォルダ
- **ファイル名テンプレート**: カスタマイズ可能

### 高度な設定

- **リトライ回数**: エラー時の再試行回数
- **タイムアウト**: 生成待機時間
- **ログレベル**: デバッグ情報の詳細度

## 🔧 トラブルシューティング

### よくある問題

#### 1. NovelAIに適用されない

- **解決策**: NovelAIページでログインしているか確認
- **解決策**: ページをリロードしてから再試行

#### 2. ファイルが読み込めない

- **解決策**: JSONファイルの形式が正しいか確認
- **解決策**: ファイルサイズが制限内か確認（10MB以下）

#### 3. 生成が開始されない

- **解決策**: NovelAIの生成ボタンが利用可能か確認
- **解決策**: ブラウザの権限設定を確認

#### 4. ダウンロードが失敗する

- **解決策**: ダウンロードフォルダの権限を確認
- **解決策**: ディスク容量が十分か確認

### ログの確認

1. Chromeの開発者ツールを開く（F12）
2. **Console**タブでエラーメッセージを確認
3. **Network**タブで通信状況を確認

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
│   └── prompts.json      # プロンプト設定
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
```

## 🤝 貢献

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- [NovelAI](https://novelai.net/) - AI画像生成サービス
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) - 拡張機能開発プラットフォーム

## 📞 サポート

問題や質問がある場合は、[Issues](https://github.com/small-java-world/novel-ai-auto/issues)で報告してください。

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
