/**
 * 【エラーハンドリング統一モジュール】: Storage/Download処理のエラー分類・処理を一元化
 * 【設計方針】: エラー種別の判定、メッセージ生成、リトライ制御を統一的に管理
 * 【保守性向上】: エラー処理ロジックの重複を排除し、一貫性を確保
 * 🟢 信頼性レベル: 高（テストケース期待値とGreenフェーズ実装に基づく）
 */

import { DownloadResult } from './storage-download-compatibility';
import { STORAGE_DOWNLOAD_CONFIG, ERROR_MESSAGES } from './storage-download-compatibility-config';

/**
 * エラー種別の列挙型
 * 【分類基準】: テストケースで検証されるエラーコードに基づく分類
 */
export type ErrorType =
  | 'PERMISSION_DENIED'
  | 'PERMISSION_API_ERROR'
  | 'DOWNLOAD_FAILED'
  | 'INVALID_INPUT';

/**
 * 【エラーハンドリング統一クラス】: 全てのエラー処理を統一的に管理
 * 【責任範囲】: エラー分類、メッセージ生成、リトライ判定、レスポンス構築
 */
export class DownloadErrorHandler {
  /**
   * 【エラー結果生成】: エラー情報からDownloadResultを構築
   * 【設計方針】: エラータイプに応じて適切なレスポンス構造を生成
   * 【テスト対応】: 各テストケースで期待されるエラーレスポンス形式に準拠
   *
   * @param errorType - エラーの分類
   * @param error - 発生した例外オブジェクト
   * @param retryable - リトライ可能かどうか（オプション）
   * @returns DownloadResult - 統一されたエラーレスポンス
   */
  static createErrorResult(
    errorType: ErrorType,
    error: Error,
    retryable?: boolean
  ): DownloadResult {
    // 【基本エラー構造】: 全エラータイプ共通の基本構造
    const baseResult: DownloadResult = {
      success: false,
      errorCode: errorType as
        | 'DOWNLOAD_FAILED'
        | 'PERMISSION_DENIED'
        | 'PERMISSION_API_ERROR'
        | 'PERMISSION_PENDING',
      errorMessage: this.getErrorMessage(errorType),
    };

    // 【リトライ制御】: エラータイプに応じたリトライ可否判定
    if (this.isRetryableError(errorType, retryable)) {
      baseResult.retryable = true;
      baseResult.retryDelay = this.calculateRetryDelay();
    } else {
      baseResult.retryable = false;
    }

    return baseResult;
  }

  /**
   * 【エラーメッセージ取得】: エラータイプに応じた適切なメッセージを取得
   * 【一元管理】: メッセージ定数からの統一的な取得
   *
   * @param errorType - エラーの分類
   * @returns string - 対応するエラーメッセージ
   */
  private static getErrorMessage(errorType: ErrorType): string {
    switch (errorType) {
      case 'PERMISSION_DENIED':
        return ERROR_MESSAGES.PERMISSION_DENIED;
      case 'PERMISSION_API_ERROR':
        return ERROR_MESSAGES.PERMISSION_API_ERROR;
      case 'DOWNLOAD_FAILED':
        return ERROR_MESSAGES.DOWNLOAD_FAILED;
      case 'INVALID_INPUT':
        return ERROR_MESSAGES.INVALID_INPUT;
      default:
        // 【フォールバック】: 予期しないエラータイプへの安全な対応
        return ERROR_MESSAGES.DOWNLOAD_FAILED;
    }
  }

  /**
   * 【リトライ可否判定】: エラータイプと状況に応じてリトライ可能性を判定
   * 【判定基準】: テストケースで期待されるリトライ動作に基づく
   *
   * @param errorType - エラーの分類
   * @param explicitRetryable - 明示的なリトライ可否指定
   * @returns boolean - リトライ可能かどうか
   */
  private static isRetryableError(errorType: ErrorType, explicitRetryable?: boolean): boolean {
    // 【明示的指定優先】: 外部から明示的に指定された場合はそれを優先
    if (explicitRetryable !== undefined) {
      return explicitRetryable;
    }

    // 【エラータイプ別判定】: デフォルトのリトライ可否
    switch (errorType) {
      case 'DOWNLOAD_FAILED':
        // 【ダウンロード失敗】: 一時的な問題の可能性があるためリトライ可能
        return true;
      case 'PERMISSION_DENIED':
      case 'PERMISSION_API_ERROR':
      case 'INVALID_INPUT':
        // 【権限・入力エラー】: 根本的な問題のためリトライ不可
        return false;
      default:
        // 【デフォルト】: 不明なエラーはリトライしない（安全側に倒す）
        return false;
    }
  }

  /**
   * 【リトライ遅延計算】: 適切なリトライ遅延時間を計算
   * 【計算方式】: 基本遅延 × 倍率で計算し、上限値で制限
   * 【テスト対応】: TC-072-202のリトライ遅延境界値（2000ms上限）に準拠
   *
   * @param attempt - リトライ試行回数（デフォルト1）
   * @returns number - リトライ遅延時間（ミリ秒）
   */
  private static calculateRetryDelay(attempt: number = 1): number {
    // 【指数バックオフ計算】: 基本遅延 × 倍率^試行回数
    const calculatedDelay =
      STORAGE_DOWNLOAD_CONFIG.RETRY_BASE_DELAY *
      Math.pow(STORAGE_DOWNLOAD_CONFIG.RETRY_MULTIPLIER, attempt - 1);

    // 【上限制限】: 設定された最大遅延時間を超えないよう制限
    return Math.min(calculatedDelay, STORAGE_DOWNLOAD_CONFIG.MAX_RETRY_DELAY);
  }

  /**
   * 【エラー種別判定】: 例外オブジェクトからエラータイプを推測
   * 【判定ロジック】: エラーメッセージの内容から適切な分類を決定
   * 【フォールバック】: 判定できない場合は安全な分類にフォールバック
   *
   * @param error - 発生した例外オブジェクト
   * @returns ErrorType - 推測されるエラータイプ
   */
  static classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    // 【権限API例外判定】: TC-072-102で期待される特定メッセージパターン
    if (message.includes('permission api error')) {
      return 'PERMISSION_API_ERROR';
    }

    // 【権限拒否判定】: 権限関連のエラーメッセージパターン
    if (message.includes('permission') && message.includes('denied')) {
      return 'PERMISSION_DENIED';
    }

    // 【入力値エラー判定】: 入力値関連のエラーメッセージパターン
    if (message.includes('invalid') || message.includes('required')) {
      return 'INVALID_INPUT';
    }

    // 【デフォルト分類】: その他のエラーはダウンロード失敗として分類
    return 'DOWNLOAD_FAILED';
  }

  /**
   * 【包括的エラー処理】: 例外オブジェクトから適切なDownloadResultを生成
   * 【統合処理】: エラー分類、メッセージ生成、リトライ判定を一括実行
   * 【利便性】: 呼び出し側のコードを簡潔にするための高レベルAPI
   *
   * @param error - 発生した例外オブジェクト
   * @returns DownloadResult - 適切に分類・構築されたエラーレスポンス
   */
  static handleError(error: Error): DownloadResult {
    const errorType = this.classifyError(error);
    return this.createErrorResult(errorType, error);
  }
}
