# TASK-070 Red Phase 実装詳細

## Red フェーズ概要

**実装日時**: 2025-09-18 22:32
**ステータス**: ✅ 完了（期待通りの失敗を確認）
**次フェーズ**: Green フェーズ（最小実装）準備完了

## 作成したテストファイル

**ファイル名**: `src/utils/login-detection-manager.red.test.ts`
**総行数**: 524行
**テストケース数**: 13ケース

### テスト分類と内容

#### 1. 正常系テストケース（5ケース）

| テストID | テスト名 | 検証内容 | 信頼性 |
|----------|----------|----------|--------|
| TC-070-001 | ログインフォーム検出 | DOM上のログインフォームを検出しLOGIN_REQUIREDメッセージ送信 | 🟢 |
| TC-070-002 | ジョブ一時停止 | 実行中ジョブのstatus変更（running→paused） | 🟢 |
| TC-070-003 | 状態保存 | chrome.storageへのジョブ状態永続化 | 🟢 |
| TC-070-004 | ログイン完了検出 | URL変化とPageState監視でログイン完了を検出 | 🟡 |
| TC-070-005 | ジョブ復元・再開 | 保存されたジョブの復元とRESUME_JOBメッセージ送信 | 🟢 |

#### 2. 異常系テストケース（4ケース）

| テストID | テスト名 | 検証内容 | 信頼性 |
|----------|----------|----------|--------|
| TC-070-101 | DOM要素未検出 | ログイン判定用DOM要素が見つからない場合のフォールバック | 🟡 |
| TC-070-102 | ストレージ失敗 | chrome.storage API失敗時のメモリ内フォールバック | 🟡 |
| TC-070-103 | タブ制御失敗 | タブアクティブ化失敗時のユーザーガイダンス表示 | 🟡 |
| TC-070-104 | 無効データ処理 | 破損ジョブデータでの復元処理エラーハンドリング | 🟡 |

#### 3. 境界値テストケース（4ケース）

| テストID | テスト名 | 検証内容 | 信頼性 |
|----------|----------|----------|--------|
| TC-070-201 | 500ms継続閾値 | 誤検出防止のための最小継続時間境界値テスト | 🟢 |
| TC-070-202 | 10分間5回上限 | 無限ループ防止のためのレート制限境界値テスト | 🟢 |
| TC-070-203 | 1秒処理時間 | パフォーマンス要件（1秒以内）の境界値テスト | 🟡 |
| TC-070-204 | null/undefined安全性 | 予期しない入力値での安全処理境界値テスト | 🟡 |

## 期待される実装関数

### Core Functions

```typescript
// 【必須実装】: ログイン要求検出の中核機能
export function detectLoginRequired(currentJobId?: string): LoginDetectionResult {
  // DOM要素の検出とLOGIN_REQUIREDメッセージ生成
}

// 【必須実装】: 実行中ジョブの一時停止処理
export function pauseCurrentJob(runningJob: GenerationJob): JobPauseResult {
  // ジョブステータス変更（running → paused）と進捗保存
}

// 【必須実装】: ジョブ状態の永続化
export function saveJobState(pausedJob: PausedJob): Promise<SaveStateResult> {
  // chrome.storage.local への状態保存（エラーハンドリング含む）
}

// 【必須実装】: ログイン完了の検出
export function detectLoginCompleted(pageTransition: PageTransition): LoginCompletedResult {
  // URL変化とPageState監視でログイン完了判定
}

// 【必須実装】: 保存ジョブの復元・再開
export function resumeSavedJob(): Promise<JobResumeResult> {
  // ストレージからのジョブ復元とRESUME_JOBメッセージ送信
}
```

### Helper Class Methods

```typescript
export class LoginDetectionManager {
  // 【必須実装】: タブ制御失敗時の処理
  static handleTabActivationFailure(tabId: number, action: string): TabFailureResult

  // 【必須実装】: 継続時間を考慮した検出
  static detectWithDuration(jobId: string, duration: number): DetectionResult

  // 【必須実装】: レート制限チェック
  static checkRateLimit(attempts: number, timeWindow: number): RateLimitResult

  // 【必須実装】: タイムアウト付き検出
  static detectWithTimeout(jobId: string, timeout: number): TimeoutResult

  // 【必須実装】: URL変化の処理
  static handleUrlChange(url: string | null): UrlChangeResult
}
```

## 新しい型定義（types.ts への追加予定）

```typescript
// 【追加予定】: ログイン検出関連のメッセージ型
interface LoginRequiredMessage extends Message {
  type: 'LOGIN_REQUIRED';
  currentJobId?: string;
  detectedAt: number;
  redirectUrl: string;
}

interface JobResumeMessage extends Message {
  type: 'RESUME_JOB';
  jobId: string;
  resumePoint: 'prompt_application' | 'generation_start' | 'download_start';
}

interface LoginCompletedMessage extends Message {
  type: 'LOGIN_COMPLETED';
  detectedAt: number;
  availableForResume: boolean;
}

// 【追加予定】: 結果オブジェクト型
interface LoginDetectionResult {
  detected: boolean;
  message?: LoginRequiredMessage;
  fallbackResult?: string;
  warning?: string;
  reason?: string;
}

interface JobPauseResult {
  success: boolean;
  pausedJob: GenerationJob & { pausedAt: number };
}

interface SaveStateResult {
  storageResult: 'success' | 'failed';
  fallbackResult?: 'memory_only';
  warning?: string;
  memoryState?: any;
}

// その他必要な型定義...
```

## 現在の失敗状況（期待通り）

### 1. Import エラー
```
Error: Failed to resolve import "./login-detection-manager" from "src/utils/login-detection-manager.red.test.ts".
Does the file exist?
```

**理由**: `src/utils/login-detection-manager.ts` ファイルが存在しない（TDD Red フェーズでは意図的）

### 2. 期待される追加エラー（Green フェーズで解決予定）

実装ファイル作成後に期待される失敗：
- `detectLoginRequired is not a function`
- `pauseCurrentJob is not a function`
- `LoginDetectionManager is not defined`
- 型定義エラー（LoginDetectionResult等）

## Red フェーズの成功基準

✅ **テスト実行**: 失敗することを確認済み（import エラー）
✅ **期待値**: 13テストケースで明確で具体的な期待値を定義済み
✅ **アサーション**: 各テストで適切なexpectステートメントを配置済み
✅ **実装方針**: Greenフェーズで実装すべき関数・クラス・型定義が明確

## 品質評価

**Red フェーズ品質**: ✅ **高品質**
- テスト実行: 成功（失敗することを確認）
- 期待値: 明確で具体的（型定義に基づく）
- アサーション: 適切（13ケース全てで詳細な検証）
- 実装方針: 明確（要件定義との完全な対応）

## 次のステップ

**Green フェーズで実装する順序**:
1. 基本ファイル作成（`login-detection-manager.ts`）
2. 必要な型定義追加（`types.ts`）
3. Core Functions の最小実装
4. LoginDetectionManager クラスの最小実装
5. テスト実行での成功確認

**推奨コマンド**: `/tdd-green` でGreenフェーズ（最小実装）を開始