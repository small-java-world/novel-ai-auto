# TDDテストケース一覧: messaging-router（メッセージルータ/プロトコル実装）

## 事前準備

Taskツール実行: `/tdd-load-context` にてTDD関連ファイルの読み込みとコンテキスト準備を実施済み。

## 参照コンテキスト（抜粋）

- EARS機能要件: REQ-006（メッセージ送受信）, REQ-003（進捗表示）, REQ-004（ダウンロード連携）, REQ-101（タブ制御）
- 非機能: NFR-002（メッセージ往復200ms目標）, NFR-201（UI反映500ms以内）
- 設計文書: docs/design/novelai-auto-generator/api-endpoints.md, interfaces.ts, dataflow.md（Start/Progress/ImageReady/Download フロー）
- 型定義: RuntimeMessage, StartGenerationMsg, ProgressUpdateMsg, ImageReadyMsg など

---

## 開発言語・フレームワーク

- プログラミング言語: TypeScript
  - 言語選択の理由: 既存設計がTSインターフェースで定義。型安全によりペイロード検証を強化しやすい。
  - テストに適した機能: 型推論、ナロイング、ユニオン型でメッセージ種別ごとの網羅性検証。
  - 信頼性: 🟢（設計文書のinterfaces.tsに準拠）

- テストフレームワーク: Vitest
  - フレームワーク選択の理由: TS/ESMに親和性が高く、高速。モックが容易。
  - テスト実行環境: Node + JSDOM（chrome.\* APIはモック）。
  - 信頼性: 🟡（設計文書に明記なしだが、プロジェクト方針と合致）

---

## 1. 正常系テストケース

1. テスト名: START_GENERATION メッセージを受理しジョブを登録・指示送出
   - 何をテストするか: Popup→SWのStartGeneration受信と、SW内でのジョブ登録、CSへのApplyAndGenerate指示送出。
   - 期待される動作: SWが`START_GENERATION`を受理→内部キュー/状態に登録→対象タブへ`APPLY_AND_GENERATE`送信。
   - 入力値: StartGenerationMsg { job: minimal valid job }
     - 入力データの意味: 最小限の必須フィールドを満たす正当なジョブ開始。
   - 期待される結果: true/ACK相当、送信先/送信内容が正しい。
     - 期待結果の理由: api-endpoints.mdの「START_GENERATION」「APPLY_AND_GENERATE」仕様。
   - テストの目的: ルータの基本的な開始フローの検証。
   - 確認ポイント: 送信種別、payload整合、キュー登録。
   - 信頼性: 🟢

2. テスト名: PROGRESS_UPDATE を受理してPopupへブロードキャスト
   - 何をテストするか: CS→SWの進捗通知をPopupへ中継。
   - 期待される動作: `PROGRESS_UPDATE`受信→Popupへ反映メッセージ送出（UIは500ms以内更新前提）。
   - 入力値: ProgressUpdateMsg { jobId, progress:{current:1,total:3,etaSeconds:20}, status:"running" }
   - 期待される結果: SWがPopup向けチャンネルへ同等payloadを転送。
   - テストの目的: 中継の正確性と形の維持。
   - 確認ポイント: 値が改変されない、遅延発生が閾値内。
   - 信頼性: 🟢

3. テスト名: IMAGE_READY 受理でダウンロード指示を発行
   - 何をテストするか: CS→SWの画像URL通知で`DOWNLOAD_IMAGE`発行。
   - 期待される動作: `DOWNLOAD_IMAGE`が正しいfileNameで発行される。
   - 入力値: ImageReadyMsg { jobId, url, index, fileName }
   - 期待される結果: SW内部のダウンロードキューに投入、処理開始。
   - テストの目的: 画像受領から保存までの連携起点を保証。
   - 確認ポイント: URL/ファイル名の受け渡し正確性。
   - 信頼性: 🟢

4. テスト名: CANCEL_JOB が進行中ジョブを中断
   - 何をテストするか: Popup→SWのキャンセル要求で、保留/実行中の再試行や待機を停止。
   - 期待される動作: ジョブ状態が`canceled`、CSへキャンセル通知（必要なら）。
   - 入力値: CancelJobMsg { jobId }
   - 期待される結果: キューと進行状態の更新。
   - テストの目的: 中断操作の有効性。
   - 確認ポイント: 再試行タイマ解除、状態遷移。
   - 信頼性: 🟡（キャンセル通知の詳細は設計の裁量）

5. テスト名: OPEN_OR_FOCUS_TAB 指示で既存タブをフォーカス/未存在なら作成
   - 何をテストするか: SW内のタブ制御メッセージ処理。
   - 期待される動作: 既存→focus、新規→create→focus。
   - 入力値: OpenOrFocusTabMsg { url }
   - 期待される結果: 適切な`tabs.update`/`tabs.create`呼出（モック）。
   - テスト目的: タブ制御の分岐正当性。
   - 確認ポイント: 呼出引数、分岐条件。
   - 信頼性: 🟢

6. テスト名: APPLY_AND_GENERATE がCSに正しいpayloadで送達
   - 何をテストするか: SW→CSのタブメッセージ。
   - 期待される動作: 指定タブIDへ`APPLY_AND_GENERATE`送信。
   - 入力値: ApplyAndGenerateMsg { job }
   - 期待される結果: CS側モックの受信履歴に一致。
   - テスト目的: 宛先と形式の正確性。
   - 確認ポイント: jobの必須フィールド保持。
   - 信頼性: 🟢

7. テスト名: DOWNLOAD_IMAGE が chrome.downloads 呼出へブリッジ
   - 何をテストするか: SW内部メッセージからダウンロードAPIへ。
   - 期待される動作: 適切な`downloads.download({url, filename})`。
   - 入力値: DownloadImageMsg { url, fileName }
   - 期待される結果: 成功ACK、downloadId を保持。
   - テスト目的: 連携境界の健全性。
   - 確認ポイント: ファイル名・URLの整合。
   - 信頼性: 🟢

---

## 2. 異常系テストケース

1. テスト名: 未知のメッセージtypeを拒否しエラーを記録
   - エラーケースの概要: 仕様外typeが到達。
   - エラー処理の重要性: 不正入力耐性・安全性確保。
   - 入力値: { type: "UNKNOWN", payload:{} }
     - 不正な理由: interfaces.ts RuntimeMessage に未定義。
     - 実際の発生シナリオ: バージョン不整合/外部由来。
   - 期待される結果: 例外/エラーログ、呼出は実施しない。
     - メッセージ内容: code:"UNKNOWN_MESSAGE"。
     - システムの安全性: ルート無効化。
   - テストの目的: バリデーションの網羅。
   - 品質保証: 想定外入力の封じ込め。
   - 信頼性: 🟢

2. テスト名: 不正payload（必須欠落）を検出し拒否
   - エラーケースの概要: StartGenerationMsg から job が欠落。
   - 入力値: { type:"START_GENERATION", payload:{} }
     - 不正な理由: 必須フィールド欠落。
     - 実際の発生シナリオ: バグ/改修漏れ。
   - 期待される結果: code:"INVALID_PAYLOAD"、処理中断。
   - テストの目的: スキーマ検証。
   - 信頼性: 🟢

3. テスト名: PROGRESS_UPDATE の値域不正を拒否（current>total）
   - エラーケースの概要: 進捗の整合性違反。
   - 入力値: { current:5, total:3 }
     - 不正な理由: 物理的に不可能。
   - 期待される結果: エラーログ、転送しない。
   - テストの目的: 整合性チェック。
   - 信頼性: 🟡（値域制約は常識的制約の追加）

4. テスト名: IMAGE_READY の URL 不正（空/不正スキーム）
   - 入力値: url:"javascript:alert(1)"
     - 不正な理由: ダウンロード不能/危険。
   - 期待される結果: 拒否しログ、DOWNLOAD_IMAGEへ渡さない。
   - テストの目的: セキュリティ担保。
   - 信頼性: 🟡（セキュリティ強化として妥当）

5. テスト名: DOWNLOAD_IMAGE の downloads API 失敗時に再試行発火
   - 入力値: 正常payloadだがAPIが失敗を返す。
   - 期待される結果: REQ-104に基づく再試行メッセージのスケジュール。
   - テストの目的: 異常時の自己回復。
   - 信頼性: 🟢（設計のリトライ方針）

6. テスト名: CANCEL_JOB 未知ID指定時の無視/警告
   - 入力値: 未登録jobId
   - 期待される結果: 状態は変更せず警告ログ。
   - テストの目的: 整合性確保。
   - 信頼性: 🟡（ログ文言は設計裁量）

---

## 3. 境界値テストケース

1. テスト名: 空のログ/購読者不在でも処理継続
   - 境界値の意味: 受信はあるがUI購読者なし。
   - 境界値での動作保証: 例外を出さずNo-op。
   - 入力値: PROGRESS_UPDATE with no listeners
   - 期待される結果: 例外なし、内部状態のみ更新。
   - テストの目的: 疎結合性維持。
   - 信頼性: 🟢

2. テスト名: ジョブ件数上限近傍でのルーティング安定性
   - 境界値の意味: 多数ジョブ同時配信。
   - 入力値: キューサイズ上限-1, 上限
   - 期待される結果: 遅延は発生しても喪失なし。
   - テストの目的: スループット検証。
   - 信頼性: 🟡（上限値は設計で定義）

3. テスト名: 大きなpayload（長いprompt/filename）
   - 境界値の意味: ファイル名/メッセージサイズの上限付近。
   - 入力値: prompt長/filename長が許容上限-1, =上限
   - 期待される結果: サニタイズ後に正常通過 or 警告。
   - テストの目的: NFR-103準拠の確認。
   - 信頼性: 🟡（サイズ上限はサニタイズ仕様依存）

4. テスト名: タイミング境界（200ms以内での往復）
   - 境界値の意味: NFR-002のレイテンシ目標。
   - 入力値: ProgressUpdateのラピッドバースト
   - 期待される結果: 200ms以内の往復平均を満たす（モック計測）。
   - テストの目的: 性能境界の担保。
   - 信頼性: 🟢（非機能要件に準拠）

---

## 4. テスト実装時の日本語コメント指針

各テストケース実装時は、問題文記載のコメント指針（テスト目的/内容/期待動作、Given/When/Then、各expect、セットアップ/クリーンアップ）を準拠して付与すること。

---

## 5. 対応関係（EARS要件・設計文書）

- 参照したユーザストーリー: ストーリー3: 進捗と失敗時の再試行（進捗表示/キャンセル） 🟢
- 参照した機能要件: REQ-006, REQ-003, REQ-004, REQ-101 🟢
- 参照した非機能要件: NFR-002, NFR-201, NFR-103 🟢
- 参照したEdgeケース: EDGE-001, EDGE-003, EDGE-004, EDGE-104, EDGE-101 🟢🟡
- 参照した受け入れ基準: 進捗表示、ダウンロード再試行、キャンセル動作のテスト項目 🟢
- 参照した設計文書:
  - アーキテクチャ: architecture.md「主要設計決定」「Service Worker/Content Script」🟢
  - データフロー: dataflow.md「単枚生成」「失敗時リトライ」🟢
  - 型定義: interfaces.ts「RuntimeMessage系」🟢
  - データベース: database-schema.sql（ログ/ジョブ状態の概念）🟡
  - API仕様: api-endpoints.md（拡張内メッセージ仕様）🟢

---

## 品質判定

✅ 高品質 判定

- テストケース分類: 正常系/異常系/境界値を網羅
- 期待値定義: 各ケースに具体記述
- 技術選択: TypeScript + Vitest を明示
- 実装可能性: 既存設計/要件と整合し実現可能

---

## 次のステップ

次のお勧めステップ: `/tdd-red` でRedフェーズ（失敗テスト作成）を開始します。
