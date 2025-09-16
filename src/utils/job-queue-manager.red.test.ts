// テストファイル: job-queue-manager.red.test.ts
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// まだ実装されていないJobQueueManagerのAPIを仮定してインポート（Redフェーズでは存在せず失敗する想定）
// 実装予定: createJobQueueManager が Service Worker 内で複数枚生成ジョブを管理
import { createJobQueueManager, type JobQueueManager } from './job-queue-manager';
import { GenerationJob, GenerationProgress, GenerationSettings } from '../types';

// Chrome API の簡易モック
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  tabs: {
    sendMessage: vi.fn(),
    query: vi.fn(),
  },
};

// グローバルに反映
(globalThis as any).chrome = mockChrome as any;

describe('ジョブキュー/キャンセル制御', () => {
  let jobQueueManager: JobQueueManager;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にChrome APIモックをクリアし、一貫したテスト条件を保証
    // 【環境初期化】: 前のテストの影響を受けないよう、ジョブマネージャーを新規作成
    vi.clearAllMocks();
    mockChrome.tabs.query.mockResolvedValue([{ id: 123 }]);
    jobQueueManager = createJobQueueManager();
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後に実行中ジョブがあればクリーンアップ
    // 【状態復元】: 次のテストに影響しないよう、すべてのジョブを停止
    if (jobQueueManager) {
      jobQueueManager.cancelAll();
    }
  });

  test('単枚生成（imageCount=1）で正常にジョブが完了する', async () => {
    // 【テスト目的】: 最もシンプルなケースでのジョブライフサイクル管理が正常に動作することを確認
    // 【テスト内容】: 単枚生成ジョブの開始から完了までの状態遷移と進捗管理を検証
    // 【期待される動作】: pending → running → completed の状態遷移が正しく実行される
    // 🟢 信頼性レベル: REQ-103の基本要件と既存型定義（types.ts）に基づく

    // 【テストデータ準備】: 最小限の正当な単枚生成ジョブを構築
    // 【初期条件設定】: imageCount=1で基本的な画像生成パラメータを設定
    const jobSettings: GenerationSettings = {
      imageCount: 1,
      seed: 123456,
      filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
      retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 }
    };

    const job: GenerationJob = {
      id: 'test-job-1',
      prompt: 'test prompt',
      parameters: { steps: 28, cfgScale: 7.0, sampler: 'k_dpmpp_2m' },
      settings: jobSettings,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: { current: 0, total: 1, status: 'waiting' }
    };

    // 【実際の処理実行】: ジョブをキューに追加し実行開始
    // 【処理内容】: JobQueueManager.startJob で単枚生成ジョブを開始
    await jobQueueManager.startJob(job);

    // Content Scriptからの画像完了を模擬
    await jobQueueManager.handleImageReady('test-job-1', 'https://example.com/image1.png', 0, 'image1.png');

    // 【結果検証】: ジョブの最終状態と進捗が期待値と一致することを確認
    // 【期待値確認】: 単枚生成なので進捗は1/1、ステータスはcompletedになる
    const finalJob = jobQueueManager.getJob('test-job-1');
    expect(finalJob.status).toBe('completed'); // 【確認内容】: ジョブが正常完了状態になることを確認 🟢
    expect(finalJob.progress.current).toBe(1); // 【確認内容】: 進捗カウントが最終値1になることを確認 🟢
    expect(finalJob.progress.total).toBe(1); // 【確認内容】: 総数が1のまま変わらないことを確認 🟢
    expect(finalJob.progress.status).toBe('complete'); // 【確認内容】: 進捗ステータスが完了状態になることを確認 🟢
  });

  test('複数枚生成（imageCount=3）で順次実行される', async () => {
    // 【テスト目的】: 指定枚数分のループ制御と進捗管理機能が正しく動作することを確認
    // 【テスト内容】: 3枚生成ジョブの順次実行と各段階での進捗更新を検証
    // 【期待される動作】: 3回の生成サイクルが順次実行され、各回で進捗が更新される
    // 🟢 信頼性レベル: REQ-103の複数枚生成要件に基づく

    // 【テストデータ準備】: 複数枚生成の代表的なケースとして3枚を設定
    // 【初期条件設定】: imageCount=3で実用的な使用パターンを模擬
    const jobSettings: GenerationSettings = {
      imageCount: 3,
      seed: 123456,
      filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
      retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 }
    };

    const job: GenerationJob = {
      id: 'test-job-3',
      prompt: 'test prompt for multiple images',
      parameters: { steps: 28, cfgScale: 7.0, sampler: 'k_dpmpp_2m' },
      settings: jobSettings,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: { current: 0, total: 3, status: 'waiting' }
    };

    // 【実際の処理実行】: 複数枚ジョブを開始し、各画像完了を順次模擬
    // 【処理内容】: 3回の生成サイクルを模擬して進捗の連続性を確認
    await jobQueueManager.startJob(job);

    // 1枚目完了
    await jobQueueManager.handleImageReady('test-job-3', 'https://example.com/image1.png', 0, 'image1.png');
    let currentJob = jobQueueManager.getJob('test-job-3');
    expect(currentJob.progress.current).toBe(1); // 【確認内容】: 1枚目完了で進捗が1になることを確認 🟢

    // 2枚目完了
    await jobQueueManager.handleImageReady('test-job-3', 'https://example.com/image2.png', 1, 'image2.png');
    currentJob = jobQueueManager.getJob('test-job-3');
    expect(currentJob.progress.current).toBe(2); // 【確認内容】: 2枚目完了で進捗が2になることを確認 🟢

    // 3枚目完了
    await jobQueueManager.handleImageReady('test-job-3', 'https://example.com/image3.png', 2, 'image3.png');

    // 【結果検証】: 全枚数完了時の最終状態確認
    // 【期待値確認】: 進捗が3/3、ステータスがcompletedになることを確認
    const finalJob = jobQueueManager.getJob('test-job-3');
    expect(finalJob.status).toBe('completed'); // 【確認内容】: 全枚数完了でジョブが完了状態になることを確認 🟢
    expect(finalJob.progress.current).toBe(3); // 【確認内容】: 最終進捗が総数3と一致することを確認 🟢
    expect(finalJob.progress.total).toBe(3); // 【確認内容】: 総数が変わらず3のままであることを確認 🟢
    expect(finalJob.progress.status).toBe('complete'); // 【確認内容】: 進捗ステータスが完了になることを確認 🟢
  });

  test('実行中のジョブをキャンセルして即座に停止する', async () => {
    // 【テスト目的】: NFR-202（キャンセル即時性）の実現とユーザビリティの確保
    // 【テスト内容】: 実行中ジョブのキャンセル処理による即座停止と状態更新を検証
    // 【期待される動作】: 現在の生成を中断し、残りをスキップして'cancelled'状態に即座更新
    // 🟢 信頼性レベル: NFR-202要件と既存CANCEL_JOB実装パターンに基づく

    // 【テストデータ準備】: 長時間実行されるであろう複数枚ジョブを準備
    // 【初期条件設定】: キャンセル効果が明確になるよう5枚生成ジョブを設定
    const jobSettings: GenerationSettings = {
      imageCount: 5,
      seed: 123456,
      filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
      retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 }
    };

    const job: GenerationJob = {
      id: 'cancel-test-job',
      prompt: 'long running test job',
      parameters: { steps: 28, cfgScale: 7.0, sampler: 'k_dpmpp_2m' },
      settings: jobSettings,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: { current: 0, total: 5, status: 'waiting' }
    };

    // 【実際の処理実行】: ジョブ開始後、2枚目完了時にキャンセルを実行
    // 【処理内容】: 途中キャンセルによる即座停止とリソース解放を確認
    await jobQueueManager.startJob(job);

    // 1枚目完了
    await jobQueueManager.handleImageReady('cancel-test-job', 'https://example.com/image1.png', 0, 'image1.png');

    // 2枚目完了後にキャンセル実行
    await jobQueueManager.handleImageReady('cancel-test-job', 'https://example.com/image2.png', 1, 'image2.png');

    // キャンセル処理実行
    await jobQueueManager.cancelJob('cancel-test-job');

    // 【結果検証】: キャンセル後の状態確認とリソース解放の確認
    // 【期待値確認】: ジョブステータスが'cancelled'、進捗は中断時点のまま
    const cancelledJob = jobQueueManager.getJob('cancel-test-job');
    expect(cancelledJob.status).toBe('cancelled'); // 【確認内容】: キャンセル処理でステータスが'cancelled'になることを確認 🟢
    expect(cancelledJob.progress.current).toBe(2); // 【確認内容】: キャンセル時点の進捗が保持されることを確認 🟢
    expect(cancelledJob.progress.total).toBe(5); // 【確認内容】: 総数は変わらないことを確認 🟢
    expect(cancelledJob.progress.status).toBe('cancelled'); // 【確認内容】: 進捗ステータスもキャンセル状態になることを確認 🟢

    // キャンセル通知がUI（runtime）に送信されることを確認
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PROGRESS_UPDATE',
        payload: expect.objectContaining({
          jobId: 'cancel-test-job',
          status: 'cancelled'
        })
      })
    ); // 【確認内容】: キャンセル完了通知がUIに送信されることを確認 🟢
  });

  test('存在しないジョブIDに対するキャンセル要求を適切に拒否する', async () => {
    // 【テスト目的】: システムの整合性とエラー報告の明確化を確保
    // 【テスト内容】: 無効なIDや既に完了したジョブのキャンセル要求に対する適切なエラー処理
    // 【期待される動作】: ERROR メッセージでINVALID_PAYLOADまたは専用エラーコードを返却
    // 🟡 信頼性レベル: 既存エラー処理パターンからの妥当な推測

    // 【テストデータ準備】: 存在しないジョブIDを使用
    // 【初期条件設定】: 実際に登録されていないIDでキャンセルを試行
    const nonexistentJobId = 'nonexistent-job-id';

    // 【実際の処理実行】: 存在しないジョブIDでキャンセル要求を実行
    // 【処理内容】: 不正操作に対する適切なエラーハンドリングの確認
    const result = await jobQueueManager.cancelJob(nonexistentJobId);

    // 【結果検証】: エラー応答の内容と形式の確認
    // 【期待値確認】: エラーコードとメッセージが適切に返却される
    expect(result.success).toBe(false); // 【確認内容】: 操作が失敗として報告されることを確認 🟡
    expect(result.error).toBeDefined(); // 【確認内容】: エラー情報が含まれることを確認 🟡
    expect(result.error?.code).toBe('JOB_NOT_FOUND'); // 【確認内容】: 適切なエラーコードが設定されることを確認 🟡
    expect(result.error?.message).toContain('Job not found'); // 【確認内容】: ユーザーに分かりやすいエラーメッセージが含まれることを確認 🟡

    // エラー通知がUIに送信されることを確認
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ERROR',
        payload: expect.objectContaining({
          error: expect.objectContaining({
            code: 'JOB_NOT_FOUND'
          })
        })
      })
    ); // 【確認内容】: エラー情報がUIに適切に通知されることを確認 🟡
  });

  test('最小枚数1枚での正常動作確認', async () => {
    // 【テスト目的】: ループ処理の最小単位での安定動作を確認し、エッジケースでの予期しない動作を防止
    // 【テスト内容】: 最小境界値でのジョブ処理と複数枚処理との一貫性確認
    // 【期待される動作】: 単枚でも複数枚でも同じロジックで処理できることを確認
    // 🟢 信頼性レベル: REQ-103の枚数指定要件に基づく

    // 【テストデータ準備】: 最小枚数1枚の境界値でテストデータ作成
    // 【初期条件設定】: imageCount=1で境界条件をテスト
    const jobSettings: GenerationSettings = {
      imageCount: 1,
      seed: 999999,
      filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
      retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 }
    };

    const job: GenerationJob = {
      id: 'boundary-test-1',
      prompt: 'boundary test prompt',
      parameters: { steps: 20, cfgScale: 5.0, sampler: 'k_euler' },
      settings: jobSettings,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: { current: 0, total: 1, status: 'waiting' }
    };

    // 【実際の処理実行】: 最小枚数でのジョブ実行
    // 【処理内容】: 境界値での安定動作とエラーなし処理の確認
    await jobQueueManager.startJob(job);
    await jobQueueManager.handleImageReady('boundary-test-1', 'https://example.com/boundary.png', 0, 'boundary.png');

    // 【結果検証】: 最小境界での正確な処理結果確認
    // 【期待値確認】: 1回のみの実行で正しく完了状態になることを確認
    const completedJob = jobQueueManager.getJob('boundary-test-1');
    expect(completedJob.status).toBe('completed'); // 【確認内容】: 最小枚数でも正常完了することを確認 🟢
    expect(completedJob.progress.current).toBe(1); // 【確認内容】: 進捗が正確に1になることを確認 🟢
    expect(completedJob.progress.total).toBe(1); // 【確認内容】: 総数が1のまま保持されることを確認 🟢

    // Content Script への呼び出し回数が1回のみであることを確認
    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(1); // 【確認内容】: 最小枚数では1回のみCS呼び出しが行われることを確認 🟢
  });

  test('不正な枚数0での適切なエラー処理', async () => {
    // 【テスト目的】: 不正入力の適切な検出と拒否により、システム破綻を防止
    // 【テスト内容】: 論理的に意味をなさない入力値に対する事前検証確認
    // 【期待される動作】: 処理開始前の事前検証でエラー検出し、安全な拒否処理
    // 🟡 信頼性レベル: 一般的な入力検証パターンからの推測

    // 【テストデータ準備】: 論理的下限を下回る不正値を設定
    // 【初期条件設定】: imageCount=0で不正入力パターンをテスト
    const invalidJobSettings: GenerationSettings = {
      imageCount: 0, // 不正値
      seed: 123456,
      filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
      retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 }
    };

    const invalidJob: GenerationJob = {
      id: 'invalid-job-0',
      prompt: 'invalid job with zero count',
      parameters: { steps: 28, cfgScale: 7.0, sampler: 'k_dpmpp_2m' },
      settings: invalidJobSettings,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: { current: 0, total: 0, status: 'waiting' }
    };

    // 【実際の処理実行】: 不正データでのジョブ開始試行
    // 【処理内容】: 事前検証による不正データの検出と適切な拒否
    const result = await jobQueueManager.startJob(invalidJob);

    // 【結果検証】: 不正データに対する適切なエラー応答確認
    // 【期待値確認】: 事前検証でエラーが検出され、処理が開始されない
    expect(result.success).toBe(false); // 【確認内容】: 不正データが適切に拒否されることを確認 🟡
    expect(result.error?.code).toBe('INVALID_IMAGE_COUNT'); // 【確認内容】: 適切なエラーコードが返却されることを確認 🟡
    expect(result.error?.message).toContain('Image count must be between 1 and'); // 【確認内容】: 明確なエラーメッセージが提供されることを確認 🟡

    // ジョブが登録されていないことを確認
    expect(() => jobQueueManager.getJob('invalid-job-0')).toThrow(); // 【確認内容】: 不正ジョブが登録されていないことを確認 🟡
  });

  test('同じジョブに対する複数のキャンセル要求の処理', async () => {
    // 【テスト目的】: 並行処理での状態一貫性確認とrace conditionでもデータ整合性が保たれることを確認
    // 【テスト内容】: 競合状態（race condition）での動作境界と排他制御の確認
    // 【期待される動作】: 複数キャンセルでも一意な最終状態に収束することを確認
    // 🟡 信頼性レベル: 並行処理の一般的な考慮事項からの推測

    // 【テストデータ準備】: 競合発生の典型例として同一ジョブIDを使用
    // 【初期条件設定】: 長時間実行されるジョブで競合状況を模擬
    const jobSettings: GenerationSettings = {
      imageCount: 10,
      seed: 123456,
      filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
      retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 }
    };

    const job: GenerationJob = {
      id: 'race-condition-job',
      prompt: 'race condition test job',
      parameters: { steps: 28, cfgScale: 7.0, sampler: 'k_dpmpp_2m' },
      settings: jobSettings,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: { current: 0, total: 10, status: 'waiting' }
    };

    // 【実際の処理実行】: ジョブ開始後に同時キャンセル要求を実行
    // 【処理内容】: 並行処理での排他制御と状態一意性の確認
    await jobQueueManager.startJob(job);

    // 2枚完了後に同時キャンセル要求（競合模擬）
    await jobQueueManager.handleImageReady('race-condition-job', 'https://example.com/race1.png', 0, 'race1.png');
    await jobQueueManager.handleImageReady('race-condition-job', 'https://example.com/race2.png', 1, 'race2.png');

    // 複数のキャンセル要求を並行実行
    const cancelPromises = [
      jobQueueManager.cancelJob('race-condition-job'),
      jobQueueManager.cancelJob('race-condition-job'),
      jobQueueManager.cancelJob('race-condition-job')
    ];

    const results = await Promise.all(cancelPromises);

    // 【結果検証】: 競合時の一意な最終状態確認
    // 【期待値確認】: 最初のキャンセルのみ有効、後続は既にキャンセル済み通知
    const finalJob = jobQueueManager.getJob('race-condition-job');
    expect(finalJob.status).toBe('cancelled'); // 【確認内容】: 最終的に'cancelled'状態で一意に収束することを確認 🟡

    // 複数リクエストの結果確認（最初の1つが成功、残りは既にキャンセル済み）
    const successfulCancels = results.filter(r => r.success && r.operation === 'cancelled');
    const alreadyCancelled = results.filter(r => r.success && r.operation === 'already_cancelled');

    expect(successfulCancels).toHaveLength(1); // 【確認内容】: 1回のみ実際のキャンセル処理が実行されることを確認 🟡
    expect(alreadyCancelled).toHaveLength(2); // 【確認内容】: 残り2回は既にキャンセル済みとして処理されることを確認 🟡
  });
});