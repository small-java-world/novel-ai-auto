/**
 * 【機能概要】: エラーコードと安全なエラー生成ユーティリティの定義
 * 【改善内容】: エラーコードの一元管理と型安全なエラー作成を提供
 * 【設計方針】: 例外メッセージのばらつきを抑え、ログ解析とテスト容易性を向上
 * 【パフォーマンス】: 文字列定数参照のみでオーバーヘッドは極小
 * 【保守性】: 追加/変更はここに集約（呼び出し側はenum的に利用）
 * 🟢 信頼性レベル: 設計文書(api-endpoints.md, interfaces.ts)のエラー構造に整合
 */

export const ERROR_CODES = {
  UNKNOWN_MESSAGE: 'UNKNOWN_MESSAGE',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  PROGRESS_INCONSISTENT: 'PROGRESS_INCONSISTENT',
  INVALID_URL: 'INVALID_URL',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * 【ヘルパー関数】: 統一形式のエラーオブジェクトを生成
 * 【再利用性】: ルータ/ダウンロード/検証レイヤーで共通利用
 * 【単一責任】: コードとメッセージ整形の責務に限定
 */
export function createError(code: ErrorCode, message: string, details?: unknown) {
  return { code, message, details } as const;
}
