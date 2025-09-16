# TDDテストケース洗い出し — Retry Engine（指数バックオフ）

対象機能名（おすすめ）: Retry Engine（Downloads/Actions の指数バックオフ再試行）
保存先: docs/implements/retry-engine-testcases.md（フォルダ選定基準: 既存が多い docs/implements を採用）

- 参照要件: REQ-104, NFR-002, EDGE-104（docs/spec/novelai-auto-generator-requirements.md） 🟢
- 参照設計: architecture.md（バックオフ記述）, dataflow.md（失敗時リトライシーケンス）, api-endpoints.md（処理フローの前提）🟢
- 参照型定義: docs/design/novelai-auto-generator/interfaces.ts（Settings.retry）🟢
- 参照実装: src/utils/retry-engine.ts, src/utils/retry-engine.test.ts 🟢

## 開発言語・フレームワーク

- プログラミング言語: TypeScript（ES2020） 🟢
  - 言語選択の理由: 既存実装・テストがTSで統一、型安全により境界条件の不具合を事前検出できるため。
  - テストに適した機能: 型の絞り込み、モジュール分割、AbortController 等の標準API利用が容易。
- テストフレームワーク: Vitest 🟢
  - フレームワーク選択の理由: 既存 `vitest.config.ts` に整合、`vi.useFakeTimers` による時間制御が必要なため。
  - テスト実行環境: Node.js + jsdom（必要に応じて）。CI は既存GitHub Actionsを利用。

---

## 1. 正常系テストケース（基本的な動作）

- テスト名: 初回成功でリトライしない
  - 何をテストするか: 最初の試行で成功した場合、追加の待機・再試行が行われないこと。
  - 期待される動作: `operation` が1回だけ呼ばれ、結果が即時返る。
- 入力値: baseDelay=500, factor=2.0, maxRetries=5, operation=1回目resolve
  - 入力データの意味: 既定相当のバックオフ設定と成功シナリオの代表。
- 期待される結果: 呼び出し回数1回、遅延なし、戻り値はresolve値。
  - 期待結果の理由: REQ-104 は「失敗時のみ再試行」だから。🟢（要件整合）
- テストの目的: 不要リトライの未実行を確認。
  - 確認ポイント: タイマー未登録、`executeWithDelay`未使用。
- 信頼性: 🟢（既存実装と要件に合致）

- テスト名: 1回失敗→2回目で成功（指数バックオフ反映）
  - 何をテストするか: attempt=0 失敗後に delay=round(500*2^0)=500ms 待機して2回目で成功。
  - 期待される動作: `operation` 呼び出し2回、間に500msの待機。
- 入力値: baseDelay=500, factor=2.0, maxRetries=5, operation=1回目reject/2回目resolve
  - 入力データの意味: 最小限のリトライ成立シナリオ。
- 期待される結果: 呼び出し2回, 合計待機500ms。
  - 理由: 設計の `calculateDelay(attempt)` 定義に一致。🟢
- テストの目的: 指数バックオフの1段目を検証。
  - 確認ポイント: 偽タイマーで500ms進めると2回目実行。
- 信頼性: 🟢

- テスト名: 2回連続失敗→3回目で成功（500ms→1000ms）
  - 何をテストするか: attempt 0,1 の各失敗で 500ms,1000ms を待機して3回目で成功。
  - 期待される動作: 呼び出し3回、待機累計1500ms。
- 入力値: baseDelay=500, factor=2.0, maxRetries>=2, operation=×,×,○
- 期待される結果: 遅延シーケンス [500, 1000] を順に消化。
  - 理由: `Math.round(base*factor^n)` 実装に一致。🟢
- テストの目的: 指数バックオフの多段確認。
  - 確認ポイント: 各段ごとに `executeWithDelay` が1回だけ。
- 信頼性: 🟢

- テスト名: `shouldRetry` が `attempts < maxRetries` を満たす範囲のみ再試行
  - 何をテストするか: 上限直前までは再試行するが、上限到達で停止。
  - 期待される動作: attempt==maxRetries で停止し、直前のエラーをthrow。
- 入力値: maxRetries=2, 常にreject
- 期待される結果: 呼び出し3回（0,1,2回目で終了）、最後はreject。
  - 理由: 実装 `for (attempt=0; attempt<=maxRetries; attempt++)` と `shouldRetry` 条件。🟢
- テストの目的: 上限制御の正しさ検証。
  - 確認ポイント: 計3回で完了、不要な4回目はない。
- 信頼性: 🟢

- テスト名: `runWithRetry` が AbortSignal を内部統合し cancel() で中断可能
  - 何をテストするか: `handle.cancel()` で実行中の待機/次回試行が中断される。
  - 期待される動作: `promise` が AbortError でreject、以降の実行なし。
- 入力値: 長時間待機中に cancel 実行
- 期待される結果: AbortError（name='AbortError'）
  - 理由: 実装の `AbortController` 連携に一致（dataflowの再試行中断とも整合）。🟢
- テストの目的: 中断の安全性。
  - 確認ポイント: タイマーはすべてクリアされる。
- 信頼性: 🟢

- テスト名: 外部Signalを渡した場合に外部abortで即中断
  - 何をテストするか: options.signal.abort() により即時abort。
  - 期待される動作: AbortErrorでreject、待機をスキップ。
- 入力値: options.signal=AbortController().signal
- 期待される結果: 直ちに中断。
  - 理由: 実装で外部→内部へ伝播する設計。🟢
- テストの目的: 外部指示の優先処理。
- 確認ポイント: `waitWithAbort` の abortリスナー解放。
- 信頼性: 🟢

## 2. 異常系テストケース（エラーハンドリング）

- テスト名: 入力検証エラー（負のbaseDelay）
  - エラーケースの概要: 不正な設定値。
  - エラー処理の重要性: 早期失敗により実行時の無限ループや過大遅延を回避。
- 入力値: baseDelay=-1, factor=2.0, maxRetries=5
  - 不正な理由: 仕様で baseDelay>=0 必須。
  - 実際の発生シナリオ: 外部設定の誤り。
- 期待される結果: TypeError('baseDelay must be a finite number >= 0')
  - エラーメッセージの内容: 実装と一致し明確。🟢
  - システムの安全性: 生成失敗で以降の処理は開始されない。
- テストの目的: パラメータバリデーション確認。
  - 品質保証の観点: REQ-104/NFR-103の堅牢性担保。🟢

- テスト名: 入力検証エラー（非正のfactor）
- 入力値: factor<=0
- 期待される結果: TypeError('factor must be a finite number > 0') 🟢
- テストの目的: 係数の健全性。

- テスト名: 入力検証エラー（maxRetries<0 or 非整数）
- 入力値: maxRetries=-1, 1.2 など
- 期待される結果: TypeError('maxRetries must be an integer >= 0') 🟢
- テストの目的: 上限指定の妥当性。

- テスト名: 全試行失敗で最終エラーをthrow（EDGE-104）
  - エラーケースの概要: すべての試行が失敗。
  - エラー処理の重要性: 明示的な失敗確定が必要。
- 入力値: maxRetries=2, 常にreject
- 期待される結果: 最後に受け取ったErrorをthrow。
  - 理由: 実装 `throw lastError`。🟢
- テストの目的: 失敗確定処理。

- テスト名: cancel() 後は shouldRetry=false かつ executeWithDelay が効果を持たない
- 入力値: 任意設定、cancel() 実行
- 期待される結果: 再試行停止、遅延後コールバック未実行。🟢
- テストの目的: キャンセル時の安全側停止。

- テスト名: 外部AbortSignalで待機中に中断（waitWithAbort の動作）
- 入力値: signal.abort() を待機中に発火
- 期待される結果: AbortError、タイマー解除。🟢
- テストの目的: 中断処理の資源リーク防止。

## 3. 境界値テストケース（最小値、最大値、null等）

- テスト名: maxRetries=0（再試行なし）
  - 境界値の意味: 最小上限設定。
  - 境界値での動作保証: 0回のみ試行、即失敗確定。
- 入力値: maxRetries=0, 常にreject
  - 境界値選択の根拠: shouldRetryは attempts<maxRetries。
  - 実際の使用場面: 即時失敗方針の設定。
- 期待される結果: 呼び出し1回でエラー。
  - 正確性: 仕様通り。🟢
  - 一貫した動作: 上限の内外で整合。
- テストの目的: 下限上限の確定動作。

- テスト名: baseDelay=0（即時再試行）
  - 境界値の意味: 待機最小。
- 入力値: baseDelay=0
- 期待される結果: 各段の待機0ms（偽タイマーで即時進行）。🟢
- テストの目的: 0遅延の正当性。

- テスト名: factor=1.0（等差的=固定遅延として機能）
  - 境界値の意味: 変化率の下限（>0）。
- 入力値: factor=1.0
- 期待される結果: すべての段で baseDelay に丸め。🟢
- テストの目的: 遅延一定の許容。

- テスト名: calculateDelay に負値/NaN/Infinity を渡すと 0 に丸めて基準計算
  - 境界値の意味: attempts 引数の健全化。
- 入力値: attempts=-1, NaN, Infinity
- 期待される結果: 内部で attempts=0 として計算。🟢（実装）
- テストの目的: API堅牢性。

- テスト名: 大きな maxRetries（例: 20）でも `shouldRetry` と遅延計算が破綻しない
  - 境界値の意味: 高負荷シナリオ。
- 入力値: maxRetries=20, baseDelay=1, factor=2
- 期待される結果: 各段の遅延が計算可能かつ指定回数で停止。🟡（性能面はNFR-001/002の目標だが上限は仕様外）
- テストの目的: スケール耐性の確認。

---

## 実装時コメント指針（テストコードに必須）

各テストには以下の日本語コメントを含めること（要約）。🟢

```javascript
// 【テスト目的】: ~
// 【テスト内容】: ~
// 【期待される動作】: ~
// 🟢🟡🔴 この内容の信頼性レベル

// Given
// 【テストデータ準備】: ~
// 【初期条件設定】: ~
// 【前提条件確認】: ~

// When
// 【実際の処理実行】: ~
// 【処理内容】: ~
// 【実行タイミング】: ~

// Then
// 【結果検証】: ~
// 【期待値確認】: ~
// 【品質保証】: ~

// 各expect前
// 【検証項目】: ~
// 🟢🟡🔴
```

---

## TODO更新

- 現在のTODO「テストケース洗い出し」を「completed」にマーク
- テストケース定義フェーズの完了を反映（Retry Engine: テスト観点網羅）
- 品質判定結果を記録（下記）
- 次フェーズ「Redフェーズ（失敗テスト作成）」をTODOに追加

## 品質判定

✅ 高品質 と判定
- テスト分類: 正常系・異常系・境界値を網羅
- 期待値定義: 各テストで具体的・算出根拠を明記
- 技術選択: TypeScript + Vitest（既存環境）
- 実装可能性: 既存の `retry-engine` 構造とタイマーAPIで実現可能

## 次のステップ

次のお勧めステップ: `/tdd-red` でRedフェーズ（失敗テスト作成）を開始します。

---

## 信頼性レベルまとめ

- 🟢 青信号: 仕様・設計・既存実装に直接整合（大半のケース）
- 🟡 黄信号: 性能の上限スケールなど設計に明文化が薄い部分の妥当推測（maxRetries=20 など）
- 🔴 赤信号: なし（本ドキュメントでは採用していない）
