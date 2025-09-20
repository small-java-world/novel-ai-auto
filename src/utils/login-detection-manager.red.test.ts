// テストファイル: src/utils/login-detection-manager.red.test.ts
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { guardRejection } from '../../test/helpers';

// 【テストファイル概要】: TASK-070 ログイン要求の検出と再開機能の失敗テストを作成（TDD Red フェーズ）
// 【対象機能】: ログイン要求DOM検出、ジョブ一時停止、状態保存、ログイン完了検出、ジョブ再開

// Chrome API のモック設定
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    update: vi.fn(),
  },
};

// グローバル chrome オブジェクトをモック
(globalThis as any).chrome = mockChrome;

// 【未実装】: TDD Red フェーズのため、以下の関数は未実装（意図的にエラーになる）
import {
  LoginDetectionManager,
  detectLoginRequired,
  pauseCurrentJob,
  saveJobState,
  detectLoginCompleted,
  resumeSavedJob,
} from './login-detection-manager';

describe('LoginDetectionManager - TASK-070 ログイン要求の検出と再開', () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にクリーンなDOM環境を初期化し、一貫したテスト条件を保証
    // 【環境初期化】: 前のテストの影響を受けないよう、DOM構造とモック呼び出し履歴をリセット
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後にDOM環境とグローバル変数をクリーンアップ
    // 【状態復元】: 次のテストに影響しないよう、グローバルスコープの状態を元に戻す
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('正常系テストケース（基本的な動作）', () => {
    test('TC-070-001: ログインフォームが表示された場合にログイン要求を正しく検出する', () => {
      // 【テスト目的】: DOM上にログインフォームが表示された際の検出ロジックを確認
      // 【テスト内容】: ログインフォーム要素の存在を検出し、LOGIN_REQUIRED メッセージを送信する処理
      // 【期待される動作】: 現在のジョブIDを含むLOGIN_REQUIREDメッセージが正しい形式で送信される
      // 🟢 信頼性レベル: 要件定義のLoginRequiredMessage型定義に基づく

      // 【テストデータ準備】: NovelAI の標準的なログインフォーム構造を模擬し、検出対象のDOM要素を配置
      // 【初期条件設定】: ログインフォームが表示されている状態を再現
      document.body.innerHTML = `
        <form class="login-form">
          <input type="email" name="email">
          <input type="password" name="password">
          <button type="submit">ログイン</button>
        </form>
      `;

      const currentJobId = 'test-job-123';
      const expectedDetectionTime = Date.now();

      // 【実際の処理実行】: ログイン要求検出機能を呼び出し、DOM解析と検出処理を実行
      // 【処理内容】: DOM要素の存在確認とLOGIN_REQUIREDメッセージの生成・送信処理
      const result = detectLoginRequired(currentJobId);

      // 【結果検証】: ログイン要求検出結果とメッセージ形式の正確性を確認
      // 【期待値確認】: 検出成功、正しいメッセージ型、必要なフィールドの存在を検証
      expect(result.detected).toBe(true); // 【確認内容】: ログインフォームが正しく検出されることを確認 🟢
      expect(result.message.type).toBe('LOGIN_REQUIRED'); // 【確認内容】: メッセージタイプが仕様通りであることを確認 🟢
      expect(result.message.currentJobId).toBe(currentJobId); // 【確認内容】: 現在のジョブIDが正確に含まれることを確認 🟢
      expect(result.message.detectedAt).toBeGreaterThanOrEqual(expectedDetectionTime); // 【確認内容】: 検出時刻が現在時刻以降であることを確認 🟢
      expect(result.message.redirectUrl).toBe('https://novelai.net/login'); // 【確認内容】: リダイレクトURLが正しく設定されることを確認 🟡
    });

    test('TC-070-002: ログイン要求検出時に実行中ジョブを正しく一時停止する', () => {
      // 【テスト目的】: ジョブステータスの'running'から'paused'への状態変更処理を確認
      // 【テスト内容】: 実行中のジョブを検出し、適切な一時停止処理とタイムスタンプ記録を行う
      // 【期待される動作】: ジョブの進行が停止し、現在位置と一時停止時刻が正確に保存される
      // 🟢 信頼性レベル: types.ts の GenerationJob インターフェースに基づく

      // 【テストデータ準備】: 画像生成プロセスの途中（3/10枚完了）でログアウトが発生した状況を模擬
      // 【初期条件設定】: 実行中のジョブオブジェクトと進捗情報を準備
      const runningJob = {
        id: 'job-456',
        status: 'running' as const,
        progress: { current: 3, total: 10 },
        resumePoint: 'generation_start' as const,
        prompt: 'beautiful landscape',
        parameters: { steps: 28, cfgScale: 7 },
      };

      const pausedAt = Date.now();

      // 【実際の処理実行】: ジョブ一時停止機能を呼び出し、状態変更とタイムスタンプ記録を実行
      // 【処理内容】: ジョブステータスの変更、進捗情報の保持、一時停止時刻の記録処理
      const result = pauseCurrentJob(runningJob);

      // 【結果検証】: ジョブ一時停止処理の正確性と状態保存の完全性を確認
      // 【期待値確認】: ステータス変更、進捗保持、タイムスタンプ記録の正確性を検証
      expect(result.success).toBe(true); // 【確認内容】: ジョブ一時停止処理が成功することを確認 🟢
      expect(result.pausedJob.id).toBe('job-456'); // 【確認内容】: ジョブIDが変更されないことを確認 🟢
      expect(result.pausedJob.status).toBe('paused'); // 【確認内容】: ステータスが'paused'に正しく変更されることを確認 🟢
      expect(result.pausedJob.progress.current).toBe(3); // 【確認内容】: 現在の進捗が正確に保持されることを確認 🟢
      expect(result.pausedJob.progress.total).toBe(10); // 【確認内容】: 総数が正確に保持されることを確認 🟢
      expect(result.pausedJob.resumePoint).toBe('generation_start'); // 【確認内容】: 再開ポイントが正確に保存されることを確認 🟢
      expect(result.pausedJob.pausedAt).toBeGreaterThanOrEqual(pausedAt); // 【確認内容】: 一時停止時刻が現在時刻以降であることを確認 🟡
    });

    test('TC-070-003: 一時停止したジョブ状態をchrome.storageに正しく保存する', async () => {
      // 【テスト目的】: ジョブ状態の永続化処理とストレージAPI の正しい呼び出しを確認
      // 【テスト内容】: chrome.storage.local.set が正しいデータ形式で呼び出される処理
      // 【期待される動作】: ブラウザ再起動後も状態を復元可能な形式でデータが保存される
      // 🟢 信頼性レベル: Chrome Storage API 仕様と既存ストレージ実装に基づく

      // 【テストデータ準備】: 一時停止が必要な完全なジョブ情報を準備し、永続化対象データを設定
      // 【初期条件設定】: ストレージ保存に必要な全ての情報が含まれた状態を作成
      const pausedJob = {
        id: 'job-789',
        status: 'paused' as const,
        prompt: 'beautiful landscape',
        parameters: { steps: 28, cfgScale: 7 },
        progress: { current: 2, total: 5 },
        resumePoint: 'generation_start' as const,
        pausedAt: Date.now(),
      };

      mockChrome.storage.local.set.mockResolvedValue(undefined);

      // 【実際の処理実行】: ジョブ状態保存機能を呼び出し、chrome.storage API を使用した永続化処理を実行
      // 【処理内容】: ジョブデータの形式変換とchrome.storage.local.set の呼び出し処理
      const result = saveJobState(pausedJob);

      // 【結果検証】: ストレージAPI の正しい使用と保存データ形式の妥当性を確認
      // 【期待値確認】: ストレージAPI 呼び出し、データ形式、必須フィールドの存在を検証
      await expect(result).resolves.toMatchObject({ storageResult: 'success' }); // 【確認内容】: ストレージ保存処理が成功することを確認 🟢
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        paused_jobs: [
          {
            id: 'job-789',
            status: 'paused',
            prompt: 'beautiful landscape',
            parameters: { steps: 28, cfgScale: 7 },
            progress: { current: 2, total: 5 },
            resumePoint: 'generation_start',
            pausedAt: expect.any(Number),
          },
        ],
      }); // 【確認内容】: chrome.storage.local.set が正しいデータ形式で呼び出されることを確認 🟢
    });

    test('TC-070-004: ログイン完了後にNovelAI メインページへの遷移を検出する', () => {
      // 【テスト目的】: URLの変化とPageState.isLoggedIn の状態変化監視を確認
      // 【テスト内容】: ログイン完了によるページ遷移とDOM状態の変化を検出する処理
      // 【期待される動作】: ログイン状態がtrue に変わり、保存されたジョブの復元処理が開始される
      // 🟡 信頼性レベル: NovelAI のURL構造とPageState定義から推測

      // 【テストデータ準備】: ログイン完了によるページ遷移とDOM状態の変化を模擬
      // 【初期条件設定】: ログインページからメインページへの遷移状態を再現
      const pageTransition = {
        previousUrl: 'https://novelai.net/login',
        currentUrl: 'https://novelai.net/',
        pageState: {
          isLoggedIn: true,
          hasPromptInput: true,
          isNovelAIPage: true,
          currentUrl: 'https://novelai.net/',
        },
      };

      // NovelAI メインページのDOM構造を模擬
      document.body.innerHTML = `
        <div class="app">
          <textarea class="prompt-input" placeholder="Enter your prompt"></textarea>
          <button class="generate-button">Generate</button>
        </div>
      `;

      // 【実際の処理実行】: ログイン完了検出機能を呼び出し、URL変化とDOM状態の解析を実行
      // 【処理内容】: ページ遷移の検出、DOM要素の存在確認、ログイン状態の判定処理
      const result = detectLoginCompleted(pageTransition);

      // 【結果検証】: ログイン完了検出の精度とジョブ復元準備状態の確認
      // 【期待値確認】: 検出成功、メッセージ形式、復元可能性フラグの正確性を検証
      expect(result.completed).toBe(true); // 【確認内容】: ログイン完了が正しく検出されることを確認 🟡
      expect(result.message.type).toBe('LOGIN_COMPLETED'); // 【確認内容】: メッセージタイプが仕様通りであることを確認 🟡
      expect(result.message.detectedAt).toBeGreaterThan(0); // 【確認内容】: 検出時刻が記録されることを確認 🟡
      expect(result.message.availableForResume).toBe(true); // 【確認内容】: ジョブ再開が可能な状態であることを確認 🟡
    });

    test('TC-070-005: ログイン完了後に保存されたジョブを正しく復元し、適切なポイントから再開する', () => {
      // 【テスト目的】: ストレージからのジョブ復元と再開メッセージの送信を確認
      // 【テスト内容】: 保存されたジョブデータの読み取り、復元、RESUME_JOB メッセージの生成処理
      // 【期待される動作】: RESUME_JOB メッセージが送信され、適切なresumePoint が指定される
      // 🟢 信頼性レベル: 要件定義のJobResumeMessage型定義に基づく

      // 【テストデータ準備】: 以前に一時停止されたジョブの完全な状態情報を準備
      // 【初期条件設定】: chrome.storage から復元可能な形式でジョブデータを設定
      const savedJob = {
        id: 'job-restore-001',
        status: 'paused' as const,
        resumePoint: 'generation_start' as const,
        progress: { current: 2, total: 5 },
        prompt: 'anime character portrait',
        parameters: { steps: 30, cfgScale: 8 },
        pausedAt: Date.now() - 10000, // 10秒前に一時停止
      };

      mockChrome.storage.local.get.mockResolvedValue({
        paused_jobs: [savedJob],
      });

      // 【実際の処理実行】: ジョブ復元機能を呼び出し、ストレージからの読み取りと再開メッセージ生成を実行
      // 【処理内容】: chrome.storage からのデータ読み取り、ジョブ復元、RESUME_JOB メッセージの送信処理
      const result = resumeSavedJob();

      // 【結果検証】: ジョブ復元機能の正確性と再開メッセージの形式確認
      // 【期待値確認】: ストレージからの正しいデータ読み取り、メッセージ形式、再開ポイントの精度を検証
      expect(result).resolves.toMatchObject({
        success: true,
        resumedJob: {
          id: 'job-restore-001',
          resumePoint: 'generation_start',
        },
        message: {
          type: 'RESUME_JOB',
          jobId: 'job-restore-001',
          resumePoint: 'generation_start',
        },
      }); // 【確認内容】: ジョブ復元処理が成功し、正しい形式で結果が返されることを確認 🟢

      expect(mockChrome.storage.local.get).toHaveBeenCalledWith('paused_jobs'); // 【確認内容】: chrome.storage から正しいキーでデータが読み取られることを確認 🟢
    });
  });

  describe('異常系テストケース（エラーハンドリング）', () => {
    test('TC-070-101: ログイン判定用DOM要素の未検出時のフォールバック処理', () => {
      // 【テスト目的】: DOM要素未検出時の安全なフォールバック動作を確認
      // 【テスト内容】: 期待するログイン要素が見つからない場合の代替処理ロジック
      // 【期待される動作】: ログイン済み状態を仮定することで、ジョブの継続実行を優先する
      // 🟡 信頼性レベル: TASK-020のDOM selector strategy のフォールバック機能から推測

      // 【テストデータ準備】: 既知のログインフォーム構造と一致しないDOM構造を配置
      // 【初期条件設定】: NovelAI のUI変更やA/Bテストによるページ構造変更を模擬
      document.body.innerHTML = `
        <div class="unknown-structure">
          <span>Loading...</span>
        </div>
      `;

      // Clear DOM cache to ensure fresh detection
      LoginDetectionManager.clearDOMCache();

      const currentJobId = 'test-job-fallback';

      // 【実際の処理実行】: DOM要素未検出時のフォールバック処理を実行
      // 【処理内容】: セレクタ探索失敗時の代替ロジックと安全な状態仮定処理
      const result = detectLoginRequired(currentJobId);

      // 【結果検証】: フォールバック処理の安全性とシステム継続動作の確認
      // 【期待値確認】: 検出失敗、フォールバック結果、警告メッセージの適切性を検証
      expect(result.detected).toBe(false); // 【確認内容】: ログイン要求が検出されないことを確認 🟡
      expect(result.fallbackResult).toBe('assume_logged_in'); // 【確認内容】: ログイン済み状態を仮定するフォールバックが動作することを確認 🟡
      expect(result.warning).toContain('Login detection elements not found'); // 【確認内容】: 適切な警告メッセージが生成されることを確認 🟡
    });

    test('TC-070-102: chrome.storage API のアクセス失敗時のメモリ内フォールバック処理', () => {
      // 【テスト目的】: ストレージ障害時の代替手段の動作を確認
      // 【テスト内容】: ストレージ容量不足やAPIエラーによる永続化失敗時の対応処理
      // 【期待される動作】: メモリ内状態保持により、セッション継続中は機能を維持する
      // 🟡 信頼性レベル: 要件定義のエラーケースと Chrome API制限から推測

      // 【テストデータ準備】: Chrome拡張のストレージ容量制限超過エラーを模擬
      // 【初期条件設定】: 大量のログデータやジョブ履歴による容量制限到達状況を再現
      const jobData = {
        id: 'job-error-001',
        status: 'paused' as const,
        progress: { current: 1, total: 3 },
        prompt: 'test prompt',
        parameters: { steps: 28, cfgScale: 7 },
        pausedAt: Date.now(),
      };

      const storageError = new Error('QUOTA_EXCEEDED_ERR');
      mockChrome.storage.local.set.mockRejectedValue(storageError);

      // 【実際の処理実行】: ストレージ失敗時のフォールバック処理を実行
      // 【処理内容】: ストレージAPI エラーの捕捉とメモリ内代替保存処理
      const result = saveJobState(jobData);

      // 【結果検証】: ストレージ障害時の段階的デグラデーション機能を確認
      // 【期待値確認】: エラー処理、フォールバック状態、警告メッセージの適切性を検証
      expect(result).resolves.toMatchObject({
        storageResult: 'failed',
        fallbackResult: 'memory_only',
        warning: expect.stringContaining('Storage failed'),
        memoryState: {
          jobId: 'job-error-001',
          tempStatus: 'paused',
        },
      }); // 【確認内容】: ストレージ失敗時にメモリ内フォールバックが正しく動作することを確認 🟡
    });

    test('TC-070-103: NovelAI タブのアクティブ化失敗時のユーザーガイダンス表示', () => {
      // 【テスト目的】: タブ制御失敗時のユーザーガイダンス機能を確認
      // 【テスト内容】: chrome.tabs.update の権限不足やタブの無効状態での対応処理
      // 【期待される動作】: ユーザーに適切な代替手段を提示し、処理継続の道筋を示す
      // 🟡 信頼性レベル: TASK-030のタブ管理機能とChrome API制限から推測

      // 【テストデータ準備】: タブが既に閉じられているか、権限制限により操作不可な状況を模擬
      // 【初期条件設定】: ユーザーが手動でタブを閉じた、またはChrome拡張の権限変更を再現
      const tabError = new Error('Tab not found or invalid');
      const targetTabId = 123;
      const requiredAction = 'activate_novelai_tab';

      mockChrome.tabs.update.mockRejectedValue(tabError);

      // 【実際の処理実行】: タブ制御失敗時のユーザーガイダンス機能を実行
      // 【処理内容】: タブAPI エラーの処理と手動操作案内メッセージの生成処理
      const result = LoginDetectionManager.handleTabActivationFailure(targetTabId, requiredAction);

      // 【結果検証】: ユーザビリティと処理継続性のバランスを確認
      // 【期待値確認】: エラー結果、手動操作要求、具体的な手順指示の適切性を検証
      expect(result.tabResult).toBe('failed'); // 【確認内容】: タブ制御が失敗したことが正しく報告されることを確認 🟡
      expect(result.userAction).toBe('manual_required'); // 【確認内容】: 手動操作が必要であることが明示されることを確認 🟡
      expect(result.message).toContain('NovelAIタブを手動で開いてログインしてください'); // 【確認内容】: 具体的で実行可能な指示が提供されることを確認 🟡
      expect(result.instructions).toContain('NovelAI (https://novelai.net) を開く'); // 【確認内容】: 段階的な手順が含まれることを確認 🟡
    });

    test('TC-070-104: 無効なジョブ状態での復元試行時のエラーハンドリング', () => {
      // 【テスト目的】: データバリデーションとエラー回復機能を確認
      // 【テスト内容】: 破損または不完全なジョブデータでの復元処理のエラーハンドリング
      // 【期待される動作】: 不正データの除去と、クリーンな状態での新規開始
      // 🟡 信頼性レベル: 一般的なデータバリデーション要件から推測

      // 【テストデータ準備】: 必須フィールドの欠損と型不整合を含む破損データを準備
      // 【初期条件設定】: ストレージデータの部分的破損や、異なるバージョン間での非互換性を模擬
      const corruptedJob = {
        id: null,
        status: 'unknown_status' as any,
        progress: { current: -1, total: 'invalid' as any },
      };

      mockChrome.storage.local.get.mockResolvedValue({
        paused_jobs: [corruptedJob],
      });

      mockChrome.storage.local.remove = vi.fn().mockResolvedValue(undefined);

      // 【実際の処理実行】: 無効データでの復元処理とバリデーション機能を実行
      // 【処理内容】: ジョブデータの検証、不正データの検出、クリーンアップ処理
      const result = resumeSavedJob();

      // 【結果検証】: データ整合性の保証とシステムの自己修復能力を確認
      // 【期待値確認】: バリデーション失敗、復元スキップ、データクリーンアップの適切性を検証
      expect(result).resolves.toMatchObject({
        validationResult: 'failed',
        action: 'skip_restoration',
        message: expect.stringContaining('保存されたジョブデータが無効'),
        cleanupResult: 'corrupted_data_removed',
      }); // 【確認内容】: 無効データが適切に処理され、安全な状態に復旧することを確認 🟡
    });
  });

  describe('境界値テストケース（最小値、最大値、null等）', () => {
    test('TC-070-201: ログイン要求検出の最小継続時間（500ms）境界値テスト', () => {
      // 【テスト目的】: 誤検出防止機能の精度を確認
      // 【テスト内容】: 一時的な画面表示とログイン要求の区別を行う最小閾値の動作
      // 【期待される動作】: 499ms以下は無視、500ms以上で検出する一貫した動作
      // 🟢 信頼性レベル: 要件定義の誤検出防止仕様（500ms継続条件）に基づく

      // 【テストデータ準備】: API遅延やページ読み込み中の一時的なログイン画面表示を模擬
      // 【初期条件設定】: 要件定義で指定された誤検出防止のための最小閾値を境界値として設定
      const testCases = [
        { duration: 499, shouldDetect: false },
        { duration: 500, shouldDetect: true },
        { duration: 501, shouldDetect: true },
      ];

      document.body.innerHTML = `<form class="login-form"><input type="email"></form>`;

      for (const testCase of testCases) {
        // 【実際の処理実行】: 各境界値での検出処理を実行し、閾値の正確性を検証
        // 【処理内容】: 指定時間でのログイン要求検出とタイミング依存処理の安定性確認
        const result = LoginDetectionManager.detectWithDuration('test-job', testCase.duration);

        // 【結果検証】: タイミング依存処理の安定性と信頼性を確認
        // 【期待値確認】: 境界値前後での判定ロジックに矛盾がないことを検証
        if (testCase.shouldDetect) {
          expect(result.detected).toBe(true); // 【確認内容】: 閾値以上で検出が動作することを確認 🟢
          expect(result.reason).toBe(
            testCase.duration === 500 ? 'threshold_met' : 'above_threshold'
          ); // 【確認内容】: 閾値での正確な判定理由が記録されることを確認 🟢
        } else {
          expect(result.detected).toBe(false); // 【確認内容】: 閾値未満で検出されないことを確認 🟢
          expect(result.reason).toBe('below_threshold'); // 【確認内容】: 閾値未満の理由が正しく記録されることを確認 🟢
        }
      }
    });

    test('TC-070-202: エラー検出回数の上限値（10分間で5回）境界値テスト', () => {
      // 【テスト目的】: レート制限機能の正確性を確認
      // 【テスト内容】: 正常な再試行と異常なループ状態を区別する閾値の動作
      // 【期待される動作】: 4回までは正常、5回目で異常判定し自動再開を無効化
      // 🟢 信頼性レベル: 要件定義の無限ループ防止仕様（10分間で5回上限）に基づく

      // 【テストデータ準備】: ログイン認証の連続失敗やセッション管理の異常を模擬
      // 【初期条件設定】: 要件定義で指定された無限ループ防止のための上限設定を境界値として使用
      const timeWindow = 600000; // 10分間（ミリ秒）
      const testCases = [
        { attempts: 4, withinWindow: true, shouldBlock: false },
        { attempts: 5, withinWindow: true, shouldBlock: true },
        { attempts: 6, withinWindow: true, shouldBlock: true },
      ];

      for (const testCase of testCases) {
        // 【実際の処理実行】: 各境界値での制限機能を実行し、レート制限の正確性を検証
        // 【処理内容】: 連続アクセス回数の記録と上限到達時の自動再開無効化処理
        const result = LoginDetectionManager.checkRateLimit(testCase.attempts, timeWindow);

        // 【結果検証】: 異常な使用パターンに対するシステム保護機能を確認
        // 【期待値確認】: 制限発動後は一貫して自動再開を無効化することを検証
        if (testCase.shouldBlock) {
          expect(result.blocked).toBe(true); // 【確認内容】: 上限到達時に制限が発動することを確認 🟢
          expect(result.autoResumeEnabled).toBe(false); // 【確認内容】: 自動再開が無効化されることを確認 🟢
          expect(result.reason).toBe('rate_limit_exceeded'); // 【確認内容】: 制限理由が正しく記録されることを確認 🟢
        } else {
          expect(result.blocked).toBe(false); // 【確認内容】: 上限未満では制限されないことを確認 🟢
          expect(result.autoResumeEnabled).toBe(true); // 【確認内容】: 自動再開が有効なままであることを確認 🟢
        }
      }
    });

    test('TC-070-203: タイムアウト境界での処理（検出から通知まで1秒）境界値テスト', () => {
      // 【テスト目的】: パフォーマンス要件の遵守を確認
      // 【テスト内容】: ログイン要求検出から通知までの処理時間1秒以内の境界値での動作
      // 【期待される動作】: 1000ms以内での通知完了、超過時の警告出力
      // 🟡 信頼性レベル: 要件定義のパフォーマンス要件から推測

      // 【テストデータ準備】: DOM解析、メッセージ送信、ストレージアクセスの合計処理時間を境界値で設定
      // 【初期条件設定】: 要件定義で指定されたパフォーマンス要件（1秒以内）を境界値として使用
      const testScenarios = [
        { processingTime: 999, expectSuccess: true, expectWarning: false },
        { processingTime: 1000, expectSuccess: true, expectWarning: false },
        { processingTime: 1001, expectSuccess: true, expectWarning: true },
      ];

      document.body.innerHTML = `<form class="login-form"><input type="email"></form>`;

      for (const scenario of testScenarios) {
        // 【実際の処理実行】: 各境界値での処理時間を測定し、パフォーマンス要件の遵守を検証
        // 【処理内容】: 処理時間の監視と制限時間超過時の警告機能確認
        const result = LoginDetectionManager.detectWithTimeout('test-job', scenario.processingTime);

        // 【結果検証】: 処理時間の監視と品質保証機能を確認
        // 【期待値確認】: 制限時間超過時の警告機能が正しく動作することを検証
        expect(result.completed).toBe(scenario.expectSuccess); // 【確認内容】: 処理が完了することを確認 🟡
        expect(result.withinSLA).toBe(!scenario.expectWarning); // 【確認内容】: SLA（1秒以内）の遵守状況が正しく判定されることを確認 🟡

        if (scenario.expectWarning) {
          expect(result.warning).toBe(true); // 【確認内容】: 制限時間超過時に警告が出力されることを確認 🟡
        } else {
          expect(result.warning).toBe(false); // 【確認内容】: 制限時間内では警告が出力されないことを確認 🟡
        }
      }
    });

    test('TC-070-204: null/undefined 入力値での安全な処理の境界値テスト', () => {
      // 【テスト目的】: null安全性とシステムの堅牢性を確認
      // 【テスト内容】: 予期しないnull/undefined値に対する安全な処理の動作
      // 【期待される動作】: null/undefinedでもシステムが異常終了せず、適切なデフォルト値で継続
      // 🟡 信頼性レベル: 一般的なプログラミングベストプラクティスから推測

      // 【テストデータ準備】: API応答の遅延、ストレージデータの部分的破損、初期化前のアクセスを模擬
      // 【初期条件設定】: JavaScript/TypeScriptにおける値の不存在を表す基本的なパターンを境界値として使用
      const testCases = [
        { jobId: null, expectedBehavior: 'use_default_or_skip' },
        { jobId: undefined, expectedBehavior: 'use_default_or_skip' },
        { currentUrl: null, expectedBehavior: 'use_empty_string' },
        { pageState: undefined, expectedBehavior: 'use_default_state' },
      ];

      for (const testCase of testCases) {
        // 【実際の処理実行】: null/undefined値での各機能を実行し、null安全性を検証
        // 【処理内容】: 入力値の検証とデフォルト値での代替処理
        let result;

        if ('jobId' in testCase) {
          result = detectLoginRequired(testCase.jobId);
        } else if ('currentUrl' in testCase) {
          result = LoginDetectionManager.handleUrlChange(testCase.currentUrl);
        } else if ('pageState' in testCase) {
          result = detectLoginCompleted(testCase.pageState);
        }

        // 【結果検証】: 予期しない入力に対するシステムの防御能力を確認
        // 【期待値確認】: 全ての入力フィールドで統一されたnull安全性を保証することを検証
        expect(result.handled).toBe(true); // 【確認内容】: null/undefined値が安全に処理されることを確認 🟡
        expect(result.fallback).toBeDefined(); // 【確認内容】: 適切なフォールバック値が設定されることを確認 🟡
      }
    });
  });
});
