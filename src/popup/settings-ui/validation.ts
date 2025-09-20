/**
 * 【バリデーション機能モジュール】: Settings UI の入力値検証ロジック
 * 【設計方針】: 単一責任原則に基づく検証機能の分離
 * 【再利用性】: 他のコンポーネントからも利用可能な汎用バリデーター
 * 【保守性】: 検証ルールの変更時に影響範囲を限定
 * 🟢 TASK-042要件定義とテストケースに基づく確実な実装
 */

import {
  SettingsInput,
  ValidationResult,
  ValidationError,
  VALIDATION_CONSTRAINTS,
  ERROR_MESSAGES,
} from './types';

/**
 * 【設定値バリデータークラス】: 設定値の包括的検証機能
 * 【改善内容】: モノリシックな検証メソッドを機能別に分離
 * 【パフォーマンス】: 早期リターンによる効率的な検証処理
 * 【テスト容易性】: 各検証機能の独立テストが可能
 * 🟢 全テストケースの期待動作に基づく確実な実装
 */
export class SettingsValidator {
  /**
   * 【メイン検証メソッド】: 設定値全体の包括的検証
   * 【改善内容】: 機能別検証メソッドの組み合わせによる簡潔な実装
   * 【エラー収集】: 全フィールドのエラーを一度に収集して効率化
   * 🟢 TC-002系、TC-003系テストケースの全要求に対応
   */
  static validate(settings: SettingsInput): ValidationResult {
    const errors: ValidationError[] = [
      ...this.validateImageCount(settings.imageCount),
      ...this.validateSeedSettings(settings.seedMode, settings.seedValue),
      ...this.validateFilenameTemplate(settings.filenameTemplate),
      ...this.validateRetrySettings(settings.retrySettings),
    ];

    return {
      isValid: errors.length === 0,
      errors: Object.fromEntries(errors.map((err) => [err.field, err.message])),
    };
  }

  /**
   * 【画像生成数検証】: imageCountフィールドの制約チェック
   * 【改善内容】: 制約定数を使用した保守性の高い実装
   * 【検証内容】: null/undefined チェック、整数チェック、範囲チェック
   * 🟢 TC-002-001, TC-003-001, TC-003-004 テストケースに対応
   */
  private static validateImageCount(imageCount: number): ValidationError[] {
    const errors: ValidationError[] = [];

    if (imageCount == null) {
      errors.push({
        field: 'imageCount',
        message: ERROR_MESSAGES.imageCount.required,
      });
    } else if (
      !Number.isInteger(imageCount) ||
      imageCount < VALIDATION_CONSTRAINTS.imageCount.min ||
      imageCount > VALIDATION_CONSTRAINTS.imageCount.max
    ) {
      errors.push({
        field: 'imageCount',
        message: ERROR_MESSAGES.imageCount.range,
      });
    }

    return errors;
  }

  /**
   * 【シード設定検証】: seedModeとseedValueの組み合わせ検証
   * 【改善内容】: 関連フィールドの相互依存性を考慮した検証
   * 【ビジネスロジック】: fixedモード時のseedValue必須制約を実装
   * 🟢 TC-002-002, TC-003-004 テストケースに対応
   */
  private static validateSeedSettings(
    seedMode: 'random' | 'fixed',
    seedValue?: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (seedMode === 'fixed') {
      if (seedValue == null) {
        errors.push({
          field: 'seedValue',
          message: ERROR_MESSAGES.seedValue.required,
        });
      } else if (
        !Number.isInteger(seedValue) ||
        seedValue < VALIDATION_CONSTRAINTS.seedValue.min ||
        seedValue > VALIDATION_CONSTRAINTS.seedValue.max
      ) {
        errors.push({
          field: 'seedValue',
          message: ERROR_MESSAGES.seedValue.range,
        });
      }
    }

    return errors;
  }

  /**
   * 【ファイル名テンプレート検証】: テンプレート文字列の制約チェック
   * 【改善内容】: セキュリティ強化 - 禁止文字パターンに*文字を追加
   * 【セキュリティ】: ファイルシステム制約とセキュリティ考慮事項を統合
   * 【パフォーマンス】: 早期リターンによる効率的な検証順序
   * 🟢 TC-002-003, TC-003-003, TC-003-004 テストケースに対応
   */
  private static validateFilenameTemplate(filenameTemplate: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // 【必須チェック】: 空文字・null・undefined の検出
    if (!filenameTemplate || filenameTemplate.trim() === '') {
      errors.push({
        field: 'filenameTemplate',
        message: ERROR_MESSAGES.filenameTemplate.required,
      });
      return errors; // 【早期リターン】: 必須チェック失敗時は他のチェックをスキップ
    }

    // 【禁止文字チェック】: セキュリティ強化版 - *文字を追加
    if (VALIDATION_CONSTRAINTS.filenameTemplate.forbiddenChars.test(filenameTemplate)) {
      errors.push({
        field: 'filenameTemplate',
        message: ERROR_MESSAGES.filenameTemplate.invalidChars,
      });
    }

    // 【長さ制約チェック】: ファイルシステム制限の考慮
    if (filenameTemplate.length > VALIDATION_CONSTRAINTS.filenameTemplate.maxLength) {
      errors.push({
        field: 'filenameTemplate',
        message: ERROR_MESSAGES.filenameTemplate.tooLong,
      });
    }

    return errors;
  }

  /**
   * 【リトライ設定検証】: 複合オブジェクトの各パラメータ検証
   * 【改善内容】: ネストしたオブジェクトの効率的な検証パターン
   * 【境界値テスト対応】: 各パラメータの独立した境界値チェック
   * 🟢 TC-003-002 テストケースの境界値組み合わせに対応
   */
  private static validateRetrySettings(
    retrySettings: SettingsInput['retrySettings']
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!retrySettings) {
      errors.push({
        field: 'retrySettings',
        message: ERROR_MESSAGES.retrySettings.required,
      });
      return errors; // 【早期リターン】: オブジェクト自体が無効な場合は詳細チェックをスキップ
    }

    // 【最大試行回数検証】: 整数かつ範囲内チェック
    if (
      !Number.isInteger(retrySettings.maxAttempts) ||
      retrySettings.maxAttempts < VALIDATION_CONSTRAINTS.retry.maxAttempts.min ||
      retrySettings.maxAttempts > VALIDATION_CONSTRAINTS.retry.maxAttempts.max
    ) {
      errors.push({
        field: 'maxAttempts',
        message: ERROR_MESSAGES.retrySettings.maxAttempts,
      });
    }

    // 【基本遅延時間検証】: 整数かつ実用的な範囲チェック
    if (
      !Number.isInteger(retrySettings.baseDelayMs) ||
      retrySettings.baseDelayMs < VALIDATION_CONSTRAINTS.retry.baseDelayMs.min ||
      retrySettings.baseDelayMs > VALIDATION_CONSTRAINTS.retry.baseDelayMs.max
    ) {
      errors.push({
        field: 'baseDelayMs',
        message: ERROR_MESSAGES.retrySettings.baseDelayMs,
      });
    }

    // 【遅延倍率検証】: 浮動小数点数の範囲チェック
    if (
      typeof retrySettings.factor !== 'number' ||
      retrySettings.factor < VALIDATION_CONSTRAINTS.retry.factor.min ||
      retrySettings.factor > VALIDATION_CONSTRAINTS.retry.factor.max
    ) {
      errors.push({
        field: 'factor',
        message: ERROR_MESSAGES.retrySettings.factor,
      });
    }

    return errors;
  }

  /**
   * 【個別フィールドバリデーション】: 特定フィールドのみの検証
   * 【用途】: リアルタイムバリデーションやフォーカス時の個別チェック
   * 【パフォーマンス】: 必要なフィールドのみを検証して効率化
   * 🟡 将来の機能拡張を想定した妥当な実装
   */
  static validateField(
    field: keyof SettingsInput,
    value: any,
    settings?: Partial<SettingsInput>
  ): ValidationError[] {
    switch (field) {
      case 'imageCount':
        return this.validateImageCount(value);
      case 'seedMode':
      case 'seedValue':
        return this.validateSeedSettings(
          settings?.seedMode || 'random',
          field === 'seedValue' ? value : settings?.seedValue
        );
      case 'filenameTemplate':
        return this.validateFilenameTemplate(value);
      case 'retrySettings':
        return this.validateRetrySettings(value);
      default:
        return [];
    }
  }
}
