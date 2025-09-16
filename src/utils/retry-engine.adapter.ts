import { createRetryEngine, type RetryEngine } from './retry-engine';
import type { RetrySettings } from '../types';

/**
 * 【機能概要】: RetrySettings から RetryEngine を生成するアダプタ関数
 * 【実装方針】: Redテスト（adapter.red.test）を通すため、設定値をそのまま createRetryEngine に橋渡しする最小実装
 * 【テスト対応】: "RetrySettings から RetryEngine を生成し、指数バックオフが正しく計算される" を満たす
 * 🟢 信頼性レベル: docs/design/architecture.md の既定（base=500ms/factor=2.0）と既存実装の引数整合に基づく直接対応
 * @param {RetrySettings} settings - リトライ設定（baseDelay, factor, maxRetries）
 * @returns {RetryEngine} - 生成されたリトライエンジン
 */
export function createRetryEngineFromRetrySettings(settings: RetrySettings): RetryEngine {
  /**
   * 【改善ポイント】: 入力値の堅牢化と命名差異の吸収
   * - docs/design の Settings.retry では `baseDelayMs`/`maxAttempts` の表記があるため、フォールバック対応を追加 🟡
   * - 異常値（負値/非数/非整数）を早期に検出し、明確な TypeError を投げる 🟢（既存 createRetryEngine の契約整合）
   */

  // 【命名差異フォールバック】: 設計資料の別名に対応（将来の型統合までの橋渡し）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySettings = settings as any;
  const baseDelay: number =
    typeof settings.baseDelay === 'number'
      ? settings.baseDelay
      : typeof anySettings.baseDelayMs === 'number'
        ? anySettings.baseDelayMs
        : NaN;
  const factor: number = settings.factor as number;
  const maxRetries: number =
    typeof settings.maxRetries === 'number'
      ? settings.maxRetries
      : typeof anySettings.maxAttempts === 'number'
        ? anySettings.maxAttempts
        : NaN;

  // 【入力値検証】: 既存エンジンの制約に合わせて前段でチェック 🟢
  if (!Number.isFinite(baseDelay) || baseDelay < 0) {
    throw new TypeError('baseDelay must be a finite number >= 0');
  }
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new TypeError('factor must be a finite number > 0');
  }
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new TypeError('maxRetries must be an integer >= 0');
  }

  // 【設定橋渡し】: 正常化した値をそのまま委譲 🟢
  return createRetryEngine({ baseDelay, factor, maxRetries });
}
