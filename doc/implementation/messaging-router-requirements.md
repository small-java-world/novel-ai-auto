# TDD要件定義・機能仕様（messaging-router）

本ドキュメントは、Service Worker 内のメッセージルーティング（messaging-router）機能に関するTDD用要件定義です。リポジトリ内のテスト、型定義、実装・設計メモから抽出しています。

## 事前準備（/tdd-load-context 相当）

- 参照ソース: `src/messaging-router.test.ts`（テスト仕様）, `src/types.ts`（型定義）, `src/background.ts`（SW実装）, `src/content.ts`（CS実装）, `プロジェクト概要.md`（設計概要）, `doc/todo.md`（進捗）
- 備考: 明示的な EARS 文書（requirements.md, dataflow.md, api-endpoints.md 等）は未検出。テスト記述内の REQ/NFR/EDGE ID を暫定参照とする。

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🟡 何をする機能か: Service Worker において、Popup/Content Script/背景タスク間のメッセージを受理・検証し、適切な宛先へ転送・ブロードキャストするメッセージルータ。START_GENERATION → CS への APPLY_AND_GENERATE 橋渡し、PROGRESS_UPDATE の Popup ブロードキャスト、IMAGE_READY → DOWNLOAD_IMAGE 指示、未知メッセージや不正payloadの拒否、ダウンロード失敗時の指数バックオフ再試行を含む。
- 🟡 どのような問題を解決するか: ユーザーがPopupから画像生成を操作した際に、UI/CS/SW間の非同期メッセージを安全・確実に伝搬し、進捗可視化と自動ダウンロードを成立させる。
- 🟡 想定されるユーザー: 画像生成を自動化したいNovelAIユーザー（拡張機能利用者）。
- 🟡 システム内での位置づけ: Chrome MV3 の Service Worker 層に常駐し、メッセージハブとして振る舞う。`background.ts` の責務を専用ルータに分割する設計。
- 参照したEARS要件: REQ-101, REQ-104, REQ-006（テスト内記述に基づく）
- 参照した設計文書: `プロジェクト概要.md`（アーキテクチャ図、Phase 6: メッセージング統合）

信頼性コメント: 明示のEARS要件書がないため、テスト記述と概念設計からの抽出（🟡）。

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

- 🟢 入力パラメータ（代表例）
  - `START_GENERATION` payload: `{ job: { id: string, prompt: string, params?: object } }`（テスト由来）
  - `PROGRESS_UPDATE` payload: `{ jobId: string, status: 'running'|'pending'|'completed'|'error', progress: { current: number, total: number, etaSeconds?: number } }`（テスト由来）
  - `IMAGE_READY` payload: `{ jobId: string, url: string, index: number, fileName: string }`（テスト由来）
  - 型参照: `src/types.ts` 内の `StartGenerationMessage`, `ProgressUpdateMessage`, `DownloadImageMessage` など（用語・基本形）

- 🟡 出力値（代表例）
  - `APPLY_AND_GENERATE` → CS へ `{ type: 'APPLY_AND_GENERATE', payload: { job } }`
  - `PROGRESS_UPDATE` → Popup へブロードキャスト `{ type: 'PROGRESS_UPDATE', payload }`
  - `DOWNLOAD_IMAGE` → SW/Downloads `{ type: 'DOWNLOAD_IMAGE', payload: { url, fileName } }`
  - エラー: `{ type: 'ERROR', payload: { error: { code, message }, context? } }`（code例: `INVALID_PAYLOAD`, `UNKNOWN_MESSAGE`, `INVALID_URL`, `DOWNLOAD_FAILED`）

- 🟡 入出力の関係性
  - START_GENERATION 受理 → NovelAI タブ特定 → CSへ APPLY_AND_GENERATE を橋渡し
  - CS/内部からの PROGRESS_UPDATE 受理 → Popupへ即時ブロードキャスト
  - IMAGE_READY 受理 → payload検証/サニタイズ → DOWNLOAD_IMAGE を即時送出
  - DOWNLOAD_FAILED（ERROR）受理 → バックオフ再試行をスケジュール（上限あり）

- 🔴 データフロー
  - 明示的な `dataflow.md` 不在。上記関係性を仮のデータフローとする。

- 参照したEARS要件: REQ-006（検証）、REQ-101（タブ制御）、REQ-104（再試行）
- 参照した設計文書: `src/types.ts` の各メッセージ/設定型（実名は既存と差異あり）

信頼性コメント: 型は `src/types.ts` から（🟢）。ルーティングのメッセージ名・詳細はテストからの抽出（🟡）。`dataflow.md` 未検出のため一部仮置き（🔴）。

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

- 🟡 パフォーマンス要件（NFR-002 想定）
  - PROGRESS_UPDATE と IMAGE_READY 経路はタイマーを用いず即時転送（目標レイテンシ < 200ms）

- 🟡 セキュリティ要件（NFR-103 想定）
  - `IMAGE_READY.url` は `http/https` のみ許可（`javascript:` 等は拒否, `INVALID_URL`）
  - `fileName` は128文字以内、禁止文字 `\\/:*?"<>|` を除去し拡張子保持

- 🟡 互換性要件
  - Chrome Extension Manifest V3, `chrome.runtime`, `chrome.tabs`, `chrome.downloads`, `chrome.storage`

- 🟡 アーキテクチャ制約
  - ルーティングは SW 内で完結。タブ探索/フォーカスは一元化（REQ-101）。バックオフは SW タイマーで管理。

- 🔴 データベース制約
  - 専用DBなし。`chrome.storage` 利用（既存コード準拠）。EARS上のDB要件は不在。

- 🔴 API制約（外部）
  - `api-endpoints.md` 不在。Chrome API に限定。

- 参照したEARS要件: NFR-002, NFR-103, REQ-101, REQ-104（テスト記述のID参照）
- 参照した設計文書: `プロジェクト概要.md`（アーキテクチャ）、`src/background.ts`（タブ/Download実装）

信頼性コメント: テストと既存実装からの抽出（🟡）、正式NFR/REQ文書は未検出（🔴）。

## 4. 想定される使用例（EDGEケース・データフローベース）

- 🟢 基本パターン
  - Popup→SW: `START_GENERATION(job)` → SW→CS: `APPLY_AND_GENERATE(job)` → CSで適用/生成 → CS/SW→Popup: `PROGRESS_UPDATE` → CS/SW→SW: `IMAGE_READY(url,fileName)` → SW: `DOWNLOAD_IMAGE`

- 🟡 データフロー（簡易）
  - Runtime/Tabs メッセージングのハブとして SW が受理→検証→分配。進捗・完了は Popup へブロードキャスト。

- 🟢 エッジケース（例）
  - `UNKNOWN` メッセージ → `ERROR(UNKNOWN_MESSAGE)` をPopupへ通知
  - `START_GENERATION` の必須 `job` 欠落 → `ERROR(INVALID_PAYLOAD)`
  - `IMAGE_READY` の `url` 欠落/不正 → `ERROR(INVALID_PAYLOAD|INVALID_URL)`

- 🟡 エラーケース（再試行）
  - `DOWNLOAD_FAILED` を受理 → 500ms/1000ms/2000ms の指数バックオフで最大3回再送、超過時は `ERROR(DOWNLOAD_FAILED)` 通知し打切り

- 参照したEARS要件: EDGE-104（再試行上限通知）, 他 EDGE系はテスト内コメント参照
- 参照した設計文書: （データフロー図不在につき）`src/messaging-router.test.ts` の記述を準拠とする

信頼性コメント: テストケース由来（🟢/🟡）、正式 dataflow 図は未検出（🔴）。

## 5. EARS要件・設計文書との対応関係

- 参照したユーザストーリー: Popup からの画像生成操作を確実に反映し、進捗/完了と保存を自動化したい（`プロジェクト概要.md`）
- 参照した機能要件: REQ-006（メッセージ検証）, REQ-101（タブ制御）, REQ-104（ダウンロード再試行）
- 参照した非機能要件: NFR-002（レイテンシ/即時性）, NFR-103（サニタイズ/安全性）
- 参照したEdgeケース: EDGE-104（再試行上限打切り通知）, 未知メッセージ・不正payload（テスト記述）
- 参照した受け入れ基準: `src/messaging-router.test.ts` の各 `test`/`expect` 条件
- 参照した設計文書:
  - アーキテクチャ: `プロジェクト概要.md`（アーキテクチャ構成/Phase 6）
  - データフロー: （なし）→ 暫定で本書2章/4章の関係性を定義
  - 型定義: `src/types.ts`
  - データベース: （なし）
  - API仕様: （なし, Chrome API 準拠）

---

## 品質判定（暫定）

⚠️ 要改善

- 要件の曖昧さ: 一部あり（正式EARS/NFR文書・dataflow図が未整備）
- 入出力定義: 主要経路は明確（テスト/型で補完）だが命名の一貫性に改善余地
- 制約条件: 概ね明確（レイテンシ、サニタイズ、再試行）が、正式ID/本文が未整備
- 実装可能性: 確実（テストドリブンで段階的に可能）

## 次のステップ

次のお勧めステップ: `/tdd-testcases` でテストケースの洗い出しを行います。
