# TDD Redフェーズ設計: TASK-034 ジョブキュー/キャンセル制御

## 実装対象API設計

### JobQueueManager インターフェース

```typescript
export interface JobQueueManager {
  // ジョブ実行制御
  startJob(job: GenerationJob): Promise<OperationResult>;
  cancelJob(jobId: string): Promise<OperationResult>;
  cancelAll(): void;

  // 進捗管理
  handleImageReady(jobId: string, url: string, index: number, fileName: string): Promise<void>;
  handleGenerationError(jobId: string, error: string): Promise<void>;

  // 状態取得
  getJob(jobId: string): GenerationJob;
  getAllJobs(): GenerationJob[];
  isJobActive(jobId: string): boolean;
}

export interface OperationResult {
  success: boolean;
  operation?: 'started' | 'cancelled' | 'already_cancelled';
  error?: {
    code: string;
    message: string;
  };
}

export function createJobQueueManager(): JobQueueManager;
```

## テストカバレッジ詳細

### 正常系テスト（3ケース）

1. **単枚生成の完全ライフサイクル**
   - 入力: `imageCount: 1`
   - 検証: pending → running → completed
   - 期待値: `progress: {current: 1, total: 1, status: 'complete'}`

2. **複数枚生成の順次実行**
   - 入力: `imageCount: 3`
   - 検証: 各画像完了での進捗更新
   - 期待値: `progress: {current: 0→1→2→3, total: 3}`

3. **Progress Update のブロードキャスト**
   - Content Script からの進捗受信
   - UI への転送確認
   - メッセージ改変なし検証

### 異常系テスト（2ケース）

4. **実行中ジョブのキャンセル**
   - NFR-202（即時性）対応
   - 中断時点での進捗保持
   - リソース解放確認

5. **不正ジョブIDのキャンセル拒否**
   - エラーコード: `JOB_NOT_FOUND`
   - 適切なエラーメッセージ
   - UI へのエラー通知

### 境界値テスト（2ケース）

6. **最小枚数（1枚）処理**
   - 境界値での安定動作
   - Content Script 呼び出し回数検証
   - 複数枚処理との一貫性

7. **不正枚数（0枚）の事前拒否**
   - 入力検証での早期エラー検出
   - エラーコード: `INVALID_IMAGE_COUNT`
   - 処理開始前の拒否

8. **同時キャンセル競合の排他制御**
   - Race condition 対応
   - 状態一意性の保証
   - 並行処理での整合性

## Chrome Extension 連携設計

### Message Flow

```
Popup UI → Service Worker → JobQueueManager
    ↓
JobQueueManager → Content Script (APPLY_AND_GENERATE)
    ↓
Content Script → JobQueueManager (IMAGE_READY)
    ↓
JobQueueManager → Service Worker (DOWNLOAD_IMAGE)
    ↓
Service Worker → Popup UI (PROGRESS_UPDATE)
```

### 状態管理

```typescript
interface JobState {
  jobs: Map<string, GenerationJob>;
  activeJobId: string | null;
  progressCallbacks: Set<(progress: GenerationProgress) => void>;
}
```

## エラーハンドリング設計

### エラーコード体系

- `JOB_NOT_FOUND`: 存在しないジョブID
- `INVALID_IMAGE_COUNT`: 不正な枚数指定
- `JOB_ALREADY_RUNNING`: 重複実行試行
- `GENERATION_FAILED`: Content Script エラー
- `DOWNLOAD_FAILED`: ダウンロードエラー

### 復旧戦略

- **ジョブキャンセル**: 即座停止、リソース解放
- **生成エラー**: リトライエンジン連携
- **ダウンロードエラー**: 指数バックオフ再試行

## 実装優先度

### Phase 1 (最小実装)
1. `createJobQueueManager` ファクトリ
2. 基本的なジョブ状態管理
3. 単枚生成の完全サポート

### Phase 2 (複数枚対応)
4. 複数枚生成のループ制御
5. 進捗管理とUI通知
6. 基本的なキャンセル機能

### Phase 3 (堅牢性)
7. エラーハンドリング強化
8. 境界値・競合状態対応
9. リトライエンジン連携

## 品質保証

### テスト戦略
- **Unit Test**: 7ケース（Red Phase 完了）
- **Integration Test**: Chrome API モック
- **Edge Case**: 境界値・競合状態

### コード品質
- TypeScript 厳密設定
- ESLint/Prettier 適用
- 日本語コメント必須
- 信頼性レベル明記

## 次フェーズ要件

Green フェーズでは以下の最小実装を目標：
1. すべてのテストケースが通る最小限の実装
2. Chrome Extension API との適切な連携
3. エラーハンドリングの基本実装
4. メモリ効率的な状態管理