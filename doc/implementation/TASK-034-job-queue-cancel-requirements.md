# TDD要件定義: TASK-034 ジョブキュー/キャンセル制御

## 【機能名】: TASK-034 ジョブキュー/キャンセル制御

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🟢 **機能概要**: 複数枚画像生成時のジョブキューイング制御とユーザーによる即時キャンセル機能
- 🟢 **解決する問題**: 指定枚数分の画像生成を順次実行し、ユーザーがいつでも処理を中断できる仕組みを提供
- 🟢 **想定ユーザー**: NovelAI Auto Generator の拡張機能を使用する画像生成者
- 🟢 **システム内位置づけ**: Service Worker内でメッセージルータと連携し、Content Scriptからの進捗報告を受けて複数枚生成を制御
- **参照したEARS要件**: REQ-103, NFR-202
- **参照した設計文書**: architecture.md のサービスワーカー構成、dataflow.md の複数枚生成フロー

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

- 🟢 **入力パラメータ**:
  - `GenerationJob`: ジョブオブジェクト（id, settings.imageCount, status等）
  - `CancelJobMessage`: キャンセル指示メッセージ（jobId）
  - `ProgressUpdateMessage`: Content Scriptからの進捗報告
  - `ImageReadyMessage`: 各画像生成完了通知

- 🟢 **出力値**:
  - 更新された`GenerationJob.status`: 'pending' | 'running' | 'completed' | 'cancelled' | 'error'
  - `ProgressUpdateMessage`: UI向け進捗更新（current/total/status）
  - 各画像の`DownloadImageMessage`: ダウンロード指示

- 🟢 **入出力関係**: settings.imageCount回のループ制御で、各回でContent Scriptに生成指示を送信し、IMAGE_READYを受信してダウンロードを実行

- **参照したEARS要件**: REQ-103（複数枚生成の繰り返し）
- **参照した設計文書**: types.ts のGenerationJob, CancelJobMessage, ProgressUpdateMessage

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

- 🟢 **パフォーマンス要件**: 進捗更新は500ms周期でUI反映（NFR-002）
- 🟢 **レスポンス要件**: キャンセル操作の即時反映（NFR-202）
- 🟢 **アーキテクチャ制約**: Message Passingパターンでの非同期制御、Service Worker内での状態管理
- 🟡 **リソース制約**: Chrome Extension のメモリ制限内でのジョブ状態保持
- 🟡 **並行制約**: 同時実行は1ジョブまで（推測）

- **参照したEARS要件**: NFR-002（進捗更新頻度）, NFR-202（キャンセル即時性）
- **参照した設計文書**: architecture.md のMessage-driven設計

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

- 🟢 **基本使用パターン**:
  1. ユーザーが複数枚生成を指定（例：5枚）
  2. システムがジョブをキューに登録し、1枚ずつ順次生成
  3. 各画像完了時に進捗更新とダウンロード実行
  4. 全枚数完了でジョブステータスを'completed'に更新

- 🟢 **キャンセルケース**:
  1. 生成中にユーザーがキャンセル操作
  2. 現在の生成を中断し、残りをスキップ
  3. ジョブステータスを'cancelled'に即座に更新
  4. UI に中断完了を通知

- 🟡 **エラーケース**:
  - 生成失敗時のリトライ制御（TASK-032の指数バックオフと連携）
  - ネットワーク断時の一時停止と復帰
  - リソース不足時の適切なエラー処理

- **参照したEARS要件**: REQ-103（複数枚繰り返し）, NFR-202（キャンセル）
- **参照した設計文書**: dataflow.md の複数枚生成シーケンス図

## 5. EARS要件・設計文書との対応関係

- **参照したユーザストーリー**: ストーリー3（進捗と異常時の再開）
- **参照した機能要件**: REQ-103（複数枚生成の指定枚数まで繰り返し）
- **参照した非機能要件**: NFR-202（ユーザーのいつでもキャンセル）, NFR-002（500ms進捗更新）
- **参照したEdgeケース**: 推測ベース（明示的なEdgeケース定義なし）
- **参照した受け入れ基準**:
  - キャンセル操作で即時停止し状態が'canceled'に更新
  - 指定枚数分のループ制御実現
- **参照した設計文書**:
  - **アーキテクチャ**: architecture.md のService Worker構成、Message-driven設計
  - **データフロー**: dataflow.md の複数枚生成フロー
  - **型定義**: types.ts のGenerationJob, CancelJobMessage等
  - **メッセージ実装**: messagingRouter.ts の既存CANCEL_JOB処理

## 品質判定

✅ **高品質**:
- 要件の曖昧さ: なし（EARS要件に基づく明確な定義）
- 入出力定義: 完全（既存型定義との整合性確保）
- 制約条件: 明確（NFR要件との対応関係明示）
- 実装可能性: 確実（既存メッセージルータとの連携設計）

## 次のステップ

次のお勧めステップ: `/tdd-testcases` でテストケースの洗い出しを行います。