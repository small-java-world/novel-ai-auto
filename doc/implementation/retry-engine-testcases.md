# TDDテストケース一覧（retry-engine）

## 事前準備（/tdd-load-context 実行済）
- 参照資料: docs/spec/novelai-auto-generator-requirements.md, docs/design/novelai-auto-generator/{architecture.md, dataflow.md, interfaces.ts}, docs/implements/TASK-032/*, src/utils/retry-engine.ts, src/utils/retry-engine.test.ts

## 開発言語・フレームワーク
- プログラミング言語: TypeScript
  - 言語選択の理由: 既存コード・型定義・テストがTypeScriptで統一されているため。型安全とAbortSignal等の型サポートが有効。
  - テストに適した機能: 型エラーの早期検知、Promise/async-awaitの標準サポート。
  - 信頼性: 🟢 既存実装とテスト・repo構成に一致
- テストフレームワーク: Vitest
  - フレームワーク選択の理由: 既存のユニットテストがVitestで記述されているため（test/setup.ts, 既存*.test.ts）。
  - テスト実行環境: Node + jsdom 互換（タイマーはvi.useFakeTimers()を使用）。
  - 信頼性: 🟢 既存テストと設定に一致

---

## 1. 正常系テストケース（基本動作）

- テスト名: 指数バックオフ遅延の計算（デフォルト設定）
  - 何をテストするか: baseDelay=500ms, factor=2.0 のとき、attempts=0..4 の遅延計算
  - 期待される動作: 500, 1000, 2000, 4000, 8000(ms) を返す
- 入力値: baseDelay=500, factor=2.0, attempts=[0,1,2,3,4]
  - 入力データの意味: アーキ設計の既定値（バックオフ）を代表
- 期待される結果: [500, 1000, 2000, 4000, 8000]
  - 期待結果の理由: architecture.md のバックオフ既定値記載、指数計算 base*factor^n
- テストの目的: 遅延計算の正確性
  - 確認ポイント: 丸め、負値/非数の補正が無いケースの正確性
  - 信頼性: 🟢 参照: architecture.md（バックオフ 500ms, factor 2.0, 上限5）

- テスト名: カスタム設定での遅延計算（200ms, 1.5倍）
  - 何をテストするか: baseDelay=200, factor=1.5 の有効性
  - 期待される動作: 200, 300, 450, 675(ms) を丸め返却
- 入力値: baseDelay=200, factor=1.5, attempts=[0,1,2,3]
  - 入力データの意味: 利用者設定変更時の計算妥当性
- 期待される結果: [200, 300, 450, 675]
  - 期待結果の理由: 指数計算とMath.roundの仕様
- テストの目的: 設定変更時の一貫性
  - 確認ポイント: 浮動小数の丸め挙動
  - 信頼性: 🟡 仕様は一般則、丸めは実装依存確認（retry-engine.tsに準拠）

- テスト名: shouldRetry は attempts < maxRetries の間だけ許可
  - 何をテストするか: maxRetries=2 の場合の判定
  - 期待される動作: attempts=0,1 は true、2 以降は false
- 入力値: maxRetries=2, attempts=[0,1,2,3]
  - 入力データの意味: 再試行回数上限の境界
- 期待される結果: [true,true,false,false]
  - 期待結果の理由: REQ-104（再試行上限）と実装仕様
- テストの目的: 上限ロジックの正当性
  - 確認ポイント: キャンセル時の強制falseは別テストで検証
  - 信頼性: 🟢 参照: REQ-104, retry-engine.ts

- テスト名: executeWithRetry 成功で即時値を返す（再試行なし）
  - 何をテストするか: 1回目成功時の挙動
  - 期待される動作: operation() の結果を返し、待機や追加attemptが行われない
- 入力値: 成功Promise(=42)
  - 入力データの意味: 最短経路
- 期待される結果: 42 を返却、タイマー未登録
  - 期待結果の理由: 再試行は失敗時のみ
- テストの目的: ハッピーケースの無駄な待機がないこと
  - 確認ポイント: activeTimeoutsが増えない（実装観点）
  - 信頼性: 🟡 実装読解に基づく（仕様上も妥当）

- テスト名: runWithRetry の基本ハンドル（promise/signal/cancel）
  - 何をテストするか: 戻り値の構造と連携
  - 期待される動作: promise解決/拒否、signal伝搬、cancelでAbortError
- 入力値: 成功/失敗operationのモック
  - 入力データの意味: APIの基本契約
- 期待される結果: 仕様通りにキャンセルや伝搬が動作
  - 期待結果の理由: インターフェース契約と実装
- テストの目的: 実運用での使い勝手を確認
  - 確認ポイント: external/internal signal の一貫動作
  - 信頼性: 🟡 実装読解とテストから抽出

---

## 2. 異常系テストケース（エラーハンドリング）

- テスト名: 最大再試行に達したら直近エラーでreject
  - エラーケースの概要: 失敗が続く場合
  - エラー処理の重要性: 永久ループや握り潰しの防止
- 入力値: base=50, factor=2, maxRetries=2, operation=常にreject('Operation failed')
  - 不正な理由: 連続エラーは想定異常
  - 実際の発生シナリオ: DOM操作/ダウンロード等の一時/恒久失敗
- 期待される結果: 最終的に 3回試行後に 'Operation failed' でreject
  - エラーメッセージの内容: 直近error messageを保持
  - システムの安全性: 余計なタイマーが残らない
- テストの目的: 上限到達時の終了動作
  - 品質保証の観点: 期待通りの打ち切りで資源リーク防止
  - 信頼性: 🟢 参照: REQ-104, 実装/既存テスト

- テスト名: 無効な設定はコンストラクタでTypeError
  - エラーケースの概要: baseDelay<0, factor<=0, maxRetries<0または非整数
  - エラー処理の重要性: 早期失敗で不正状態を防止
- 入力値: 各種不正パラメータ
  - 不正な理由: 設計上の許容範囲外
  - 実際の発生シナリオ: ユーザ設定/コードミス
- 期待される結果: TypeError 送出
  - エラーメッセージの内容: 型/範囲の妥当性エラー
  - システムの安全性: 実行前に失敗させる
- テストの目的: バリデーションの堅牢性
  - 品質保証の観点: 不正入力からの回復容易化
  - 信頼性: 🟢 参照: retry-engine.ts の入力検証

- テスト名: AbortSignal が事前にabortedなら即時AbortError
  - エラーケースの概要: 外部キャンセルが先行
  - エラー処理の重要性: 無駄な試行と副作用の回避
- 入力値: options.signal.aborted=true
  - 不正な理由: 実行前にキャンセル済
  - 実際の発生シナリオ: ユーザが直前でキャンセル
- 期待される結果: 直ちにAbortErrorでreject、operation未実行
  - エラーメッセージの内容: name=AbortError
  - システムの安全性: タイマー登録なし
- テストの目的: 先行キャンセルの尊重
  - 品質保証の観点: UI応答性と安全
  - 信頼性: 🟢 参照: executeWithRetryの冒頭分岐、既存テスト

- テスト名: 実行中キャンセルで待機解除しAbortError
  - エラーケースの概要: バックオフ待機中にキャンセル
  - エラー処理の重要性: 早期停止
- 入力値: runWithRetry開始→少し後にcancel()
  - 不正な理由: 継続不能
  - 実際の発生シナリオ: ユーザ中断
- 期待される結果: AbortErrorでreject、後続attemptしない
  - エラーメッセージの内容: name=AbortError
  - システムの安全性: タイマー解除
- テストの目的: キャンセル経路の確実性
  - 品質保証の観点: 中断の即時性
  - 信頼性: 🟢 参照: runWithRetry/cancel 実装と既存テスト

- テスト名: cancel() 後は shouldRetry=false かつ executeWithDelay は実行しない
  - エラーケースの概要: cancelフラグ下での誤動作
  - エラー処理の重要性: 二次副作用の防止
- 入力値: cancel() 後に各API呼び出し
  - 不正な理由: 無効状態
  - 実際の発生シナリオ: 途中中断後の誤API使用
- 期待される結果: shouldRetry=false, executeWithDelayはcallback未実行
  - エラーメッセージの内容: なし（状態検証）
  - システムの安全性: タイマー登録なし
- テストの目的: キャンセル状態の防御
  - 品質保証の観点: 状態機械の一貫性
  - 信頼性: 🟡 実装読解に基づく（外部仕様では暗黙）

---

## 3. 境界値テストケース（最小・最大・null等）

- テスト名: attempts が負/NaN の場合は 0 とみなす
  - 境界値の意味: attemptsのドメイン逸脱
  - 境界値での動作保証: 安全な既定計算
- 入力値: attempts=-5, NaN
  - 境界値選択の根拠: 実装でguard（Number.isFinite, <0）
  - 実際の使用場面: カウンタ初期化ミス
- 期待される結果: calculateDelay は baseDelay を返す
  - 境界での正確性: 0扱い
  - 一貫した動作: 正常系と連続
- テストの目的: 入力ロバスト性
  - 堅牢性の確認: 不正attemptsでも暴走しない
  - 信頼性: 🟢 参照: 実装ガード

- テスト名: maxRetries=0 の場合は一切リトライしない
  - 境界値の意味: 最小上限
  - 境界値での動作保証: 0回リトライ
- 入力値: maxRetries=0, attempts=[0,1]
  - 境界値選択の根拠: shouldRetryの比較式
  - 実際の使用場面: 即時失敗の方針
- 期待される結果: shouldRetry は常に false
  - 境界での正確性: 0との比較
  - 一貫した動作: 上限仕様
- テストの目的: 上限ゼロの特例を保証
  - 堅牢性の確認: 無駄な待機なし
  - 信頼性: 🟢 参照: 実装および既存テスト

- テスト名: external AbortSignal と internal signal の伝搬
  - 境界値の意味: 外部/内部の競合
  - 境界値での動作保証: 片方のabortが他方へ伝搬
- 入力値: runWithRetry(op, { signal: external.signal })、外部abort
  - 境界値選択の根拠: 競合状態での一貫性
  - 実際の使用場面: 上位キャンセルの伝播
- 期待される結果: 最終的にAbortError、operationはabortイベントを受領
  - 境界での正確性: 片方のみabortでも十分
  - 一貫した動作: 双方のリスナー解放
- テストの目的: signal配線の健全性
  - 堅牢性の確認: メモリリーク防止（リスナー解除）
  - 信頼性: 🟡 実装読解に基づく（EARS直接の記述なし）

---

## 参照（要件・設計）
- 参照したEARS要件: REQ-104（再試行上限）, NFR-001/002（性能目標の背後要素としての待機・応答性）, NFR-103（安全な入力/サニタイズの観点で設定検証）
- 参照した設計文書:
  - architecture.md: バックオフ設定（baseDelay=500ms, factor=2.0, 上限=5）
  - interfaces.ts: Settings.retry { maxAttempts, baseDelayMs, factor }
  - dataflow.md: エラー時のバックオフ再試行シーケンス
  - docs/implements/TASK-032/*: 実装メモとTDD経緯
  - src/utils/retry-engine.ts, src/utils/retry-engine.test.ts: 既存実装とテスト

---

## 品質判定（テストケース）
✅ 高品質
- テストケース分類: 正常系・異常系・境界値を網羅
- 期待値定義: 具体的・根拠明確（設計/実装/要件に紐付け）
- 技術選択: TypeScript + Vitest に確定
- 実装可能性: 既存の技術スタックで即時実装可能

## 次のステップ
- 次のお勧めステップ: `/tdd-red` でRedフェーズ（失敗テスト作成）を開始します。
