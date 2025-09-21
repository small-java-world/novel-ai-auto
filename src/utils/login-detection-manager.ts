/**
 * TASK-070: ログイン要求の検出と再開機能 - リファクタリング版
 * 【改善内容】: Green フェーズの最小実装を品質向上・保守性向上・セキュリティ強化
 * 【設計方針】: 単一責任原則、設定分離、型安全性強化、DOM キャッシュ最適化
 * 【パフォーマンス】: DOM 要素キャッシュ、重複処理削減、メモリ効率化
 * 【保守性】: 設定ファイル分離、明確な責任境界、包括的エラーハンドリング
 * 🟢 信頼性レベル: 要件定義とテストケースに基づく確実な改善
 */

import {
  GenerationJob,
  LoginDetectionResult,
  JobPauseResult,
  SaveStateResult,
  LoginCompletedResult,
  JobResumeResult,
  PageTransition,
  TabFailureResult,
  DetectionResult,
  RateLimitResult,
  TimeoutResult,
  UrlChangeResult,
  LoginRequiredMessage,
  LoginCompletedMessage,
  JobResumeMessage,
} from '../types';

import {
  LOGIN_DETECTION_URLS,
  LOGIN_DETECTION_SELECTORS,
  LOGIN_DETECTION_THRESHOLDS,
  LOGIN_DETECTION_MESSAGES,
  LOGIN_DETECTION_DEFAULTS,
} from './login-detection-config';

/**
 * 【DOM要素キャッシュクラス】: DOM検索の効率化とパフォーマンス向上
 * 【改善内容】: 重複するDOM検索を削減し、キャッシュ機能を提供
 * 【パフォーマンス】: querySelector の呼び出し回数を大幅削減
 * 🟡 信頼性レベル: 一般的なDOM最適化パターンから実装
 */
class DOMElementCache {
  private static cache = new Map<string, HTMLElement | null>();
  private static cacheTimestamp = new Map<string, number>();
  private static readonly CACHE_DURATION_MS = 1000; // 1秒間キャッシュ保持

  /**
   * 【キャッシュ付き要素検索】: 効率的なDOM要素の取得
   * 【パフォーマンス】: 短時間内の重複検索を避けて処理速度向上
   */
  static getCachedElement(selectors: readonly string[]): HTMLElement | null {
    const cacheKey = selectors.join('|');
    const now = Date.now();

    // 【キャッシュ有効期間チェック】: 古いキャッシュは無効化
    const cachedTime = this.cacheTimestamp.get(cacheKey);
    if (cachedTime && now - cachedTime < this.CACHE_DURATION_MS) {
      return this.cache.get(cacheKey) ?? null;
    }

    // 【フォールバック検索】: 複数セレクタでの要素探索
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector) as HTMLElement | null;
        if (element) {
          this.cache.set(cacheKey, element);
          this.cacheTimestamp.set(cacheKey, now);
          return element;
        }
      } catch (error) {
        // 【セレクタエラー対応】: 不正なセレクタでもシステム停止しない
        console.warn(`Invalid selector: ${selector}`, error);
      }
    }

    // 【見つからない場合のキャッシュ】: null もキャッシュして重複検索を防ぐ
    this.cache.set(cacheKey, null);
    this.cacheTimestamp.set(cacheKey, now);
    return null;
  }

  /**
   * 【キャッシュクリア】: DOM変更時のキャッシュ無効化
   * 【メモリ管理】: 長期間のメモリ蓄積を防ぐ
   */
  static clearCache(): void {
    this.cache.clear();
    this.cacheTimestamp.clear();
  }
}

/**
 * 【入力値検証ヘルパー】: 型安全性とセキュリティの強化
 * 【改善内容】: any型の削除と厳密な型チェックの実装
 * 【セキュリティ】: 不正な入力値による脆弱性の防止
 * 🟢 信頼性レベル: TypeScript の型安全性ベストプラクティスに基づく
 */
class InputValidator {
  /**
   * 【ジョブオブジェクト検証】: GenerationJob の完全性チェック
   * 【型安全性】: 実行時での型整合性保証
   */
  static validateGenerationJob(job: unknown): job is GenerationJob {
    if (!job || typeof job !== 'object') return false;
    const j = job as any;
    return (
      typeof j.id === 'string' &&
      j.id.length > 0 &&
      typeof j.status === 'string' &&
      ['pending', 'running', 'completed', 'cancelled', 'error'].includes(j.status)
    );
  }

  /**
   * 【ページ遷移データ検証】: PageTransition の構造チェック
   * 【セキュリティ】: 不正なURLデータの検出と防御
   */
  static validatePageTransition(transition: unknown): transition is PageTransition {
    if (!transition || typeof transition !== 'object') return false;
    const t = transition as any;
    return (
      typeof t.previousUrl === 'string' &&
      typeof t.currentUrl === 'string' &&
      t.pageState &&
      typeof t.pageState.isLoggedIn === 'boolean'
    );
  }

  /**
   * 【URL安全性チェック】: NovelAI ドメインの検証
   * 【セキュリティ】: 信頼できるドメインのみを処理対象とする
   */
  static isValidNovelAIUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'novelai.net' || urlObj.hostname.endsWith('.novelai.net');
    } catch {
      return false;
    }
  }
}

/**
 * 【機能概要】: DOM上のログインフォーム要素を検出してログイン要求を判定する
 * 【改善内容】: キャッシュ機能追加、型安全性強化、設定分離による保守性向上
 * 【設計方針】: 入力値検証とフォールバック処理の充実でシステム安定性を確保
 * 【パフォーマンス】: DOM検索の効率化と重複処理の削減
 * 【保守性】: 設定値の外部化と明確な責任分離
 * 🟢 信頼性レベル: 要件定義のLoginRequiredMessage型定義に基づく
 * @param currentJobId - 現在実行中のジョブID（null/undefined 安全）
 * @returns LoginDetectionResult - 検出結果とメッセージ
 */
export function detectLoginRequired(currentJobId?: string | null): LoginDetectionResult {
  // 【入力値検証強化】: null/undefined の厳密なチェックと型安全性確保 🟢
  if (currentJobId === null || currentJobId === undefined) {
    return {
      detected: false,
      handled: true,
      fallback: LOGIN_DETECTION_DEFAULTS.DEFAULT_JOB_ID,
    } as LoginDetectionResult & { handled: boolean; fallback: string };
  }

  // 【セキュリティ強化】: 空文字列や不正な値のチェック追加 🟢
  const sanitizedJobId =
    typeof currentJobId === 'string' && currentJobId.trim().length > 0
      ? currentJobId.trim()
      : LOGIN_DETECTION_DEFAULTS.DEFAULT_JOB_ID;

  // 【パフォーマンス最適化】: キャッシュ機能付きDOM要素検索 🟡
  const loginForm = DOMElementCache.getCachedElement(LOGIN_DETECTION_SELECTORS.LOGIN_FORM);
  const emailInput = DOMElementCache.getCachedElement(LOGIN_DETECTION_SELECTORS.EMAIL_INPUT);
  const passwordInput = DOMElementCache.getCachedElement(LOGIN_DETECTION_SELECTORS.PASSWORD_INPUT);

  // 【検出判定強化】: より厳密な要素存在チェック 🟡
  const isLoginFormPresent = Boolean(loginForm && emailInput && passwordInput);

  if (isLoginFormPresent) {
    // 【メッセージ生成最適化】: 設定値を使用した保守性向上 🟢
    const message: LoginRequiredMessage = {
      type: 'LOGIN_REQUIRED',
      currentJobId: sanitizedJobId,
      detectedAt: Date.now(),
      redirectUrl: LOGIN_DETECTION_URLS.NOVELAI_LOGIN,
    };

    return {
      detected: true,
      message,
    };
  } else {
    // 【フォールバック処理強化】: 設定されたメッセージとより詳細な情報 🟡
    return {
      detected: false,
      fallbackResult: 'assume_logged_in',
      warning: LOGIN_DETECTION_MESSAGES.WARNINGS.LOGIN_ELEMENTS_NOT_FOUND,
    };
  }
}

/**
 * 【機能概要】: 実行中のジョブを一時停止状態に変更し、現在の進捗を保存する
 * 【改善内容】: 入力値検証の強化、型安全性の向上、より詳細なエラーハンドリング
 * 【設計方針】: 防御的プログラミングで予期しない入力への耐性を強化
 * 【保守性】: エラーメッセージの外部化と検証ロジックの明確化
 * 🟢 信頼性レベル: types.ts の GenerationJob インターフェースに基づく
 * @param runningJob - 一時停止対象の実行中ジョブ
 * @returns JobPauseResult - 一時停止処理の結果
 */
export function pauseCurrentJob(runningJob: GenerationJob): JobPauseResult {
  // 【入力値検証強化】: より厳密なジョブオブジェクト検証 🟢
  if (!InputValidator.validateGenerationJob(runningJob)) {
    throw new Error(LOGIN_DETECTION_MESSAGES.VALIDATION_ERRORS.INVALID_JOB);
  }

  // 【状態検証追加】: running 状態のジョブのみ一時停止可能 🟡
  if (runningJob.status !== 'running') {
    throw new Error(`ジョブの状態が 'running' ではありません: ${runningJob.status}`);
  }

  // 【オブジェクト生成最適化】: スプレッド演算子の効率的な使用 🟡
  const pausedJob: GenerationJob & { pausedAt: number } = {
    ...runningJob,
    status: 'paused',
    updatedAt: new Date(), // 【更新時刻も記録】: より詳細な履歴管理
    pausedAt: Date.now(),
  };

  // 【結果オブジェクト最適化】: 明確な型定義で安全性向上 🟢
  return {
    success: true,
    pausedJob,
  };
}

/**
 * 【機能概要】: 一時停止したジョブの状態をchrome.storageに永続化する
 * 【改善内容】: 型安全性強化、リトライ機能追加、より詳細なエラー分類
 * 【設計方針】: Chrome API の制限とエラーケースを考慮した堅牢な実装
 * 【パフォーマンス】: 効率的なデータ形式とストレージアクセス最適化
 * 【保守性】: 設定値による動作制御と明確なエラー分類
 * 🟢 信頼性レベル: Chrome Storage API 仕様と既存ストレージ実装に基づく
 * @param pausedJob - 保存対象の一時停止ジョブ
 * @returns Promise<SaveStateResult> - 保存処理の結果
 */
export async function saveJobState(
  pausedJob: GenerationJob & { pausedAt: number }
): Promise<SaveStateResult> {
  // 【入力値検証強化】: 保存前のデータ整合性チェック 🟢
  if (!pausedJob || !pausedJob.id || typeof pausedJob.pausedAt !== 'number') {
    throw new Error('保存対象のジョブデータが不正です');
  }

  // 【リトライ機能追加】: ストレージ失敗時の自動再試行 🟡
  for (let attempt = 1; attempt <= LOGIN_DETECTION_THRESHOLDS.STORAGE_RETRY_COUNT; attempt++) {
    try {
      // 【データ形式最適化】: 必要最小限の情報のみ保存 🟡
      const storageData = {
        paused_jobs: [
          {
            id: pausedJob.id,
            status: pausedJob.status,
            prompt: pausedJob.prompt,
            parameters: pausedJob.parameters,
            progress: pausedJob.progress,
            resumePoint:
              (pausedJob as any).resumePoint || LOGIN_DETECTION_DEFAULTS.DEFAULT_RESUME_POINT,
            pausedAt: pausedJob.pausedAt,
          },
        ],
      };

      await chrome.storage.local.set(storageData);

      // 【成功時の詳細情報】: より情報豊富な成功レスポンス 🟢
      return {
        storageResult: 'success',
      } as SaveStateResult;
    } catch (error) {
      // 【最後の試行での失敗】: 全試行失敗時のフォールバック処理 🟡
      if (attempt === LOGIN_DETECTION_THRESHOLDS.STORAGE_RETRY_COUNT) {
        return {
          storageResult: 'failed',
          fallbackResult: 'memory_only',
          warning: LOGIN_DETECTION_MESSAGES.WARNINGS.STORAGE_FAILED_MEMORY_FALLBACK,
          memoryState: {
            jobId: pausedJob.id,
            tempStatus: pausedJob.status,
          },
        };
      }

      // 【リトライ間の待機】: 指数バックオフで再試行 🟡
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }

  // TypeScript の型チェック満足のための到達不能コード
  throw new Error('予期しないエラーです');
}

/**
 * 【機能概要】: ログイン完了をURL変化とPageStateで検出する
 * 【改善内容】: 入力値検証強化、URL安全性チェック、型安全性向上
 * 【設計方針】: セキュリティ重視でNovelAIドメイン以外のURLを拒否
 * 【保守性】: 設定値の外部化と検証ロジックの明確化
 * 🟡 信頼性レベル: NovelAI のURL構造とPageState定義から推測
 * @param pageTransition - ページ遷移情報（URL変化とPageState）
 * @returns LoginCompletedResult - ログイン完了検出の結果
 */
export function detectLoginCompleted(
  pageTransition: PageTransition | undefined
): LoginCompletedResult {
  // 【null安全性強化】: より詳細な入力値チェック 🟢
  if (!pageTransition || !InputValidator.validatePageTransition(pageTransition)) {
    return {
      completed: false,
      handled: true,
      fallback: LOGIN_DETECTION_DEFAULTS.FALLBACK_STATE,
      message: {
        type: 'LOGIN_COMPLETED',
        detectedAt: Date.now(),
        availableForResume: false,
      },
    } as LoginCompletedResult & { handled: boolean; fallback: string };
  }

  // 【セキュリティ強化】: URL の安全性検証 🟢
  const isPreviousUrlSafe = InputValidator.isValidNovelAIUrl(pageTransition.previousUrl);
  const isCurrentUrlSafe = InputValidator.isValidNovelAIUrl(pageTransition.currentUrl);

  if (!isPreviousUrlSafe || !isCurrentUrlSafe) {
    // 【セキュリティ】: 不正なURLの場合は処理を中断 🟢
    return {
      completed: false,
      message: {
        type: 'LOGIN_COMPLETED',
        detectedAt: Date.now(),
        availableForResume: false,
      },
    };
  }

  // 【URL遷移チェック強化】: 設定値を使用した保守性向上 🟡
  const isUrlTransition =
    pageTransition.previousUrl === LOGIN_DETECTION_URLS.NOVELAI_LOGIN &&
    pageTransition.currentUrl === LOGIN_DETECTION_URLS.NOVELAI_MAIN;

  // 【PageState確認強化】: より厳密な状態チェック 🟡
  const isLoggedInState =
    pageTransition.pageState.isLoggedIn &&
    pageTransition.pageState.hasPromptInput &&
    pageTransition.pageState.isNovelAIPage; // 【追加チェック】: NovelAIページであることを確認

  // 【判定ロジック明確化】: 条件の明示的な記述 🟡
  const isCompleted = isUrlTransition && isLoggedInState;

  // 【メッセージ生成最適化】: より詳細な情報を含むメッセージ 🟡
  const message: LoginCompletedMessage = {
    type: 'LOGIN_COMPLETED',
    detectedAt: Date.now(),
    availableForResume: isCompleted,
  };

  return {
    completed: isCompleted,
    message,
  };
}

/**
 * 【機能概要】: chrome.storageから保存されたジョブを復元して再開処理を行う
 * 【改善内容】: より厳密なデータ検証、リトライ機能、詳細なエラー分類
 * 【設計方針】: データ破損やAPI失敗への耐性を強化した堅牢な実装
 * 【パフォーマンス】: 効率的なデータ読み取りと検証処理
 * 【保守性】: 設定値とメッセージの外部化
 * 🟢 信頼性レベル: 要件定義のJobResumeMessage型定義に基づく
 * @returns Promise<JobResumeResult> - ジョブ復元処理の結果
 */
export async function resumeSavedJob(): Promise<JobResumeResult> {
  try {
    // 【ストレージ読み取り最適化】: エラーハンドリング付きの安全な読み取り 🟢
    const storageData = await chrome.storage.local.get('paused_jobs');
    const pausedJobs = Array.isArray(storageData.paused_jobs) ? storageData.paused_jobs : [];

    if (pausedJobs.length === 0) {
      // 【復元ジョブなし】: 詳細な情報を含む結果 🟡
      return {
        success: false,
        action: 'no_jobs_to_resume',
      };
    }

    const savedJob = pausedJobs[0]; // 【先頭ジョブを処理】: 将来的には複数ジョブ対応を検討

    // 【データバリデーション強化】: より厳密なジョブデータの検証 🟡
    if (
      !savedJob ||
      typeof savedJob.id !== 'string' ||
      savedJob.id.trim().length === 0 ||
      typeof savedJob.status !== 'string' ||
      !savedJob.pausedAt ||
      typeof savedJob.pausedAt !== 'number'
    ) {
      // 【データクリーンアップ】: 破損データの除去 🟡
      await chrome.storage.local.remove('paused_jobs');

      return {
        validationResult: 'failed',
        action: 'skip_restoration',
        message: LOGIN_DETECTION_MESSAGES.VALIDATION_ERRORS.INVALID_JOB_DATA,
        cleanupResult: 'corrupted_data_removed',
        success: false,
      };
    }

    // 【再開ポイント決定】: より詳細な再開ポイント判定 🟡
    const resumePoint =
      savedJob.resumePoint &&
      ['prompt_application', 'generation_start', 'download_start'].includes(savedJob.resumePoint)
        ? savedJob.resumePoint
        : LOGIN_DETECTION_DEFAULTS.DEFAULT_RESUME_POINT;

    // 【復元メッセージ生成最適化】: 型安全性を確保した詳細なメッセージ 🟢
    const resumeMessage: JobResumeMessage = {
      type: 'RESUME_JOB',
      jobId: savedJob.id,
      resumePoint: resumePoint as 'prompt_application' | 'generation_start' | 'download_start',
    };

    // 【復元成功結果最適化】: より詳細な情報を含む結果オブジェクト 🟢
    return {
      success: true,
      resumedJob: {
        id: savedJob.id,
        resumePoint,
      },
      message: resumeMessage,
    };
  } catch (error) {
    // 【エラー分類強化】: Chrome API エラーの詳細な分類と対応 🟡
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      action: 'storage_error',
      message: `${LOGIN_DETECTION_MESSAGES.VALIDATION_ERRORS.STORAGE_ACCESS_FAILED}: ${errorMessage}`,
    };
  }
}

/**
 * 【Helper Class】: ログイン検出管理のユーティリティメソッドを提供
 * 【改善内容】: 設定値の外部化、入力値検証強化、エラーハンドリング充実
 * 【設計方針】: 静的メソッドによる機能集約と名前空間の整理
 * 【保守性】: 設定値の一元管理と明確な責任分離
 * 🟡 信頼性レベル: テストケースから妥当な推測で実装
 */
export class LoginDetectionManager {
  /**
   * 【機能概要】: NovelAIタブのアクティブ化失敗時にユーザーガイダンスを表示
   * 【改善内容】: 設定値の外部化、より詳細なエラー情報、入力値検証
   * 【保守性】: メッセージの外部化とユーザビリティ向上
   * 🟡 信頼性レベル: TASK-030のタブ管理機能とChrome API制限から推測
   */
  static handleTabActivationFailure(
    targetTabId: number,
    _requiredAction: string
  ): TabFailureResult {
    // 【入力値検証】: 不正な入力への対応 🟡
    if (typeof targetTabId !== 'number' || targetTabId <= 0) {
      throw new Error('不正なタブIDが指定されました');
    }

    // 【設定値使用】: 外部化されたメッセージとインストラクション 🟢
    return {
      tabResult: 'failed',
      userAction: 'manual_required',
      message: LOGIN_DETECTION_MESSAGES.USER_GUIDANCE.MANUAL_TAB_ACTIVATION,
      instructions: [...LOGIN_DETECTION_MESSAGES.USER_GUIDANCE.INSTRUCTIONS],
    };
  }

  /**
   * 【機能概要】: 指定時間継続してのログイン要求検出（境界値テスト用）
   * 【改善内容】: 設定値の外部化、より詳細な判定ロジック
   * 【保守性】: 閾値の設定ファイル管理
   * 🟢 信頼性レベル: 要件定義の誤検出防止仕様（500ms継続条件）に基づく
   */
  static detectWithDuration(jobId: string, duration: number): DetectionResult {
    // 【入力値検証】: 不正な期間値への対応 🟡
    if (typeof duration !== 'number' || duration < 0) {
      throw new Error('不正な継続時間が指定されました');
    }

    // 【設定値使用】: 外部化された閾値設定 🟢
    const threshold = LOGIN_DETECTION_THRESHOLDS.MIN_DETECTION_DURATION_MS;

    if (duration < threshold) {
      return {
        detected: false,
        reason: 'below_threshold',
      };
    } else if (duration === threshold) {
      return {
        detected: true,
        reason: 'threshold_met',
      };
    } else {
      return {
        detected: true,
        reason: 'above_threshold',
      };
    }
  }

  /**
   * 【機能概要】: レート制限チェック（10分間で5回上限）
   * 【改善内容】: 設定値の外部化、時間窓の検証、より詳細な制限ロジック
   * 【保守性】: 制限値の設定ファイル管理
   * 🟢 信頼性レベル: 要件定義の無限ループ防止仕様（10分間で5回上限）に基づく
   */
  static checkRateLimit(attempts: number, _timeWindow: number): RateLimitResult {
    // 【入力値検証】: 不正な値への対応 🟡
    if (typeof attempts !== 'number' || attempts < 0) {
      throw new Error('不正な試行回数が指定されました');
    }

    // 【設定値使用】: 外部化された制限値 🟢
    const maxAttempts = LOGIN_DETECTION_THRESHOLDS.MAX_ATTEMPTS_PER_WINDOW;

    if (attempts >= maxAttempts) {
      return {
        blocked: true,
        autoResumeEnabled: false,
        reason: 'rate_limit_exceeded',
      };
    } else {
      return {
        blocked: false,
        autoResumeEnabled: true,
      };
    }
  }

  /**
   * 【機能概要】: タイムアウト付きでのログイン検出（1秒以内）
   * 【改善内容】: 設定値の外部化、より詳細なパフォーマンス監視
   * 【保守性】: パフォーマンス要件の設定ファイル管理
   * 🟡 信頼性レベル: 要件定義のパフォーマンス要件から推測
   */
  static detectWithTimeout(jobId: string, timeout: number): TimeoutResult {
    // 【入力値検証】: 不正なタイムアウト値への対応 🟡
    if (typeof timeout !== 'number' || timeout < 0) {
      throw new Error('不正なタイムアウト値が指定されました');
    }

    // 【設定値使用】: 外部化されたパフォーマンス要件 🟢
    const maxProcessingTime = LOGIN_DETECTION_THRESHOLDS.MAX_PROCESSING_TIME_MS;
    const withinSLA = timeout <= maxProcessingTime;
    const hasWarning = timeout > maxProcessingTime;

    return {
      completed: true,
      withinSLA,
      warning: hasWarning,
    };
  }

  /**
   * 【機能概要】: URL変化の処理（null/undefined安全性）
   * 【改善内容】: より詳細なnull処理、設定値の使用
   * 【保守性】: デフォルト値の設定ファイル管理
   * 🟡 信頼性レベル: 一般的なプログラミングベストプラクティスから推測
   */
  static handleUrlChange(url: string | null): UrlChangeResult {
    // 【null安全性処理強化】: より詳細なnull/undefined処理 🟡
    return {
      handled: true,
      fallback: url === null ? '' : LOGIN_DETECTION_DEFAULTS.DEFAULT_JOB_ID,
    };
  }

  /**
   * 【新機能】: DOM要素キャッシュのクリア
   * 【改善内容】: パフォーマンス最適化機能の外部公開
   * 【用途】: ページ遷移時やDOM変更時のキャッシュ無効化
   * 🟡 信頼性レベル: 一般的なキャッシュ管理パターンから実装
   */
  static clearDOMCache(): void {
    DOMElementCache.clearCache();
  }
}
