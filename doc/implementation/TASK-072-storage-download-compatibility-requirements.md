# TDD要件定義 - TASK-072: ストレージ/ダウンロード互換制御

## 1. 機能の概要（EARS要件・設計文書ベース）

- 🟢 **機能目的**: サービスワーカーが画像ダウンロードを実行する前に `downloads` 権限の有無を検査し、未付与であれば権限要求ダイアログを提示してユーザの選択結果に応じた処理へ分岐する（REQ-202, architecture.md#Service Worker）。
- 🟢 **解決したい課題**: 画像収集を行うユーザが権限未付与や権限剥奪によってダウンロードが失敗する問題を防ぎ、確実に自動保存を完遂できるようにする（ユーザストーリー2「自動ダウンロードと命名」、EDGE-003）。
- 🟢 **想定ユーザ**: NovelAI で大量の生成結果を収集するエンドユーザ／画像収集者（ユーザストーリー2）。
- 🟢 **システム内での位置づけ**: Service Worker のダウンロード処理 (`chrome.downloads`) とストレージ (`chrome.storage.local`) の橋渡し層。権限確認・失敗ログ記録・再試行の全てを Service Worker 側で担い、Popup/Content Script へはメッセージで結果を返す（architecture.md, dataflow.md）。
- **参照したEARS要件**: REQ-202, REQ-004, REQ-005, REQ-403, EDGE-003。
- **参照した設計文書**: `docs/design/novelai-auto-generator/architecture.md`（Service Worker/Downloads 節）, `docs/design/novelai-auto-generator/dataflow.md`（Download フロー）。

## 2. 入力・出力の仕様（EARS要件・型定義ベース）

- 🟢 **入力パラメータ**:
  - `DownloadImageMsg` (`interfaces.ts` L118) — `{ url: string; fileName: string }`。
  - 追加で `chrome.permissions.contains({ permissions: ['downloads'] })` の結果、および `chrome.permissions.request(...)` のユーザ選択結果を参照する（REQ-202）。
  - 既存ストレージ (`StorageModel.logs`, `storage-schema.md`) を読み書きし、成功/失敗イベントを記録する。
- 🟢 **出力値**:
  - 成功時: `DownloadResult`（`download-handler.ts`）や `RuntimeMessage`（`interfaces.ts`）経由で `{ success: true, downloadId }` を返却。
  - 失敗時: `ErrorMsg` (`type: 'ERROR', payload: { code: 'PERMISSION_DENIED' | 'DOWNLOAD_FAILED', message, details }`) をルータ経由で Popup/UI へ送信し、`logs` に追記。
- 🟢 **入出力の関係性**:
  - 入力 `DownloadImageMsg` → 権限チェック → ダウンロード実行/再試行 → 成功なら `DownloadResult`・進捗ログ更新、失敗なら `ErrorMsg` とストレージ更新。
  - 権限要求後にユーザが拒否した場合は `DownloadResult.success=false` として継続ダウンロードを停止し、再度リクエストが来るまで `permissionPending` フラグを記録する。
- 🟢 **データフロー**: `dataflow.md` の「Service Worker → chrome.downloads → Service Worker」経路に権限確認とログ書き込み工程を追加し、Popup とは runtime メッセージで通信する。
- **参照したEARS要件**: REQ-202, REQ-004, REQ-005, EDGE-003。
- **参照した設計文書**: `docs/design/novelai-auto-generator/interfaces.ts`（`DownloadImageMsg`, `ErrorMsg`, `StorageModel`）, `docs/design/novelai-auto-generator/dataflow.md`（Download シーケンス）。

## 3. 制約条件（非機能要件・アーキテクチャベース）

- 🟢 **パフォーマンス要件**: 権限確認→ダウンロード判定は 1 リクエストあたり 200ms 以内に結果を返却し（NFR-003）、ダウンロード可否が確定したら即座にリトライエンジンへ委譲する。
- 🟢 **セキュリティ要件**: 権限要求は必要な時のみ実行し、取得した情報はローカルストレージにのみ保持（NFR-101, NFR-102）。権限拒否時はエラーコードを明示し、過度な再試行を行わない。
- 🟢 **互換性要件**: Manifest V3 かつ `downloads`, `storage`, `activeTab`, `scripting` 権限のみを利用し、最小権限原則を維持（REQ-403, `architecture.md`）。
- 🟢 **アーキテクチャ制約**: Service Worker 上で `chrome.permissions` / `chrome.downloads` API を扱い、Popup/Content Script 側での権限確認は禁止し単一責任を維持。
- 🟢 **データベース制約**: `chrome.storage.local.novelaiAutoGenerator.logs` に成功/失敗イベントを追加し、過去 500 件上限を遵守（`storage-schema.md`）。
- 🟢 **API制約**: `chrome.downloads.download` は `conflictAction: 'uniquify'` を維持し、失敗時は `chrome.runtime.lastError` を透過的に取り扱う（`download-handler.ts`, `api-endpoints.md#DOWNLOAD_IMAGE`）。
- **参照したEARS要件**: NFR-003, NFR-101, NFR-102, REQ-403, EDGE-003。
- **参照した設計文書**: `architecture.md`, `storage-schema.md`, `api-endpoints.md`。

## 4. 想定される使用例（Edgeケース含む）

- 🟢 **基本シナリオ**: IMAGE_READY → MessagingRouter → Service Worker が `DownloadImageMsg` を受信。既に `downloads` 権限あり → 直ちに `chrome.downloads.download` 実行 → 成功ログを `logs` に保存（REQ-004, `dataflow.md`）。
- 🟢 **権限未付与シナリオ**: Service Worker が `chrome.permissions.contains` で未付与と判定 → `chrome.permissions.request` を表示 → 承諾ならダウンロード継続、拒否なら `ErrorMsg(code='PERMISSION_DENIED')` を返し `logs` へ記録（REQ-202, EDGE-003）。
- 🟢 **失敗フォールバック**: ダウンロード API が `DOWNLOAD_FAILED` を返した場合、既存リトライエンジンに委譲しつつ失敗回数・原因をストレージへ追記。ファイル名テンプレートが不正なら `sanitizeFileName` を利用して再試行（EDGE-003, `download-handler.ts`）。
- 🟡 **権限再承認**: ユーザが後から権限を再許可した場合、ストレージ上の `permissionPending` フラグを解除し、次回リクエスト時に通常フローへ戻す（設計上の推奨事項）。
- **参照したEARS要件**: REQ-202, REQ-004, EDGE-003。
- **参照した設計文書**: `dataflow.md`（Download フロー）, `storage-schema.md`（logs 構造）, `download-handler.ts`（フォールバック実装）。

## 5. EARS要件・設計文書との対応関係

- **参照したユーザストーリー**: ストーリー2「自動ダウンロードと命名」。
- **参照した機能要件**: REQ-004, REQ-005, REQ-202, REQ-403。
- **参照した非機能要件**: NFR-003, NFR-101, NFR-102。
- **参照したEdgeケース**: EDGE-003（ダウンロード失敗時の再試行とサニタイズ）。
- **参照した受け入れ基準**: 「単枚生成後に画像が自動ダウンロードされる」「ダウンロード失敗時に指数バックオフで再試行される」「権限未付与エラーでも安全に再試行できる」。
- **参照した設計文書**:
  - **アーキテクチャ**: `docs/design/novelai-auto-generator/architecture.md`
  - **データフロー**: `docs/design/novelai-auto-generator/dataflow.md`
  - **型定義**: `docs/design/novelai-auto-generator/interfaces.ts`
  - **データベース**: `docs/design/novelai-auto-generator/storage-schema.md`
  - **API仕様**: `docs/design/novelai-auto-generator/api-endpoints.md`
