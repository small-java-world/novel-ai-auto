# Tsumiki + Codex CLI 設定完了

## 設定内容

### 1. Tsumikiフレームワークのインストール
- ✅ `npx tsumiki install` でTsumikiコマンドをインストール
- ✅ `.claude/commands/` に21個のコマンドファイルが配置済み

### 2. rulesyncの設定
- ✅ `npx -y rulesync init` でrulesyncを初期化
- ✅ `npx -y rulesync config --init` で設定ファイルを作成
- ✅ `npx -y rulesync import` でClaude Codeコマンドをインポート

### 3. Codex CLI用の設定
- ✅ `CODEX.md` にCodex CLI用のカスタムスラッシュコマンドを定義
- ✅ プロジェクト固有の指示とTsumikiコマンドを統合

## 利用可能なコマンド

### 包括的開発フロー (Kairo)
- `/kairo-requirements` - 要件定義
- `/kairo-design` - 設計文書生成
- `/kairo-tasks` - タスク分割
- `/kairo-implement` - 実装実行

### TDDコマンド（個別実行）
- `/tdd-requirements` - TDD要件定義
- `/tdd-testcases` - テストケース作成
- `/tdd-red` - テスト実装（Red）
- `/tdd-green` - 最小実装（Green）
- `/tdd-refactor` - リファクタリング
- `/tdd-verify-complete` - TDD完了確認

### リバースエンジニアリングコマンド
- `/rev-tasks` - 既存コードからタスク一覧を逆生成
- `/rev-design` - 既存コードから設計文書を逆生成
- `/rev-specs` - 既存コードからテスト仕様書を逆生成
- `/rev-requirements` - 既存コードから要件定義書を逆生成

### その他のコマンド
- `/init-tech-stack` - 技術スタックの特定
- `/clear` - 開発環境のクリーンアップ

## 使用方法

### 新規プロジェクトの場合
1. `/init-tech-stack` - 技術スタックの特定
2. `/kairo-requirements` - 要件定義
3. `/kairo-design` - 設計
4. `/kairo-tasks` - タスク分割
5. `/kairo-implement` - 実装

### 既存プロジェクトの分析
1. `/rev-tasks` - タスク構造の分析
2. `/rev-design` - 設計文書の逆生成
3. `/rev-specs` - テスト仕様書の逆生成
4. `/rev-requirements` - 要件定義書の逆生成

## 参考リンク
- [Tsumiki GitHub Repository](https://github.com/classmethod/tsumiki)
- [Tsumiki Manual](https://github.com/classmethod/tsumiki/blob/main/MANUAL.md)
