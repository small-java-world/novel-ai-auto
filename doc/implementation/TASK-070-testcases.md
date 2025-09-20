# TDDテストケース - TASK-070: ログイン要求の検出と再開

## 開発言語・フレームワーク

- **プログラミング言語**: TypeScript
  - **言語選択の理由**: 既存プロジェクトの技術スタックに準拠、型安全性による品質向上
  - **テストに適した機能**: 型定義による明確なインターフェース、Chrome Extension API の型サポート
- **テストフレームワーク**: Vitest
  - **フレームワーク選択の理由**: 既存プロジェクトで使用中、高速実行とESモジュール対応
  - **テスト実行環境**: Node.js環境でChrome API をモック化して実行
- 🟢 **信頼性レベル**: 既存プロジェクトの技術スタック（package.json）に基づく

## 1. 正常系テストケース（基本的な動作）

### TC-070-001: ログイン要求DOM要素の検出
- **テスト名**: ログインフォームが表示された場合にログイン要求を正しく検出する
  - **何をテストするか**: DOM上にログインフォームが表示された際の検出ロジック
  - **期待される動作**: LOGIN_REQUIRED メッセージが送信され、現在のジョブIDが含まれる
- **入力値**:
  ```html
  <form class="login-form">
    <input type="email" name="email">
    <input type="password" name="password">
    <button type="submit">ログイン</button>
  </form>
  ```
  - **入力データの意味**: NovelAI の標準的なログインフォーム構造を模擬
- **期待される結果**:
  ```typescript
  {
    type: 'LOGIN_REQUIRED',
    currentJobId: 'test-job-123',
    detectedAt: 1699000000000,
    redirectUrl: 'https://novelai.net/login'
  }
  ```
  - **期待結果の理由**: 実行中のジョブを特定し、復帰時に正確な再開が可能になる
- **テストの目的**: ログイン要求の基本検出機能が動作することを確認
  - **確認ポイント**: DOM要素の存在確認、メッセージ形式の妥当性、ジョブID の正確性
- 🟢 **信頼性レベル**: 要件定義のLoginRequiredMessage型定義に基づく

### TC-070-002: 実行中ジョブの一時停止
- **テスト名**: ログイン要求検出時に実行中ジョブを正しく一時停止する
  - **何をテストするか**: ジョブステータスの'running'から'paused'への状態変更
  - **期待される動作**: ジョブの進行が停止し、現在位置が保存される
- **入力値**:
  ```typescript
  {
    id: 'job-456',
    status: 'running',
    progress: { current: 3, total: 10 },
    resumePoint: 'generation_start'
  }
  ```
  - **入力データの意味**: 画像生成プロセスの途中（3/10枚完了）でログアウトが発生した状況
- **期待される結果**:
  ```typescript
  {
    id: 'job-456',
    status: 'paused',
    progress: { current: 3, total: 10 },
    resumePoint: 'generation_start',
    pausedAt: 1699000000000
  }
  ```
  - **期待結果の理由**: 正確な進捗保存により、再開時に重複作業を避ける
- **テストの目的**: ジョブ制御機能の正確性を確認
  - **確認ポイント**: ステータス変更のタイミング、進捗情報の保持、再開ポイントの記録
- 🟢 **信頼性レベル**: types.ts の GenerationJob インターフェースに基づく

### TC-070-003: ジョブ状態のストレージ保存
- **テスト名**: 一時停止したジョブ状態をchrome.storageに正しく保存する
  - **何をテストするか**: ジョブ状態の永続化処理とストレージAPI の呼び出し
  - **期待される動作**: chrome.storage.local.set が正しいデータ形式で呼び出される
- **入力値**:
  ```typescript
  {
    pausedJob: {
      id: 'job-789',
      status: 'paused',
      prompt: 'beautiful landscape',
      parameters: { steps: 28, cfgScale: 7 }
    }
  }
  ```
  - **入力データの意味**: 一時停止が必要な完全なジョブ情報
- **期待される結果**:
  ```typescript
  chrome.storage.local.set.calledWith({
    'paused_jobs': [{
      id: 'job-789',
      status: 'paused',
      pausedAt: expect.any(Number)
    }]
  })
  ```
  - **期待結果の理由**: ブラウザ再起動後も状態を復元可能にする
- **テストの目的**: データ永続化の信頼性を確認
  - **確認ポイント**: ストレージAPI の正しい使用、データ形式の妥当性、エラーハンドリング
- 🟢 **信頼性レベル**: Chrome Storage API 仕様と既存ストレージ実装に基づく

### TC-070-004: ログイン完了の検出
- **テスト名**: ログイン完了後にNovelAI メインページへの遷移を検出する
  - **何をテストするか**: URLの変化とPageState.isLoggedIn の状態変化監視
  - **期待される動作**: ログイン状態がtrue に変わり、保存されたジョブの復元処理が開始される
- **入力値**:
  ```typescript
  {
    previousUrl: 'https://novelai.net/login',
    currentUrl: 'https://novelai.net/',
    pageState: { isLoggedIn: true, hasPromptInput: true }
  }
  ```
  - **入力データの意味**: ログイン完了によるページ遷移とDOM状態の変化
- **期待される結果**:
  ```typescript
  {
    type: 'LOGIN_COMPLETED',
    detectedAt: expect.any(Number),
    availableForResume: true
  }
  ```
  - **期待結果の理由**: ジョブ再開が可能な状態であることを明確に示す
- **テストの目的**: ログイン完了検出の精度を確認
  - **確認ポイント**: URL変化の監視、DOM要素の存在確認、ページ状態の正確な判定
- 🟡 **信頼性レベル**: NovelAI のURL構造とPageState定義から推測

### TC-070-005: 保存されたジョブの復元と再開
- **テスト名**: ログイン完了後に保存されたジョブを正しく復元し、適切なポイントから再開する
  - **何をテストするか**: ストレージからのジョブ復元と再開メッセージの送信
  - **期待される動作**: RESUME_JOB メッセージが送信され、適切なresumePoint が指定される
- **入力値**:
  ```typescript
  {
    pausedJob: {
      id: 'job-restore-001',
      status: 'paused',
      resumePoint: 'generation_start',
      progress: { current: 2, total: 5 }
    }
  }
  ```
  - **入力データの意味**: 以前に一時停止されたジョブの完全な状態情報
- **期待される結果**:
  ```typescript
  {
    type: 'RESUME_JOB',
    jobId: 'job-restore-001',
    resumePoint: 'generation_start'
  }
  ```
  - **期待結果の理由**: 正確な再開ポイントにより、効率的な処理継続が可能
- **テストの目的**: ジョブ復元機能の正確性を確認
  - **確認ポイント**: ストレージからの正しいデータ読み取り、メッセージ形式の妥当性、再開ポイントの精度
- 🟢 **信頼性レベル**: 要件定義のJobResumeMessage型定義に基づく

## 2. 異常系テストケース（エラーハンドリング）

### TC-070-101: ログイン判定用DOM要素の未検出
- **テスト名**: ログイン判定に必要なDOM要素が見つからない場合のフォールバック処理
  - **エラーケースの概要**: NovelAI のUI変更により、期待するセレクタでログイン要素が見つからない状況
  - **エラー処理の重要性**: 誤検出によるジョブの不要な停止を防ぎ、安定した動作を保証
- **入力値**:
  ```html
  <div class="unknown-structure">
    <!-- 期待するログイン要素が存在しない -->
    <span>Loading...</span>
  </div>
  ```
  - **不正な理由**: 既知のログインフォーム構造と一致しない
  - **実際の発生シナリオ**: NovelAI のUI更新やA/Bテストによるページ構造変更
- **期待される結果**:
  ```typescript
  {
    loginDetected: false,
    fallbackResult: 'assume_logged_in',
    warning: 'Login detection elements not found, assuming logged in state'
  }
  ```
  - **エラーメッセージの内容**: 技術的詳細とユーザー影響の両方を含む分かりやすい内容
  - **システムの安全性**: ログイン済み状態を仮定することで、ジョブの継続実行を優先
- **テストの目的**: DOM要素未検出時の安全なフォールバック動作を確認
  - **品質保証の観点**: UI変更への耐性とシステムの継続動作能力を保証
- 🟡 **信頼性レベル**: TASK-020のDOM selector strategy のフォールバック機能から推測

### TC-070-102: chrome.storage API のアクセス失敗
- **テスト名**: ストレージ保存に失敗した場合のメモリ内フォールバック処理
  - **エラーケースの概要**: ストレージ容量不足やAPIエラーによる永続化失敗
  - **エラー処理の重要性**: データ損失を防ぎ、セッション内での機能継続を保証
- **入力値**:
  ```typescript
  {
    storageError: new Error('QUOTA_EXCEEDED_ERR'),
    jobData: { id: 'job-error-001', status: 'paused' }
  }
  ```
  - **不正な理由**: Chrome拡張のストレージ容量制限超過
  - **実際の発生シナリオ**: 大量のログデータやジョブ履歴による容量制限到達
- **期待される結果**:
  ```typescript
  {
    storageResult: 'failed',
    fallbackResult: 'memory_only',
    warning: 'Storage failed, job state kept in memory only',
    memoryState: { jobId: 'job-error-001', tempStatus: 'paused' }
  }
  ```
  - **エラーメッセージの内容**: ストレージ失敗の具体的理由とフォールバック状態の説明
  - **システムの安全性**: メモリ内状態保持により、セッション継続中は機能を維持
- **テストの目的**: ストレージ障害時の代替手段の動作を確認
  - **品質保証の観点**: システムの障害耐性と段階的デグラデーション機能を検証
- 🟡 **信頼性レベル**: 要件定義のエラーケースと Chrome API制限から推測

### TC-070-103: NovelAI タブのアクティブ化失敗
- **テスト名**: タブ制御API の失敗時にユーザーへの手動操作促進メッセージを表示
  - **エラーケースの概要**: chrome.tabs.update の権限不足やタブの無効状態
  - **エラー処理の重要性**: ユーザーに適切な代替手段を提示し、処理継続の道筋を示す
- **入力値**:
  ```typescript
  {
    tabError: new Error('Tab not found or invalid'),
    targetTabId: 123,
    requiredAction: 'activate_novelai_tab'
  }
  ```
  - **不正な理由**: タブが既に閉じられているか、権限制限により操作不可
  - **実際の発生シナリオ**: ユーザーが手動でタブを閉じた、またはChrome拡張の権限変更
- **期待される結果**:
  ```typescript
  {
    tabResult: 'failed',
    userAction: 'manual_required',
    message: 'NovelAIタブを手動で開いてログインしてください',
    instructions: ['NovelAI (https://novelai.net) を開く', 'ログイン完了後、拡張アイコンをクリック']
  }
  ```
  - **エラーメッセージの内容**: 具体的な手順を含む、ユーザーにとって実行可能な指示
  - **システムの安全性**: 自動復旧失敗時も、手動による処理継続パスを提供
- **テストの目的**: タブ制御失敗時のユーザーガイダンス機能を確認
  - **品質保証の観点**: ユーザビリティと処理継続性のバランスを検証
- 🟡 **信頼性レベル**: TASK-030のタブ管理機能とChrome API制限から推測

### TC-070-104: 無効なジョブ状態での復元試行
- **テスト名**: 破損または不完全なジョブデータでの復元処理のエラーハンドリング
  - **エラーケースの概要**: ストレージから読み取ったジョブデータが不正または不完全
  - **エラー処理の重要性**: 不正データによるシステム異常を防ぎ、安全な初期化を実行
- **入力値**:
  ```typescript
  {
    corruptedJob: {
      id: null,
      status: 'unknown_status',
      progress: { current: -1, total: 'invalid' }
    }
  }
  ```
  - **不正な理由**: 必須フィールドの欠損と型不整合
  - **実際の発生シナリオ**: ストレージデータの部分的破損や、異なるバージョン間での非互換性
- **期待される結果**:
  ```typescript
  {
    validationResult: 'failed',
    action: 'skip_restoration',
    message: '保存されたジョブデータが無効のため、新規開始してください',
    cleanupResult: 'corrupted_data_removed'
  }
  ```
  - **エラーメッセージの内容**: 問題の説明と推奨される次のアクション
  - **システムの安全性**: 不正データの除去と、クリーンな状態での新規開始
- **テストの目的**: データバリデーションとエラー回復機能を確認
  - **品質保証の観点**: データ整合性の保証とシステムの自己修復能力を検証
- 🟡 **信頼性レベル**: 一般的なデータバリデーション要件から推測

## 3. 境界値テストケース（最小値、最大値、null等）

### TC-070-201: ログイン要求検出の最小継続時間（500ms）
- **テスト名**: ログイン要求状態が500ms継続した場合にのみ検出する境界値テスト
  - **境界値の意味**: 一時的な画面表示とログイン要求の区別を行う最小閾値
  - **境界値での動作保証**: 499ms以下は無視、500ms以上で検出する一貫した動作
- **入力値**:
  ```typescript
  [
    { duration: 499, shouldDetect: false },
    { duration: 500, shouldDetect: true },
    { duration: 501, shouldDetect: true }
  ]
  ```
  - **境界値選択の根拠**: 要件定義で指定された誤検出防止のための最小閾値
  - **実際の使用場面**: API遅延やページ読み込み中の一時的なログイン画面表示
- **期待される結果**:
  ```typescript
  {
    duration_499ms: { detected: false, reason: 'below_threshold' },
    duration_500ms: { detected: true, reason: 'threshold_met' },
    duration_501ms: { detected: true, reason: 'above_threshold' }
  }
  ```
  - **境界での正確性**: 閾値ちょうどでの動作が仕様通りに実行される
  - **一貫した動作**: 境界値前後での判定ロジックに矛盾がない
- **テストの目的**: 誤検出防止機能の精度を確認
  - **堅牢性の確認**: タイミング依存処理の安定性と信頼性を検証
- 🟢 **信頼性レベル**: 要件定義の誤検出防止仕様（500ms継続条件）に基づく

### TC-070-202: エラー検出回数の上限値（10分間で5回）
- **テスト名**: 短時間内の連続ログイン要求検出における異常判定の境界値テスト
  - **境界値の意味**: 正常な再試行と異常なループ状態を区別する閾値
  - **境界値での動作保証**: 4回までは正常、5回目で異常判定し自動再開を無効化
- **入力値**:
  ```typescript
  {
    timeWindow: 600000, // 10分間（ミリ秒）
    testCases: [
      { attempts: 4, withinWindow: true, shouldBlock: false },
      { attempts: 5, withinWindow: true, shouldBlock: true },
      { attempts: 6, withinWindow: true, shouldBlock: true }
    ]
  }
  ```
  - **境界値選択の根拠**: 要件定義で指定された無限ループ防止のための上限設定
  - **実際の使用場面**: ログイン認証の連続失敗やセッション管理の異常
- **期待される結果**:
  ```typescript
  {
    attempts_4: { blocked: false, autoResumeEnabled: true },
    attempts_5: { blocked: true, autoResumeEnabled: false, reason: 'rate_limit_exceeded' },
    attempts_6: { blocked: true, autoResumeEnabled: false, reason: 'rate_limit_exceeded' }
  }
  ```
  - **境界での正確性**: 正確に5回目で制限が発動する
  - **一貫した動作**: 制限発動後は一貫して自動再開を無効化
- **テストの目的**: レート制限機能の正確性を確認
  - **堅牢性の確認**: 異常な使用パターンに対するシステム保護機能を検証
- 🟢 **信頼性レベル**: 要件定義の無限ループ防止仕様（10分間で5回上限）に基づく

### TC-070-203: タイムアウト境界での処理（検出から通知まで1秒）
- **テスト名**: ログイン要求検出から通知までの処理時間1秒以内の境界値テスト
  - **境界値の意味**: ユーザー体験を損なわない応答性の保証時間
  - **境界値での動作保証**: 1000ms以内での通知完了、超過時の警告出力
- **入力値**:
  ```typescript
  {
    detectionStartTime: 0,
    testScenarios: [
      { processingTime: 999, expectSuccess: true },
      { processingTime: 1000, expectSuccess: true, expectWarning: false },
      { processingTime: 1001, expectSuccess: true, expectWarning: true }
    ]
  }
  ```
  - **境界値選択の根拠**: 要件定義で指定されたパフォーマンス要件（1秒以内）
  - **実際の使用場面**: DOM解析、メッセージ送信、ストレージアクセスの合計処理時間
- **期待される結果**:
  ```typescript
  {
    time_999ms: { completed: true, warning: false, withinSLA: true },
    time_1000ms: { completed: true, warning: false, withinSLA: true },
    time_1001ms: { completed: true, warning: true, withinSLA: false }
  }
  ```
  - **境界での正確性**: 1秒ちょうどでの処理が正常に完了する
  - **一貫した動作**: 制限時間超過時の警告機能が正しく動作する
- **テストの目的**: パフォーマンス要件の遵守を確認
  - **堅牢性の確認**: 処理時間の監視と品質保証機能を検証
- 🟡 **信頼性レベル**: 要件定義のパフォーマンス要件から推測

### TC-070-204: null/undefined 入力値での安全な処理
- **テスト名**: 予期しないnull/undefined値に対する安全な処理の境界値テスト
  - **境界値の意味**: 入力データの最も極端なケース（値の不存在）
  - **境界値での動作保証**: null/undefinedでもシステムが異常終了せず、適切なデフォルト値で継続
- **入力値**:
  ```typescript
  {
    testCases: [
      { jobId: null, expectedBehavior: 'use_default_or_skip' },
      { jobId: undefined, expectedBehavior: 'use_default_or_skip' },
      { currentUrl: null, expectedBehavior: 'use_empty_string' },
      { pageState: undefined, expectedBehavior: 'use_default_state' }
    ]
  }
  ```
  - **境界値選択の根拠**: JavaScript/TypeScriptにおける値の不存在を表す基本的なパターン
  - **実際の使用場面**: API応答の遅延、ストレージデータの部分的破損、初期化前のアクセス
- **期待される結果**:
  ```typescript
  {
    null_jobId: { handled: true, fallback: 'generated_temp_id' },
    undefined_jobId: { handled: true, fallback: 'generated_temp_id' },
    null_currentUrl: { handled: true, fallback: '' },
    undefined_pageState: { handled: true, fallback: 'default_logged_out_state' }
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
- **実装可能性**: 既存のTASK-020（DOM selector）、TASK-030（tab manager）の基盤を活用可能

## TODO更新

- テストケース洗い出しフェーズ完了
- 正常系・異常系・境界値の全分類で詳細テストケース定義済み
- 品質判定結果: 高品質（実装準備完了）

**次のお勧めステップ**: `/tdd-red` でRedフェーズ（失敗テスト作成）を開始します。