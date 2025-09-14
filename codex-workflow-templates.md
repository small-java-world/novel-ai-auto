# Codex CLI + Tsumiki 作業指示テンプレート

## A. 初回オンボーディング（新規機能開発フロー）

```
あなたはリポジトリ直下で動くローカル開発エージェントです。
目的：このプロジェクトに Tsumiki ベースの「要件→設計→タスク分割→TDD実装」フローを確立し、最小の機能Aを実装・テスト・コミットまで完了させる。

手順：
1) s/init-tech-stack
   - 現在の言語/フレームワーク/テスト基盤を自動推定し、結果を要約。

2) s/kairo-requirements
   - 機能Aの要件定義を具体化（入力/出力/制約/受入基準）。

3) s/kairo-design
   - 設計方針・依存関係・I/F・データ構造・エラー方針を書き出す。

4) s/kairo-tasks
   - 実装タスクを粒度良く分割し、順序と見積りを付与。

5) s/kairo-implement
   - TDD で進める。以降「Red→Green→Refactor」を繰り返す:
     - s/tdd-testcases → s/tdd-red → s/tdd-green → s/tdd-refactor
     - s/tdd-verify-complete で受入基準を満たすか確認。

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
1) s/rev-tasks     # 既存コードから作業ブレークダウンを抽出
2) s/rev-design    # 設計文書（層/依存/I/F/例外）を生成
3) s/rev-specs     # テスト仕様書を生成
4) s/rev-requirements # 暗黙要件を文書化
5) 抽出内容と実コードの差分ギャップを一覧化し、補完テストを追加。
6) CI の通過までリファクタリング＆テスト強化。
```

## C. バグ修正・小規模改修のショートフロー

```
目的：Issue #<番号> の修正を最短で完了。

手順：
1) 影響範囲と再現手順を特定（ログ/テストから絞り込み）。
2) s/tdd-testcases → s/tdd-red → s/tdd-green → s/tdd-refactor
3) 既存回帰テストを全実行、パフォーマンス劣化が無いか確認。
4) CHANGELOG とドキュメント更新、コミット＆PR 下書きまで。
```

## よく使うシェルコマンド集

```bash
# Codex の対話モード開始
codex

# 単発実行（説明や要約に便利）
codex "summarize the repository structure and test setup"

# Tsumiki（/kairo 等）の擬似コマンドを使った開始メッセージを渡す例
codex "Please run s/init-tech-stack then s/kairo-requirements for feature A."
```

## 運用のコツ

- **プロンプトの先頭に目的と完了定義（Done 条件）**を必ず書く
- 小さく区切る：/kairo-* で要件・設計を固めてから /tdd-*
- ドキュメント化を自動化：生成された要件・設計・テスト仕様は docs/ に置き、PR に含める
- 安全策：最初は Codex の承認モードを「Read Only」にして、設計や手順を計画→承認→実行の順で頼むと事故りにくい
