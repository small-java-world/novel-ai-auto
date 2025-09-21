/**
 * TASK-102: メタデータ管理 - 結果構築ユーティリティ
 *
 * 【機能概要】: 一貫した結果オブジェクトの構築とエラーハンドリングを提供
 * 【改善内容】: 重複する結果構築コードを共通化してDRY原則を適用
 * 【設計方針】: Builder パターンを使用して可読性と保守性を向上
 * 【保守性】: 結果の形式を統一してAPIの一貫性を確保
 * 🟢 信頼性レベル: 各テストケースで期待される結果形式に基づく
 *
 * @version 1.0.0
 * @author NovelAI Auto Generator Team
 * @since 2025-01-20 (Refactor phase)
 */

import type {
  LoadResult,
  ConversionResult,
  MetadataDisplayResult,
  FilterResult,
  PresetV1,
  PromptFileV1,
} from '../types/metadata';
import { ERROR_MESSAGES, WARNING_MESSAGES } from './metadata-manager-config';

/**
 * 【結果構築クラス】: LoadResult の一貫した構築を支援
 * 【改善内容】: 散らばっていた結果構築ロジックを統一
 * 【設計方針】: Fluent インターフェースで可読性の高いコード記述を実現
 * 🔴 改善: Greenフェーズの重複コードをBuilder パターンで整理
 */
export class LoadResultBuilder {
  private result: LoadResult;

  constructor() {
    // 【初期状態】: デフォルトの失敗状態で初期化
    this.result = {
      success: false,
      errors: [],
      warnings: [],
    };
  }

  /**
   * 【成功状態設定】: 処理成功を表す状態に設定
   * 【チェーンメソッド】: Fluent インターフェースでメソッドチェーンを可能にする
   */
  success(): this {
    this.result.success = true;
    return this;
  }

  /**
   * 【失敗状態設定】: 処理失敗を表す状態に設定
   * 【チェーンメソッド】: エラー状態の明示的な設定
   */
  failure(): this {
    this.result.success = false;
    return this;
  }

  /**
   * 【メタデータ設定】: 表示用メタデータを設定
   * 【型安全性】: TypeScript の型チェックで不正なデータを防止
   */
  withMetadata(metadata: MetadataDisplayResult): this {
    this.result.metadata = metadata;
    return this;
  }

  /**
   * 【プリセット設定】: プリセット配列を設定
   * 【データ整合性】: プリセットデータの整合性を保持
   */
  withPresets(presets: PresetV1[]): this {
    this.result.presets = presets;
    return this;
  }

  /**
   * 【エラー追加】: エラーメッセージを追加
   * 【複数エラー対応】: 複数のエラーを蓄積して包括的なエラー情報を提供
   */
  addError(error: string): this {
    this.result.errors.push(error);
    return this;
  }

  /**
   * 【複数エラー追加】: エラー配列を一括追加
   * 【効率性】: 複数エラーの効率的な追加
   */
  addErrors(errors: string[]): this {
    this.result.errors.push(...errors);
    return this;
  }

  /**
   * 【警告追加】: 警告メッセージを追加
   * 【ユーザビリティ】: エラーではないが注意が必要な情報を提供
   */
  addWarning(warning: string): this {
    this.result.warnings.push(warning);
    return this;
  }

  /**
   * 【複数警告追加】: 警告配列を一括追加
   * 【効率性】: 複数警告の効率的な追加
   */
  addWarnings(warnings: string[]): this {
    this.result.warnings.push(...warnings);
    return this;
  }

  /**
   * 【結果構築】: 設定された内容から最終的な LoadResult を生成
   * 【イミュータブル】: 元のビルダーに影響しない独立したオブジェクトを返却
   */
  build(): LoadResult {
    // 【ディープコピー】: 参照の共有を避けて安全なオブジェクトを返却
    return {
      success: this.result.success,
      metadata: this.result.metadata,
      presets: this.result.presets ? [...this.result.presets] : undefined,
      errors: [...this.result.errors],
      warnings: [...this.result.warnings],
    };
  }

  /**
   * 【静的ファクトリーメソッド】: 成功結果の簡易作成
   * 【利便性】: よく使用される成功パターンの簡略化
   */
  static createSuccess(
    metadata: MetadataDisplayResult,
    presets: PresetV1[],
    warnings: string[] = []
  ): LoadResult {
    return new LoadResultBuilder()
      .success()
      .withMetadata(metadata)
      .withPresets(presets)
      .addWarnings(warnings)
      .build();
  }

  /**
   * 【静的ファクトリーメソッド】: 失敗結果の簡易作成
   * 【利便性】: よく使用される失敗パターンの簡略化
   */
  static createFailure(errors: string[], warnings: string[] = []): LoadResult {
    return new LoadResultBuilder().failure().addErrors(errors).addWarnings(warnings).build();
  }

  /**
   * 【静的ファクトリーメソッド】: 入力データ不正エラーの簡易作成
   * 【標準化】: よく発生するエラーパターンの標準化
   */
  static createInvalidInputError(): LoadResult {
    return LoadResultBuilder.createFailure([ERROR_MESSAGES.INVALID_INPUT_DATA]);
  }

  /**
   * 【静的ファクトリーメソッド】: JSON構文エラーの簡易作成
   * 【標準化】: TC008で期待される形式のエラーを生成
   */
  static createJsonSyntaxError(): LoadResult {
    return LoadResultBuilder.createFailure([ERROR_MESSAGES.JSON_SYNTAX_ERROR]);
  }

  /**
   * 【静的ファクトリーメソッド】: バージョン不一致エラーの簡易作成
   * 【標準化】: TC009で期待される形式のエラーを生成
   */
  static createVersionMismatchError(version: string): LoadResult {
    return new LoadResultBuilder()
      .failure()
      .addError(WARNING_MESSAGES.SUPPORTED_VERSION_INFO)
      .addWarning(WARNING_MESSAGES.VERSION_UNSUPPORTED_TEMPLATE.replace('{version}', version))
      .build();
  }
}

/**
 * 【結果構築クラス】: ConversionResult の一貫した構築を支援
 * 【改善内容】: レガシー変換結果の構築ロジックを統一
 * 【設計方針】: LoadResultBuilder と同様のパターンで一貫性を保持
 * 🔴 改善: 変換処理の結果構築を標準化
 */
export class ConversionResultBuilder {
  private result: ConversionResult;

  constructor() {
    this.result = {
      success: false,
      warnings: [],
      errors: [],
    };
  }

  /**
   * 【成功状態設定】: 変換成功を表す状態に設定
   */
  success(): this {
    this.result.success = true;
    return this;
  }

  /**
   * 【失敗状態設定】: 変換失敗を表す状態に設定
   */
  failure(): this {
    this.result.success = false;
    return this;
  }

  /**
   * 【変換データ設定】: 変換済みデータを設定
   */
  withConvertedData(data: PromptFileV1): this {
    this.result.convertedData = data;
    return this;
  }

  /**
   * 【エラー追加】: エラーメッセージを追加
   */
  addError(error: string): this {
    this.result.errors.push(error);
    return this;
  }

  /**
   * 【警告追加】: 警告メッセージを追加
   */
  addWarning(warning: string): this {
    this.result.warnings.push(warning);
    return this;
  }

  /**
   * 【複数警告追加】: 警告配列を一括追加
   */
  addWarnings(warnings: string[]): this {
    this.result.warnings.push(...warnings);
    return this;
  }

  /**
   * 【結果構築】: 最終的な ConversionResult を生成
   */
  build(): ConversionResult {
    return {
      success: this.result.success,
      convertedData: this.result.convertedData,
      warnings: [...this.result.warnings],
      errors: [...this.result.errors],
    };
  }

  /**
   * 【静的ファクトリーメソッド】: 成功結果の簡易作成
   * 【標準化】: TC007で期待される形式の成功結果を生成
   */
  static createSuccess(
    convertedData: PromptFileV1,
    warnings: string[] = [
      WARNING_MESSAGES.LEGACY_FORMAT_CONVERTED,
      WARNING_MESSAGES.METADATA_DEFAULTS_APPLIED,
    ]
  ): ConversionResult {
    return new ConversionResultBuilder()
      .success()
      .withConvertedData(convertedData)
      .addWarnings(warnings)
      .build();
  }

  /**
   * 【静的ファクトリーメソッド】: 失敗結果の簡易作成
   */
  static createFailure(errors: string[]): ConversionResult {
    return new ConversionResultBuilder()
      .failure()
      .addError(errors[0] || ERROR_MESSAGES.CONVERSION_ERROR)
      .build();
  }

  /**
   * 【静的ファクトリーメソッド】: レガシー形式不正エラーの簡易作成
   */
  static createInvalidLegacyFormatError(): ConversionResult {
    return ConversionResultBuilder.createFailure([ERROR_MESSAGES.INVALID_LEGACY_FORMAT]);
  }
}

/**
 * 【結果構築クラス】: FilterResult の一貫した構築を支援
 * 【改善内容】: フィルタリング結果の構築ロジックを統一
 * 【設計方針】: 統計情報の正確性を保証する構築方法
 * 🔴 改善: フィルタリング処理の結果構築を標準化
 */
export class FilterResultBuilder {
  private filteredPresets: PresetV1[] = [];
  private appliedTags: string[] = [];

  /**
   * 【フィルタ済みプリセット設定】: フィルタリング結果を設定
   */
  withFilteredPresets(presets: PresetV1[]): this {
    this.filteredPresets = presets;
    return this;
  }

  /**
   * 【適用タグ設定】: フィルタリングに使用されたタグを設定
   */
  withAppliedTags(tags: string[]): this {
    this.appliedTags = tags;
    return this;
  }

  /**
   * 【結果構築】: 最終的な FilterResult を生成
   * 【自動計算】: マッチ数を自動的に計算して整合性を保証
   */
  build(): FilterResult {
    return {
      filteredPresets: [...this.filteredPresets],
      matchCount: this.filteredPresets.length,
      appliedTags: [...this.appliedTags],
    };
  }

  /**
   * 【静的ファクトリーメソッド】: フィルタリング結果の簡易作成
   */
  static create(filteredPresets: PresetV1[], appliedTags: string[]): FilterResult {
    return new FilterResultBuilder()
      .withFilteredPresets(filteredPresets)
      .withAppliedTags(appliedTags)
      .build();
  }

  /**
   * 【静的ファクトリーメソッド】: 空のフィルタリング結果
   * 【利便性】: 入力値不正時などの空結果を簡易作成
   */
  static createEmpty(): FilterResult {
    return FilterResultBuilder.create([], []);
  }

  /**
   * 【静的ファクトリーメソッド】: 全件返却結果
   * 【利便性】: タグ未選択時の全件返却結果を簡易作成
   */
  static createAllResults(presets: PresetV1[]): FilterResult {
    return FilterResultBuilder.create(presets, []);
  }
}

/**
 * 【共通エラーハンドラー】: 統一されたエラー処理機能
 * 【改善内容】: 散らばっていたエラー処理ロジックを統一
 * 【設計方針】: エラーの種類に応じた適切な結果構築
 * 🔴 改善: エラーハンドリングの一貫性向上
 */
export class CommonErrorHandler {
  /**
   * 【JSON解析エラー処理】: JSON解析失敗時の統一的な処理
   * 【標準化】: TC008で期待される形式のエラー結果を生成
   */
  static handleJsonParseError(_error?: Error): LoadResult {
    return LoadResultBuilder.createJsonSyntaxError();
  }

  /**
   * 【バージョン不一致エラー処理】: バージョン不一致時の統一的な処理
   * 【標準化】: TC009で期待される形式のエラー結果を生成
   */
  static handleVersionMismatch(actualVersion: string): LoadResult {
    return LoadResultBuilder.createVersionMismatchError(actualVersion);
  }

  /**
   * 【ファイルサイズエラー処理】: ファイルサイズ超過時の統一的な処理
   * 【標準化】: TC013で期待される形式のエラー結果を生成
   */
  static handleFileSizeExceeded(): LoadResult {
    return LoadResultBuilder.createFailure([ERROR_MESSAGES.FILE_SIZE_EXCEEDED]);
  }

  /**
   * 【一般的なエラー処理】: 予期しないエラーの統一的な処理
   * 【安全性】: システムエラーを安全に処理して情報漏洩を防止
   */
  static handleGenericError(_context: string = 'processing'): LoadResult {
    return LoadResultBuilder.createFailure([ERROR_MESSAGES.FILE_LOAD_ERROR]);
  }

  /**
   * 【レガシー変換エラー処理】: レガシー変換失敗時の統一的な処理
   */
  static handleLegacyConversionError(): ConversionResult {
    return ConversionResultBuilder.createInvalidLegacyFormatError();
  }
}
