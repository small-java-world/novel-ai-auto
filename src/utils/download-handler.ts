import { createRetryEngine } from './retry-engine';
import { sanitizeFileName } from './fileNameTemplate';

// 【設定定数】: エラーメッセージの一元管理 🟢
// 【調整可能性】: 多言語化・文言変更時はここを更新 🟡
const ERROR_MSG = {
  permissionDenied: 'ダウンロード権限がありません',
  aborted: 'キャンセルされました',
} as const;

// 【設定定数】: テスト時は短いディレイで高速化、通常は実運用想定 🟡
const IS_TEST =
  typeof process !== 'undefined' && (process.env.VITEST || process.env.NODE_ENV === 'test');
const RETRY_CONFIG = {
  baseDelay: IS_TEST ? 50 : 500,
  factor: 2.0,
  maxRetries: 5,
} as const;

/**
 * 【機能概要】: ダウンロード要求の入力型
 * 【実装方針】: 必要最小限（URL/ファイル名/任意のAbortSignal）
 * 【テスト対応】: download-handler.test.ts の呼び出しに一致
 * 🟢🟡🔴 信頼性レベル: 🟢（既存テスト準拠）
 */
export interface DownloadRequest {
  url: string;
  filename: string;
  signal?: AbortSignal;
}

/**
 * 【機能概要】: ダウンロード結果の出力型
 * 【実装方針】: 成功時はID、失敗時はエラーメッセージを返す
 * 【テスト対応】: download-handler.test.ts のassertに一致
 * 🟢🟡🔴 信頼性レベル: 🟢（既存テスト準拠）
 */
export interface DownloadResult {
  success: boolean;
  downloadId?: number;
  error?: string;
}

/**
 * 【ヘルパー関数】: AbortSignal と任意の Promise を競合させる
 * 【再利用性】: 長時間I/Oの中断にも利用可能
 * 【単一責任】: 中断イベントを即時にPromiseに反映
 */
function abortable<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
  message: string = ERROR_MSG.aborted
): Promise<T> {
  if (!signal) return promise;
  let remove: (() => void) | undefined;
  const onAbortPromise = new Promise<T>((_, reject) => {
    const onAbort = () => {
      const e = new Error(message);
      (e as any).name = 'AbortError';
      reject(e);
    };
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    remove = () => signal.removeEventListener('abort', onAbort);
  });
  return Promise.race([promise, onAbortPromise]).finally(() => {
    if (remove) remove();
  });
}

/**
 * 【ヘルパー関数】: どの値でも Error に正規化
 * 【再利用性】: 最終catchの整形を簡素化
 * 【単一責任】: 例外の型を Error に寄せる
 */
function ensureError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * 【機能概要】: エラーの性質を分類
 * 【実装方針】: プロパティ/メッセージによる最小限の判定
 * 【テスト対応】: 権限/中断/ファイル名/一時エラーの分岐
 * 🟢🟡🔴 信頼性レベル: 🟡（妥当な推測＋テスト基準）
 */
function classifyError(
  error: unknown
): 'retryable' | 'non-retryable' | 'filename-invalid' | 'aborted' {
  if (!(error instanceof Error)) return 'retryable';
  if ((error as any).code === 'PERMISSION_DENIED') return 'non-retryable';
  if ((error as any).name === 'AbortError') return 'aborted';
  if (error.message.includes('Invalid filename')) return 'filename-invalid';
  return 'retryable';
}

/**
 * 【機能概要】: ダウンロード実行（指数バックオフ＋Abort対応）
 * 【改善内容】: 定数抽出・Abort競合のヘルパー化・エラーメッセージの一元管理
 * 【設計方針】: 単一責任のユーティリティで重複を排除し、可読性を向上
 * 【パフォーマンス】: Abort の即時反映で無駄な待機を削減
 * 【保守性】: 文言・設定の変更点を局所化（ERROR_MSG/RETRY_CONFIG）
 * 🟢🟡🔴 信頼性レベル: 🟢（既存テスト準拠）
 * @param {DownloadRequest} request - URL/ファイル名/中断用シグナル（任意）
 * @returns {Promise<DownloadResult>} - 成否・ID・エラー
 */
export async function downloadHandler(request: DownloadRequest): Promise<DownloadResult> {
  // 【入力値検証】: 事前キャンセル 🟢
  if (request.signal?.aborted) {
    return { success: false, error: ERROR_MSG.aborted };
  }

  const retryEngine = createRetryEngine({
    baseDelay: RETRY_CONFIG.baseDelay,
    factor: RETRY_CONFIG.factor,
    maxRetries: RETRY_CONFIG.maxRetries,
  });

  try {
    const downloadId = await retryEngine.executeWithRetry(
      async () => {
        // 【実行直前中断確認】🟢
        if (request.signal?.aborted) {
          const e = new Error(ERROR_MSG.aborted);
          (e as any).name = 'AbortError';
          throw e;
        }

        try {
          // 【Chrome API呼出】🟢
          const promise = Promise.resolve(
            chrome.downloads.download({
              url: request.url,
              filename: request.filename,
              conflictAction: 'uniquify',
            })
          );

          // 【中断競合】🟢
          return await abortable(promise, request.signal, ERROR_MSG.aborted);
        } catch (chromeError) {
          const kind = classifyError(chromeError);

          if (kind === 'non-retryable') {
            const e: any = new Error(ERROR_MSG.permissionDenied);
            e.isNonRetryable = true;
            throw e;
          }

          if (kind === 'aborted') {
            const e: any = new Error(ERROR_MSG.aborted);
            e.name = 'AbortError';
            e.isNonRetryable = true; // リトライしない
            throw e;
          }

          if (kind === 'filename-invalid') {
            const sanitized = sanitizeFileName(request.filename);
            if (sanitized !== request.filename) {
              request.filename = sanitized;
              const promise2 = Promise.resolve(
                chrome.downloads.download({
                  url: request.url,
                  filename: request.filename,
                  conflictAction: 'uniquify',
                })
              );
              return await abortable(promise2, request.signal, ERROR_MSG.aborted);
            }
            const e: any = new Error('ファイル名のサニタイズに失敗しました');
            e.isNonRetryable = true;
            throw e;
          }

          // リトライ対象
          throw ensureError(chromeError);
        }
      },
      { signal: request.signal }
    );

    // 【結果返却】🟢
    return { success: true, downloadId };
  } catch (error) {
    // 【終端整形】🟢
    const kind = classifyError(error);
    if (kind === 'aborted' || (error as any)?.isAbort === true) {
      return { success: false, error: ERROR_MSG.aborted };
    }
    if (kind === 'non-retryable' || (error as any)?.isNonRetryable === true) {
      return { success: false, error: ERROR_MSG.permissionDenied };
    }
    return { success: false, error: ensureError(error).message };
  }
}
