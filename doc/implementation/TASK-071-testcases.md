# TDDテストケース - TASK-071: オフライン/復帰ハンドリング

## 開発言語・フレームワーク

- **プログラミング言語**: TypeScript
  - **言語選択の理由**: 既存プロジェクトの技術スタックに準拠、型安全性によるネットワーク状態管理の品質向上
  - **テストに適した機能**: 型定義による明確なインターフェース、Chrome Extension API の型サポート
- **テストフレームワーク**: Vitest
  - **フレームワーク選択の理由**: 既存プロジェクトで使用中、高速実行とESモジュール対応
  - **テスト実行環境**: Node.js環境でChrome API をモック化、navigator.onLineをシミュレート
- 🟢 **信頼性レベル**: 既存プロジェクトの技術スタック（package.json）に基づく

## 1. 正常系テストケース（基本的な動作）

### TC-071-001: ネットワーク状態変化の検出
- **テスト名**: オフライン状態変化を正しく検出し、適切なメッセージを送信する
  - **何をテストするか**: navigator.onLineの変化監視とofflineイベントの検出ロジック
  - **期待される動作**: NETWORK_STATE_CHANGED メッセージが送信され、状態変化が正確に記録される
- **入力値**:
  ```javascript
  {
    initialOnlineState: true,
    networkEvent: 'offline',
    navigatorOnLine: false,
    currentTime: 1699000000000
  }
  ```
  - **入力データの意味**: WiFi切断など典型的なオフライン状態への遷移を模擬
- **期待される結果**:
  ```typescript
  {
    type: 'NETWORK_STATE_CHANGED',
    isOnline: false,
    timestamp: 1699000000000,
    affectedJobs: ['job-1', 'job-2']
  }
  ```
  - **期待結果の理由**: 状態変化を正確に検出し、影響を受けるジョブを特定してメッセージ配信
- **テストの目的**: ネットワーク状態監視の基本機能が動作することを確認
  - **確認ポイント**: イベント検出の正確性、タイムスタンプの記録、影響ジョブの特定
- 🟢 **信頼性レベル**: 要件定義のNetworkStateMessage型定義に基づく

### TC-071-002: 実行中ジョブの一時停止
- **テスト名**: オフライン検出時に実行中ジョブを正しく一時停止する
  - **何をテストするか**: ジョブステータスの'running'から'paused'への状態変更と一時停止処理
  - **期待される動作**: ジョブの進行が停止し、一時停止時刻と理由が記録される
- **入力値**:
  ```typescript
  {
    runningJob: {
      id: 'job-456',
      status: 'running',
      progress: { current: 2, total: 5 },
      startedAt: 1699000000000
    },
    networkState: { isOnline: false }
  }
  ```
  - **入力データの意味**: 画像生成プロセスの途中（2/5枚完了）でネットワーク断線が発生した状況
- **期待される結果**:
  ```typescript
  {
    type: 'JOB_PAUSED',
    jobId: 'job-456',
    reason: 'network_offline',
    pausedAt: 1699000000000
  }
  ```
  - **期待結果の理由**: 正確な一時停止処理により、復旧時に適切な地点から再開可能
- **テストの目的**: ジョブ制御機能の正確性を確認
  - **確認ポイント**: ステータス変更のタイミング、進捗情報の保持、一時停止理由の記録
- 🟢 **信頼性レベル**: 要件定義のJobPausedMessage型定義に基づく

### TC-071-003: オンライン復帰時のジョブ再開
- **テスト名**: ネットワーク復旧後に一時停止したジョブを正しく再開する
  - **何をテストするか**: オンライン状態変化の検出とジョブ再開処理
  - **期待される動作**: JOB_RESUMED メッセージが送信され、ジョブが適切な地点から再開される
- **入力値**:
  ```typescript
  {
    pausedJob: {
      id: 'job-restore-001',
      status: 'paused',
      reason: 'network_offline',
      pausedAt: 1699000000000,
      progress: { current: 2, total: 5 }
    },
    networkState: { isOnline: true }
  }
  ```
  - **入力データの意味**: ネットワーク復旧により、一時停止されたジョブの再開処理を実行
- **期待される結果**:
  ```typescript
  {
    type: 'JOB_RESUMED',
    jobId: 'job-restore-001',
    reason: 'network_restored',
    resumedAt: 1699000005000
  }
  ```
  - **期待結果の理由**: 正確な再開処理により、作業の継続性を保証
- **テストの目的**: ジョブ復元・再開機能の正確性を確認
  - **確認ポイント**: 再開メッセージの送信、再開理由の記録、タイムスタンプの精度
- 🟢 **信頼性レベル**: 要件定義のJobResumedMessage型定義に基づく

### TC-071-004: メッセージルータとの統合
- **テスト名**: ネットワーク状態変化メッセージがメッセージルータ経由で正しく配信される
  - **何をテストするか**: 既存のTASK-031メッセージルータとの統合動作
  - **期待される動作**: ネットワーク状態メッセージが適切なコンポーネントに配信される
- **入力値**:
  ```typescript
  {
    message: {
      type: 'NETWORK_STATE_CHANGED',
      isOnline: false,
      timestamp: 1699000000000
    },
    targetComponents: ['popup', 'content-script']
  }
  ```
  - **入力データの意味**: ネットワーク状態変化を複数コンポーネントに通知する必要がある状況
- **期待される結果**:
  ```typescript
  {
    deliveryResults: [
      { target: 'popup', success: true },
      { target: 'content-script', success: true }
    ],
    totalDelivered: 2
  }
  ```
  - **期待結果の理由**: 既存メッセージングインフラとの完全な統合を保証
- **テストの目的**: 既存システムとの統合性を確認
  - **確認ポイント**: メッセージ形式の互換性、配信の成功率、エラーハンドリング
- 🟡 **信頼性レベル**: 既存messagingRouter実装から妥当な推測

### TC-071-005: 複数ジョブの段階的再開
- **テスト名**: 複数のジョブが一時停止中の場合に段階的に再開する
  - **何をテストするか**: RetryEngineとの統合による負荷分散再開機能
  - **期待される動作**: 複数ジョブが一度に再開されず、適切な間隔で段階的に処理される
- **入力値**:
  ```typescript
  {
    pausedJobs: [
      { id: 'job-1', pausedAt: 1699000000000 },
      { id: 'job-2', pausedAt: 1699000001000 },
      { id: 'job-3', pausedAt: 1699000002000 }
    ],
    retrySettings: { baseDelay: 500, factor: 2.0 }
  }
  ```
  - **入力データの意味**: 複数ジョブが同時期に一時停止され、ネットワーク復旧時に再開が必要
- **期待される結果**:
  ```typescript
  {
    resumeSchedule: [
      { jobId: 'job-1', delayMs: 0 },
      { jobId: 'job-2', delayMs: 500 },
      { jobId: 'job-3', delayMs: 1000 }
    ],
    totalJobs: 3
  }
  ```
  - **期待結果の理由**: 負荷分散により、システムの安定性とパフォーマンスを確保
- **テストの目的**: 負荷制御機能の動作を確認
  - **確認ポイント**: 再開間隔の適切性、RetryEngineとの統合、システム負荷の制御
- 🟡 **信頼性レベル**: TASK-032リトライエンジン仕様から妥当な推測

## 2. 異常系テストケース（エラーハンドリング）

### TC-071-101: ネットワーク状態検出失敗
- **テスト名**: navigator.onLineが利用できない場合のフォールバック処理
  - **エラーケースの概要**: navigator.onLineプロパティが未定義またはアクセス不可の環境
  - **エラー処理の重要性**: 古いブラウザや特殊環境での安定動作を保証
- **入力値**:
  ```javascript
  {
    navigator: { onLine: undefined },
    window: { addEventListener: null },
    environment: 'unsupported_browser'
  }
  ```
  - **不正な理由**: ブラウザAPIの未サポートまたは制限された環境
  - **実際の発生シナリオ**: 古いChromeバージョンや企業プロキシ環境での制限
- **期待される結果**:
  ```typescript
  {
    fallbackMode: true,
    assumedState: 'online',
    warning: 'Network detection not available, assuming online state',
    monitoringDisabled: true
  }
  ```
  - **エラーメッセージの内容**: 技術的状況とフォールバック動作の明確な説明
  - **システムの安全性**: オンライン状態を仮定することで、機能の継続使用を優先
- **テストの目的**: API未サポート環境での安全なフォールバック動作を確認
  - **品質保証の観点**: 環境制約に対する耐性とシステムの継続動作能力を保証
- 🟡 **信頼性レベル**: ブラウザ互換性要件から推測

### TC-071-102: ジョブ一時停止処理の失敗
- **テスト名**: ジョブ一時停止処理に失敗した場合のエラーハンドリング
  - **エラーケースの概要**: ジョブの状態変更やストレージ保存の失敗
  - **エラー処理の重要性**: データ整合性とシステムの安定性を維持
- **入力値**:
  ```typescript
  {
    runningJob: { id: 'job-error-001', status: 'running' },
    storageError: new Error('Storage quota exceeded'),
    jobUpdateError: new Error('Job state update failed')
  }
  ```
  - **不正な理由**: ストレージ容量不足やジョブ管理システムの異常
  - **実際の発生シナリオ**: Chrome拡張のストレージ制限到達や同期エラー
- **期待される結果**:
  ```typescript
  {
    pauseResult: 'failed',
    fallbackAction: 'force_stop',
    errorLog: 'Job pause failed: Storage quota exceeded',
    jobStatus: 'error',
    userNotification: 'ジョブの一時停止に失敗しました。ジョブを停止します。'
  }
  ```
  - **エラーメッセージの内容**: 失敗の具体的理由と実行されたフォールバック処理
  - **システムの安全性**: 強制停止により、不整合状態の継続を防止
- **テストの目的**: ジョブ制御失敗時の安全なエラー処理を確認
  - **品質保証の観点**: データ整合性の保証とエラー状況での適切な復旧処理を検証
- 🟡 **信頼性レベル**: 一般的なストレージエラー処理要件から推測

### TC-071-103: ジョブ再開処理の失敗
- **テスト名**: ネットワーク復旧後のジョブ再開に失敗した場合のリトライ機構委譲
  - **エラーケースの概要**: 再開対象ジョブのデータ破損や実行環境の問題
  - **エラー処理の重要性**: 再開失敗時の適切な代替処理とユーザー通知
- **入力値**:
  ```typescript
  {
    pausedJob: { id: 'job-resume-error', status: 'paused', data: null },
    resumeError: new Error('Job data corrupted'),
    retryEngineAvailable: true
  }
  ```
  - **不正な理由**: ジョブデータの破損や依存リソースの不整合
  - **実際の発生シナリオ**: ストレージデータの部分的破損や拡張の再起動による状態喪失
- **期待される結果**:
  ```typescript
  {
    resumeResult: 'failed',
    delegatedTo: 'retry_engine',
    retryScheduled: true,
    maxRetries: 5,
    nextRetryAt: 1699000005000,
    userMessage: 'ジョブ再開に失敗しました。自動再試行を開始します。'
  }
  ```
  - **エラーメッセージの内容**: 失敗状況と後続の自動処理についての説明
  - **システムの安全性**: 既存リトライ機構への委譲により、回復可能性を最大化
- **テストの目的**: 再開失敗時の適切なエスカレーション処理を確認
  - **品質保証の観点**: 既存システムとの統合による回復能力の向上を検証
- 🟢 **信頼性レベル**: TASK-032リトライエンジン仕様に基づく

### TC-071-104: メッセージルータエラー時の直接通知
- **テスト名**: メッセージルータが利用できない場合の直接通知機能
  - **エラーケースの概要**: messagingRouterの初期化失敗や通信エラー
  - **エラー処理の重要性**: インフラ障害時でも重要な状態変化を通知
- **入力値**:
  ```typescript
  {
    networkStateChange: { isOnline: false, timestamp: 1699000000000 },
    messagingRouterError: new Error('Router initialization failed'),
    directNotificationTargets: ['popup']
  }
  ```
  - **不正な理由**: メッセージルータの依存エラーや初期化タイミング問題
  - **実際の発生シナリオ**: 拡張の部分的読み込み失敗や権限制限による機能制約
- **期待される結果**:
  ```typescript
  {
    routerUsed: false,
    directNotificationSent: true,
    notificationTargets: ['popup'],
    fallbackMethod: 'chrome.runtime.sendMessage',
    deliveryConfirmed: true
  }
  ```
  - **エラーメッセージの内容**: ルータ障害と直接通知への切り替えについての詳細
  - **システムの安全性**: 代替通信手段により、重要な情報の伝達を保証
- **テストの目的**: インフラ障害時の代替通信機能を確認
  - **品質保証の観点**: システムの冗長性と障害耐性の実現を検証
- 🟡 **信頼性レベル**: 拡張システムの障害対応要件から推測

## 3. 境界値テストケース（最小値、最大値、null等）

### TC-071-201: フラッピング防止の5秒閾値
- **テスト名**: 5秒以内の連続状態変化を無視するフラッピング防止機能の境界値テスト
  - **境界値の意味**: 真の状態変化と一時的な接続不安定を区別する最小閾値
  - **境界値での動作保証**: 4.9秒は無視、5.0秒以上で検出する一貫した動作
- **入力値**:
  ```javascript
  [
    { duration: 4900, shouldIgnore: true },
    { duration: 5000, shouldDetect: true },
    { duration: 5100, shouldDetect: true }
  ]
  ```
  - **境界値選択の根拠**: 要件定義で指定された5秒安定化要件
  - **実際の使用場面**: WiFi接続の一時的断続やモバイル接続切り替え時の短時間変動
- **期待される結果**:
  ```typescript
  {
    duration_4900ms: { detected: false, reason: 'flapping_prevention' },
    duration_5000ms: { detected: true, reason: 'threshold_met' },
    duration_5100ms: { detected: true, reason: 'stable_state' }
  }
  ```
  - **境界での正確性**: 閾値ちょうどでの動作が仕様通りに実行される
  - **一貫した動作**: 境界値前後での判定ロジックに矛盾がない
- **テストの目的**: フラッピング防止機能の精度を確認
  - **堅牢性の確認**: 不安定なネットワーク環境での誤検出防止能力を検証
- 🟢 **信頼性レベル**: 要件定義のフラッピング防止仕様（5秒閾値）に基づく

### TC-071-202: 監視周期の1秒間隔上限
- **テスト名**: navigator.onLineポーリングの最大1秒間隔制御の境界値テスト
  - **境界値の意味**: パフォーマンスへの影響を抑制する監視周期の上限
  - **境界値での動作保証**: 1秒を超えない間隔で監視が実行される
- **入力値**:
  ```typescript
  {
    monitoringIntervals: [900, 1000, 1100],
    expectedBehavior: ['allowed', 'allowed', 'capped_to_1000']
  }
  ```
  - **境界値選択の根拠**: 要件定義で指定された最大1秒間隔制約
  - **実際の使用場面**: 高頻度でのネットワーク状態確認が必要な不安定環境
- **期待される結果**:
  ```typescript
  {
    interval_900ms: { applied: 900, acceptable: true },
    interval_1000ms: { applied: 1000, acceptable: true },
    interval_1100ms: { applied: 1000, capped: true, warning: 'Interval capped to 1000ms' }
  }
  ```
  - **境界での正確性**: 1秒ちょうどでの制御が正確に動作する
  - **一貫した動作**: 上限超過時の適切な制限機能が動作する
- **テストの目的**: パフォーマンス制約の遵守を確認
  - **堅牢性の確認**: CPU使用率とバッテリー消費への配慮を検証
- 🟡 **信頼性レベル**: 要件定義のパフォーマンス要件から推測

### TC-071-203: 同時復旧制御の複数ジョブ境界値
- **テスト名**: 最大同時復旧ジョブ数制御の境界値テスト
  - **境界値の意味**: システム負荷を制御する同時処理数の限界
  - **境界値での動作保証**: 制限数を超える場合の適切な待機制御
- **入力値**:
  ```typescript
  {
    pausedJobCounts: [3, 5, 7],
    maxConcurrentResume: 5,
    expectedBehavior: ['all_immediate', 'all_immediate', 'batched_resume']
  }
  ```
  - **境界値選択の根拠**: システム負荷とパフォーマンスのバランス
  - **実際の使用場面**: 大量ジョブ実行中の長時間ネットワーク障害からの復旧
- **期待される結果**:
  ```typescript
  {
    jobs_3: { immediate: 3, queued: 0, batchCount: 1 },
    jobs_5: { immediate: 5, queued: 0, batchCount: 1 },
    jobs_7: { immediate: 5, queued: 2, batchCount: 2 }
  }
  ```
  - **境界での正確性**: 制限数での制御が正確に動作する
  - **一貫した動作**: 超過時のバッチ処理が適切に実行される
- **テストの目的**: 負荷制御機能の動作を確認
  - **堅牢性の確認**: 大量ジョブ処理時のシステム安定性を検証
- 🟡 **信頼性レベル**: システム負荷制御の一般的要件から推測

### TC-071-204: null/undefined入力値での安全な処理
- **テスト名**: 予期しないnull/undefined値に対する安全な処理の境界値テスト
  - **境界値の意味**: 入力データの最も極端なケース（値の不存在）
  - **境界値での動作保証**: null/undefinedでもシステムが異常終了せず、適切なデフォルト動作で継続
- **入力値**:
  ```typescript
  {
    testCases: [
      { jobId: null, expectedBehavior: 'skip_processing' },
      { jobId: undefined, expectedBehavior: 'skip_processing' },
      { networkState: null, expectedBehavior: 'assume_online' },
      { timestamp: undefined, expectedBehavior: 'use_current_time' }
    ]
  }
  ```
  - **境界値選択の根拠**: JavaScript/TypeScriptにおける値の不存在を表す基本的なパターン
  - **実際の使用場面**: API応答の遅延、データ同期エラー、初期化前のアクセス
- **期待される結果**:
  ```typescript
  {
    null_jobId: { handled: true, action: 'skipped', safe: true },
    undefined_jobId: { handled: true, action: 'skipped', safe: true },
    null_networkState: { handled: true, fallback: 'online', safe: true },
    undefined_timestamp: { handled: true, fallback: 'Date.now()', safe: true }
  }
  ```
  - **境界での正確性**: null/undefined の区別なく安全に処理される
  - **一貫した動作**: 全ての入力フィールドで統一されたnull安全性を保証
- **テストの目的**: null安全性とシステムの堅牢性を確認
  - **堅牢性の確認**: 予期しない入力に対するシステムの防御能力を検証
- 🟡 **信頼性レベル**: 一般的なプログラミングベストプラクティスから推測

## 品質判定

✅ **高品質**:
- **テストケース分類**: 正常系（5ケース）・異常系（4ケース）・境界値（4ケース）が網羅されている
- **期待値定義**: 各テストケースで具体的な入出力データと期待結果が明確に定義されている
- **技術選択**: TypeScript + Vitest は既存プロジェクトと一致し、実装可能性が確実
- **実装可能性**: 既存のTASK-031（メッセージルータ）、TASK-032（リトライエンジン）の基盤を活用可能

## TODO更新

- テストケース洗い出しフェーズ完了
- 正常系・異常系・境界値の全分類で詳細テストケース定義済み
- 品質判定結果: 高品質（実装準備完了）

**次のお勧めステップ**: `/tdd-red` でRedフェーズ（失敗テスト作成）を開始します。