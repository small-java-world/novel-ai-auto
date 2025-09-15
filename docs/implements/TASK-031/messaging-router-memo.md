# メモ: TASK-031 messaging-router Refactor フェーズ

## フェーズ状況

- 現在のTDDフェーズ: Refactor（品質改善）
- 前回完了フェーズ: Green（最小実装）/ Red（失敗テスト作成）/ Testcases（洗い出し）
- 今回実行: ルータの可読性・保守性改善（定数化/ヘルパー分割/コメント強化）に加え、
  PROGRESS_UPDATE ブロードキャストのRedテストを追加（意図的に失敗）

## 変更サマリー

- 追加: `src/shared/messages.ts`（メッセージ種別定数・型ガード・URL安全チェック）
- 追加: `src/shared/errors.ts`（エラーコード/エラー生成ヘルパー）
- ドキュメント: 本メモ、リファクタ内容記録
- 追加: `src/messaging-router.test.ts`（Redフェーズの失敗テスト → 現在合格）
- ドキュメント: `docs/implements/TASK-031/messaging-router-red-phase.md` / `.../messaging-router-green-phase.md` / `.../messaging-router-refactor-phase.md`

## セキュリティレビュー（🟢）

- 入力検証: 受信メッセージに対し形状検証（type/必須フィールド）を追加可能な下地を整備
- URL検証: ダウンロードURLは http/https のみ許可（javascript:等を拒否）
- 最小権限: 検証ロジックは純粋関数で副作用なし
- データ漏洩: ログに機微情報を出さない方針を前提（実装時に徹底）

## パフォーマンスレビュー（🟢）

- 検証は浅いO(1)チェックのみで低オーバーヘッド
- 文字列定数化によりミスタイプ削減とJIT最適化に有利
- 深い検証（大payload）は上位レイヤーで段階的に行う方針

## 既知の課題/今後

- 進捗一貫性（current<=total）検証はルータ実装側に委譲
- スキーマ厳格化（zod等）導入は将来検討（現段階では導入せず）

## 品質評価（暫定）

- セキュリティ: 重大な懸念なし（URLスキーム検証導入）
- パフォーマンス: 影響軽微
- リファクタ品質: 共通化・命名・コメント整備完了
- ドキュメント: 本メモおよびリファクタ記録を追加

## テスト結果（Refactor/Green後）

- `src/messaging-router.test.ts` 合格（2/2: START_GENERATION, PROGRESS_UPDATE）
- 既存の storage テスト2件は依然失敗（本機能とは独立）

## 追加改善（今回）

- runtime送信の共通化ヘルパー `forwardToRuntime` を導入（DRY化）
- UNKNOWN メッセージに対する ERROR 発行を実装（エラーコード: UNKNOWN_MESSAGE）
- ルータ系テストは 4/4 合格を維持（ストレージ系の既存失敗は対象外）

### Greenフェーズ追記（2025-09-14 21:15）

- DOWNLOAD_FAILED リトライ（指数バックオフの最小実装）を追加
  - 仕様: `ERROR` で `code: DOWNLOAD_FAILED` を受理した場合、500ms 後に `DOWNLOAD_IMAGE` を再送
  - 実装: `setTimeout(() => chrome.runtime.sendMessage({ type: DOWNLOAD_IMAGE, payload:{ url, fileName } }), 500)`
  - 信頼性: 🟡（EARSの再試行要件からの妥当推測、詳細ポリシーはRefactorで拡張）
  - テスト: `vi.useFakeTimers()` により 500ms 経過後の送信を検証（合格）

### 追記（2025-09-14 22:10 以降の拡張）

- 不正payload/検証強化（REQ-006, REQ-003）
  - START_GENERATION/PROGRESS_UPDATE/IMAGE_READY の必須payload検証を追加（欠落時は INVALID_PAYLOAD）🟢
  - PROGRESS_UPDATE 値域検証（current>total は PROGRESS_INCONSISTENT）🟢

- URL/ファイル名の安全性（NFR-103, EDGE-003）
  - DOWNLOAD_URL の http/https 限定化（INVALID_URL）🟢
  - fileName サニタイズ（禁止文字除去・128文字上限・拡張子保持・全禁止時は 'image' フォールバック）🟡

- 経路と操作（REQ-101, NFR-002, NFR-202）
  - OPEN_OR_FOCUS_TAB（既存/新規）を実装しテストで検証 🟢
  - CANCEL_JOB 橋渡し（CSへ中断シグナル送出）🟢
  - レイテンシ境界: PROGRESS_UPDATE/IMAGE_READY 経路でタイマー未使用（即時転送）をテストで保証 🟢

- 境界・エラー分岐（EDGE-104, EDGE-001）
  - DOWNLOAD_FAILED の指数バックオフ + 上限打切り時に ERROR を通知 🟢
  - START_GENERATION で対象タブ未検出時は静かに無視（現仕様）🟢

## 要件網羅性メモ（スコープ10）

- 完全: 2/10（REQ-003, REQ-004）
- 部分: 1/10（REQ-006）+ 他NFR/EDGE一部
- 網羅率（完全）: 20%（部分含む概算 ≈ 30%）

## TODO（次フェーズ候補）

- REQ-101 異常系: tabs.query/update/create 失敗を ERROR へ変換
- REQ-105/EDGE-001: Content Script のセレクタフォールバック/タイムアウト（別タスク）
- NFR-103: ファイル名テンプレ展開＋重複回避（ユーティリティ化）
- NFR-002: 実測レイテンシの軽量メトリクス記録

## Redテスト（新規追加）

- PROGRESS_UPDATE ブロードキャスト: 失敗（runtime.sendMessage が未呼び出し）

## セキュリティレビュー（🟢）

- 入力: メッセージ種別の定数化で誤入力抑制
- 将来: URL/値域検証は shared/helpers を活用して段階的に強化

## パフォーマンスレビュー（🟢）

- 追加コストなし（関数分割のみ）。tabs.query/送信回数は据置き

## 現状の課題

- NovelAIタブ特定/生成の未実装、型/値域検証の不足（後続で対応）
