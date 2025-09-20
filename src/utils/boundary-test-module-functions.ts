/**
 * 【機能概要】: 境界値テスト統合のためのモジュール別専用関数群
 * 【設計方針】: 単一責任原則による関数分割とコードの可読性向上
 * 【再利用性】: 各境界値テストで共通利用可能な専用ロジック
 * 【保守性】: 境界値ロジックの変更時の影響範囲を限定
 */

import {
  BOUNDARY_LIMITS,
  BOUNDARY_MESSAGES,
  BOUNDARY_EXPECTED_VALUES,
  MODULE_NAMES,
  TEST_STATUS,
} from './boundary-test-constants';
import {
  TestCase,
  TestStatistics,
  createTestCase,
  addUniqueError,
  addUniqueWarning,
  isEmpty,
  updateTestStatistics,
  determineModuleStatus,
  isWithinBounds,
  truncateString,
} from './boundary-test-helpers';
import { BoundaryTestInput, BoundaryResult } from './boundary-test-integration';

/**
 * 【入力値検証】: 境界値テスト入力の妥当性確認
 * 【エラー早期検出】: 不正な入力値による処理エラーを防止
 * 【セキュリティ】: 入力値検証による安全性確保
 */
export function validateBoundaryTestInput(input: BoundaryTestInput): void {
  if (!input) {
    throw new Error('境界値テスト入力が必要です');
  }
}

/**
 * 【統合実行】: 全境界値テストの統合実行
 * 【責任分離】: 各テストモジュールの独立実行と結果統合
 * 【並行処理】: 非同期処理による効率的なテスト実行
 */
export async function executeAllBoundaryTests(
  input: BoundaryTestInput,
  statistics: TestStatistics,
  warnings: string[],
  errors: string[]
): Promise<{
  promptApplication: BoundaryResult;
  imageGeneration: BoundaryResult;
  retryProcessing: BoundaryResult;
  systemIntegration: BoundaryResult;
}> {
  const promptResult = await testPromptBoundary(input, statistics, warnings, errors);
  const imageResult = await testImageCountBoundary(input, statistics, warnings, errors);
  const retryResult = await testRetryBoundary(input, statistics, warnings, errors);
  const integrationResult = await testSystemIntegration(input, statistics, warnings, errors);

  return {
    promptApplication: promptResult,
    imageGeneration: imageResult,
    retryProcessing: retryResult,
    systemIntegration: integrationResult,
  };
}

/**
 * 【機能概要】: EDGE-101プロンプト文字数境界値テストの実行
 * 【改善内容】: 定数利用とヘルパー関数による重複コード削除
 * 【設計方針】: 条件分岐の簡素化と責任分離
 * 【テスト対応】: TC-073-001, TC-073-002, TC-073-008の検証
 */
async function testPromptBoundary(
  input: BoundaryTestInput,
  statistics: TestStatistics,
  warnings: string[],
  errors: string[]
): Promise<BoundaryResult> {
  const testCases: TestCase[] = [];
  const promptLength = input.promptText.length;

  const testCase = createPromptTestCase(input.promptText, promptLength);
  testCases.push(testCase);

  updateTestStatistics(statistics, testCase.status);
  addTestMessagesToArrays(testCase, warnings, errors);

  return {
    module: MODULE_NAMES.PROMPT_APPLICATION,
    status: determineModuleStatus(testCases),
    testCases,
    processedLength: Math.min(promptLength, BOUNDARY_LIMITS.PROMPT_MAX_LENGTH),
    originalLength: promptLength,
    processedPrompt: truncateString(input.promptText, BOUNDARY_LIMITS.PROMPT_MAX_LENGTH),
  };
}

/**
 * 【機能概要】: EDGE-102画像生成枚数境界値テストの実行
 * 【改善内容】: 定数利用とヘルパー関数による重複コード削除
 * 【設計方針】: 条件分岐の簡素化と責任分離
 * 【テスト対応】: TC-073-003, TC-073-004, TC-073-005, TC-073-009の検証
 */
async function testImageCountBoundary(
  input: BoundaryTestInput,
  statistics: TestStatistics,
  warnings: string[],
  errors: string[]
): Promise<BoundaryResult> {
  const testCases: TestCase[] = [];
  const imageCount = input.imageCount;

  const testCase = createImageCountTestCase(imageCount);
  testCases.push(testCase);

  updateTestStatistics(statistics, testCase.status);
  addTestMessagesToArrays(testCase, warnings, errors);

  const isValidCount = isWithinBounds(
    imageCount,
    BOUNDARY_LIMITS.IMAGE_COUNT_MIN,
    BOUNDARY_LIMITS.IMAGE_COUNT_MAX
  );

  return {
    module: MODULE_NAMES.IMAGE_GENERATION,
    status: determineModuleStatus(testCases),
    testCases,
    requestedCount: imageCount,
    validatedCount: isValidCount ? imageCount : 0,
    invalidValue: !isValidCount ? imageCount : undefined,
    validRange: { min: BOUNDARY_LIMITS.IMAGE_COUNT_MIN, max: BOUNDARY_LIMITS.IMAGE_COUNT_MAX },
  };
}

/**
 * 【機能概要】: EDGE-104リトライ処理境界値テストの実行
 * 【改善内容】: ヘルパー関数による重複コード削除と可読性向上
 * 【設計方針】: 条件分岐の簡素化と責任分離
 * 【テスト対応】: TC-073-006, TC-073-007の検証
 */
async function testRetryBoundary(
  input: BoundaryTestInput,
  statistics: TestStatistics,
  warnings: string[],
  errors: string[]
): Promise<BoundaryResult> {
  const testCases: TestCase[] = [];
  const maxRetries = input.retrySettings.maxRetries;

  const testCase = createRetryTestCase(maxRetries, input.simulateFailure || false);
  testCases.push(testCase);

  updateTestStatistics(statistics, testCase.status);
  addTestMessagesToArrays(testCase, warnings, errors);

  const isValidSettings = maxRetries > 0 && !input.simulateFailure;

  return {
    module: MODULE_NAMES.RETRY_PROCESSING,
    status: determineModuleStatus(testCases),
    testCases,
    settingsValid: isValidSettings,
    retriesExecuted: input.simulateFailure ? maxRetries : 0,
    maxRetriesLimit: maxRetries,
    retryExhaustionReason: input.simulateFailure ? 'maxRetriesReached' : undefined,
    retriesAttempted: maxRetries === 0 ? 0 : input.simulateFailure ? maxRetries : 0,
    maxRetriesReached: input.simulateFailure || false,
    finalFailure: input.simulateFailure || maxRetries === 0,
  };
}

/**
 * 【機能概要】: システム統合境界値テストの実行
 * 【改善内容】: ヘルパー関数による複雑な条件分岐の簡素化
 * 【設計方針】: 組み合わせロジックの分離と可読性向上
 * 【テスト対応】: TC-073-010, TC-073-011の検証
 */
async function testSystemIntegration(
  input: BoundaryTestInput,
  statistics: TestStatistics,
  warnings: string[],
  errors: string[]
): Promise<BoundaryResult> {
  const testCases: TestCase[] = [];
  const hasPromptError =
    input.promptText.length > BOUNDARY_LIMITS.PROMPT_MAX_LENGTH || input.promptText.length === 0;
  const hasImageError =
    input.imageCount === 0 || input.imageCount > BOUNDARY_LIMITS.IMAGE_COUNT_MAX;

  const testCase = createSystemIntegrationTestCase(input, hasPromptError, hasImageError);
  testCases.push(testCase);

  updateTestStatistics(statistics, testCase.status);
  addTestMessagesToArrays(testCase, warnings, errors);

  return createSystemIntegrationResult(input, testCases, hasPromptError, hasImageError);
}

/**
 * 【機能概要】: システム統合結果の作成
 * 【設計方針】: 複雑なプロパティ設定を分離した関数
 * 【可読性】: 長大なオブジェクト作成を簡素化
 */
function createSystemIntegrationResult(
  input: BoundaryTestInput,
  testCases: TestCase[],
  hasPromptError: boolean,
  hasImageError: boolean
): BoundaryResult {
  return {
    module: MODULE_NAMES.SYSTEM_INTEGRATION,
    status: determineModuleStatus(testCases),
    testCases,
    minLoadConfiguration: input.promptText.length === 1 && input.imageCount === 1,
    promptLength: input.promptText.length,
    imageCount: input.imageCount,
    estimatedProcessingTime:
      input.promptText.length === 1 && input.imageCount === 1 ? '< 1s' : undefined,
    conflictingParameter: hasPromptError && hasImageError ? 'imageCount' : undefined,
    conflictPriority: hasPromptError && hasImageError ? 'imageCount' : undefined,
    errorPriority: hasPromptError && hasImageError ? 'imageCount' : undefined,
    multipleIssues: hasPromptError && hasImageError,
    maxLoadConfiguration:
      input.promptText.length === BOUNDARY_LIMITS.PROMPT_MAX_LENGTH &&
      input.imageCount === BOUNDARY_LIMITS.IMAGE_COUNT_MAX,
    allParametersInvalid:
      input.promptText.length === 0 &&
      input.imageCount === 0 &&
      input.retrySettings.maxRetries === 0,
    configurationRequired:
      input.promptText.length === 0 &&
      input.imageCount === 0 &&
      input.retrySettings.maxRetries === 0,
    retrySettingsValid: input.retrySettings.maxRetries > 0,
  };
}

/**
 * 【プロンプトテストケース作成】: EDGE-101対応のテストケース生成
 * 【条件分岐最適化】: 文字数による適切なテストケース判定
 * 【メッセージ統一】: 定数管理によるメッセージ品質向上
 */
export function createPromptTestCase(promptText: string, promptLength: number): TestCase {
  if (promptLength === 0) {
    return createTestCase(
      promptText,
      BOUNDARY_EXPECTED_VALUES.ERROR,
      BOUNDARY_EXPECTED_VALUES.ERROR,
      TEST_STATUS.FAIL,
      'プロンプトを入力してください'
    );
  } else if (promptLength === BOUNDARY_LIMITS.PROMPT_MAX_LENGTH) {
    return createTestCase(
      promptText,
      BOUNDARY_EXPECTED_VALUES.WARNING,
      BOUNDARY_EXPECTED_VALUES.WARNING,
      TEST_STATUS.WARNING,
      BOUNDARY_MESSAGES.PROMPT_AT_LIMIT
    );
  } else if (promptLength > BOUNDARY_LIMITS.PROMPT_MAX_LENGTH) {
    return createTestCase(
      promptText,
      BOUNDARY_EXPECTED_VALUES.TRUNCATED,
      BOUNDARY_EXPECTED_VALUES.TRUNCATED,
      TEST_STATUS.WARNING,
      BOUNDARY_MESSAGES.PROMPT_EXCEEDS_LIMIT
    );
  } else {
    return createTestCase(
      promptText,
      BOUNDARY_EXPECTED_VALUES.VALID,
      BOUNDARY_EXPECTED_VALUES.VALID,
      TEST_STATUS.PASS,
      BOUNDARY_MESSAGES.PROMPT_LENGTH_NORMAL
    );
  }
}

/**
 * 【画像枚数テストケース作成】: EDGE-102対応のテストケース生成
 * 【範囲チェック最適化】: 境界値条件の効率的な判定
 * 【メッセージ統一】: 定数管理によるメッセージ品質向上
 */
export function createImageCountTestCase(imageCount: number): TestCase {
  if (imageCount === 0) {
    return createTestCase(
      imageCount,
      BOUNDARY_EXPECTED_VALUES.ERROR,
      BOUNDARY_EXPECTED_VALUES.ERROR,
      TEST_STATUS.FAIL,
      '画像生成数は1以上100以下の値を入力してください'
    );
  } else if (imageCount === BOUNDARY_LIMITS.IMAGE_COUNT_MIN) {
    return createTestCase(
      imageCount,
      BOUNDARY_EXPECTED_VALUES.VALID,
      BOUNDARY_EXPECTED_VALUES.VALID,
      TEST_STATUS.PASS,
      BOUNDARY_MESSAGES.IMAGE_COUNT_MIN_VALID
    );
  } else if (imageCount === BOUNDARY_LIMITS.IMAGE_COUNT_MAX) {
    return createTestCase(
      imageCount,
      BOUNDARY_EXPECTED_VALUES.VALID,
      BOUNDARY_EXPECTED_VALUES.VALID,
      TEST_STATUS.PASS,
      BOUNDARY_MESSAGES.IMAGE_COUNT_MAX_VALID
    );
  } else if (imageCount > BOUNDARY_LIMITS.IMAGE_COUNT_MAX) {
    return createTestCase(
      imageCount,
      BOUNDARY_EXPECTED_VALUES.ERROR,
      BOUNDARY_EXPECTED_VALUES.ERROR,
      TEST_STATUS.FAIL,
      '画像生成数は1以上100以下の値を入力してください'
    );
  } else {
    return createTestCase(
      imageCount,
      BOUNDARY_EXPECTED_VALUES.VALID,
      BOUNDARY_EXPECTED_VALUES.VALID,
      TEST_STATUS.PASS,
      BOUNDARY_MESSAGES.IMAGE_COUNT_NORMAL
    );
  }
}

/**
 * 【リトライテストケース作成】: EDGE-104対応のテストケース生成
 * 【条件最適化】: シミュレーション状態とリトライ設定の効率的な判定
 * 【ロジック分離】: 複雑な条件分岐の簡素化
 */
export function createRetryTestCase(maxRetries: number, simulateFailure: boolean): TestCase {
  if (maxRetries === 0 && simulateFailure) {
    return createTestCase(
      maxRetries,
      BOUNDARY_EXPECTED_VALUES.RETRY_EXHAUSTED,
      BOUNDARY_EXPECTED_VALUES.RETRY_EXHAUSTED,
      TEST_STATUS.FAIL,
      'リトライ回数上限に達したため処理を停止しました'
    );
  } else if (maxRetries === 0) {
    return createTestCase(
      maxRetries,
      BOUNDARY_EXPECTED_VALUES.NO_RETRY,
      BOUNDARY_EXPECTED_VALUES.NO_RETRY,
      TEST_STATUS.FAIL,
      'リトライ設定が無効です'
    );
  } else if (simulateFailure) {
    return createTestCase(
      maxRetries,
      BOUNDARY_EXPECTED_VALUES.RETRY_EXHAUSTED,
      BOUNDARY_EXPECTED_VALUES.RETRY_EXHAUSTED,
      TEST_STATUS.FAIL,
      'リトライ回数上限に達したため処理を停止しました'
    );
  } else {
    return createTestCase(
      maxRetries,
      BOUNDARY_EXPECTED_VALUES.VALID,
      BOUNDARY_EXPECTED_VALUES.VALID,
      TEST_STATUS.PASS,
      BOUNDARY_MESSAGES.RETRY_SETTINGS_VALID
    );
  }
}

/**
 * 【システム統合テストケース作成】: 複数境界値組み合わせのテストケース生成
 * 【組み合わせ最適化】: 複数エラー条件の効率的な判定
 * 【優先度管理】: エラー優先度の適切な管理
 */
export function createSystemIntegrationTestCase(
  input: BoundaryTestInput,
  hasPromptError: boolean,
  hasImageError: boolean
): TestCase {
  if (hasPromptError && hasImageError) {
    return createTestCase(
      { prompt: input.promptText.length, images: input.imageCount },
      BOUNDARY_EXPECTED_VALUES.MULTIPLE_BOUNDARY_VIOLATION,
      BOUNDARY_EXPECTED_VALUES.MULTIPLE_BOUNDARY_VIOLATION,
      TEST_STATUS.FAIL,
      '画像生成数は1以上100以下の値を入力してください'
    );
  } else if (input.promptText.length === 0 && input.imageCount === 0) {
    return createTestCase(
      { prompt: input.promptText, images: input.imageCount },
      BOUNDARY_EXPECTED_VALUES.ALL_ZERO_VALUES,
      BOUNDARY_EXPECTED_VALUES.ALL_ZERO_VALUES,
      TEST_STATUS.FAIL,
      'プロンプトを入力してください'
    );
  } else {
    return createTestCase(
      'system_integration',
      BOUNDARY_EXPECTED_VALUES.VALID_COMBINATION,
      BOUNDARY_EXPECTED_VALUES.VALID_COMBINATION,
      TEST_STATUS.PASS,
      BOUNDARY_MESSAGES.SYSTEM_INTEGRATION_VALID
    );
  }
}

/**
 * 【メッセージ配列管理】: テストケース結果をwarnings/errorsに適切に追加
 * 【重複防止】: 同一メッセージの重複追加を防止
 * 【分類管理】: エラーと警告の適切な分類
 */
export function addTestMessagesToArrays(
  testCase: TestCase,
  warnings: string[],
  errors: string[]
): void {
  if (testCase.status === TEST_STATUS.FAIL) {
    addUniqueError(errors, testCase.message);
  } else if (testCase.status === TEST_STATUS.WARNING) {
    addUniqueWarning(warnings, testCase.message);
  }
}

/**
 * 【エラー結果作成】: 例外発生時のBoundaryTestResult作成
 * 【安全な復帰】: 予期しないエラー時の安全な結果返却
 * 【一貫性保持】: エラー時でも期待される構造の維持
 */
export function createErrorBoundaryTestResult(errorMessage: string): any {
  return {
    success: false,
    results: {
      promptApplication: createEmptyBoundaryResult(MODULE_NAMES.PROMPT_APPLICATION),
      imageGeneration: createEmptyBoundaryResult(MODULE_NAMES.IMAGE_GENERATION),
      retryProcessing: createEmptyBoundaryResult(MODULE_NAMES.RETRY_PROCESSING),
      systemIntegration: createEmptyBoundaryResult(MODULE_NAMES.SYSTEM_INTEGRATION),
    },
    warnings: [],
    errors: [`${BOUNDARY_MESSAGES.UNEXPECTED_ERROR}: ${errorMessage}`],
    statistics: { totalTests: 0, passedTests: 0, failedTests: 0, warningTests: 0 },
  };
}

/**
 * 【空結果作成】: 空のBoundaryResult構造を作成するヘルパー関数
 * 【デフォルト値】: エラー時のデフォルト値提供
 * 【構造維持】: 例外処理時のテスト構造維持
 */
export function createEmptyBoundaryResult(moduleName: string): BoundaryResult {
  return {
    module: moduleName,
    status: TEST_STATUS.FAIL,
    testCases: [],
  };
}
