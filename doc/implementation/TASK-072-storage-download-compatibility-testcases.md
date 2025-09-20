# TDDテストケース - TASK-072 ストレージ/ダウンロード互換制御

## 1. 正常系テストケース

### TC-072-001: 権限済みでダウンロードが即時成功する
- **何をテストするか**: downloads 権限が既に付与されている状態で `DownloadImageMsg` を受信した際、権限確認→ダウンロード→ログ記録までが一連で成功することを検証する。
- **期待される動作**: `chrome.permissions.contains` が `true` を返し、`chrome.downloads.download` が成功し、結果が Service Worker から Popup/UI に `{ success: true, downloadId }` で返却され、`StorageModel.logs` に INFO ログが追記される。
- **入力値**:
  - `DownloadImageMsg` `{ url: 'https://example.com/image.png', fileName: 'foo.png' }`
  - mocks: `permissions.contains` → `true`, `downloads.download` → `123`
  - 設定ストレージ初期値: logs 空
  - **入力データの意味**: もっとも一般的な成功経路。既に権限があるユーザが通常の画像ダウンロードを実行する場面。
- **期待結果**: 戻り値 `{ success: true, downloadId: 123 }`、logs に INFO エントリ追加。
  - **期待結果の理由**: REQ-004/REQ-005 に従い、成功時は downloadId を返し履歴へ記録する設計となっているため。
- **テストの目的**: 権限済みパスの基本動作確認。
  - **確認ポイント**: 権限チェック条件分岐が `true` 経路を通ること、ログ記録フォーマットが要件どおり。
- 🟢 信頼性レベル: 要件定義書および architecture/dataflow/既存 download-handler 実装に基づく。

### TC-072-002: 権限未付与でユーザが承諾した場合にダウンロードが継続する
- **何をテストするか**: `permissions.contains` が `false` の場合に `permissions.request` を提示し、ユーザが承諾した結果ダウンロードへ進む経路。
- **期待される動作**: `permissions.request` → `true`、続いて `downloads.download` 実行、ログには PERMISSION_GRANTED イベントと DOWNLOAD_SUCCESS イベントが追加される。
- **入力値**:
  - `DownloadImageMsg` `{ url: 'https://example.com/image.png', fileName: 'foo.png' }`
  - mocks: `permissions.contains` → `false`, `permissions.request` → `true`, `downloads.download` → `321`
  - logs 初期値空
  - **入力データの意味**: 初回利用などで権限が未許可だが、その場で承諾する現実的シナリオ。
- **期待結果**: 戻り値 `{ success: true, downloadId: 321 }`、logs に `permissionGranted` と `downloadSuccess` の2件。
  - **理由**: REQ-202 で承諾時は通常フローに合流し、履歴に権限取得を記録することが推奨されているため。
- **テストの目的**: 権限要求フローの正当経路検証。
  - **確認ポイント**: request の結果 true のみダウンロード実行、ログ順序、`permissionPending` フラグ解除。
- 🟢 信頼性レベル: REQ-202, EDGE-003, architecture.md の設計に厳密準拠。

### TC-072-003: 権限承諾後に permissionPending フラグが解除される
- **何をテストするか**: ストレージに `permissionPending=true` が事前記録されているケースで、承諾後にフラグが false へ更新され履歴が残ること。
- **期待される動作**: request が `true` を返した後、`permissionPending` が `false` に更新され、`logs` に INFO エントリが追記される。
- **入力値**:
  - StorageModel に `{ permissionPending: true }` 相当の設定（設定領域など要件で想定）
  - `permissions.contains` → `false`, `permissions.request` → `true`
  - `downloads.download` → `456`
  - **入力データの意味**: 過去に拒否して pending になっていたユーザが再許可したシナリオ。
- **期待結果**: 戻り値成功、`permissionPending` が false、ログに pending → resolved のイベント。
  - **理由**: 要件で pending フラグを解除して次回以降通常フローに戻すと定義。
- **テストの目的**: ストレージ更新の正当性。
  - **確認ポイント**: 設定書き戻し、ログ記録。
- 🟡 信頼性レベル: 要件書に pending 設計が補足された想定に基づく推測（memo 参照）

## 2. 異常系テストケース

### TC-072-101: 権限要求をユーザが拒否した場合にエラーを通知する
- **エラーケースの概要**: `permissions.request` が `false`（拒否）を返す。
- **エラー処理の重要性**: 継続的に権限なしでダウンロードを試みると失敗を繰り返すため、明確なエラー通知とログが必要（REQ-202, EDGE-003）。
- **入力値**:
  - `permissions.contains` → `false`, `permissions.request` → `false`
  - `DownloadImageMsg` は通常値
  - **不正な理由**: 権限拒否によりダウンロード条件が満たされない。
  - **発生シナリオ**: 初回権限要求をユーザが明示的に拒否。
- **期待される結果**: `{ success: false, error: 'PERMISSION_DENIED' }` を返却し、Popup/UI へ `ErrorMsg(code='PERMISSION_DENIED')` を送信。logs に WARN を追記し、`permissionPending=true` を設定。
  - **エラーメッセージ**: 「ダウンロード権限が付与されていません」等。
  - **安全性**: 以降の自動再試行を抑制。
- **テストの目的**: 権限拒否時のフェイルセーフ。
  - **品質保証**: ユーザに明確なアクションを促し、無限ループを防ぐ。
- 🟢 信頼性レベル: REQ-202 / EDGE-003 設計に基づく。

### TC-072-102: 権限 API が例外を投げた場合にフェイルセーフでエラー返却する
- **エラー概要**: `chrome.permissions.contains` や `request` が `chrome.runtime.lastError` または例外を発生。
- **重要性**: ブラウザ実装差異や一時的不具合でも安定して失敗を検知する必要がある。
- **入力値**: `permissions.contains` → throw Error('internal error')。
  - **発生シナリオ**: 権限 API が未サポート／内部エラー。
- **期待結果**: 戻り値 `{ success: false, error: 'PERMISSION_CHECK_FAILED' }`、logs に ERROR 記録、`ErrorMsg(code='PERMISSION_CHECK_FAILED')` 通知。
  - **安全性**: ダウンロードを試みない。
- **テスト目的**: 例外ハンドリングの確認。
  - **品質保証**: 異常時でもクラッシュせず安全に止める。
- 🟡 信頼性レベル: 設計文書には直接記載がないため妥当な推測。

### TC-072-103: ダウンロード API が連続失敗し上限に達した場合のエラー通知
- **エラー概要**: `chrome.downloads.download` が上限回数（`maxRetries`）すべて失敗。
- **重要性**: EDGE-003 で規定されたリトライ上限到達時の確定失敗処理。
- **入力値**: `permissions.contains` → `true`, `downloads.download` → 毎回 reject `DOWNLOAD_FAILED`。
  - **発生シナリオ**: ネットワーク不調やファイル名の致命的問題。
- **期待結果**: 戻り値 `{ success: false, error: 'DOWNLOAD_FAILED' }`、logs に WARN/Error、Popup へ `ErrorMsg(code='DOWNLOAD_FAILED')`。
- **テスト目的**: 既存リトライエンジンとの結合確認。
  - **品質保証**: 無制限リトライにならない。
- 🟢 信頼性レベル: EDGE-003 と download-handler の既存テストに基づく。

### TC-072-104: 権限拒否が連続する場合に permissionPending を維持して再試行をスキップ
- **エラー概要**: 前回拒否で pending=true の状態で再度リクエストが来た場合、改めて request を出さずスキップ。
- **重要性**: ユーザ体験向上と不要なモーダル連打防止。
- **入力値**: StorageModel.settings.permissionPending=true, `permissions.contains`→false。
- **期待結果**: 即座に `{ success: false, error: 'PERMISSION_PENDING' }` を返し、logs に WARN 追記。
- **テスト目的**: pending ステータスの尊重。
- **品質保証**: 無駄な権限要求を防ぎUXを守る。
- 🟡 信頼性レベル: メモ要件に基づく推測。

## 3. 境界値テストケース

### TC-072-201: ログ上限500件到達時のローテーション
- **境界値の意味**: storage-schema.md で logs は最大500件とされている。
- **入力値**: logs に499件存在、成功シナリオ追加。
- **期待される結果**: 500件維持。501件目を追加する場合は FIFO で最古が削除される。
- **目的**: 境界での一貫性。
- 🟡 信頼性レベル: storage-schema.md の推奨に基づく推測。

### TC-072-202: ダウンロードリトライ遅延の境界（最大 2000ms）
- **境界値**: RETRY_CONFIG `maxRetries=5`, `factor=2.0`, `baseDelay=500` → 4回目以降 4000ms にならないこと。
- **入力値**: ダウンロードが連続失敗、4回目以降はスケジュールされない。
- **期待結果**: 設定の最大遅延 2000ms で stop。
- **目的**: バックオフ境界を検証。
- 🟢 信頼性レベル: download-handler.ts 実装に基づく。

### TC-072-203: ファイル名テンプレートのサニタイズ境界（不正文字のみ）
- **境界値**: `fileName` が禁則のみ（`<>:"/\|?*`）。
- **入力値**: `fileName='<>:"/\|?*'`。
- **期待結果**: sanitize で安全なファイル名に変換、ログでサニタイズ実施記録。
- **目的**: サニタイズ境界確認。
- 🟡 信頼性レベル: download-handler.ts の sanitize 処理に基づく推測。

### TC-072-204: 権限要求ダイアログを連続で拒否→承諾の境界
- **境界値**: pending=true から false に戻る遷移。
- **入力値**: 1回目 pending, 2回目 request=true。
- **期待結果**: pending解除、正常フロー復帰。
- **目的**: 状態遷移境界。
- 🟡 信頼性レベル: 要件メモ参照の推測。

## 4. 実装技術

- **プログラミング言語**: TypeScript
  - **理由**: 既存 Service Worker / Router 実装が TypeScript で統一されており、型定義 (`interfaces.ts`) によるメッセージバリデーションを活用できる。
  - **テストに適した機能**: 型安全・enum/const アサーションでメッセージ種別を保証。
  - 🟢 信頼性レベル: 既存実装・リポジトリ標準に基づく。
- **テストフレームワーク**: Vitest
  - **理由**: プロジェクト既定のユニットテスト環境（`npm test`）であり、Chrome API をモックしやすい。
  - **テスト実行環境**: Node.js + happy-dom（`vitest.config.ts`）。
  - 🟢 信頼性レベル: 既存download-handler/messaging-routerテストに準拠。
