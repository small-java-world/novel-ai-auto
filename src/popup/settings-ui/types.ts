/**
 * 【型定義モジュール】: Settings UI関連の型定義を集約
 * 【設計方針】: 既存のプロジェクト型システムとの統合を重視
 * 【保守性】: 型定義を一元管理して変更の影響範囲を明確化
 * 🟢 既存のsrc/types.tsとの整合性を保った確実な型定義
 */

/**
 * 【設定入力型】: ユーザーが入力する設定値の型定義
 * 【改善内容】: 既存のGenerationSettingsインターフェースとの整合性確保
 * 【型安全性】: strict modeでの完全な型チェック対応
 * 🟢 TASK-042要件定義とテストケースに基づく確実な定義
 */
export interface SettingsInput {
  imageCount: number; // 1-100の範囲制限
  seedMode: 'random' | 'fixed'; // ランダムまたは固定シード
  seedValue?: number; // seedMode="fixed"時の具体値（0～2^32-1）
  filenameTemplate: string; // ファイル名テンプレート（最大255文字）
  retrySettings: {
    maxAttempts: number; // リトライ最大回数（1-10）
    baseDelayMs: number; // 基本遅延時間（100-5000ms）
    factor: number; // 遅延倍率（1.1-3.0）
  };
}

/**
 * 【バリデーション結果型】: 入力値検証の結果を表す型定義
 * 【改善内容】: より詳細なエラー情報と型安全性を提供
 * 🟢 テストケースで期待される検証結果構造に基づく
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>; // フィールド名 → エラーメッセージ
}

/**
 * 【個別バリデーションエラー型】: 単一フィールドのバリデーションエラー
 * 【新規追加】: バリデーション処理の型安全性向上のため
 * 🟡 既存パターンから妥当に推測した型定義
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * 【設定保存結果型】: 設定保存処理の結果を表す型定義
 * 【改善内容】: エラーハンドリングの詳細化と型安全性向上
 * 🟢 テストケースで期待される出力構造に基づく
 */
export interface SaveResult {
  validationResult: ValidationResult;
  savedSettings: SettingsInput; // 保存された設定値
  storageStatus: 'success' | 'error'; // 保存処理の成否
  errorMessage?: string; // ストレージエラー時のメッセージ
}

/**
 * 【バリデーション制約定数】: 各フィールドの制約値を定義
 * 【改善内容】: マジックナンバーの排除と保守性向上
 * 【設定管理】: 制約値の一元管理により変更時の影響範囲を限定
 * 🟢 TASK-042要件定義書の制約条件に基づく確実な定義
 */
export const VALIDATION_CONSTRAINTS = {
  imageCount: {
    min: 1,
    max: 100,
  },
  seedValue: {
    min: 0,
    max: Math.pow(2, 32) - 1, // 2^32-1 (4294967295)
  },
  filenameTemplate: {
    maxLength: 255,
    forbiddenChars: /[<>:|?*]/g, // セキュリティ強化: *文字を追加
  },
  retry: {
    maxAttempts: { min: 1, max: 10 },
    baseDelayMs: { min: 100, max: 5000 },
    factor: { min: 1.1, max: 3.0 },
  },
} as const;

/**
 * 【デフォルト設定値】: システム初期化時の標準設定
 * 【改善内容】: 設定値の一元管理と変更時の影響範囲明確化
 * 【保守性】: デフォルト値の変更時に単一箇所での修正を可能に
 * 🟢 テストケースTC-001-001で検証されるデフォルト値に基づく
 */
export const DEFAULT_SETTINGS: SettingsInput = {
  imageCount: 10,
  seedMode: 'random',
  seedValue: undefined,
  filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
  retrySettings: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    factor: 2.0,
  },
};

/**
 * 【エラーメッセージ定数】: バリデーションエラー時の表示メッセージ
 * 【改善内容】: ハードコーディングの排除と多言語対応準備
 * 【保守性】: エラーメッセージの一元管理により統一性確保
 * 🟢 テストケースで期待されるエラーメッセージに基づく確実な定義
 */
export const ERROR_MESSAGES = {
  imageCount: {
    required: '画像生成数を入力してください',
    range: '1以上100以下の値を入力してください',
  },
  seedValue: {
    required: '固定シードモード時はシード値が必要です',
    range: '0以上の整数値を入力してください',
  },
  filenameTemplate: {
    required: 'ファイル名テンプレートは必須です',
    invalidChars: 'ファイル名に使用できない文字が含まれています',
    tooLong: 'ファイル名テンプレートは255文字以下で入力してください',
  },
  retrySettings: {
    required: 'リトライ設定は必須です',
    maxAttempts: 'リトライ回数は1以上10以下で入力してください',
    baseDelayMs: '基本遅延時間は100以上5000以下で入力してください',
    factor: '遅延倍率は1.1以上3.0以下で入力してください',
  },
  storage: {
    saveFailed: '設定の保存に失敗しました。しばらく時間をおいて再試行してください。',
  },
} as const;
