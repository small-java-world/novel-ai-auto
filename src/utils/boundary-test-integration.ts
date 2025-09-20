/**
 * 【機能概要】: システム全体における境界値での統合動作確認機能
 * 【実装方針】: TDD Refactor フェーズでコード品質と保守性を向上
 * 【改善内容】: 定数外部化、関数分割、重複コード排除による可読性向上
 * 【設計方針】: 単一責任原則と依存関係分離による保守性改善
 * 【テスト対応】: boundary-test-integration.red.test.ts の11テストケースを継続対応
 * 【ファイルサイズ】: 518行から450行以下への最適化
 */

// 【依存関係の明確化】: 定数、ヘルパー、モジュール関数の分離による責任分離
import { BOUNDARY_LIMITS, MODULE_NAMES, TEST_STATUS } from './boundary-test-constants';
import {
  TestCase,
  TestStatistics,
  updateTestStatistics,
  determineModuleStatus,
  createInitialStatistics,
  isWithinBounds,
  truncateString,
} from './boundary-test-helpers';
import {
  validateBoundaryTestInput,
  executeAllBoundaryTests,
  createPromptTestCase,
  createImageCountTestCase,
  createRetryTestCase,
  createSystemIntegrationTestCase,
  addTestMessagesToArrays,
  createErrorBoundaryTestResult,
  createEmptyBoundaryResult,
} from './boundary-test-module-functions';

/**
 * 境界値テスト入力パラメータのインターフェース
 * 【定義継承】: テストケース定義から引き継いだ構造
 * 【設計改善】: 明確なプロパティ定義とコメント整理
 */
export interface BoundaryTestInput {
  promptText: string;
  imageCount: number;
  retrySettings: {
    maxRetries: number;
    baseDelay: number;
    factor: number;
  };
  testCombinations?: boolean;
  simulateFailure?: boolean;
}

/**
 * 個別境界値テスト結果のインターフェース
 * 【構造化結果】: 各モジュール別の境界値テスト結果を管理
 * 【設計改善】: ヘルパー関数からの型定義利用と責任分離
 */
export interface BoundaryResult {
  module: string;
  status: (typeof TEST_STATUS)[keyof typeof TEST_STATUS];
  testCases: TestCase[];
  // プロンプト処理関連プロパティ
  processedLength?: number;
  originalLength?: number;
  processedPrompt?: string;
  // 画像生成関連プロパティ
  requestedCount?: number;
  validatedCount?: number;
  invalidValue?: number;
  validRange?: { min: number; max: number };
  // リトライ処理関連プロパティ
  settingsValid?: boolean;
  retriesExecuted?: number;
  maxRetriesLimit?: number;
  retryExhaustionReason?: string;
  retriesAttempted?: number;
  maxRetriesReached?: boolean;
  finalFailure?: boolean;
  // システム統合関連プロパティ
  minLoadConfiguration?: boolean;
  promptLength?: number;
  imageCount?: number;
  estimatedProcessingTime?: string;
  conflictingParameter?: string;
  conflictPriority?: string;
  errorPriority?: string;
  multipleIssues?: boolean;
  maxLoadConfiguration?: boolean;
  allParametersInvalid?: boolean;
  configurationRequired?: boolean;
  retrySettingsValid?: boolean;
}

/**
 * 境界値テスト結果のインターフェース
 * 【統合結果管理】: システム全体の境界値テスト結果を一元管理
 * 【設計改善】: ヘルパー関数からの型定義利用
 */
export interface BoundaryTestResult {
  success: boolean;
  results: {
    promptApplication: BoundaryResult;
    imageGeneration: BoundaryResult;
    retryProcessing: BoundaryResult;
    systemIntegration: BoundaryResult;
  };
  warnings: string[];
  errors: string[];
  statistics: TestStatistics;
}

/**
 * 【機能概要】: システム全体の境界値テストを統合的に実行する主要関数
 * 【改善内容】: 定数外部化とヘルパー関数による可読性・保守性向上
 * 【設計方針】: 単一責任原則とモジュール分離による品質改善
 * 【テスト対応】: TC-073-001〜TC-073-011の全テストケースを継続対応
 * @param input 境界値テスト入力パラメータ
 * @returns 境界値テスト結果
 */
export async function ensureBoundaryTestIntegration(
  input: BoundaryTestInput
): Promise<BoundaryTestResult> {
  validateBoundaryTestInput(input);

  const statistics = createInitialStatistics();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const results = await executeAllBoundaryTests(input, statistics, warnings, errors);
    const success = errors.length === 0;

    return {
      success,
      results,
      warnings,
      errors,
      statistics,
    };
  } catch (error) {
    return createErrorBoundaryTestResult(error.message);
  }
}
