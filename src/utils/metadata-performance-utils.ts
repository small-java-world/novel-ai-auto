/**
 * TASK-102: メタデータ管理 - パフォーマンスユーティリティ
 *
 * 【機能概要】: メタデータ処理のパフォーマンス最適化機能を提供
 * 【改善内容】: タグ処理の効率化、メモリ使用量の最適化、大容量ファイル対応
 * 【設計方針】: パフォーマンス機能を分離してテスト可能性と保守性を向上
 * 【パフォーマンス】: O(n²)アルゴリズムをO(n)に改善、メモリ効率の向上
 * 🟢 信頼性レベル: NFR-102-001〜003性能要件に基づく
 *
 * @version 1.0.0
 * @author NovelAI Auto Generator Team
 * @since 2025-01-20 (Refactor phase)
 */

import { PERFORMANCE_CONFIG } from './metadata-manager-config';
import type { PresetV1, MetadataV1 } from '../types/metadata';

/**
 * 【パフォーマンス最適化】: 高効率タグ重複除去処理
 * 【改善内容】: O(n²)の処理をO(n)に改善し、メモリ使用量も最適化
 * 【設計方針】: 複数のデータソースから効率的にユニークタグを収集
 * 🔴 改善: Greenフェーズの非効率な処理を高速化
 *
 * @param metadata - メタデータオブジェクト（タグソース1）
 * @param presets - プリセット配列（タグソース2）
 * @returns 重複を除去したタグ配列
 */
export function deduplicateTagsEfficient(metadata: MetadataV1, presets: PresetV1[]): string[] {
  // 【高速重複除去】: Set を使用してO(1)の重複チェックを実現
  const uniqueTagsSet = new Set<string>();

  // 【メタデータタグ処理】: メタデータのタグを安全に追加
  if (metadata.tags) {
    for (const tag of metadata.tags) {
      // 【型安全性】: 文字列以外の値を安全にフィルタリング
      if (typeof tag === 'string' && tag.trim().length > 0) {
        uniqueTagsSet.add(tag.trim());
      }
    }
  }

  // 【プリセットタグ処理】: 全プリセットからタグを効率的に収集
  for (const preset of presets) {
    if (preset.tags) {
      for (const tag of preset.tags) {
        // 【型安全性と正規化】: 有効な文字列タグのみを処理
        if (typeof tag === 'string' && tag.trim().length > 0) {
          uniqueTagsSet.add(tag.trim());
        }
      }
    }
  }

  // 【メモリ効率化】: Set から配列への効率的な変換
  return Array.from(uniqueTagsSet);
}

/**
 * 【パフォーマンス最適化】: メモ化機能付きタグフィルタリング
 * 【改善内容】: 同じフィルタ条件の結果をキャッシュして処理速度を向上
 * 【設計方針】: LRUキャッシュを使用してメモリ使用量を制御
 * 🔴 改善: 繰り返し処理に対するパフォーマンス最適化
 */
export class OptimizedTagFilter {
  private cache = new Map<string, PresetV1[]>();
  private readonly maxCacheSize: number;

  constructor(maxCacheSize: number = 100) {
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * 【高速フィルタリング】: キャッシュ機能付きタグベースフィルタリング
   * 【パフォーマンス】: 同一条件での繰り返し処理を高速化
   *
   * @param presets - フィルタリング対象のプリセット配列
   * @param selectedTags - 選択されたタグ配列
   * @returns フィルタリング済みプリセット配列
   */
  filterPresetsByTags(presets: PresetV1[], selectedTags: string[]): PresetV1[] {
    // 【早期リターン】: タグが選択されていない場合は全件返却
    if (selectedTags.length === 0) {
      return presets;
    }

    // 【キャッシュキー生成】: ソート済みタグからユニークなキーを生成
    const cacheKey = [...selectedTags].sort().join('|');

    // 【キャッシュヒット確認】: 既存の結果があれば即座に返却
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 【実際のフィルタリング処理】: AND条件での効率的なフィルタリング
    const filteredPresets = presets.filter((preset) => {
      // 【早期リターン】: タグがないプリセットは除外
      if (!preset.tags || preset.tags.length === 0) {
        return false;
      }

      // 【高速マッチング】: Set を使用したO(1)のタグマッチング
      const presetTagsSet = new Set(preset.tags);
      return selectedTags.every((selectedTag) => presetTagsSet.has(selectedTag));
    });

    // 【キャッシュ管理】: LRU方式でキャッシュサイズを制御
    this.addToCache(cacheKey, filteredPresets);

    return filteredPresets;
  }

  /**
   * 【キャッシュ管理】: LRU (Least Recently Used) 方式でキャッシュを管理
   * 【メモリ効率化】: メモリ使用量を制限してメモリリークを防止
   */
  private addToCache(key: string, result: PresetV1[]): void {
    // 【LRU実装】: 既存キーは削除して最新位置に再挿入
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 【サイズ制限】: キャッシュサイズが上限を超える場合は古いエントリを削除
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // 【新規エントリ追加】: 最新の結果をキャッシュに追加
    this.cache.set(key, result);
  }

  /**
   * 【メモリ管理】: キャッシュクリア機能
   * 【保守性】: 明示的なメモリ解放でガベージコレクションを支援
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 【監視機能】: キャッシュ使用状況の取得
   * 【デバッグ支援】: キャッシュ効率の監視とパフォーマンス分析
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      // 将来的にヒット率も追跡可能
    };
  }
}

/**
 * 【パフォーマンス監視】: 処理時間測定とパフォーマンス分析
 * 【改善内容】: 各処理の実行時間を監視して性能要件の遵守を確認
 * 【設計方針】: 非侵入的な監視でパフォーマンスオーバーヘッドを最小化
 * 🟡 改善: 性能監視とボトルネック特定のための機能拡張
 */
export class PerformanceMonitor {
  private measurements = new Map<string, number[]>();

  /**
   * 【時間測定開始】: 処理の開始時刻を記録
   * @param operationName - 測定対象の処理名
   * @returns 測定を終了するための関数
   */
  startMeasurement(operationName: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // 【測定結果記録】: 処理時間を蓄積して統計分析を可能にする
      const measurements = this.measurements.get(operationName) || [];
      measurements.push(duration);

      // 【メモリ効率化】: 測定データの上限を設けてメモリ使用量を制御
      const MAX_MEASUREMENTS = 1000;
      if (measurements.length > MAX_MEASUREMENTS) {
        measurements.shift(); // 古いデータを削除
      }

      this.measurements.set(operationName, measurements);

      // 【性能要件チェック】: 目標時間を超過した場合の警告
      this.checkPerformanceTarget(operationName, duration);
    };
  }

  /**
   * 【性能要件チェック】: 実行時間が目標値を超過していないか確認
   * 【品質保証】: NFR-102-001〜003の性能要件遵守を監視
   */
  private checkPerformanceTarget(operationName: string, duration: number): void {
    const thresholds: Record<string, number> = {
      metadata_load: PERFORMANCE_CONFIG.METADATA_LOAD_TARGET_MS,
      tag_filtering: PERFORMANCE_CONFIG.TAG_FILTERING_TARGET_MS,
      format_conversion: PERFORMANCE_CONFIG.FORMAT_CONVERSION_TARGET_MS,
    };

    const threshold = thresholds[operationName];
    if (threshold && duration > threshold) {
      console.warn(
        `Performance warning: ${operationName} took ${duration.toFixed(2)}ms (target: ${threshold}ms)`
      );
    }
  }

  /**
   * 【統計分析】: 測定データから統計情報を生成
   * 【パフォーマンス分析】: 平均値、最大値、最小値を計算してボトルネックを特定
   *
   * @param operationName - 分析対象の処理名
   * @returns 統計情報オブジェクト
   */
  getStatistics(operationName: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    median: number;
  } | null {
    const measurements = this.measurements.get(operationName);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    // 【統計計算】: 基本的な統計値を効率的に計算
    const sorted = [...measurements].sort((a, b) => a - b);
    const count = measurements.length;
    const sum = measurements.reduce((acc, val) => acc + val, 0);

    return {
      count,
      average: sum / count,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
    };
  }

  /**
   * 【レポート生成】: 全体的なパフォーマンス状況のレポート
   * 【監視支援】: システム全体のパフォーマンス状況を把握
   */
  generateReport(): Record<string, any> {
    const report: Record<string, any> = {};

    for (const [operationName] of this.measurements) {
      report[operationName] = this.getStatistics(operationName);
    }

    return report;
  }

  /**
   * 【データクリア】: 測定データの初期化
   * 【メモリ管理】: 長期間の実行でメモリ使用量が増大するのを防止
   */
  clearMeasurements(): void {
    this.measurements.clear();
  }
}

/**
 * 【大容量ファイル対応】: ストリーミング処理による効率的なファイル処理
 * 【改善内容】: 10MBに近い大容量ファイルでもメモリ効率よく処理
 * 【設計方針】: チャンク単位の処理でメモリ使用量を制御
 * 🔴 改善: Greenフェーズでは未対応だった大容量ファイル処理を追加
 *
 * @param data - 処理対象の大容量文字列
 * @param chunkSize - チャンクサイズ（バイト）
 * @returns 処理済みデータのストリーム
 */
export async function* processLargeDataStream(
  data: string,
  chunkSize: number = PERFORMANCE_CONFIG.LARGE_FILE_CHUNK_SIZE
): AsyncGenerator<string, void, unknown> {
  let offset = 0;

  while (offset < data.length) {
    // 【チャンク切り出し】: 指定サイズごとにデータを分割
    const chunk = data.slice(offset, offset + chunkSize);

    // 【非同期処理】: UIをブロックしないように非同期でチャンクを処理
    yield new Promise<string>((resolve) => {
      // 【非ブロッキング処理】: setTimeoutでイベントループを解放
      setTimeout(() => {
        resolve(chunk);
      }, 0);
    });

    offset += chunkSize;

    // 【メモリ解放】: ガベージコレクションの機会を提供
    if (offset % (chunkSize * 10) === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }
}

/**
 * 【メモリ使用量監視】: メモリ使用状況の監視と警告
 * 【改善内容】: メモリリークや過度なメモリ使用を早期に検出
 * 【設計方針】: ブラウザ環境での制約を考慮した軽量な監視機能
 * 🟡 改善: 将来のメモリ使用量最適化のための監視機能
 */
export function checkMemoryUsage(): {
  isMemoryWarning: boolean;
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
} {
  // 【ブラウザ互換性】: performance.memory が利用可能な場合のみ監視
  if ('memory' in performance) {
    const memory = (performance as any).memory;

    const usedMB = memory.usedJSHeapSize / (1024 * 1024);
    const warningThresholdMB = PERFORMANCE_CONFIG.MEMORY_WARNING_THRESHOLD / (1024 * 1024);

    return {
      isMemoryWarning: usedMB > warningThresholdMB,
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }

  // 【フォールバック】: memory API が利用できない環境では警告なし
  return {
    isMemoryWarning: false,
  };
}

/**
 * 【シングルトンインスタンス】: グローバルなパフォーマンス監視インスタンス
 * 【設計方針】: アプリケーション全体で統一されたパフォーマンス監視
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * 【シングルトンインスタンス】: グローバルなタグフィルタインスタンス
 * 【設計方針】: キャッシュ効果を最大化するための共有インスタンス
 */
export const globalTagFilter = new OptimizedTagFilter();
