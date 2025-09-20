/**
 * 【ヘルパー関数群】: 境界値テスト統合で使用する共通ユーティリティ
 * 【単一責任】: 各関数が特定の責任のみを担当
 * 【再利用性】: 複数のテストモジュールで共通利用可能
 * 🟢 信頼性レベル: 実装済みロジックからの抽出による確実な実装
 */

import { TEST_STATUS } from './boundary-test-constants';

/**
 * テストケース結果の型定義
 * 【型安全性】: テストケース構造の統一
 */
export interface TestCase {
  input: any;
  expected: any;
  actual: any;
  status: (typeof TEST_STATUS)[keyof typeof TEST_STATUS];
  message: string;
}

/**
 * 統計情報の型定義
 * 【集計管理】: テスト実行統計の統一構造
 */
export interface TestStatistics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warningTests: number;
}

/**
 * 【ヘルパー関数】: テストケースを作成する共通関数
 * 【重複削除】: テストケース作成ロジックの統一
 * 【保守性】: テストケース構造変更時の修正箇所を一元化
 * 🟢 信頼性レベル: 既存実装からの抽出
 */
export function createTestCase(
  input: any,
  expected: any,
  actual: any,
  status: (typeof TEST_STATUS)[keyof typeof TEST_STATUS],
  message: string
): TestCase {
  return {
    input,
    expected,
    actual,
    status,
    message,
  };
}

/**
 * 【ヘルパー関数】: 統計情報を更新する共通関数
 * 【重複削除】: 統計更新ロジックの統一
 * 【一貫性】: カウンタ管理の一元化
 * 🟢 信頼性レベル: 既存実装からの抽出
 */
export function updateTestStatistics(
  statistics: TestStatistics,
  status: (typeof TEST_STATUS)[keyof typeof TEST_STATUS]
): void {
  statistics.totalTests++;

  switch (status) {
    case TEST_STATUS.PASS:
      statistics.passedTests++;
      break;
    case TEST_STATUS.FAIL:
      statistics.failedTests++;
      break;
    case TEST_STATUS.WARNING:
      statistics.warningTests++;
      break;
  }
}

/**
 * 【ヘルパー関数】: モジュール全体のステータスを決定する共通関数
 * 【重複削除】: ステータス判定ロジックの統一
 * 【一貫性】: 判定基準の統一化
 * 🟢 信頼性レベル: 既存実装からの抽出
 */
export function determineModuleStatus(
  testCases: TestCase[]
): (typeof TEST_STATUS)[keyof typeof TEST_STATUS] {
  const hasErrors = testCases.some((tc) => tc.status === TEST_STATUS.FAIL);
  const hasWarnings = testCases.some((tc) => tc.status === TEST_STATUS.WARNING);

  if (hasErrors) return TEST_STATUS.FAIL;
  if (hasWarnings) return TEST_STATUS.WARNING;
  return TEST_STATUS.PASS;
}

/**
 * 【ヘルパー関数】: エラー配列に重複しないエラーメッセージを追加
 * 【重複防止】: 同一エラーメッセージの重複追加を防止
 * 【配列管理】: エラー配列の一元的な管理
 * 🟢 信頼性レベル: 既存実装からの抽出
 */
export function addUniqueError(errors: string[], errorMessage: string): void {
  if (!errors.includes(errorMessage)) {
    errors.push(errorMessage);
  }
}

/**
 * 【ヘルパー関数】: 警告配列に重複しない警告メッセージを追加
 * 【重複防止】: 同一警告メッセージの重複追加を防止
 * 【配列管理】: 警告配列の一元的な管理
 * 🟢 信頼性レベル: 既存実装からの抽出
 */
export function addUniqueWarning(warnings: string[], warningMessage: string): void {
  if (!warnings.includes(warningMessage)) {
    warnings.push(warningMessage);
  }
}

/**
 * 【ヘルパー関数】: 統計情報の初期化
 * 【初期化統一】: 統計オブジェクトの統一的な初期化
 * 【型安全性】: TypeScript型との整合性確保
 * 🟢 信頼性レベル: 既存実装からの抽出
 */
export function createInitialStatistics(): TestStatistics {
  return {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    warningTests: 0,
  };
}

/**
 * 【ヘルパー関数】: 境界値の範囲チェック
 * 【汎用性】: 数値境界値チェックの共通化
 * 【再利用性】: 様々な境界値チェックで利用可能
 * 🟢 信頼性レベル: 数学的な範囲チェックロジック
 */
export function isWithinBounds(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * 【ヘルパー関数】: 空値チェック
 * 【入力検証】: null/undefined/空文字列の統一チェック
 * 【安全性】: 入力値の安全性確認
 * 🟢 信頼性レベル: 基本的な入力検証ロジック
 */
export function isEmpty(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim().length === 0)
  );
}

/**
 * 【ヘルパー関数】: 文字列の切り詰め処理
 * 【安全な切り詰め】: 指定長での安全な文字列切り詰め
 * 【プロンプト処理】: プロンプト文字数制限処理の共通化
 * 🟢 信頼性レベル: 既存実装からの抽出
 */
export function truncateString(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength);
}
