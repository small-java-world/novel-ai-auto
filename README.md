# novel-ai-auto

NovelAIのWeb UIを自動化し、事前定義されたプロンプトで複数の画像を生成・保存するChrome拡張機能

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

### 🔧 なぜ使えるのか？

#### Claude Codeの場合
- Tsumikiは**Claude Code専用**として設計されている
- `.claude/commands/`ディレクトリに直接コマンドファイルを配置
- Claude Codeが自動的にコマンドを認識・実行

#### Codex CLIの場合
- **バージョン0.34.0以降**でカスタムスラッシュコマンドが正式サポート
- `.codex/commands/`ディレクトリにコマンドファイルを直接配置
- Codex CLIが自動的にコマンドを認識・実行

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
