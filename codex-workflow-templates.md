# Codex CLI + Tsumiki 作業指示テンプレート

## A. 初回オンボーディング（新規機能開発フロー）

```
あなたはリポジトリ直下で動くローカル開発エージェントです。
目的：このプロジェクトに Tsumiki ベースの「要件→設計→タスク分割→TDD実装」フローを確立し、最小の機能Aを実装・テスト・コミットまで完了させる。

手順：
1) /init-tech-stack
   - 現在の言語/フレームワーク/テスト基盤を自動推定し、結果を要約。

2) /kairo-requirements NovelAI Chrome Extension
   - 機能Aの要件定義を具体化（入力/出力/制約/受入基準）。

3) /kairo-design NovelAI Chrome Extension
   - 設計方針・依存関係・I/F・データ構造・エラー方針を書き出す。

4) /kairo-tasks NovelAI Chrome Extension
   - 実装タスクを粒度良く分割し、順序と見積りを付与。

5) /kairo-implement NovelAI Chrome Extension
   - TDD で進める。以降「Red→Green→Refactor」を繰り返す:
     - /tdd-testcases → /tdd-red → /tdd-green → /tdd-refactor
     - /tdd-verify-complete で受入基準を満たすか確認。

6) 変更差分の提示、必要なコマンド実行（lint/test/build）を自動化。
   - すべて成功したら、意味のあるコミットメッセージでコミットし、ブランチを push 可能な状態にする。
   - 以降の作業のための TODO を ISSUE 体裁で列挙。

重要ルール：
- 変更前に diff を提示。危険な操作は私の許可を取る。
- 既存の設計思想と一貫性を保つ。テストは冪等で高速に。
- ドキュメントは docs/ または README に追記し、手順再現性を担保。
```

## B. 既存コードの「逆生成（リバースエンジニアリング）」

```
目的：既存コードから仕様・設計・テスト仕様を逆生成し、欠落テストを補う。

手順：
1) /rev-tasks     # 既存コードから作業ブレークダウンを抽出
2) /rev-design    # 設計文書（層/依存/I/F/例外）を生成
3) /rev-specs     # テスト仕様書を生成
4) /rev-requirements # 暗黙要件を文書化
5) 抽出内容と実コードの差分ギャップを一覧化し、補完テストを追加。
6) CI の通過までリファクタリング＆テスト強化。
```

## C. バグ修正・小規模改修のショートフロー

```
目的：Issue #<番号> の修正を最短で完了。

手順：
1) 影響範囲と再現手順を特定（ログ/テストから絞り込み）。
2) /tdd-testcases → /tdd-red → /tdd-green → /tdd-refactor
3) 既存回帰テストを全実行、パフォーマンス劣化が無いか確認。
4) CHANGELOG とドキュメント更新、コミット＆PR 下書きまで。
```

## よく使うシェルコマンド集

```bash
# Codex の対話モード開始
codex

# 単発実行（説明や要約に便利）
codex "summarize the repository structure and test setup"

# Tsumikiコマンドを使った開始メッセージを渡す例
codex "Please run /init-tech-stack then /kairo-requirements NovelAI Chrome Extension."
```

## 利用可能なTsumikiコマンド

### Kairo Commands (包括的開発フロー)
- `/kairo-requirements <feature>` - 要件定義
- `/kairo-design <feature>` - 設計文書生成
- `/kairo-tasks <feature>` - タスク分割
- `/kairo-implement <feature>` - 実装実行

### TDD Commands (テスト駆動開発)
- `/tdd-requirements <feature>` - TDD要件定義
- `/tdd-testcases <feature>` - テストケース作成
- `/tdd-red <feature>` - テスト実装（Red）
- `/tdd-green <feature>` - 最小実装（Green）
- `/tdd-refactor <feature>` - リファクタリング
- `/tdd-verify-complete <feature>` - TDD完了確認

### Reverse Engineering Commands (リバースエンジニアリング)
- `/rev-tasks` - 既存コードからタスク一覧を逆生成
- `/rev-design` - 既存コードから設計文書を逆生成
- `/rev-specs` - 既存コードからテスト仕様書を逆生成
- `/rev-requirements` - 既存コードから要件定義書を逆生成

### Utility Commands (ユーティリティ)
- `/init-tech-stack` - 技術スタックの特定
- `/clear` - 開発環境のクリーンアップ

## 運用のコツ

- **プロンプトの先頭に目的と完了定義（Done 条件）**を必ず書く
- 小さく区切る：/kairo-* で要件・設計を固めてから /tdd-*
- ドキュメント化を自動化：生成された要件・設計・テスト仕様は docs/ に置き、PR に含める
- 安全策：最初は Codex の承認モードを「Read Only」にして、設計や手順を計画→承認→実行の順で頼むと事故りにくい

## 生成されるファイル構造

```
docs/
├── requirements/
│   └── novelai-chrome-extension/
│       └── requirements.md
├── design/
│   └── novelai-chrome-extension/
│       └── design.md
└── tasks/
    └── novelai-chrome-extension/
        └── backlog.md
```
