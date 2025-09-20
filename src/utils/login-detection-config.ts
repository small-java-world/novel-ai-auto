/**
 * 【設定定数ファイル】: TASK-070 ログイン検出機能の設定値を一元管理
 * 【改善内容】: ハードコーディングされた値を設定ファイルに分離し、保守性を向上
 * 【設計方針】: 設定変更時の影響範囲を限定し、テスト環境での設定変更を容易にする
 * 🟢 信頼性レベル: 要件定義とテストケースの境界値設定に基づく
 */

// 【URL設定】: NovelAIの各種URLパターンを一元管理 🟢
// 【調整可能性】: NovelAIのURL構造変更時に容易に修正可能 🟢
export const LOGIN_DETECTION_URLS = {
  NOVELAI_LOGIN: 'https://novelai.net/login',
  NOVELAI_MAIN: 'https://novelai.net/',
  NOVELAI_DOMAIN_PATTERN: 'https://*.novelai.net/*',
} as const;

// 【DOM セレクタ設定】: ログイン検出に使用するセレクタパターンを定義 🟡
// 【フォールバック対応】: 複数候補でUI変更への耐性を確保 🟡
export const LOGIN_DETECTION_SELECTORS = {
  LOGIN_FORM: ['form.login-form', 'form[action*="login"]', '.auth-form'],
  EMAIL_INPUT: ['input[type="email"]', 'input[name="email"]', 'input#email'],
  PASSWORD_INPUT: ['input[type="password"]', 'input[name="password"]', 'input#password'],
  PROMPT_INPUT: ['.prompt-input', 'textarea[placeholder*="prompt"]', '#prompt-text'],
} as const;

// 【境界値設定】: テストケースで検証された境界値を定数として定義 🟢
// 【調整可能性】: パフォーマンス要件の変更時に設定で対応可能 🟢
export const LOGIN_DETECTION_THRESHOLDS = {
  MIN_DETECTION_DURATION_MS: 500, // 誤検出防止のための最小継続時間
  MAX_ATTEMPTS_PER_WINDOW: 5, // 無限ループ防止のための上限回数
  RATE_LIMIT_WINDOW_MS: 600000, // レート制限の時間窓（10分）
  MAX_PROCESSING_TIME_MS: 1000, // パフォーマンス要件（1秒以内）
  STORAGE_RETRY_COUNT: 3, // ストレージ失敗時の再試行回数
} as const;

// 【エラーメッセージ設定】: ユーザー向けメッセージを一元管理 🟡
// 【国際化対応】: 将来的な多言語対応を見据えた構造 🟡
export const LOGIN_DETECTION_MESSAGES = {
  VALIDATION_ERRORS: {
    INVALID_JOB: '無効なジョブが指定されました',
    INVALID_JOB_DATA: '保存されたジョブデータが無効のため、新規開始してください',
    STORAGE_ACCESS_FAILED: 'ストレージへのアクセスに失敗しました',
  },
  WARNINGS: {
    LOGIN_ELEMENTS_NOT_FOUND: 'Login detection elements not found, assuming logged in state',
    STORAGE_FAILED_MEMORY_FALLBACK: 'Storage failed, job state kept in memory only',
  },
  USER_GUIDANCE: {
    MANUAL_TAB_ACTIVATION: 'NovelAIタブを手動で開いてログインしてください',
    INSTRUCTIONS: [
      'NovelAI (https://novelai.net) を開く',
      'ログイン完了後、拡張アイコンをクリック',
    ],
  },
} as const;

// 【デフォルト値設定】: 各種デフォルト値を定義 🟡
// 【フォールバック値】: 予期しない状況での安全な初期値を設定 🟡
export const LOGIN_DETECTION_DEFAULTS = {
  DEFAULT_JOB_ID: 'default-job-id',
  DEFAULT_RESUME_POINT: 'generation_start' as const,
  FALLBACK_STATE: 'default-state',
} as const;
