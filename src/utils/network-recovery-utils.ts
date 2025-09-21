/**
 * TASK-071: Network Recovery Handler Utility Functions
 * 【機能概要】: ネットワーク復旧ハンドラーの共通処理とヘルパー関数
 * 【改善内容】: DRY原則の適用による重複コード除去とモジュール化
 * 【設計方針】: 再利用可能で保守性の高いユーティリティ関数の提供
 * 🟢 信頼性レベル: 既存実装から抽出した実証済みの処理パターン
 */

import {
  NetworkStateMessage,
  JobPausedMessage,
  JobResumedMessage,
  NetworkStateDetectionResult,
  JobPauseCollectiveResult,
  JobResumeCollectiveResult,
  GenerationJob,
  PausedJob,
} from '../types.js';
import { ERROR_MESSAGES, PERFORMANCE_CONFIG } from './network-recovery-config.js';
import { ValidationResult } from './network-recovery-validators.js';

/**
 * 【Null安全性ヘルパー】: null/undefined処理の統一パターン
 * 【改善内容】: 重複していたnull安全性処理を共通化
 * 【再利用性】: 全ての検証関数で使用可能な汎用的なパターン
 * 🟢 信頼性レベル: 既存のテスト要件(TC-071-204)に基づく実装
 */
export interface NullSafetyResult {
  handled: boolean;
  safe: boolean;
  action?: string;
  fallback?: string;
}

/**
 * 【Null安全性マーカー作成】: null/undefined処理結果のマーキング
 * 【使用場面】: TC-071-204境界値テストの期待値に対応
 * 【統一性】: 全ての関数で一貫したnull安全性レスポンスを提供
 */
export function createNullSafetyMarker(
  behaviorType: 'skip_processing' | 'assume_online' | 'use_current_time'
): NullSafetyResult {
  const base: NullSafetyResult = {
    handled: true,
    safe: true,
  };

  // 【行動タイプ別の追加プロパティ設定】: テスト期待値に合わせた特化処理
  switch (behaviorType) {
    case 'skip_processing':
      return { ...base, action: 'skipped' };
    case 'assume_online':
      return { ...base, fallback: 'online' };
    case 'use_current_time':
      return { ...base, fallback: 'Date.now()' };
    default:
      return base;
  }
}

/**
 * 【結果オブジェクト拡張】: 検証結果にnull安全性マーカーを追加
 * 【統合性】: 既存の結果オブジェクトを壊すことなく拡張
 * 【テスト対応】: TC-071-204の期待値を満たすプロパティ追加
 */
export function enhanceResultWithNullSafety<T extends object>(
  result: T,
  nullSafetyMarker: NullSafetyResult
): T & NullSafetyResult {
  return { ...result, ...nullSafetyMarker };
}

/**
 * 【エラーレスポンス統一ファクトリー】: 一貫したエラーレスポンス生成
 * 【改善内容】: 散在していたエラーレスポンス作成パターンを統一
 * 【保守性】: エラーレスポンスの形式変更時の影響範囲を最小化
 * 🟢 信頼性レベル: 既存のテスト要件に基づく統一エラー形式
 */
export interface StandardErrorResponse {
  success: boolean;
  errorMessage: string;
  errorCode?: string;
  timestamp: number;
}

/**
 * 【標準エラーレスポンス作成】: 統一されたエラーレスポンスオブジェクト生成
 * 【セキュリティ考慮】: エラーメッセージの長さ制限と機密情報漏洩防止
 * 【ユーザビリティ】: 分かりやすく一貫したエラーメッセージの提供
 */
export function createErrorResponse(
  message: string,
  errorCode?: string,
  additionalProperties: object = {}
): StandardErrorResponse & typeof additionalProperties {
  // 【メッセージ長制限】: セキュリティポリシーに基づくメッセージ長制御
  const MAX_ERROR_MESSAGE_LENGTH = 500;
  const truncatedMessage =
    message.length > MAX_ERROR_MESSAGE_LENGTH
      ? message.substring(0, MAX_ERROR_MESSAGE_LENGTH) + '...'
      : message;

  return {
    success: false,
    errorMessage: truncatedMessage,
    errorCode,
    timestamp: Date.now(),
    ...additionalProperties,
  };
}

/**
 * 【ジョブ配列処理ヘルパー】: ジョブ配列の効率的な処理パターン
 * 【パフォーマンス改善】: filter/map操作の最適化と一括処理
 * 【メモリ効率】: 不要な中間配列の生成を避けた効率的な処理
 * 🟡 信頼性レベル: パフォーマンス最適化を目的とした改善実装
 */
export interface JobProcessingResult<T> {
  processedJobs: T[];
  skippedJobs: GenerationJob[];
  processingCount: number;
  errors: string[];
}

/**
 * 【ジョブフィルタリング・変換】: 条件付きジョブ処理の効率化
 * 【最適化内容】: filter + map の二段階処理を一回のループに統合
 * 【エラー処理】: 処理中のエラーを安全に収集・レポート
 */
export function processJobsWithCondition<T>(
  jobs: GenerationJob[],
  condition: (job: GenerationJob) => boolean,
  transformer: (job: GenerationJob) => T,
  errorHandler?: (job: GenerationJob, error: Error) => string
): JobProcessingResult<T> {
  const result: JobProcessingResult<T> = {
    processedJobs: [],
    skippedJobs: [],
    processingCount: 0,
    errors: [],
  };

  // 【効率的な一括処理】: 単一ループでフィルタリングと変換を実行
  for (const job of jobs) {
    try {
      if (condition(job)) {
        // 【条件マッチ】: 変換処理を実行
        const transformedJob = transformer(job);
        result.processedJobs.push(transformedJob);
        result.processingCount++;
      } else {
        // 【条件非マッチ】: スキップ対象として記録
        result.skippedJobs.push(job);
      }
    } catch (error) {
      // 【エラー処理】: 処理エラーを安全に記録
      const errorMessage = errorHandler
        ? errorHandler(job, error as Error)
        : `ジョブ ${job.id} の処理中にエラーが発生しました`;
      result.errors.push(errorMessage);
      result.skippedJobs.push(job);
    }
  }

  return result;
}

/**
 * 【メッセージ生成ヘルパー】: ジョブ状態変更メッセージの統一生成
 * 【改善内容】: 重複していたメッセージ生成ロジックを共通化
 * 【一貫性】: 全てのメッセージで統一された形式とプロパティを保証
 * 🟢 信頼性レベル: 要件定義のメッセージ型定義に基づく実装
 */
export function createJobPausedMessage(jobId: string, pauseTime: number): JobPausedMessage {
  return {
    type: 'JOB_PAUSED',
    jobId,
    reason: 'network_offline',
    pausedAt: pauseTime,
  };
}

export function createJobResumedMessage(jobId: string, resumeTime: number): JobResumedMessage {
  return {
    type: 'JOB_RESUMED',
    jobId,
    reason: 'network_restored',
    resumedAt: resumeTime,
  };
}

export function createNetworkStateMessage(
  isOnline: boolean,
  timestamp: number,
  affectedJobs: string[] = []
): NetworkStateMessage {
  return {
    type: 'NETWORK_STATE_CHANGED',
    isOnline,
    timestamp,
    affectedJobs,
  };
}

/**
 * 【バッチ処理ヘルパー】: 大量データの効率的な分割処理
 * 【パフォーマンス改善】: メモリ使用量とCPU負荷の分散
 * 【スケーラビリティ】: 大量ジョブ処理時のシステム安定性確保
 * 🟡 信頼性レベル: システム負荷制御の一般的要件に基づく実装
 */
export interface BatchProcessingOptions {
  batchSize?: number;
  processingDelay?: number;
  maxConcurrent?: number;
}

/**
 * 【バッチ分割処理】: 配列を指定サイズのバッチに分割
 * 【効率化】: 大量データを処理可能なサイズに分割して順次処理
 * 【制御性】: バッチサイズと処理遅延の細かな制御が可能
 */
export function createBatches<T>(items: T[], options: BatchProcessingOptions = {}): T[][] {
  const {
    batchSize = PERFORMANCE_CONFIG.MAX_BATCH_SIZE,
    maxConcurrent = PERFORMANCE_CONFIG.MAX_BATCH_SIZE,
  } = options;

  const batches: T[][] = [];
  const effectiveBatchSize = Math.min(batchSize, maxConcurrent);

  // 【分割処理】: 効率的な配列分割
  for (let i = 0; i < items.length; i += effectiveBatchSize) {
    batches.push(items.slice(i, i + effectiveBatchSize));
  }

  return batches;
}

/**
 * 【遅延計算ヘルパー】: 指数バックオフ遅延の計算
 * 【改善内容】: 段階的再開処理の遅延計算ロジックを共通化
 * 【アルゴリズム最適化】: 効率的な指数計算と安全な上限制御
 * 🟢 信頼性レベル: TASK-032リトライエンジン仕様に基づく計算式
 */
export interface DelayCalculationOptions {
  baseDelay: number;
  factor: number;
  maxDelay?: number;
  jitterRange?: number; // ランダムなジッター追加（0.0-1.0）
}

/**
 * 【指数バックオフ遅延計算】: インデックスに基づく遅延時間計算
 * 【安全性】: オーバーフロー防止と妥当な上限制御
 * 【ランダム性】: ジッター追加による負荷分散効果（オプション）
 */
export function calculateExponentialDelay(index: number, options: DelayCalculationOptions): number {
  const { baseDelay, factor, maxDelay = Infinity, jitterRange = 0 } = options;

  // 【基本遅延計算】: 指数バックオフアルゴリズム
  let delay = index === 0 ? 0 : baseDelay * Math.pow(factor, index - 1);

  // 【上限制御】: 過度な遅延による問題を防止
  delay = Math.min(delay, maxDelay);

  // 【ジッター追加】: 同時処理による負荷集中を分散
  if (jitterRange > 0) {
    const jitter = delay * jitterRange * (Math.random() - 0.5);
    delay = Math.max(0, delay + jitter);
  }

  return Math.floor(delay);
}

/**
 * 【統計計算ヘルパー】: 処理結果の統計情報計算
 * 【改善内容】: 重複していた統計計算ロジックを共通化
 * 【可視性】: 処理結果の分析とモニタリングを支援
 * 🟡 信頼性レベル: 運用監視要件に基づく実用的実装
 */
export interface ProcessingStatistics {
  totalItems: number;
  immediate: number;
  queued: number;
  batchCount: number;
  averageDelay: number;
  maxDelay: number;
}

/**
 * 【遅延統計計算】: 遅延スケジュールの統計分析
 * 【監視支援】: システム負荷とパフォーマンスの可視化
 * 【最適化支援】: 設定調整のためのデータ提供
 */
export function calculateProcessingStatistics(
  delaySchedule: Array<{ delayMs: number }>,
  batchSize?: number
): ProcessingStatistics {
  const totalItems = delaySchedule.length;
  const delays = delaySchedule.map((item) => item.delayMs);

  // 【即座実行・キュー分類】: 遅延ゼロと遅延ありの分類
  const immediate = delays.filter((delay) => delay === 0).length;
  const queued = totalItems - immediate;

  // 【統計計算】: 平均遅延と最大遅延の計算
  const averageDelay =
    queued > 0
      ? delays.filter((delay) => delay > 0).reduce((sum, delay) => sum + delay, 0) / queued
      : 0;
  const maxDelay = delays.length > 0 ? Math.max(...delays) : 0;

  // 【バッチ数計算】: 指定されたバッチサイズに基づく分割数
  const effectiveBatchSize = batchSize || PERFORMANCE_CONFIG.MAX_BATCH_SIZE;
  const batchCount = Math.ceil(totalItems / effectiveBatchSize);

  return {
    totalItems,
    immediate,
    queued,
    batchCount,
    averageDelay: Math.floor(averageDelay),
    maxDelay,
  };
}

/**
 * 【キャッシュ機能ヘルパー】: 計算結果の効率的なキャッシング
 * 【パフォーマンス向上】: 重複計算の回避とレスポンス時間短縮
 * 【メモリ管理】: 適切なキャッシュサイズ制限とTTL管理
 * 🟡 信頼性レベル: 一般的なキャッシング要件に基づく実装
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttl: number;
  private readonly maxEntries: number;

  constructor(
    ttl = PERFORMANCE_CONFIG.CACHE_TTL_MS,
    maxEntries = PERFORMANCE_CONFIG.MAX_CACHE_ENTRIES
  ) {
    this.ttl = ttl;
    this.maxEntries = maxEntries;
  }

  /**
   * 【キャッシュ取得】: キーに基づく値の高速取得
   * 【TTL管理】: 期限切れエントリの自動削除
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // 【期限チェック】: TTL期限切れの確認
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // 【アクセス記録】: 使用頻度の追跡
    entry.accessCount++;
    return entry.value;
  }

  /**
   * 【キャッシュ設定】: 新しい値のキャッシュ格納
   * 【容量管理】: 最大エントリ数の制御とLRU削除
   */
  set(key: string, value: T): void {
    // 【容量制御】: 最大エントリ数を超えた場合の古いエントリ削除
    if (this.cache.size >= this.maxEntries) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * 【LRU削除】: 最も使用頻度の低いエントリを削除
   * 【効率性】: メモリ使用量の最適化
   */
  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let minAccessCount = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < minAccessCount) {
        minAccessCount = entry.accessCount;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }
}

// 【グローバルキャッシュインスタンス】: モジュール間での共有キャッシュ
export const sharedCache = new SimpleCache<any>();
