/**
 * TASK-102: 新フォーマット対応・メタデータ管理 型定義
 * 
 * 【機能概要】: 新フォーマット（v1.0）とメタデータ管理の型定義
 * 【設計方針】: 型安全性と拡張性を重視し、既存形式との互換性を確保
 * 【バージョン管理】: 後方互換性を保持しつつ、新機能を段階的に追加
 * 🟢 信頼性レベル: TASK-102要件定義書の技術仕様に基づく
 * 
 * @version 1.0.0
 * @author NovelAI Auto Generator Team
 * @since 2025-09-20
 */

// 【新フォーマット（v1.0）の型定義】
// 🟢 信頼性レベル: TASK-102要件定義書の新フォーマットスキーマに基づく

/**
 * 新フォーマット（v1.0）のプロンプトファイル
 * @interface PromptFileV1
 */
export interface PromptFileV1 {
  /** ファイルバージョン */
  version: "1.0";
  /** メタデータ */
  metadata: MetadataV1;
  /** 共通プロンプト（オプション） */
  commonPrompts?: CommonPromptsV1;
  /** プリセット配列 */
  presets: PresetV1[];
}

/**
 * メタデータ（v1.0）
 * @interface MetadataV1
 */
export interface MetadataV1 {
  /** プロンプトセット名（1-100文字） */
  name: string;
  /** 説明（0-500文字、オプション） */
  description?: string;
  /** 作成者（0-50文字、オプション） */
  author?: string;
  /** 作成日（ISO 8601形式、オプション） */
  created?: string;
  /** 更新日（ISO 8601形式、オプション） */
  modified?: string;
  /** タグ配列（0-20個のタグ、オプション） */
  tags?: string[];
  /** ライセンス情報（オプション） */
  license?: string;
  /** 出典情報（オプション） */
  source?: string;
}

/**
 * 共通プロンプト（v1.0）
 * @interface CommonPromptsV1
 */
export interface CommonPromptsV1 {
  /** 基本プロンプト（0-2000文字、オプション） */
  base?: string;
  /** ネガティブプロンプト（0-2000文字、オプション） */
  negative?: string;
}

/**
 * プリセット（v1.0）
 * @interface PresetV1
 */
export interface PresetV1 {
  /** プリセットID（1-50文字、英数字とアンダースコアのみ） */
  id: string;
  /** プリセット名（1-100文字） */
  name: string;
  /** 説明（0-300文字、オプション） */
  description?: string;
  /** 正方向プロンプト（1-2000文字） */
  positive: string;
  /** 負方向プロンプト（0-2000文字、オプション） */
  negative?: string;
  /** パラメータ（オプション） */
  parameters?: PresetParametersV1;
  /** タグ配列（0-10個のタグ、オプション） */
  tags?: string[];
  /** 作成日（ISO 8601形式、オプション） */
  created?: string;
  /** 更新日（ISO 8601形式、オプション） */
  modified?: string;
}

/**
 * プリセットパラメータ（v1.0）
 * @interface PresetParametersV1
 */
export interface PresetParametersV1 {
  /** ステップ数（1-100、オプション） */
  steps?: number;
  /** CFGスケール（1-20、オプション） */
  cfgScale?: number;
  /** サンプラー（オプション） */
  sampler?: string;
  /** 解像度（オプション） */
  resolution?: string;
  /** その他のパラメータ */
  [key: string]: any;
}

// 【既存形式との互換性のための型定義】
// 🟢 信頼性レベル: 既存のプロンプトファイル形式との互換性確保

/**
 * 既存形式のプロンプトファイル（レガシー）
 * @interface LegacyPromptFile
 */
export interface LegacyPromptFile {
  /** プリセット配列（既存形式） */
  presets: LegacyPreset[];
}

/**
 * 既存形式のプリセット（レガシー）
 * @interface LegacyPreset
 */
export interface LegacyPreset {
  /** プリセットID */
  id: string;
  /** プリセット名 */
  name: string;
  /** 正方向プロンプト */
  positive: string;
  /** 負方向プロンプト（オプション） */
  negative?: string;
  /** パラメータ（オプション） */
  parameters?: {
    steps?: number;
    cfgScale?: number;
    sampler?: string;
    resolution?: string;
    [key: string]: any;
  };
}

// 【バリデーション結果の型定義】
// 🟢 信頼性レベル: データ検証とエラーハンドリングのための型定義

/**
 * バリデーション結果
 * @interface ValidationResult
 */
export interface ValidationResult {
  /** バリデーション成功フラグ */
  valid: boolean;
  /** エラーメッセージの配列 */
  errors: string[];
  /** 警告メッセージの配列 */
  warnings: string[];
}

/**
 * 正規化されたメタデータ
 * @interface NormalizedMetadata
 */
export interface NormalizedMetadata extends MetadataV1 {
  /** 正規化された名前 */
  name: string;
  /** 正規化された説明 */
  description: string;
  /** 正規化された作成者 */
  author: string;
  /** 正規化されたタグ配列 */
  tags: string[];
  /** 正規化された作成日 */
  created: string;
  /** 正規化された更新日 */
  modified: string;
}

// 【検索・フィルタリングの型定義】
// 🟢 信頼性レベル: タグベースフィルタリングと検索機能のための型定義

/**
 * 検索クエリ
 * @interface SearchQuery
 */
export interface SearchQuery {
  /** 検索テキスト */
  text?: string;
  /** タグフィルター */
  tags?: string[];
  /** 作成者フィルター */
  author?: string;
  /** 作成日範囲 */
  dateRange?: {
    from?: string;
    to?: string;
  };
}

/**
 * フィルタリング結果
 * @interface FilterResult
 */
export interface FilterResult {
  /** フィルタリングされたプリセット配列 */
  filteredPresets: PresetV1[];
  /** マッチしたプリセット数 */
  matchCount: number;
  /** 適用されたタグ配列 */
  appliedTags: string[];
}

// 【変換処理の型定義】
// 🟢 信頼性レベル: 形式変換とバージョン管理のための型定義

/**
 * 変換オプション
 * @interface ConversionOptions
 */
export interface ConversionOptions {
  /** デフォルトメタデータの使用 */
  useDefaultMetadata?: boolean;
  /** タグの正規化 */
  normalizeTags?: boolean;
  /** 文字エンコーディング */
  encoding?: 'utf-8' | 'utf-16' | 'shift_jis';
  /** バリデーションの実行 */
  validate?: boolean;
}

/**
 * 変換結果
 * @interface ConversionResult
 */
export interface ConversionResult {
  /** 変換成功フラグ */
  success: boolean;
  /** 変換されたデータ */
  convertedData?: PromptFileV1;
  /** 警告メッセージ配列 */
  warnings: string[];
  /** エラーメッセージ配列 */
  errors: string[];
}

// 【エラーハンドリングの型定義】
// 🟢 信頼性レベル: 堅牢なエラーハンドリングのための型定義

/**
 * メタデータエラー
 * @interface MetadataError
 */
export interface MetadataError {
  /** エラータイプ */
  type: 'validation' | 'conversion' | 'encoding' | 'size' | 'format';
  /** エラーメッセージ */
  message: string;
  /** エラーが発生したフィールド */
  field?: string;
  /** エラーの詳細情報 */
  details?: any;
}

/**
 * ファイル処理エラー
 * @interface FileProcessingError
 */
export interface FileProcessingError {
  /** エラータイプ */
  type: 'read' | 'parse' | 'validate' | 'convert' | 'save';
  /** エラーメッセージ */
  message: string;
  /** ファイルパス */
  filePath?: string;
  /** エラーの詳細情報 */
  details?: any;
}

// 【パフォーマンス測定の型定義】
// 🟢 信頼性レベル: 非機能要件の測定のための型定義

/**
 * パフォーマンス測定結果
 * @interface PerformanceMetrics
 */
export interface PerformanceMetrics {
  /** 処理時間（ミリ秒） */
  processingTime: number;
  /** メモリ使用量（バイト） */
  memoryUsage: number;
  /** 処理されたアイテム数 */
  itemsProcessed: number;
  /** 成功率（パーセント） */
  successRate: number;
}

/**
 * パフォーマンス要件
 * @interface PerformanceRequirements
 */
export interface PerformanceRequirements {
  /** 最大処理時間（ミリ秒） */
  maxProcessingTime: number;
  /** 最大メモリ使用量（バイト） */
  maxMemoryUsage: number;
  /** 最小成功率（パーセント） */
  minSuccessRate: number;
}

// 【TDD Green フェーズ用の追加インターフェース】
// 🟢 信頼性レベル: テストファイルの期待値に基づく

/**
 * ファイル読み込み結果
 * @interface LoadResult
 */
export interface LoadResult {
  /** 読み込み成功フラグ */
  success: boolean;
  /** 表示用メタデータ */
  metadata?: MetadataDisplayResult;
  /** プリセット配列 */
  presets?: PresetV1[];
  /** エラーメッセージ配列 */
  errors: string[];
  /** 警告メッセージ配列 */
  warnings: string[];
}

/**
 * メタデータ表示結果
 * @interface MetadataDisplayResult
 */
export interface MetadataDisplayResult {
  /** 表示用の名前 */
  name: string;
  /** 表示用の説明 */
  description: string;
  /** 表示用の作成者 */
  author: string;
  /** 表示用の作成日 */
  dateCreated: string;
  /** 表示用の更新日 */
  dateModified: string;
  /** 表示用のタグ配列 */
  tags: string[];
  /** 表示用のライセンス情報 */
  license?: string;
  /** 表示用の出典情報 */
  source?: string;
}
