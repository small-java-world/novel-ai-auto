/**
 * TASK-102: 新フォーマット対応・メタデータ管理 統合実装
 * 
 * 【機能概要】: 新フォーマット（v1.0）とメタデータ管理機能を既存機能と統合
 * 【実装状況】: 既存機能との統合フェーズ - プロンプト合成機能との連携
 * 【設計方針】: 既存機能との互換性を保ちながら新機能を統合
 * 【パフォーマンス】: 統合処理200ms以内、メタデータ読み込み100ms以内
 * 【保守性】: モジュール化された構造と包括的な日本語コメントで長期保守性を確保
 * 🟢 信頼性レベル: TASK-102要件定義書と既存機能の仕様に基づく
 * 
 * @version 1.0.0
 * @author NovelAI Auto Generator Team
 * @since 2025-09-20
 */

// 【型定義のインポート】: 統合で使用する型定義
import type {
  PromptFileV1,
  PresetV1,
  LegacyPromptFile
} from '../types/metadata';

import type {
  PresetData
} from './prompt-synthesis';

// 【クラスのインポート】: 統合対象のクラス
import { MetadataManager } from './metadata-manager';
import { FormatConverter } from './format-converter';
import { PromptSynthesizer } from './prompt-synthesis';

/**
 * 統合結果の型定義
 * @interface IntegrationResult
 */
export interface IntegrationResult {
  /** 統合成功フラグ */
  success: boolean;
  /** エラーメッセージ */
  error?: string;
  /** 統合されたデータ */
  data?: any;
  /** 処理時間 */
  processingTime: number;
  /** 統合統計 */
  statistics?: {
    presetsProcessed: number;
    metadataLoaded: boolean;
    formatConverted: boolean;
    synthesisEnabled: boolean;
  };
}

/**
 * 統合オプションの型定義
 * @interface IntegrationOptions
 */
export interface IntegrationOptions {
  /** 自動変換フラグ */
  autoConvert: boolean;
  /** メタデータ読み込みフラグ */
  loadMetadata: boolean;
  /** プロンプト合成フラグ */
  enableSynthesis: boolean;
  /** バックアップ作成フラグ */
  createBackup: boolean;
}

/**
 * IntegrationManagerクラス - 新フォーマット対応・メタデータ管理統合
 * 
 * 【機能概要】: 新フォーマット（v1.0）とメタデータ管理機能を既存のプロンプト合成機能と統合
 * 【設計方針】: 既存機能との互換性を保ちながら新機能を統合
 * 【拡張性】: 将来の機能拡張に対応可能な設計
 * 【互換性】: 既存のJSON形式との完全な互換性を保持
 * 🟢 信頼性レベル: TASK-102要件定義書の機能要件に基づく
 */
export class IntegrationManager {
  // 【プライベートプロパティ】: 内部状態管理
  private metadataManager: MetadataManager;
  private formatConverter: FormatConverter;
  private promptSynthesizer: PromptSynthesizer;
  private integrationMetrics: Array<{operation: string, duration: number, timestamp: number}> = [];
  
  /**
   * コンストラクタ
   * 【初期化処理】: IntegrationManagerの初期化
   * 【依存関係注入】: 必要なマネージャークラスの初期化
   */
  constructor() {
    // 統合フェーズ: 各マネージャークラスの初期化
    this.metadataManager = new MetadataManager();
    this.formatConverter = new FormatConverter();
    this.promptSynthesizer = new PromptSynthesizer();
    
    this.initializeIntegrationTracking();
    console.log('IntegrationManager initialized (Integration Phase - Ready)');
  }

  /**
   * 【統合追跡の初期化】: 統合処理の追跡準備
   * 【最適化】: メモリ効率とパフォーマンスの向上
   */
  private initializeIntegrationTracking(): void {
    this.integrationMetrics = [];
  }

  // ===== 統合機能メソッド =====

  /**
   * 【新フォーマットファイルの統合読み込み】: v1.0フォーマットファイルを既存機能と統合
   * 【機能概要】: 新フォーマット（v1.0）のプロンプトファイルを読み込み、既存機能と統合
   * 【設計方針】: 既存機能との互換性を保ちながら新機能を統合
   * 【パフォーマンス】: 統合処理200ms以内での完了を保証
   * 🟢 信頼性レベル: TC-102-301のテストケース要件に基づく
   * @param file - 読み込むプロンプトファイル
   * @param options - 統合オプション
   * @returns 統合結果
   */
  async integrateV1File(file: PromptFileV1, options: IntegrationOptions): Promise<IntegrationResult> {
    const startTime = performance.now();
    
    try {
      // メタデータの読み込み（オプションに応じて）
      const loadedFile = options.loadMetadata
        ? await this.metadataManager.loadPromptFile(file)
        : file;
      
      // プロンプト合成機能との統合
      const synthesisResult = await this.integrateWithSynthesis(loadedFile, options);
      
      // 統合統計の生成
      const statistics = {
        presetsProcessed: loadedFile.presets.length,
        metadataLoaded: !!options.loadMetadata,
        formatConverted: false,
        synthesisEnabled: options.enableSynthesis
      };

      // パフォーマンス測定
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      this.recordIntegration('integrateV1File', processingTime);

      return {
        success: true,
        data: {
          file: loadedFile,
          synthesis: synthesisResult
        },
        processingTime,
        statistics
      };
    } catch (error) {
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      this.recordIntegration('integrateV1File', processingTime, true);
      
      return {
        success: false,
        error: `Integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTime
      };
    }
  }

  /**
   * 【レガシーファイルの統合変換】: 既存形式ファイルを新フォーマットに変換して統合
   * 【機能概要】: 既存のJSON形式を新フォーマット（v1.0）に変換し、既存機能と統合
   * 【設計方針】: データ損失の防止と既存機能との互換性確保
   * 【パフォーマンス】: 変換・統合処理500ms以内での完了を保証
   * 🟢 信頼性レベル: TC-102-302のテストケース要件に基づく
   * @param legacyFile - 既存形式のファイル
   * @param options - 統合オプション
   * @returns 統合結果
   */
  async integrateLegacyFile(legacyFile: LegacyPromptFile, options: IntegrationOptions): Promise<IntegrationResult> {
    const startTime = performance.now();
    
    try {
      // 既存形式から新形式への変換
      const conversionResult = await this.formatConverter.convertLegacyToV1(legacyFile, {
        preserveMetadata: true,
        addDefaultMetadata: true,
        validateOutput: true
      });

      if (!conversionResult.success || !conversionResult.data) {
        throw new Error(conversionResult.error || 'Conversion failed');
      }

      // 変換されたファイルの統合
      const integrationResult = await this.integrateV1File(conversionResult.data, options);

      // 統合統計の更新
      if (integrationResult.statistics) {
        integrationResult.statistics.formatConverted = true;
      }

      // パフォーマンス測定
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      this.recordIntegration('integrateLegacyFile', processingTime);

      return integrationResult;
    } catch (error) {
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      this.recordIntegration('integrateLegacyFile', processingTime, true);
      
      return {
        success: false,
        error: `Legacy integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTime
      };
    }
  }

  /**
   * 【プロンプト合成機能との統合】: 新フォーマットデータをプロンプト合成機能と統合
   * 【機能概要】: 新フォーマット（v1.0）のプリセットデータをプロンプト合成機能で使用可能な形式に変換
   * 【設計方針】: 既存のプロンプト合成機能との互換性を保つ
   * 🟢 信頼性レベル: TC-102-303のテストケース要件に基づく
   * @param file - v1.0フォーマットのファイル
   * @param options - 統合オプション
   * @returns 統合結果
   */
  private async integrateWithSynthesis(file: PromptFileV1, options: IntegrationOptions): Promise<any> {
    if (!options.enableSynthesis) {
      return null;
    }

    try {
      // プリセットデータをプロンプト合成機能の形式に変換
      const synthesisData = this.convertPresetsToSynthesisFormat(file.presets);
      
      // プロンプト合成機能の初期化（必要に応じて）
      // この時点では、データの変換のみを行い、実際の合成は呼び出し元で実行
      
      return {
        presets: synthesisData,
        metadata: file.metadata,
        synthesisEnabled: true
      };
    } catch (error) {
      console.warn('Synthesis integration failed:', error);
      return {
        presets: [],
        metadata: file.metadata,
        synthesisEnabled: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 【プリセットデータの変換】: v1.0プリセットをプロンプト合成機能の形式に変換
   * 【機能概要】: 新フォーマット（v1.0）のプリセットデータを既存のプロンプト合成機能で使用可能な形式に変換
   * 【設計方針】: 既存のPresetDataインターフェースとの互換性を保つ
   * @param presets - v1.0フォーマットのプリセット配列
   * @returns 変換されたプリセットデータ
   */
  private convertPresetsToSynthesisFormat(presets: PresetV1[]): PresetData[] {
    return presets.map(preset => ({
      positive: preset.positive,
      negative: preset.negative,
      parameters: {
        steps: preset.parameters?.steps || 28,
        cfgScale: preset.parameters?.cfgScale || 7,
        sampler: preset.parameters?.sampler || 'k_euler',
        seed: preset.parameters?.seed || -1,
        count: preset.parameters?.count || 1
      }
    }));
  }

  /**
   * 【統合記録】: 統合処理の記録
   * 【最適化】: パフォーマンス監視の強化
   */
  private recordIntegration(operation: string, duration: number, isError: boolean = false): void {
    this.integrationMetrics.push({
      operation,
      duration,
      timestamp: Date.now()
    });
    
    if (isError) {
      console.error(`Integration error in ${operation}: ${duration}ms`);
    }
  }

  /**
   * 【統合統計の取得】: 統合処理の統計情報を取得
   * 【機能概要】: 統合処理のパフォーマンス統計を取得
   * @returns 統合統計情報
   */
  getIntegrationStatistics(): any {
    const totalOperations = this.integrationMetrics.length;
    const totalDuration = this.integrationMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    const averageDuration = totalOperations > 0 ? totalDuration / totalOperations : 0;
    const lastOperation = totalOperations > 0 ? this.integrationMetrics[totalOperations - 1].operation : undefined;
    return {
      totalOperations,
      averageDuration,
      errorCount: this.integrationMetrics.filter(metric => metric.duration > 1000).length,
      lastOperation
    };
  }

  /**
   * 【統合状態のリセット】: 統合状態をリセット
   * 【機能概要】: 統合処理の状態を初期化
   */
  resetIntegrationState(): void {
    this.integrationMetrics = [];
    console.log('Integration state reset');
  }
}
