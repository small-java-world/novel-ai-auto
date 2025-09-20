/**
 * 【設定定数】: 境界値テスト統合で使用する定数定義
 * 【管理方針】: 一元的な定数管理によるメンテナンス性向上
 * 【調整可能性】: 要件変更時の設定値変更を容易にする
 * 🟢 信頼性レベル: EDGE要件定義書に基づく確実な定数定義
 */

/**
 * 境界値制限の定数定義
 * 【プロンプト制限】: EDGE-101要件に基づく文字数制限
 * 【画像生成制限】: EDGE-102要件に基づく枚数制限
 */
export const BOUNDARY_LIMITS = {
  // 【プロンプト文字数制限】: EDGE-101準拠
  PROMPT_MAX_LENGTH: 2000,
  PROMPT_MIN_LENGTH: 1,

  // 【画像生成枚数制限】: EDGE-102準拠
  IMAGE_COUNT_MIN: 1,
  IMAGE_COUNT_MAX: 100,

  // 【リトライ処理制限】: EDGE-104準拠
  RETRY_MIN_COUNT: 1,
  RETRY_MAX_COUNT: 10,
} as const;

/**
 * エラーメッセージの定数定義
 * 【一元管理】: エラーメッセージの統一とメンテナンス性向上
 * 【ユーザビリティ】: 分かりやすく統一されたメッセージ
 */
export const BOUNDARY_MESSAGES = {
  // 【プロンプト関連メッセージ】
  PROMPT_EMPTY: 'プロンプトを入力してください',
  PROMPT_AT_LIMIT: 'プロンプトが2000文字の上限に達しています',
  PROMPT_EXCEEDS_LIMIT: 'プロンプトが2000文字を超過したため切り詰めました',

  // 【画像生成関連メッセージ】
  IMAGE_COUNT_INVALID: '画像生成数は1以上100以下の値を入力してください',
  IMAGE_COUNT_MIN_VALID: '画像生成枚数は正常範囲内です（最小値）',
  IMAGE_COUNT_MAX_VALID: '画像生成枚数は正常範囲内です（上限値）',
  IMAGE_COUNT_NORMAL: '画像生成枚数は正常範囲内です',

  // 【リトライ処理関連メッセージ】
  RETRY_SETTINGS_INVALID: 'リトライ設定が無効です',
  RETRY_EXHAUSTED: 'リトライ回数上限に達したため処理を停止しました',
  RETRY_SETTINGS_VALID: 'リトライ設定は正常範囲内です',

  // 【統合処理関連メッセージ】
  SYSTEM_INTEGRATION_VALID: '境界値の組み合わせは正常です',
  MULTIPLE_BOUNDARY_VIOLATION: '画像生成数は1以上100以下の値を入力してください',

  // 【汎用メッセージ】
  PROMPT_LENGTH_NORMAL: 'プロンプト文字数は正常範囲内です',
  UNEXPECTED_ERROR: '予期しないエラーが発生しました',
  VALIDATION_ERROR: '入力値検証エラー',
} as const;

/**
 * テストケース期待値の定数定義
 * 【テスト整合性】: テストケースとの期待値統一
 * 【保守性】: テスト期待値の一元管理
 */
export const BOUNDARY_EXPECTED_VALUES = {
  // 【ステータス値】
  VALID: 'valid',
  ERROR: 'error',
  WARNING: 'warning',
  TRUNCATED: 'truncated',
  NO_RETRY: 'no_retry',
  RETRY_EXHAUSTED: 'retry_exhausted',
  MULTIPLE_BOUNDARY_VIOLATION: 'multiple_boundary_violation',
  ALL_ZERO_VALUES: 'all_zero_values',
  VALID_COMBINATION: 'valid_combination',
} as const;

/**
 * モジュール名の定数定義
 * 【識別性】: モジュール識別の統一
 * 【タイポ防止】: 文字列タイポエラーの防止
 */
export const MODULE_NAMES = {
  PROMPT_APPLICATION: 'prompt-application',
  IMAGE_GENERATION: 'image-generation',
  RETRY_PROCESSING: 'retry-processing',
  SYSTEM_INTEGRATION: 'system-integration',
} as const;

/**
 * テストステータスの定数定義
 * 【統一性】: テスト結果ステータスの統一
 * 【型安全性】: TypeScript型定義との整合性
 */
export const TEST_STATUS = {
  PASS: 'pass' as const,
  FAIL: 'fail' as const,
  WARNING: 'warning' as const,
} as const;