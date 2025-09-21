/**
 * 【機能概要】: リトライエンジン（指数バックオフ）を提供するユーティリティ
 * 【実装方針】: 本番コードからテスト環境依存を排除。同期的に await/catch で拒否を捕捉。
 * 【テスト対応】: retry-engine.test.ts の全テストケースを通すことを目的
 * 🟢🟡🔴 信頼性レベル: 🟢 既存テストとプロジェクト内コメントに即した実装
 */

export interface RetryEngine {
  /**
   * 【機能概要】: 指数バックオフの遅延時間を算出
   * 【実装方針】: baseDelay * factor^attempts を四捨五入
   * 【テスト対応】: デフォルト/カスタム設定の遅延計算ケース
   * 🟢🟡🔴 信頼性レベル: 🟢 テストに明示
   * @param {number} attempts - 試行回数（0起点）
   * @returns {number} - 遅延時間(ms)
   */
  calculateDelay(_attempts: number): number;

  /**
   * 【機能概要】: 再試行すべきかを判定
   * 【実装方針】: キャンセル状態と上限回数で判定
   * 【テスト対応】: 上限停止/キャンセル/境界値の各ケース
   * 🟢🟡🔴 信頼性レベル: 🟢 テストに明示
   */
  shouldRetry(_attempts: number): boolean;

  /**
   * 【機能概要】: 指定遅延後にコールバックを実行
   * 【実装方針】: setTimeoutで実行し、キャンセル時は何もしない
   * 【テスト対応】: 実遅延の検証、キャンセル時未実行
   * 🟢🟡🔴 信頼性レベル: 🟢 テストに明示
   */
  executeWithDelay(_delay: number, _callback: () => void): void;

  /**
   * 【機能概要】: 失敗を記録（内部カウンタを加算）
   * 【実装方針】: カウンタのみ加算
   * 【テスト対応】: リセット動作の検証に使用
   * 🟢🟡🔴 信頼性レベル: 🟢 テストに明示
   */
  recordFailure(): void;

  /**
   * 【機能概要】: 現在の試行回数を取得
   * 【実装方針】: 内部カウンタを返す
   * 【テスト対応】: リセット前後の値検証
   * 🟢🟡🔴 信頼性レベル: 🟢 テストに明示
   */
  getCurrentAttempts(): number;

  /**
   * 【機能概要】: 状態をリセット
   * 【実装方針】: カウンタ/キャンセル状態/保留タイマーを初期化
   * 【テスト対応】: リセット動作の検証
   * 🟢🟡🔴 信頼性レベル: 🟢 テストに明示
   */
  reset(): void;

  /**
   * 【機能概要】: キャンセル状態にして以降の動作を停止
   * 【実装方針】: フラグを立て、保留中のタイマーもクリア
   * 【テスト対応】: キャンセル時の未実行/未再試行
   * 🟢🟡🔴 信頼性レベル: 🟢 テストに明示
   */
  cancel(): void;

  /**
   * 【機能概要】: 対象の非同期処理を指数バックオフでリトライ実行
   * 【実装方針】: operation() を直接 await し、catch で同期捕捉して未処理拒否を出さない
   * 【テスト対応】: 上限到達時のエラー伝播、実遅延、回数制御など
   * 🟢🟡🔴 信頼性レベル: 🟢 テストに明示
   */
  executeWithRetry<T>(
    _operation: (_signal?: AbortSignal) => Promise<T>,
    _options?: { signal?: AbortSignal }
  ): Promise<T>;

  /**
   * 【機能概要】: 実行ハンドルを返す版（エンジン駆動の中断）
   * 【実装方針】: 内部 AbortController で中断し、operation と待機に伝播
   */
  runWithRetry<T>(
    _operation: (_signal?: AbortSignal) => Promise<T>,
    _options?: { signal?: AbortSignal }
  ): ExecutionHandle<T>;

  /**
   * 【機能概要】: 現在の試行回数から上限までのバックオフ遅延(ms)配列を先読みで返す
   * 【実装方針】: calculateDelay を用い、attempts を連番で列挙して配列化するだけの最小実装
   * 【テスト対応】: previewDelays のRedテスト（[100,200,400]を期待）を通すための実装
   * 🟡 信頼性レベル: 設計(architecture.mdのバックオフ設定)/dataflowの再試行記述に基づく妥当な拡張
   * @param {number} [remaining] - 返す件数の上限（省略時は残り最大回数）
   * @returns {number[]} - 予定バックオフ遅延(ms)の配列
   */
  previewDelays?(_remaining?: number): number[];
}

export interface ExecutionHandle<T> {
  promise: Promise<T>;
  cancel: () => void;
  signal: AbortSignal;
}

export interface RetryConfig {
  // 【定数定義】: バックオフ計算の基点となる遅延(ms)
  baseDelay: number;
  // 【定数定義】: 指数バックオフの倍率
  factor: number;
  // 【定数定義】: 最大リトライ回数（試行は0..maxRetriesの計maxRetries+1回）
  maxRetries: number;
}

/**
 * 【機能概要】: リトライエンジンを生成
 * 【実装方針】: 内部状態を閉じ込めたクロージャで実装
 * 【テスト対応】: retry-engine.test.ts 全ケース
 * 🟢🟡🔴 信頼性レベル: 🟢 テスト仕様に基づく
 * @param {RetryConfig} config - リトライ設定
 * @returns {RetryEngine} - エンジン実体
 */
export function createRetryEngine(config: RetryConfig): RetryEngine {
  // 【入力バリデーション】: 設定値の妥当性チェック 🟢
  const { baseDelay, factor, maxRetries } = config;
  const isFiniteNumber = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (!isFiniteNumber(baseDelay) || baseDelay < 0) {
    throw new TypeError('baseDelay must be a finite number >= 0');
  }
  if (!isFiniteNumber(factor) || factor <= 0) {
    throw new TypeError('factor must be a finite number > 0');
  }
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new TypeError('maxRetries must be an integer >= 0');
  }

  // 【変数初期化】: 現在の試行回数を保持するカウンタ 🟢
  let currentAttempts = 0;
  // 【変数初期化】: キャンセル状態フラグ 🟢
  let isCancelled = false;
  // 【変数初期化】: アクティブなタイマーIDを保持（キャンセル/リセットでクリア）🟢
  const activeTimeouts = new Set<ReturnType<typeof setTimeout>>();

  return {
    /**
     * 【機能概要】: 指数バックオフの遅延時間を算出
     * 【実装方針】: baseDelay * factor^attempts をMath.round
     * 【テスト対応】: 遅延計算の2ケース
     * 🟢🟡🔴 信頼性レベル: 🟢
     */
    calculateDelay(attempts: number): number {
      // 【入力値検証】: 非負の回数を想定（テストでは0起点）🟢
      if (!Number.isFinite(attempts) || attempts < 0) attempts = 0;
      return Math.round(config.baseDelay * Math.pow(config.factor, attempts));
    },

    /**
     * 【機能概要】: 再試行すべきかを判定
     * 【実装方針】: キャンセル時は常にfalse、そうでなければ上限比較
     * 【テスト対応】: 上限停止/キャンセル/境界値
     * 🟢🟡🔴 信頼性レベル: 🟢
     */
    shouldRetry(attempts: number): boolean {
      if (isCancelled) return false; // 【キャンセル優先】: テスト要件 🟢
      return attempts < config.maxRetries;
    },

    /**
     * 【機能概要】: 指定遅延後にコールバックを実行
     * 【実装方針】: setTimeoutで登録し、IDを追跡。キャンセル時は何もしない。
     * 【テスト対応】: 遅延の実行/キャンセル時未実行
     * 🟢🟡🔴 信頼性レベル: 🟢
     */
    executeWithDelay(delay: number, callback: () => void): void {
      // 【キャンセル確認】: キャンセル中は即復帰 🟢
      if (isCancelled) return;

      const timeoutId = setTimeout(() => {
        activeTimeouts.delete(timeoutId);
        if (!isCancelled) {
          callback();
        }
      }, delay);

      activeTimeouts.add(timeoutId);
    },

    /**
     * 【機能概要】: 失敗回数を1加算
     * 【実装方針】: 内部カウンタをインクリメント
     * 【テスト対応】: リセット前後の値検証
     * 🟢🟡🔴 信頼性レベル: 🟢
     */
    recordFailure(): void {
      currentAttempts += 1; // 【変数更新】: カウンタ加算 🟢
    },

    /**
     * 【機能概要】: 現在の試行回数を返却
     * 【実装方針】: 内部カウンタをそのまま返す
     * 【テスト対応】: リセット検証
     * 🟢🟡🔴 信頼性レベル: 🟢
     */
    getCurrentAttempts(): number {
      return currentAttempts;
    },

    /**
     * 【機能概要】: 状態を初期化
     * 【実装方針】: カウンタ/フラグ/タイマーをクリア
     * 【テスト対応】: リセット動作
     * 🟢🟡🔴 信頼性レベル: 🟢
     */
    reset(): void {
      currentAttempts = 0; // 【カウンタ】: 0へリセット 🟢
      isCancelled = false; // 【フラグ】: キャンセル解除 🟢
      for (const t of activeTimeouts) clearTimeout(t); // 【タイマー】: クリア 🟢
      activeTimeouts.clear();
    },

    /**
     * 【機能概要】: キャンセル状態に設定し、保留中のタイマーを停止
     * 【実装方針】: フラグを立て、登録済みタイマーを全解除
     * 【テスト対応】: キャンセル時の挙動
     * 🟢🟡🔴 信頼性レベル: 🟢
     */
    cancel(): void {
      isCancelled = true;
      for (const t of activeTimeouts) clearTimeout(t);
      activeTimeouts.clear();
    },

    /**
     * 【機能概要】: operationを指数バックオフ付きで最大回数まで再試行
     * 【実装方針】: await/try-catchで同期捕捉し、未処理拒否を発生させない
     * 【テスト対応】: 上限到達時のエラー伝播、回数/遅延の検証
     * 🟢🟡🔴 信頼性レベル: 🟢
     */
    async executeWithRetry<T>(
      _operation: (_signal?: AbortSignal) => Promise<T>,
      _options?: { signal?: AbortSignal }
    ): Promise<T> {
      // 【小関数】: AbortError生成
      const abortError = (): Error => {
        const err = new Error('The operation was aborted');
        (err as any).name = 'AbortError';
        return err;
      };

      // 【小関数】: 指定時間待機（Abort対応）
      const waitWithAbort = (ms: number, signal?: AbortSignal) =>
        new Promise<void>((resolve, reject) => {
          if (signal?.aborted) return reject(abortError());
          const tid = setTimeout(() => {
            cleanup();
            resolve();
          }, ms);
          activeTimeouts.add(tid);
          const onAbort = () => {
            clearTimeout(tid);
            activeTimeouts.delete(tid);
            cleanup();
            reject(abortError());
          };
          const cleanup = () => {
            if (signal) signal.removeEventListener('abort', onAbort);
          };
          if (signal) signal.addEventListener('abort', onAbort, { once: true });
        });

      // 【小関数】: 1回の試行を実行して結果/エラーを返す（同期接続で未処理拒否抑止）🟢
      const attemptOnce = async (signal?: AbortSignal): Promise<T> => {
        if (signal?.aborted) throw abortError();
        try {
          // await による同期的なエラーハンドラ接続
          return await _operation(signal);
        } catch (e) {
          // Error へ正規化
          throw e instanceof Error ? e : new Error(String(e));
        }
      };

      let lastError: Error | undefined;
      const externalSignal = _options?.signal;
      if (externalSignal?.aborted) throw abortError();

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        if (externalSignal?.aborted) throw abortError();
        try {
          const result = await attemptOnce(externalSignal);
          return result;
        } catch (error) {
          lastError = error as Error;
          if (externalSignal?.aborted) throw abortError();

          // Check for non-retryable errors that should fail immediately
          if ((error as any)?.isNonRetryable === true) {
            throw lastError;
          }

          if (!this.shouldRetry(attempt)) {
            throw lastError;
          }

          if (attempt < config.maxRetries) {
            const delay = this.calculateDelay(attempt);
            // 外部シグナルがあれば中断可能な待機を行う
            if (externalSignal) {
              await waitWithAbort(delay, externalSignal);
            } else {
              await new Promise<void>((resolve) => this.executeWithDelay(delay, resolve));
            }
          }
        }
      }

      throw lastError ?? new Error('Unknown retry error');
    },

    runWithRetry<T>(
      _operation: (_signal?: AbortSignal) => Promise<T>,
      _options?: { signal?: AbortSignal }
    ): ExecutionHandle<T> {
      const internal = new AbortController();

      // 外部シグナルが渡された場合は内部へワンウェイ伝播
      const external = _options?.signal;
      let removeExternalListener: (() => void) | undefined;
      if (external) {
        const onAbort = () => internal.abort();
        external.addEventListener('abort', onAbort, { once: true });
        removeExternalListener = () => external.removeEventListener('abort', onAbort);
        if (external.aborted) internal.abort();
      }

      // 実行開始はマイクロタスクにディファーし、即時 cancel を確実に先行させる
      const promise = Promise.resolve()
        .then(() => this.executeWithRetry(_operation, { signal: internal.signal }))
        .finally(() => {
          if (removeExternalListener) removeExternalListener();
        });

      return {
        promise,
        cancel: () => internal.abort(),
        signal: internal.signal,
      };
    },

    /**
     * 【機能概要】: 次に発生し得るバックオフ遅延(ms)を配列で先読みする
     * 【実装方針】: 現在の試行回数 currentAttempts から maxRetries-1 までを対象に
     *               calculateDelay(attempt) を順に評価して配列化する最小実装
     * 【テスト対応】: src/utils/retry-engine.previewDelays.red.test.ts をGreenにする
     * 🟡 信頼性レベル: 設計資料のバックオフ仕様に基づく拡張（外部APIは新設）
     */
    previewDelays(remaining?: number): number[] {
      // 【入力値検証】: remaining が負や非数の場合は無視して残数全量にする 🟡
      if (isCancelled) {
        // 【キャンセル時挙動】: 副作用を避け空配列を返す（将来仕様想定の安全側）🟡
        return [];
      }
      const start = currentAttempts;
      const maxCount = Math.max(0, config.maxRetries - start);
      const take =
        Number.isFinite(remaining as number) && (remaining as number) > 0
          ? Math.min(maxCount, Math.trunc(remaining as number))
          : maxCount;
      const out: number[] = [];
      for (let i = 0; i < take; i++) {
        out.push(this.calculateDelay(start + i));
      }
      return out;
    },
  };
}
