# Codex CLI + Tsumiki セットアップ完了

## 🎯 目的達成

OpenAI Codex CLI をローカルで起動し、Tsumiki の「/kairo」「/tdd」「/rev-*」系コマンド相当の仕事をCodex にやらせる（＝要件→設計→実装／逆生成までの一連を自動化）

## ✅ 完了したセットアップ

### 1. Codex CLI インストール
- ✅ `npm install -g @openai/codex` でインストール完了
- ✅ バージョン: codex-cli 0.34.0

### 2. Tsumiki フレームワーク導入
- ✅ `npx tsumiki install` でTsumikiコマンドをインストール
- ✅ `.claude/commands/` に21個のコマンドファイルが配置済み

### 3. rulesync 設定
- ✅ `npx -y rulesync init` で初期化
- ✅ `npx -y rulesync config --init` で設定作成
- ✅ `npx -y rulesync import` でClaude Codeコマンドをインポート

### 4. Codex CLI 用擬似コマンド作成
- ✅ `.codex-commands.md` に擬似コマンド定義を作成
- ✅ `codex-workflow-templates.md` に作業指示テンプレートを作成

## 🚀 利用可能な擬似コマンド

### 包括的開発フロー (Kairo)
- `s/init-tech-stack` - 技術スタックの特定
- `s/kairo-requirements` - 要件定義
- `s/kairo-design` - 設計文書生成
- `s/kairo-tasks` - タスク分割
- `s/kairo-implement` - 実装実行

### TDDコマンド
- `s/tdd-requirements` - TDD要件定義
- `s/tdd-testcases` - テストケース作成
- `s/tdd-red` - テスト実装（Red）
- `s/tdd-green` - 最小実装（Green）
- `s/tdd-refactor` - リファクタリング
- `s/tdd-verify-complete` - TDD完了確認

### リバースエンジニアリング
- `s/rev-tasks` - 既存コードからタスク一覧を逆生成
- `s/rev-design` - 既存コードから設計文書を逆生成
- `s/rev-specs` - 既存コードからテスト仕様書を逆生成
- `s/rev-requirements` - 既存コードから要件定義書を逆生成

## 📋 使用方法

### 1. Codex CLI の起動
```bash
# 対話モード
codex

# 単発実行
codex "summarize the repository structure and test setup"
```

### 2. Tsumiki 擬似コマンドの使用
```bash
# 新規機能開発フロー
codex "Please run s/init-tech-stack then s/kairo-requirements for feature A."

# 既存コードの逆生成
codex "Please run s/rev-tasks then s/rev-design for this codebase."
```

### 3. 作業指示テンプレートの活用
- `codex-workflow-templates.md` のテンプレートをコピー&ペースト
- 目的と完了定義を明確に記述
- 段階的に実行（要件→設計→実装）

## 🔧 設定ファイル

### Codex CLI 設定
- **場所**: `~/.codex/config.toml`
- **内容**: 承認モード、モデル設定、MCP連携など

### プロジェクト設定
- **Tsumikiコマンド**: `.claude/commands/`
- **擬似コマンド定義**: `.codex-commands.md`
- **作業テンプレート**: `codex-workflow-templates.md`

## 🎯 次のステップ

1. **Codex CLI にサインイン**
   ```bash
   codex
   # 初回は ChatGPT アカウントで Sign in
   ```

2. **NovelAI拡張機能の開発開始**
   ```bash
   codex "Please run s/init-tech-stack for NovelAI Chrome Extension project."
   ```

3. **段階的開発フローの実行**
   - 要件定義 → 設計 → タスク分割 → TDD実装
   - 各段階で適切なドキュメント生成
   - テスト駆動開発による品質確保

## 📚 参考資料

- [Codex CLI GitHub](https://github.com/openai/codex-cli)
- [Tsumiki GitHub](https://github.com/classmethod/tsumiki)
- [rulesync GitHub](https://github.com/rulesync/rulesync)

これで、Codex CLI + Tsumiki による本格的なAI駆動開発環境が整いました！
