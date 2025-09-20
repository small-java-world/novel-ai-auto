# NovelAI Auto Generator アーキテクチャ設計

## システム概要
NovelAI のWeb UIをChrome拡張（Manifest V3）で自動操作し、事前定義されたプロンプトに基づき画像を生成・自動ダウンロードする。拡張は以下のコンポーネントで構成される。

- Popup UI: 生成の開始/停止、プロンプト選択、進捗表示。
- Content Script: NovelAI ページのDOM操作（プロンプト適用、生成ボタン押下、進捗監視、画像URL抽出）。
- Service Worker (Background): ダウンロード管理、タブ制御、再試行制御、永続ログ。
- Storage: `chrome.storage` に設定・プロンプト・履歴・ジョブ状態を保存。
- Config: 静的な `config/prompts.json` によるプロンプト定義。
  - DOM セレクタは `config/dom-selectors.json` に定義し、Content Script 起動時に `chrome.runtime.getURL` と `fetch` で読み込む。
  - ファイルは2つのスキーマをサポート:
    1) フラット: ElementType をキーに優先度順セレクタ配列を持つ。
    2) プロファイル対応: `profiles` ルートに複数プロファイルを定義し、`detect` セレクタでマッチしたプロファイルの `selectors` を使用。`default/$default/common` のいずれかがフォールバック。
  - 例（プロファイル対応、キャラクター別UI想定）:
    ```json
    {
      "profiles": {
        "$default": {
          "selectors": {
            "prompt-input": ["#prompt-input", "[data-testid=\"prompt-input\"] textarea"],
            "negative-input": [
              "#negative-prompt-input",
              "[data-testid=\"negative-prompt\"] textarea",
              "textarea[aria-label*=\"negative\" i]"
            ]
          }
        },
        "character-anime": {
          "detect": [".anime-character-ui", "[data-style=\"anime\"]"],
          "selectors": {
            "prompt-input": [
              { "scope": ".anime-character-ui", "selectors": ["textarea", "[contenteditable=true]"] }
            ],
            "negative-input": [
              { "scope": ".anime-character-ui", "selectors": [".negative textarea"] }
            ]
          }
        }
      }
    }
    ```
  - `scope` + `selectors` 形式のエントリはスコープセレクタと子セレクタを結合して優先展開される。
  - セレクタ変更はこの設定ファイルの編集のみで完結し、Content Script はビルド済みバンドルからでも最新のマッピングを参照する。
- **キャラクター別自動選択**: プロンプトファイルで `selectorProfile` を指定すると、対応するプロファイルのセレクタが自動選択される。
  - 例: `"selectorProfile": "character-anime"` → `character-anime` プロファイルのセレクタを使用
  - 未指定または存在しないプロファイルの場合は `$default` にフォールバック

## アーキテクチャパターン
- パターン: MV3 Event-driven Extension + Message Passing
- 理由: Manifest V3 の制約下で、UI/DOM制御/バックグラウンド処理を疎結合に分離し、`chrome.runtime` メッセージングと `chrome.storage` を用いて状態同期を行うのが適切なため。

## コンポーネント構成
### フロントエンド（拡張内）
- フレームワーク: 純粋な HTML/CSS/TypeScript（軽量化を優先）。
- 状態管理: Popup 内はローカルステート + `chrome.storage` 同期、バックグラウンドとメッセージで整合。
- 主UI要素: プロンプト選択、設定（枚数/seed/命名テンプレート）、開始/停止、進捗（残枚数/ETA/ログ）。

### Content Script（DOM制御）
- 主責務: セレクタ解決、プロンプト/パラメータ適用、生成開始、完了検知、画像URL抽出。
- レジリエンス: セレクタフォールバック、待機/タイムアウト、リトライ、レート制御。

### Service Worker（バックグラウンド）
- 主責務: ダウンロード（`chrome.downloads`）、ジョブ制御（キュー/再試行/キャンセル）、NovelAI タブの生成/フォーカス。
- ロギング: 軽量リングバッファ + `chrome.storage` 永続化。

### データベース
- DBMS: 外部DBなし。`chrome.storage.local/sync` を論理スキーマ化して利用。
- キャッシュ: 進捗・直近ログはメモリ保持し、節目で永続化。

## システム境界
- 外部通信: NovelAI Web UI へのアクセスのみ。サーバーAPIや外部送信は行わない。
- 権限: `activeTab`, `scripting`, `downloads`, `storage`, `tabs`（必要最小限）。
- サポート: 最新安定版Chrome（最低バージョンは manifest で明記）。

## 主要設計決定
- メッセージ駆動: `runtime.sendMessage` と `tabs.sendMessage` を用途で使い分け。
- 失敗時リトライ: 指数バックオフ（基準 500ms、倍率 2.0、最大 5 回）を初期値とする（設定で変更可）。
- ファイル命名: テンプレート `{date}_{prompt}_{seed}_{idx}` を既定、禁止文字はサニタイズ。
- アクセシビリティ: キーボード操作、明瞭なコントラスト、フォーカス可視化。

