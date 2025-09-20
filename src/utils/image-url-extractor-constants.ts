/**
 * 【定数ファイル】: Image URL Extractor で使用する定数の定義
 * 【改善内容】: ハードコーディングされた文字列や設定値を集約管理
 * 【設計方針】: 保守性とテスタビリティの向上を目的とした定数化
 * 【パフォーマンス】: 定数参照による高速アクセスを実現
 * 【保守性】: 変更時の影響範囲を局所化し、設定の一元管理を実現
 * 🟢 信頼性レベル: 既存コードから抽出した実績のある値に基づく定義
 */

/**
 * 【DOM セレクタ定数】: 画像URL抽出で使用するDOM要素セレクタ
 * 【再利用性】: 複数箇所での一貫したセレクタ使用を保証
 * 【変更容易性】: DOM構造変更時の修正箇所を一箇所に集約
 * 🟢 信頼性レベル: テストケースで実証済みのセレクタパターン
 */
export const DOM_SELECTORS = {
  /** 【ギャラリーコンテナ】: NovelAI画像ギャラリーの親要素セレクタ */
  GALLERY_CONTAINER: '.novelai-gallery',

  /** 【画像要素】: ギャラリー内の画像要素セレクタ */
  IMAGE_ELEMENTS: 'img',

  /** 【統合セレクタ】: パフォーマンス最適化のための結合セレクタ */
  GALLERY_IMAGES: '.novelai-gallery img',
} as const;

/**
 * 【エラーメッセージ定数】: 例外処理で使用するエラーメッセージ
 * 【一貫性確保】: エラーメッセージの統一とタイポ防止
 * 【国際化対応】: 将来的な多言語化対応の基盤
 * 🟢 信頼性レベル: テストケースで期待される正確なメッセージ
 */
export const ERROR_MESSAGES = {
  /** 【DOM解析エラー】: DOM操作中のエラーメッセージ */
  DOM_PARSING_ERROR: 'DOM解析中にエラーが発生しました',

  /** 【タイムアウトエラー】: URL抽出処理のタイムアウトメッセージ */
  EXTRACTION_TIMEOUT: 'URL抽出処理がタイムアウトしました',

  /** 【Chrome API不在警告】: Chrome Extension API利用不可時の警告 */
  CHROME_API_UNAVAILABLE: '【Chrome API不在】: Chrome runtime API が利用できません',

  /** 【メッセージ送信エラー】: IMAGE_READYメッセージ送信失敗時のエラー */
  MESSAGE_SEND_ERROR: '【メッセージ送信エラー】: IMAGE_READYメッセージの送信に失敗しました',
} as const;

/**
 * 【URL検証設定】: URL有効性判定で使用する設定値
 * 【セキュリティ強化】: 安全なURL検証のための設定集約
 * 【柔軟性向上】: 検証ルールの調整を容易にする
 * 🟡 信頼性レベル: セキュリティベストプラクティスに基づく推奨設定
 */
export const URL_VALIDATION = {
  /** 【必須プロトコル】: 有効なURLプロトコルの指定 */
  REQUIRED_PROTOCOL: 'https://',

  /** 【最大URL長】: セキュリティ上安全とされる最大URL長 */
  MAX_URL_LENGTH: 2048,

  /** 【許可ドメインリスト】: NovelAI関連の信頼できるドメイン */
  ALLOWED_DOMAINS: ['novelai.net', 'cdn.novelai.net', 'images.novelai.net'],

  /** 【画像拡張子】: 有効な画像ファイル拡張子 */
  VALID_IMAGE_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.webp'],
} as const;

/**
 * 【ファイル名サニタイゼーション設定】: 安全なファイル名生成のための設定
 * 【セキュリティ強化】: ファイルシステム攻撃の防止
 * 【クロスプラットフォーム対応】: 各OS共通で安全なファイル名生成
 * 🟡 信頼性レベル: セキュリティ研究とベストプラクティスに基づく設定
 */
export const FILENAME_SANITIZATION = {
  /** 【危険文字パターン】: ファイル名から除去すべき危険な文字の正規表現 */
  DANGEROUS_CHARS_PATTERN: /[<>:"|?*\\/]/g,

  /** 【制御文字パターン】: ASCII制御文字の正規表現 */
  CONTROL_CHARS_PATTERN: /[\x00-\x1f\x7f]/g,

  /** 【置換文字】: 危険文字の安全な置換文字 */
  REPLACEMENT_CHAR: '_',

  /** 【最大ファイル名長】: 安全なファイル名の最大長 */
  MAX_FILENAME_LENGTH: 200,

  /** 【予約ファイル名】: Windowsで予約されたファイル名 */
  RESERVED_NAMES: [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
  ],
} as const;

/**
 * 【ファイル名テンプレート設定】: ファイル名生成の設定
 * 【一貫性確保】: ファイル名形式の統一
 * 【拡張性】: テンプレート形式の変更を容易にする
 * 🟢 信頼性レベル: テストケースで検証済みの形式
 */
export const FILENAME_TEMPLATE = {
  /** 【デフォルトテンプレート】: 標準的なファイル名テンプレート */
  DEFAULT_TEMPLATE: '{date}_{prompt}_{seed}_{idx}.png',

  /** 【インデックスパディング】: ファイル連番のゼロパディング桁数 */
  INDEX_PADDING: 3,

  /** 【デフォルト拡張子】: 標準的な画像ファイル拡張子 */
  DEFAULT_EXTENSION: '.png',
} as const;

/**
 * 【Chrome Extension メッセージ設定】: メッセージング関連の設定
 * 【統合性確保】: 他のコンポーネントとの一貫性
 * 🟢 信頼性レベル: 既存のmessages.tsとの整合性確保
 */
export const MESSAGING = {
  /** 【メッセージタイプ】: IMAGE_READYメッセージのタイプ識別子 */
  IMAGE_READY_TYPE: 'IMAGE_READY',
} as const;
