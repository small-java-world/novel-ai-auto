# TDD要件定義・機能仕様（TASK-011）

【機能名】: ファイル名テンプレート/サニタイズ（File Name Template & Sanitization）

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🟢 何をする機能か: ユーザ設定のファイル名テンプレートに基づき、画像保存用の安全なファイル名を生成する。テンプレートのトークン展開、禁止文字の除去、長さ制御、重複回避を行う。
- 🟢 どのような問題を解決するか: As a 画像収集者, I want 自動ダウンロード時に所定の命名規則で保存 so that 手動命名の手間や命名ミス・衝突を防ぎ整理が容易になる（ストーリー2）。
- 🟢 想定されるユーザー: NovelAIユーザ/画像収集者（エンドユーザ）。
- 🟢 システム内での位置づけ: Service Workerのダウンロード処理およびメッセージルータから呼ばれるユーティリティ。`IMAGE_READY`受信時にファイル名を確定するアプリケーション層機能。
- 🟢 参照したEARS要件: REQ-004, REQ-303, EDGE-103, NFR-103
- 🟢 参照した設計文書: docs/design/novelai-auto-generator/{interfaces.ts, api-endpoints.md, architecture.md}

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

- 🟢 入力パラメータ:
  - template: `string`（`Settings.fileNameTemplate`。例: `{date}_{prompt}_{seed}_{idx}`）
  - ctx: `FileNameTemplateContext`（interfaces.ts L24-L29）
    - `date: string` YYYYMMDD-HHmmss
    - `prompt: string`
    - `seed?: string`
    - `idx?: number`
  - options?:
    - `maxLength?: number` デフォルト255（拡張子含まず/含むの定義は実装で明示）
    - `forbiddenChars?: RegExp | string[]` OS依存禁止文字集合（デフォルト: Windows互換）
    - `replacement?: string` デフォルト "\_"
    - `collisionResolver?: (base:string, i:number)=>string` 重複時のサフィックス生成（例: `_001`）
- 🟢 出力値:
  - `string` サニタイズ・短縮・衝突回避後のファイル名（拡張子は呼び出し側で付与する想定。呼び出し側で付与済みの場合、拡張子保持のまま処理）。
- 🟢 入出力の関係性: `template`内のトークンを`ctx`で解決→サニタイズ→長さ調整→衝突回避（必要なら）
- 🟢 データフロー: Content Scriptが`IMAGE_READY`相当のURLを検出→SWへ`IMAGE_READY`送信→SWがテンプレート展開して`DOWNLOAD_IMAGE`実行（dataflow参照）
- 🟢 参照したEARS要件: REQ-004, REQ-303, EDGE-103, NFR-103
- 🟢 参照した設計文書: interfaces.ts（`FileNameTemplateContext`, `Settings`）, api-endpoints.md（`IMAGE_READY`, `DOWNLOAD_IMAGE`）

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

- 🟢 パフォーマンス要件: NFR-002（UI反映500ms以内）に影響しない同期処理。テンプレ展開/サニタイズは1ms〜数ms程度で完了すること。
- 🟢 セキュリティ要件: NFR-103（サニタイズ）。パスインジェクションと不正文字を排除。ディレクトリ区切りや先頭・末尾のドット連続は安全に処理。
- 🟢 互換性要件: REQ-404（最低サポートChrome）。ファイル名ルールはクロスプラットフォームだが、既定はWindows禁止文字ベース（<>:"/\|?\*）と制御文字、非推奨末尾（ピリオド/空白）を考慮。
- 🟢 アーキテクチャ制約: MV3のService Worker内で純粋関数的に実行可能であること。副作用は持たない（衝突回避はコールバックで外部状態と連携）。
- 🔴 データベース制約: 外部DBなし（chrome.downloadsの仕様に依存）。
- 🟢 API制約: `chrome.downloads.download` の`filename`規約に準拠。長さと禁止文字を満たす必要。
- 🟢 参照したEARS要件: NFR-103, REQ-004, REQ-404
- 🟢 参照した設計文書: architecture.md（SWの責務）, api-endpoints.md（DOWNLOAD_IMAGE）

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

- 🟢 基本的な使用パターン:
  - template: `{date}_{prompt}_{seed}_{idx}`
  - ctx: `{ date: "20240914-120000", prompt: "masterpiece, 1girl", seed: "12345", idx: 1 }`
  - 出力例: `20240914-120000_masterpiece-1girl_12345_001`
- 🟢 データフロー: Content Script→SW（IMAGE_READY）→テンプレ展開→DOWNLOAD_IMAGE。
- 🟢 エッジケース:
  - EDGE-103-1 禁止文字含有: `prompt="a<b>:\/|?*"` → `a_b________` に置換（連続はまとめて"\_")
  - EDGE-103-2 長大名: 255超なら末尾優先で切詰め、拡張子保持（`.png`）。
  - EDGE-103-3 未知トークン: `{unknown}` は空に解決し警告ログ。
  - EDGE-103-4 空結果: すべて空となる場合は`untitled`にフォールバック。
  - EDGE-103-5 末尾不正: 末尾の`.`/空白は除去。
  - EDGE-103-6 衝突回避: 既存重複時は `_001`, `_002`…を付与（上限到達時は明示エラー）。
- 🟢 エラーケース:
  - 無効なテンプレ（未閉カール）→テンプレ解決エラー
  - 非文字型入力や`maxLength<=0`→引数バリデーションエラー
- 🟢 参照したEARS要件: EDGE-103, NFR-103, REQ-303
- 🟢 参照した設計文書: dataflow.md（DOWNLOADフロー）

## 5. EARS要件・設計文書との対応関係

- 参照したユーザストーリー: ストーリー2「自動ダウンロードと命名」
- 参照した機能要件: REQ-004（自動DL）, REQ-303（テンプレート）
- 参照した非機能要件: NFR-103（サニタイズ）, NFR-002（更新周期への影響最小）
- 参照したEdgeケース: EDGE-103（ファイル名制約/衝突）
- 参照した受け入れ基準: 「単枚生成後に画像が自動ダウンロード」「ファイル名テンプレートの不正文字サニタイズ」
- 参照した設計文書:
  - アーキテクチャ: docs/design/novelai-auto-generator/architecture.md（SW責務）
  - データフロー: docs/design/novelai-auto-generator/dataflow.md（IMAGE_READY→DOWNLOAD）
  - 型定義: docs/design/novelai-auto-generator/interfaces.ts（FileNameTemplateContext, Settings）
  - データベース: なし（概念スキーマのみ）
  - API仕様: docs/design/novelai-auto-generator/api-endpoints.md（IMAGE_READY, DOWNLOAD_IMAGE）

---

## 品質判定

✅ 高品質 判定

- 要件の曖昧さ: なし（EARS/設計に直接対応）
- 入出力定義: 完全（型とオプション定義）
- 制約条件: 明確（禁止文字/長さ/拡張子/衝突）
- 実装可能性: 確実（純粋関数+コールバック方針）

## 次のステップ

- 次のお勧めステップ: `/tdd-testcases` でテストケースの洗い出しを行います。
