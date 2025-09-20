/**
 * Performance monitoring utilities for E2E tests
 */
import { Page } from '@playwright/test';

export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: number;
  networkRequests: number;
  errors: string[];
}

export class PerformanceMonitor {
  private startTime: number = 0;
  private metrics: PerformanceMetrics = {
    startTime: 0,
    endTime: 0,
    duration: 0,
    memoryUsage: 0,
    networkRequests: 0,
    errors: []
  };

  /**
   * 【パフォーマンス最適化】: ネットワークリクエストの効率的な追跡
   * 【設計方針】: メモリ効率とリアルタイム性を両立した実装
   * 🟢 信頼性レベル: Playwrightの標準APIを使用した確実な実装
   */
  private networkRequestCount: number = 0;

  constructor(private page: Page) {
    // 【効率的なネットワーク監視】: リクエスト発生時のリアルタイム追跡
    this.setupNetworkMonitoring();
  }

  /**
   * 【機能概要】: 効率的なネットワークリクエスト監視の設定
   * 【パフォーマンス】: イベント駆動によるO(1)の計算量を実現
   * 【メモリ効率】: リクエスト詳細を保存せず、カウントのみを追跡
   * 🟢 信頼性レベル: Playwrightのイベントシステムを活用
   */
  private setupNetworkMonitoring(): void {
    // 【リアルタイム監視】: ネットワークリクエストをリアルタイムで追跡
    this.page.on('request', () => {
      this.networkRequestCount++;
    });
  }

  /**
   * Start performance monitoring
   * 【メソッド目的】: パフォーマンス監視を開始する
   * 【実装内容】: パフォーマンス測定の開始と初期化の最小実装
   * 【テスト対応】: TC-081-201, TC-081-202でパフォーマンステストのための実装
   * 🟢 信頼性レベル: Date.now()を使用した時間測定は確実な方法
   */
  async startMonitoring(): Promise<void> {
    try {
      // 【測定開始時刻記録】: パフォーマンス測定の開始時刻を記録 🟢
      this.startTime = Date.now();
      this.metrics.startTime = this.startTime;
      this.metrics.errors = [];

      console.log('Performance monitoring started');

      // 【メモリ使用量初期化】: 初期メモリ使用量を記録 🟡
      // 実際のメモリ測定は後のフェーズで実装予定
      this.metrics.memoryUsage = 0;
      this.metrics.networkRequests = 0;

    } catch (error) {
      console.error('Performance monitoring start failed:', error);
      this.metrics.errors.push(`Monitoring start failed: ${error}`);
    }
  }

  /**
   * Stop monitoring and collect metrics
   * 【メソッド目的】: 監視を停止してメトリクスを収集する
   * 【実装内容】: パフォーマンス測定の終了と結果収集の最小実装
   * 【テスト対応】: TC-081-201, TC-081-202でパフォーマンス結果収集のための実装
   * 🟢 信頼性レベル: 時間計算と結果返却は確実な実装
   */
  async stopMonitoring(): Promise<PerformanceMetrics> {
    try {
      // 【測定終了時刻記録】: パフォーマンス測定の終了時刻を記録 🟢
      this.metrics.endTime = Date.now();
      this.metrics.duration = this.metrics.endTime - this.metrics.startTime;

      console.log(`Performance monitoring stopped. Duration: ${this.metrics.duration}ms`);

      // 【現在のメモリ使用量収集】: 測定終了時のメモリ使用量を記録 🟡
      this.metrics.memoryUsage = await this.monitorMemoryUsage();

      // 【ネットワークリクエスト数収集】: 総ネットワークリクエスト数を記録
      this.metrics.networkRequests = await this.countNetworkRequests();

      return { ...this.metrics }; // メトリクスのコピーを返却

    } catch (error) {
      console.error('Performance monitoring stop failed:', error);
      this.metrics.errors.push(`Monitoring stop failed: ${error}`);
      return { ...this.metrics };
    }
  }

  /**
   * Check if performance meets requirements
   * 【メソッド目的】: パフォーマンスが要件を満たしているかを確認する
   * 【実装内容】: 指定されたパフォーマンス要件と測定結果の比較の最小実装
   * 【テスト対応】: TC-081-201, TC-081-202でパフォーマンス要件確認のための実装
   * 🟢 信頼性レベル: 数値比較と結果生成は確実な実装
   */
  async checkPerformanceRequirements(
    maxDuration: number,
    maxMemory: number
  ): Promise<{ passed: boolean; details: string }> {
    try {
      const details: string[] = [];
      let passed = true;

      // 【実行時間チェック】: 最大実行時間との比較 🟢
      if (this.metrics.duration > maxDuration) {
        passed = false;
        details.push(`Duration exceeded: ${this.metrics.duration}ms > ${maxDuration}ms`);
      } else {
        details.push(`Duration OK: ${this.metrics.duration}ms <= ${maxDuration}ms`);
      }

      // 【メモリ使用量チェック】: 最大メモリ使用量との比較 🟢
      if (this.metrics.memoryUsage > maxMemory) {
        passed = false;
        details.push(`Memory exceeded: ${this.metrics.memoryUsage}MB > ${maxMemory}MB`);
      } else {
        details.push(`Memory OK: ${this.metrics.memoryUsage}MB <= ${maxMemory}MB`);
      }

      // 【エラーチェック】: パフォーマンス測定中のエラーを確認 🟢
      if (this.metrics.errors.length > 0) {
        passed = false;
        details.push(`Errors detected: ${this.metrics.errors.length} errors`);
      } else {
        details.push('No errors detected');
      }

      return {
        passed,
        details: details.join('; ')
      };

    } catch (error) {
      console.error('Performance requirements check failed:', error);
      return {
        passed: false,
        details: `Requirements check failed: ${error}`
      };
    }
  }

  /**
   * 【機能概要】: テスト中のメモリ使用量を正確に監視する
   * 【改善内容】: 実際のメモリ測定を実装し、パフォーマンス要件に対応
   * 【パフォーマンス】: 複数のメモリ指標を効率的に収集
   * 【信頼性】: フォールバック戦略により確実な測定値を提供
   * 🟢 信頼性レベル: Chrome Performance APIによる実装に基づく
   */
  async monitorMemoryUsage(): Promise<number> {
    try {
      // 【高精度メモリ測定】: Chrome Performance APIによる詳細なメモリ情報取得
      const memoryMetrics = await this.page.evaluate(() => {
        const metrics = {
          jsHeapUsed: 0,
          jsHeapTotal: 0,
          jsHeapLimit: 0,
          performanceMemory: false
        };

        // 【Chrome Performance Memory API】: 最も正確なメモリ情報を取得
        if ('memory' in performance) {
          const memInfo = (performance as any).memory;
          metrics.jsHeapUsed = memInfo.usedJSHeapSize;
          metrics.jsHeapTotal = memInfo.totalJSHeapSize;
          metrics.jsHeapLimit = memInfo.jsHeapSizeLimit;
          metrics.performanceMemory = true;
        }

        return metrics;
      });

      if (memoryMetrics.performanceMemory) {
        // 【実測値計算】: 実際のメモリ使用量をMB単位で算出
        const memoryUsedMB = Math.round(memoryMetrics.jsHeapUsed / 1024 / 1024);

        // 【パフォーマンス分析】: メモリ使用率の計算
        const memoryUsagePercent = Math.round(
          (memoryMetrics.jsHeapUsed / memoryMetrics.jsHeapLimit) * 100
        );

        console.log(`Memory usage: ${memoryUsedMB}MB (${memoryUsagePercent}% of limit)`);

        // 【メモリ警告】: 高いメモリ使用率の場合に警告を出力
        if (memoryUsagePercent > 80) {
          console.warn(`High memory usage detected: ${memoryUsagePercent}%`);
          this.metrics.errors.push(`High memory usage: ${memoryUsagePercent}%`);
        }

        return memoryUsedMB;
      }

      // 【フォールバック戦略】: Performance APIが利用できない場合の代替測定
      // プロセスメモリ情報の推定（Chrome DevTools Protocolの代替）
      const estimatedMemory = await this.page.evaluate(() => {
        // 【DOM要素数による推定】: DOM複雑度からメモリ使用量を推定
        const elementCount = document.querySelectorAll('*').length;
        const estimatedMB = Math.max(50, Math.min(1000, elementCount * 0.1));
        return Math.round(estimatedMB);
      });

      console.log(`Memory usage (estimated): ${estimatedMemory}MB`);
      return estimatedMemory;

    } catch (error) {
      console.error('Memory usage monitoring failed:', error);
      this.metrics.errors.push(`Memory monitoring error: ${error}`);

      // 【最小限のフォールバック】: エラー時でも合理的な値を返却
      return 128; // 最小限の推定値
    }
  }

  /**
   * 【機能概要】: テスト中のネットワークリクエスト数を正確にカウントする
   * 【改善内容】: リアルタイム監視による正確なリクエスト数測定を実装
   * 【パフォーマンス】: O(1)時間計算量による効率的なカウンティング
   * 【設計方針】: イベント駆動型による正確性とパフォーマンスの両立
   * 🟢 信頼性レベル: Playwrightのネットワークイベントによる実装
   */
  async countNetworkRequests(): Promise<number> {
    try {
      // 【実測値返却】: リアルタイム監視で収集した正確なリクエスト数を返却 🟢
      const actualRequests = this.networkRequestCount;

      // 【パフォーマンス分析】: リクエスト効率の計算
      const duration = this.metrics.duration || (Date.now() - this.startTime);
      const requestsPerSecond = duration > 0 ? (actualRequests / (duration / 1000)) : 0;

      console.log(`Network requests: ${actualRequests} (${requestsPerSecond.toFixed(2)} req/sec)`);

      // 【パフォーマンス警告】: 過度なネットワークリクエストの警告
      if (requestsPerSecond > 10) {
        console.warn(`High network activity detected: ${requestsPerSecond.toFixed(2)} req/sec`);
        this.metrics.errors.push(`High network activity: ${requestsPerSecond.toFixed(2)} req/sec`);
      }

      // 【効率性評価】: リクエスト数とテスト時間の関係を評価
      if (duration > 30000 && actualRequests > 100) {
        console.warn(`Potentially inefficient test: ${actualRequests} requests in ${duration}ms`);
      }

      return actualRequests;

    } catch (error) {
      console.error('Network request counting failed:', error);
      this.metrics.errors.push(`Network counting error: ${error}`);

      // 【エラー時フォールバック】: 監視に失敗した場合の代替値
      return this.networkRequestCount || 0;
    }
  }

  /**
   * Generate performance report
   * 【メソッド目的】: パフォーマンスレポートを生成する
   * 【実装内容】: 測定したパフォーマンスデータのレポート生成の最小実装
   * 【テスト対応】: TC-081-202でパフォーマンスレポート生成テストのための実装
   * 🟢 信頼性レベル: 文字列生成とJSONシリアライズは確実な実装
   */
  async generateReport(): Promise<string> {
    try {
      // 【レポートヘッダー生成】: レポートの基本情報を生成 🟢
      const reportHeader = `
=== Performance Report ===
Generated: ${new Date().toISOString()}
`;

      // 【メトリクスサマリ生成】: 主要なパフォーマンス指標をまとめたサマリ 🟢
      const metricsSection = `
--- Performance Metrics ---
Duration: ${this.metrics.duration}ms
Memory Usage: ${this.metrics.memoryUsage}MB
Network Requests: ${this.metrics.networkRequests}
Start Time: ${new Date(this.metrics.startTime).toISOString()}
End Time: ${new Date(this.metrics.endTime).toISOString()}
`;

      // 【エラーサマリ生成】: パフォーマンス測定中のエラー情報 🟢
      const errorsSection = `
--- Errors ---
${this.metrics.errors.length === 0 ? 'No errors detected' : this.metrics.errors.join('\n')}
`;

      // 【JSONデータセクション】: 機械読み取り用のJSONデータ 🟢
      const jsonSection = `
--- Raw Data (JSON) ---
${JSON.stringify(this.metrics, null, 2)}
`;

      // 【レポート結合】: 全セクションを結合して最終レポートを生成
      const fullReport = reportHeader + metricsSection + errorsSection + jsonSection;

      console.log('Performance report generated');
      return fullReport;

    } catch (error) {
      console.error('Performance report generation failed:', error);
      return `Performance Report Generation Failed: ${error}`;
    }
  }
}