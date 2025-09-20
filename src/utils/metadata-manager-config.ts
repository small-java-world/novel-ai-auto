/**
 * TASK-102: 新フォーマット対応・メタデータ管理 - 設定定数
 *
 * 【機能概要】: NewFormatMetadataManagerで使用する設定値と定数を一元管理
 * 【改善内容】: ハードコーディングされた値を外部設定として抽出・整理
 * 【設計方針】: 設定変更時の影響範囲を限定し、保守性を向上
 * 【保守性】: 設定値の変更が必要な場合、このファイルのみを修正すれば対応可能
 * 🟢 信頼性レベル: TASK-102要件定義書の制約要件に基づく
 *
 * @version 1.0.0
 * @author NovelAI Auto Generator Team
 * @since 2025-01-20 (Refactor phase)
 */

// 【ファイルサイズ制限設定】: セキュリティ要件に基づくファイルサイズ制限
// 🟢 信頼性レベル: REQ-102-401要件で定められた制限値
export const FILE_SIZE_LIMITS = {
  /** 最大ファイルサイズ（バイト） - 10MB制限 */
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  /** 最大ファイルサイズ（MB表示用） */
  MAX_FILE_SIZE_MB: 10,
} as const;

// 【メタデータフィールド制限設定】: データ品質確保のための文字数制限
// 🟢 信頼性レベル: TASK-102要件定義書のMetadataV1インターフェース仕様に基づく
export const METADATA_FIELD_LIMITS = {
  /** 名前フィールドの最大文字数 */
  NAME_MAX_LENGTH: 100,

  /** 名前フィールドの最小文字数 */
  NAME_MIN_LENGTH: 1,

  /** 説明フィールドの最大文字数 */
  DESCRIPTION_MAX_LENGTH: 500,

  /** 作成者フィールドの最大文字数 */
  AUTHOR_MAX_LENGTH: 50,

  /** タグの最大個数 */
  TAGS_MAX_COUNT: 20,

  /** 個別タグの最大文字数 */
  TAG_MAX_LENGTH: 30,
} as const;

// 【サポートバージョン設定】: フォーマットバージョン管理用定数
// 🟢 信頼性レベル: TASK-102新フォーマット仕様に基づく
export const SUPPORTED_VERSIONS = {
  /** 現在サポートしている新フォーマットのバージョン */
  CURRENT_VERSION: '1.0',

  /** 今後サポート予定のバージョン一覧 */
  FUTURE_VERSIONS: ['1.1', '2.0'] as readonly string[],

  /** 廃止予定のレガシーバージョン */
  DEPRECATED_VERSIONS: ['0.9', '0.8'] as readonly string[],
} as const;

// 【デフォルト値設定】: フィールド不足時の自動補完用デフォルト値
// 🟢 信頼性レベル: TC010テストケースで期待される値に基づく
export const DEFAULT_VALUES = {
  /** メタデータ名前フィールドのデフォルト値 */
  DEFAULT_NAME: '[ファイル名から生成]',

  /** 説明フィールドのデフォルト値 */
  DEFAULT_DESCRIPTION: 'No description available',

  /** 作成者フィールドのデフォルト値 */
  DEFAULT_AUTHOR: 'Unknown',

  /** 日付フィールドのデフォルト表示値 */
  DEFAULT_DATE_DISPLAY: 'Unknown',

  /** レガシー変換時のデフォルト説明 */
  LEGACY_CONVERSION_DESCRIPTION: '既存形式から変換されたプロンプトセット',

  /** レガシー変換時のデフォルトタグ */
  LEGACY_CONVERSION_TAGS: ['legacy', 'converted'] as readonly string[],
} as const;

// 【エラーメッセージ設定】: 統一されたエラーメッセージ管理
// 🟢 信頼性レベル: 各テストケースで期待されるメッセージに基づく
export const ERROR_MESSAGES = {
  /** 入力データ不正エラー */
  INVALID_INPUT_DATA: '入力データが不正です',

  /** JSON構文エラー（TC008対応） */
  JSON_SYNTAX_ERROR: 'JSON構文エラー: line 1, unexpected token',

  /** 必須フィールド不足エラー */
  MISSING_REQUIRED_FIELDS: '必須フィールドが不足しています',

  /** ファイルサイズ超過エラー */
  FILE_SIZE_EXCEEDED: `ファイルサイズが制限（${FILE_SIZE_LIMITS.MAX_FILE_SIZE_MB}MB）を超えています`,

  /** レガシー形式不正エラー */
  INVALID_LEGACY_FORMAT: '無効なレガシー形式です',

  /** 一般的な読み込みエラー */
  FILE_LOAD_ERROR: 'ファイル読み込み中にエラーが発生しました',

  /** 変換処理エラー */
  CONVERSION_ERROR: '変換中にエラーが発生しました',
} as const;

// 【警告メッセージ設定】: ユーザーへの注意喚起メッセージ管理
// 🟢 信頼性レベル: 各テストケースで期待される警告メッセージに基づく
export const WARNING_MESSAGES = {
  /** nameフィールド自動生成警告（TC010対応） */
  NAME_FIELD_GENERATED: 'nameフィールドが不足しているため、ファイル名から生成しました',

  /** レガシー形式変換警告（TC007対応） */
  LEGACY_FORMAT_CONVERTED: 'レガシー形式から変換されました',

  /** メタデータ補完警告（TC007対応） */
  METADATA_DEFAULTS_APPLIED: 'メタデータが不足しているため、デフォルト値を設定しました',

  /** バージョン不一致警告（TC009対応の動的生成用テンプレート） */
  VERSION_UNSUPPORTED_TEMPLATE: 'バージョン{version}は未対応です',

  /** 対応可能バージョン表示（TC009対応） */
  SUPPORTED_VERSION_INFO: `対応可能バージョン: ${SUPPORTED_VERSIONS.CURRENT_VERSION}`,
} as const;

// 【パフォーマンス設定】: 処理性能に関する設定値
// 🟢 信頼性レベル: NFR-102-001〜003非機能要件に基づく
export const PERFORMANCE_CONFIG = {
  /** メタデータ読み込み処理の目標時間（ミリ秒） */
  METADATA_LOAD_TARGET_MS: 200,

  /** タグフィルタリング処理の目標時間（ミリ秒） */
  TAG_FILTERING_TARGET_MS: 100,

  /** フォーマット変換処理の目標時間（ミリ秒） */
  FORMAT_CONVERSION_TARGET_MS: 500,

  /** 大容量ファイル処理時のチャンクサイズ（バイト） */
  LARGE_FILE_CHUNK_SIZE: 1024 * 1024, // 1MB

  /** メモリ使用量の警告閾値（バイト） */
  MEMORY_WARNING_THRESHOLD: 50 * 1024 * 1024, // 50MB
} as const;

// 【セキュリティ設定】: セキュリティ対策の設定値
// 🟢 信頼性レベル: セキュリティベストプラクティスに基づく
export const SECURITY_CONFIG = {
  /** HTMLエスケープが必要な文字のマッピング */
  HTML_ESCAPE_MAP: {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',  // 🔴 改善: 単一引用符もエスケープしてXSS攻撃を防ぐ
  } as const,

  /** 危険な文字列パターン（プロトタイプ汚染攻撃防止） */
  DANGEROUS_PATTERNS: [
    '__proto__',
    'constructor',
    'prototype',
    'constructor.prototype',
  ] as const,

  /** JSONパース時の最大ネストレベル */
  MAX_JSON_DEPTH: 10,
} as const;

// 【国際化対応設定】: 多言語対応のための設定（将来拡張用）
// 🟡 信頼性レベル: 将来の国際化要件を見込んだ設計
export const I18N_CONFIG = {
  /** デフォルト言語 */
  DEFAULT_LOCALE: 'ja-JP',

  /** サポート予定言語 */
  SUPPORTED_LOCALES: ['ja-JP', 'en-US'] as const,

  /** 日付フォーマット設定 */
  DATE_FORMAT_OPTIONS: {
    'ja-JP': { year: 'numeric', month: 'long', day: 'numeric' },
    'en-US': { year: 'numeric', month: 'long', day: 'numeric' },
  } as const,
} as const;

/**
 * 【ヘルパー関数】: 動的エラーメッセージ生成
 * 【再利用性】: バージョンエラーなど、可変部分を含むメッセージの生成
 * 【単一責任】: メッセージテンプレートの安全な文字列置換処理
 */
export function createVersionUnsupportedMessage(version: string): string {
  // 【セキュリティ】: バージョン文字列をサニタイズして安全性を確保
  const sanitizedVersion = version.replace(/[<>&"']/g, '');
  return WARNING_MESSAGES.VERSION_UNSUPPORTED_TEMPLATE.replace('{version}', sanitizedVersion);
}

/**
 * 【ヘルパー関数】: 設定値の妥当性検証
 * 【保守性】: 設定値の整合性をチェックして予期しない動作を防ぐ
 * 【エラー予防】: 開発時の設定ミスを早期に発見
 */
export function validateConfig(): void {
  // 【設定整合性チェック】: ファイルサイズ制限の論理的妥当性を確認
  if (FILE_SIZE_LIMITS.MAX_FILE_SIZE <= 0) {
    throw new Error('MAX_FILE_SIZE must be positive');
  }

  // 【フィールド制限チェック】: メタデータフィールド制限の論理的妥当性を確認
  if (METADATA_FIELD_LIMITS.NAME_MIN_LENGTH >= METADATA_FIELD_LIMITS.NAME_MAX_LENGTH) {
    throw new Error('NAME_MIN_LENGTH must be less than NAME_MAX_LENGTH');
  }

  // 【パフォーマンス設定チェック】: 性能目標値の妥当性を確認
  if (PERFORMANCE_CONFIG.METADATA_LOAD_TARGET_MS <= 0) {
    throw new Error('Performance targets must be positive');
  }
}