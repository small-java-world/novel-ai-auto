/**
 * 【機能概要】: Chrome拡張機能のダウンロード権限管理とダウンロード実行機能（リファクタ版）
 * 【設計方針】: モジュール分離による保守性向上とテスタビリティ改善
 * 【改善内容】: 設定外部化、責任分離、エラーハンドリング統一、セキュリティ強化
 * 【テスト対応】: TC-072-001〜TC-072-204の全テストケースに継続対応
 */

// モジュール分離による依存関係の明確化
import { PermissionManager } from './permission-manager';
import { FilenameSanitizer } from './filename-sanitizer';
import { DownloadLogger } from './download-logger';
import { DownloadErrorHandler } from './storage-download-error-handler';

/**
 * ダウンロード結果を表すインターフェース
 * 【定義継承】: Greenフェーズから引き継いだテスト準拠構造
 */
export interface DownloadResult {
  success: boolean;
  downloadId?: number;
  errorCode?: 'PERMISSION_DENIED' | 'PERMISSION_API_ERROR' | 'DOWNLOAD_FAILED' | 'PERMISSION_PENDING';
  errorMessage?: string;
  retryable?: boolean;
  retryDelay?: number;
}

/**
 * ダウンロード要求を表すインターフェース
 * 【セキュリティ強化】: 入力値検証を意識した型定義
 */
export interface DownloadRequest {
  url: string;
  fileName: string;
}

/**
 * 【機能概要】: ダウンロード権限確認と実行を統合的に処理する主要関数（リファクタ版）
 * 【改善内容】: モジュール分離、エラーハンドリング統一、設定外部化、セキュリティ強化
 * 【設計方針】: 各モジュールの責任分離により保守性・テスタビリティを向上
 * 【テスト対応】: TC-072-001〜TC-072-204の全テストケースに継続対応
 * @param request - ダウンロード要求（URL、ファイル名を含む）
 * @returns Promise<DownloadResult> - ダウンロード結果（成功可否、ID、エラー情報等）
 */
export async function ensureDownloadPermissionAndDownload(
  request: DownloadRequest
): Promise<DownloadResult> {
  try {
    // 【入力値検証強化】: セキュリティを重視した包括的な入力値検証
    const validationResult = validateDownloadRequest(request);
    if (!validationResult.isValid) {
      return DownloadErrorHandler.createErrorResult('INVALID_INPUT',
        new Error(validationResult.message), false);
    }

    // 【権限管理統一】: PermissionManagerによる統一的な権限状態管理
    const permissionStatus = await PermissionManager.checkPermissionStatus();

    // 【権限API例外処理】: checkPermissionStatus でエラーが発生した場合の処理
    if (permissionStatus.nextAction === 'abort') {
      return DownloadErrorHandler.createErrorResult('PERMISSION_API_ERROR',
        new Error('権限確認中にエラーが発生しました'), false);
    }

    if (!permissionStatus.hasPermission) {
      // 【権限要求処理】: 統一された権限要求フロー（権限チェック重複を避けるため直接要求実行）
      const requestResult = await PermissionManager.requestPermission(true);

      if (!requestResult.granted) {
        // 【権限拒否統一処理】: DownloadErrorHandlerによる統一的なエラー処理
        await DownloadLogger.logError('permission_denied',
          `権限が拒否されました: ${request.fileName}`);

        return DownloadErrorHandler.createErrorResult('PERMISSION_DENIED',
          new Error('権限が拒否されました'), false);
      }
    }

    // 【ファイル名サニタイズ強化】: FilenameSanitizerによるセキュアな変換
    const sanitizedFileName = FilenameSanitizer.sanitize(request.fileName);

    // 【ダウンロード実行】: Chrome Downloads APIによる実際のダウンロード
    const downloadId = await executeDownload(request.url, sanitizedFileName);

    // 【成功ログ記録】: DownloadLoggerによる統一的なログ管理
    await DownloadLogger.logSuccess('download_success',
      `ダウンロード成功: ${sanitizedFileName}`);

    // 【成功結果返却】: テストケース期待値準拠の戻り値
    return {
      success: true,
      downloadId: downloadId
    };

  } catch (error) {
    // 【統一エラーハンドリング】: DownloadErrorHandlerによる一元的なエラー処理
    await DownloadLogger.logError('download_error', `エラー: ${error.message}`);
    return DownloadErrorHandler.handleError(error);
  }
}

/**
 * 入力値検証結果のインターフェース
 * 【構造化検証】: 検証結果と詳細情報を統一的に管理
 */
interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * 【入力値検証強化】: ダウンロード要求の包括的な妥当性検証
 * 【セキュリティ重視】: XSS、パストラバーサル、不正URL等への対策
 * 【検証項目】: null安全性、URL形式、ファイル名安全性、長さ制限
 *
 * @param request - 検証対象のダウンロード要求
 * @returns ValidationResult - 検証結果の詳細
 */
function validateDownloadRequest(request: DownloadRequest): ValidationResult {
  // 【基本null安全性チェック】
  if (!request || typeof request !== 'object') {
    return { isValid: false, message: 'リクエストオブジェクトが無効です' };
  }

  // 【URL検証】: URLの形式と安全性をチェック
  if (!request.url || typeof request.url !== 'string' || request.url.trim().length === 0) {
    return { isValid: false, message: 'URLが無効です' };
  }

  // 【URL形式検証】: 基本的なURL形式の妥当性確認
  try {
    const url = new URL(request.url);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { isValid: false, message: 'HTTPまたはHTTPS URLのみ許可されています' };
    }
  } catch {
    return { isValid: false, message: 'URL形式が不正です' };
  }

  // 【ファイル名検証】: ファイル名の基本的な妥当性確認
  if (!request.fileName || typeof request.fileName !== 'string' || request.fileName.trim().length === 0) {
    return { isValid: false, message: 'ファイル名が無効です' };
  }

  // 【ファイル名長さ制限】: 極端に長いファイル名の拒否
  if (request.fileName.length > 1000) {
    return { isValid: false, message: 'ファイル名が長すぎます' };
  }

  return { isValid: true, message: '検証成功' };
}

/**
 * 【ダウンロード実行】: Chrome Downloads APIによる実際のファイルダウンロード
 * 【責任範囲】: ダウンロード実行のみに集中した単一責任関数
 * 【エラー処理】: ダウンロード固有のエラーを適切に分類
 *
 * @param url - ダウンロード対象のURL
 * @param filename - 保存ファイル名
 * @returns Promise<number> - ダウンロードID
 */
async function executeDownload(url: string, filename: string): Promise<number> {
  try {
    return await chrome.downloads.download({
      url: url,
      filename: filename,
      conflictAction: 'uniquify'
    });
  } catch (error) {
    // 【ダウンロード固有エラー処理】: Chrome Downloads API固有のエラー分類
    throw new Error(`ダウンロード実行エラー: ${error.message}`);
  }
}