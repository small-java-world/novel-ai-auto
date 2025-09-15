/**
 * 【機能概要】: START_GENERATION メッセージを受理し、Content Script に APPLY_AND_GENERATE を橋渡しする最小実装
 * 【改善内容】: メッセージ種別の定数化・小さなヘルパー分割・日本語コメントの充実で可読性と保守性を向上
 * 【設計方針】: 単一責任（受信→対象タブ特定→橋渡し）を小関数に分け、Green要件を満たす最短経路を維持
 * 【パフォーマンス】: O(1) 判定と1回の tabs.query/sendMessage のみ（オーバーヘッド極小）
 * 【保守性】: MESSAGE_TYPES による誤字防止、ヘルパーにより将来の拡張（タブ特定/検証強化）に備える
 * 🟢 信頼性レベル: 設計(api-endpoints.md, dataflow.md)に基づいた改善
 */

// 【型宣言】: TypeScript の noImplicitAny を回避するため、chrome の簡易型を宣言（テスト時はモックが注入される）
declare const chrome: any;

import {
  MESSAGE_TYPES,
  isStartGenerationMsg,
  isProgressUpdateMsg,
  isImageReadyMsg,
  isSafeDownloadUrl,
  isOpenOrFocusTabMsg,
} from '../shared/messages';
import { ERROR_CODES } from '../shared/errors';

export interface MessagingRouter {
  /**
   * 【機能概要】: runtime 経由で受信したメッセージを処理する
   * 【改善内容】: START_GENERATION のみを扱い、NovelAI タブを取得して CS へ橋渡し
   * @param msg - 受信したメッセージオブジェクト（最小限の形状を想定）
   * @returns Promise<void> - 非同期処理（タブ取得/送信）を行う
   */
  handleRuntimeMessage: (_msg: { type: string; payload?: any }) => Promise<void>;
}

/**
 * 【ヘルパー関数】: 送信対象となるタブIDを取得（最小実装として先頭タブ）
 * 【再利用性】: 後続で NovelAI タブ特定ロジックへ差し替え可能
 * 【単一責任】: タブ選択の責務に限定
 */
async function pickTargetTabId(): Promise<number | undefined> {
  const tabs = await chrome?.tabs?.query?.({});
  return tabs && tabs[0] && tabs[0].id;
}

/**
 * 【ヘルパー関数】: APPLY_AND_GENERATE メッセージを生成
 * 【再利用性】: 他の呼び出し箇所でも同一の形状を生成
 * 【単一責任】: メッセージ形状の組み立てのみに限定
 */
function buildApplyAndGenerate(job: unknown) {
  return { type: MESSAGE_TYPES.APPLY_AND_GENERATE, payload: { job } } as const;
}

/**
 * 【ヘルパー関数】: ファイル名のサニタイズ/短縮化
 * 【機能概要】: 禁止文字の除去と最大長の制限を行い、拡張子は可能な限り保持する
 * 【実装方針】: NFR-103/EDGE-103 の境界条件を満たすための最小実装（将来拡張でテンプレート側に集約）
 * 【テスト対応】: IMAGE_READY の長い fileName を安全化するテストに対応
 * 🟡 信頼性レベル: 要件の妥当推測（最大長=128, 禁止文字= \\/:*?"<>|）
 * @param {string} name - 入力ファイル名
 * @param {number} maxLen - 最大長（拡張子含む）
 * @returns {string} - サニタイズされた安全なファイル名
 */
function sanitizeFileName(name: string, maxLen = 128): string {
  // 【実装内容】: 禁止文字を除去し、前後空白をtrim
  const cleaned = (name ?? '').replace(/[\\/:*?"<>|]/g, '').trim();
  if (cleaned.length === 0) return 'image';

  // 【拡張子抽出】: 最後の '.' を拡張子区切りとみなす（先頭/末尾の'.'扱いに注意）
  const lastDot = cleaned.lastIndexOf('.');
  const hasExt = lastDot > 0 && lastDot < cleaned.length - 1;
  const base = hasExt ? cleaned.slice(0, lastDot) : cleaned;
  const ext = hasExt ? cleaned.slice(lastDot) : '';

  // 【長さ制限】: 余裕をもって基底名を切り詰め、全体長が maxLen を超えないようにする
  const allowBaseLen = Math.max(1, maxLen - ext.length);
  const safeBase = base.slice(0, allowBaseLen);
  let out = `${safeBase}${ext}`;
  if (out.length > maxLen) out = out.slice(0, maxLen);
  // 【空文字対策】: すべて除去された場合のフォールバック
  return out.length > 0 ? out : 'image';
}

/**
 * 【ヘルパー関数】: runtime へのメッセージ転送を共通化
 * 【再利用性】: PROGRESS_UPDATE / DOWNLOAD_IMAGE / ERROR などの送信で共通利用
 * 【単一責任】: runtime 送信の責務のみ（呼び出し元でpayload構築）
 */
async function forwardToRuntime(type: string, payload: unknown): Promise<void> {
  await chrome.runtime.sendMessage({ type, payload });
}

export function createMessagingRouter(): MessagingRouter {
  // 【設定定数】: リトライ遅延（指数バックオフの最小版として固定値）🟡
  const _RETRY_DELAY_MS = 500; // 将来的に指数関数化/ジッタ/上限回数を導入予定
  /**
   * 【設定定数】: 指数バックオフのパラメータ（Green→Refactorで拡張予定）
   * - base: 初期待機時間(ms)
   * - factor: 乗数
   * - maxAttempts: 最大再試行回数（この回数を超えたら打ち切り）
   */
  const BACKOFF = { base: 500, factor: 2.0, maxAttempts: 3 } as const; // 🟡 妥当推測（REQ-104/NFR-002）

  // 【状態管理】: 同一ダウンロード対象の再試行回数を追跡（キー: url|fileName）🟡
  const retryState = new Map<string, number>();

  return {
    async handleRuntimeMessage(msg) {
      // 【入力値検証】: サポートするメッセージかを判定（最小実装） 🟢
      if (!msg) return;

      // 【ジョブ中断】: CANCEL_JOB を受理し CS へ橋渡し（最小実装）🟢
      if (msg.type === MESSAGE_TYPES.CANCEL_JOB) {
        const p = msg as { type: string; payload?: { jobId?: string } };
        if (!p.payload || typeof p.payload.jobId !== 'string' || p.payload.jobId.length === 0) {
          await forwardToRuntime(MESSAGE_TYPES.ERROR, {
            error: { code: ERROR_CODES.INVALID_PAYLOAD, message: 'Invalid CANCEL_JOB payload' },
          });
          return;
        }
        const targetId = await pickTargetTabId();
        if (targetId == null) return; // タブが無ければ何もしない（後続拡張で対応）🟡
        await chrome.tabs.sendMessage(targetId, {
          type: MESSAGE_TYPES.CANCEL_JOB,
          payload: { jobId: p.payload.jobId },
        });
        return;
      }

      // 【タブ操作】: OPEN_OR_FOCUS_TAB を処理（既存/新規） 🟢
      if (msg.type === MESSAGE_TYPES.OPEN_OR_FOCUS_TAB) {
        if (!isOpenOrFocusTabMsg(msg)) {
          await forwardToRuntime(MESSAGE_TYPES.ERROR, {
            error: {
              code: ERROR_CODES.INVALID_PAYLOAD,
              message: 'Invalid OPEN_OR_FOCUS_TAB payload',
            },
          });
          return;
        }
        const rawUrl: string = msg.payload.url;
        const queryUrl = rawUrl;
        const baseUrl = rawUrl.endsWith('*') ? rawUrl.slice(0, -1) : rawUrl;
        const tabs = await chrome.tabs.query({ url: queryUrl });
        if (tabs && tabs[0] && tabs[0].id != null) {
          await chrome.tabs.update(tabs[0].id, { active: true });
        } else {
          await chrome.tabs.create({ url: baseUrl, active: true });
        }
        return;
      }

      // 【ブロードキャスト】: PROGRESS_UPDATE は Popup 等へそのまま転送（最小要件） 🟢
      // 【実装方針】: Redテスト（PROGRESS_UPDATEブロードキャスト）を満たすため、payloadを改変せずに中継
      if (msg.type === MESSAGE_TYPES.PROGRESS_UPDATE) {
        // 【入力値検証】: 必須項目（jobId/status/progress）が無ければ INVALID_PAYLOAD 🟢
        if (!isProgressUpdateMsg(msg)) {
          await forwardToRuntime(MESSAGE_TYPES.ERROR, {
            error: {
              code: ERROR_CODES.INVALID_PAYLOAD,
              message: 'Invalid PROGRESS_UPDATE payload',
            },
          });
          return;
        }
        // 【一貫性検証】: current <= total を満たさない進捗は拒否（PROGRESS_INCONSISTENT）🟢
        const { current, total } = msg.payload.progress;
        if (typeof current === 'number' && typeof total === 'number' && current > total) {
          await forwardToRuntime(MESSAGE_TYPES.ERROR, {
            error: {
              code: ERROR_CODES.PROGRESS_INCONSISTENT,
              message: 'progress current exceeds total',
            },
          });
          return;
        }
        // 【購読者不在考慮】: 受信者不在などの送信エラーは握りつぶして継続（ユーザ操作に依存するため）🟢
        try {
          await forwardToRuntime(MESSAGE_TYPES.PROGRESS_UPDATE, msg.payload);
        } catch {
          // noop
        }
        return;
      }

      // 【ダウンロード指示】: IMAGE_READY は DOWNLOAD_IMAGE を発行（最小要件） 🟢
      // 【実装方針】: Redテスト（IMAGE_READY→DOWNLOAD_IMAGE）を満たすため、受領した url/fileName をそのまま渡す
      if (msg.type === MESSAGE_TYPES.IMAGE_READY) {
        if (!isImageReadyMsg(msg)) {
          await forwardToRuntime(MESSAGE_TYPES.ERROR, {
            error: { code: ERROR_CODES.INVALID_PAYLOAD, message: 'Invalid IMAGE_READY payload' },
          });
          return;
        }
        const url: string = msg.payload.url;
        const fileName: string = sanitizeFileName(msg.payload.fileName);
        // 【URL安全性検証】: http/https 以外の不正スキームは拒否（INVALID_URL）🟢
        if (!isSafeDownloadUrl(url)) {
          await forwardToRuntime(MESSAGE_TYPES.ERROR, {
            error: { code: ERROR_CODES.INVALID_URL, message: 'Invalid download url' },
          });
          return;
        }
        await forwardToRuntime(MESSAGE_TYPES.DOWNLOAD_IMAGE, { url, fileName });
        return;
      }

      if (msg.type !== MESSAGE_TYPES.START_GENERATION) {
        // 【エラー通知】: 未知のメッセージ種別は ERROR を発行して拒否（最小要件） 🟢
        // 【再試行処理】: DOWNLOAD_FAILED の場合は遅延後に DOWNLOAD_IMAGE を再送（指数バックオフの最小版） 🟡
        // 【実装方針】: Redテスト要件を満たすため、500ms の固定遅延で再送をスケジュール
        if (
          msg.type === MESSAGE_TYPES.ERROR &&
          msg.payload?.error?.code === ERROR_CODES.DOWNLOAD_FAILED
        ) {
          const url: string | undefined = msg.payload?.context?.url;
          const fileName: string | undefined = msg.payload?.context?.fileName;
          const key = `${url || ''}|${fileName || ''}`;

          // 【試行回数取得】: 未登録は0回として扱う
          const attempts = retryState.get(key) ?? 0;

          // 【上限判定】: 規定回数に達したら打ち切り（追加の再送は行わない）
          if (attempts >= BACKOFF.maxAttempts) {
            await forwardToRuntime(MESSAGE_TYPES.ERROR, {
              error: { code: ERROR_CODES.DOWNLOAD_FAILED, message: 'Retry attempts exhausted' },
              context: { url, fileName },
            });
            return;
          }

          // 【指数バックオフ】: base * factor^attempts で遅延を計算 🟡
          const delay = Math.round(BACKOFF.base * Math.pow(BACKOFF.factor, attempts));
          retryState.set(key, attempts + 1);

          // 【スケジュール】: 指定遅延後に DOWNLOAD_IMAGE を再送（テストはフェイクタイマーで検証） 🟡
          setTimeout(() => {
            chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.DOWNLOAD_IMAGE,
              payload: { url, fileName },
            });
          }, delay);
          return;
        }

        await forwardToRuntime(MESSAGE_TYPES.ERROR, {
          error: {
            code: ERROR_CODES.UNKNOWN_MESSAGE,
            message: `Unknown message type: ${String(msg.type)}`,
          },
        });
        return;
      }

      // 【データ処理開始】: 対象タブの選択（現段階では先頭タブ） 🟡
      // 【入力値検証】: START_GENERATION は job が必須。欠落時は INVALID_PAYLOAD 🟢
      if (!isStartGenerationMsg(msg)) {
        await forwardToRuntime(MESSAGE_TYPES.ERROR, {
          error: { code: ERROR_CODES.INVALID_PAYLOAD, message: 'Invalid START_GENERATION payload' },
        });
        return;
      }
      const targetId = await pickTargetTabId();
      if (targetId == null) {
        // 【フォールバック】: タブが無い場合は何もしない（将来: タブ生成/フォーカスへ拡張） 🟡
        return;
      }

      // 【橋渡し】: Content Script へ APPLY_AND_GENERATE を送出（job をそのまま引き渡す） 🟢
      const job = msg.payload.job;
      await chrome.tabs.sendMessage(targetId, buildApplyAndGenerate(job));
      return;
    },
  };
}

/**
 * 【機能追加】: OPEN_OR_FOCUS_TAB を処理する（既存/新規の分岐）
 * 【実装方針】: 既存タブがあれば update(active:true)、無ければ create する最小実装
 * 【テスト対応】: src/messaging-router.test.ts の 2 ケース（既存/新規）
 * 🟢 信頼性レベル: REQ-101 に基づく
 */
export function extendRouterWithOpenOrFocus(router: MessagingRouter): MessagingRouter {
  return {
    async handleRuntimeMessage(msg) {
      // まず既存のロジックを適用
      if (msg && msg.type !== MESSAGE_TYPES.OPEN_OR_FOCUS_TAB) {
        return router.handleRuntimeMessage(msg);
      }

      // OPEN_OR_FOCUS_TAB の入力検証
      if (!isOpenOrFocusTabMsg(msg)) {
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.ERROR,
          payload: {
            error: {
              code: ERROR_CODES.INVALID_PAYLOAD,
              message: 'Invalid OPEN_OR_FOCUS_TAB payload',
            },
          },
        });
        return;
      }

      const rawUrl: string = msg.payload.url;
      const queryUrl = rawUrl;
      const baseUrl = rawUrl.endsWith('*') ? rawUrl.slice(0, -1) : rawUrl;

      const tabs = await chrome.tabs.query({ url: queryUrl });
      if (tabs && tabs[0] && tabs[0].id != null) {
        await chrome.tabs.update(tabs[0].id, { active: true });
        return;
      }
      await chrome.tabs.create({ url: baseUrl, active: true });
    },
  };
}
