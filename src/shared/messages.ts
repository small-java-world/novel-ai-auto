/**
 * 【機能概要】: ランタイムメッセージ種別の定数化と型ガード/検証ユーティリティ
 * 【改善内容】: 文字列リテラルの重複/誤字を排除し、型安全な検証を提供
 * 【設計方針】: interfaces.ts の仕様に沿って最小限の構造チェックを実装
 * 【パフォーマンス】: O(1) の浅い検証のみを行い、深いデータは上位で検証
 * 【保守性】: 新規メッセージ追加はここへ定義→型ガード追加の手順で一貫
 * 🟢 信頼性レベル: 設計文書(api-endpoints.md, interfaces.ts)に基づく
 */

export const MESSAGE_TYPES = {
  START_GENERATION: 'START_GENERATION',
  CANCEL_JOB: 'CANCEL_JOB',
  APPLY_AND_GENERATE: 'APPLY_AND_GENERATE',
  APPLY_PROMPT: 'APPLY_PROMPT',
  PROGRESS_UPDATE: 'PROGRESS_UPDATE',
  IMAGE_READY: 'IMAGE_READY',
  GENERATION_COMPLETE: 'GENERATION_COMPLETE',
  GENERATION_ERROR: 'GENERATION_ERROR',
  DOWNLOAD_IMAGE: 'DOWNLOAD_IMAGE',
  OPEN_OR_FOCUS_TAB: 'OPEN_OR_FOCUS_TAB',
  GET_PAGE_STATE: 'GET_PAGE_STATE',
  ERROR: 'ERROR',
  // Login Detection Messages (TASK-070)
  LOGIN_REQUIRED_CHECK: 'LOGIN_REQUIRED_CHECK',
  LOGIN_REQUIRED_RESULT: 'LOGIN_REQUIRED_RESULT',
  LOGIN_COMPLETED_CHECK: 'LOGIN_COMPLETED_CHECK',
  LOGIN_COMPLETED_RESULT: 'LOGIN_COMPLETED_RESULT',
  PAUSE_RUNNING_JOB: 'PAUSE_RUNNING_JOB',
  JOB_PAUSE_RESULT: 'JOB_PAUSE_RESULT',
  SAVE_JOB_STATE: 'SAVE_JOB_STATE',
  JOB_SAVE_RESULT: 'JOB_SAVE_RESULT',
  RESUME_SAVED_JOB: 'RESUME_SAVED_JOB',
  JOB_RESUME_RESULT: 'JOB_RESUME_RESULT',
  LOGIN_CACHE_RESET: 'LOGIN_CACHE_RESET',
  LOGIN_CACHE_CLEARED: 'LOGIN_CACHE_CLEARED',
  LOGIN_DETECTION_ERROR: 'LOGIN_DETECTION_ERROR',
  // Network Recovery Messages (TASK-071)
  NETWORK_STATE_CHANGED: 'NETWORK_STATE_CHANGED',
  JOB_PAUSED: 'JOB_PAUSED',
  JOB_RESUMED: 'JOB_RESUMED',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

// 最低限の型（実装側で詳細型と合流させる想定）
export interface BaseMessage<T extends MessageType = MessageType, P = unknown> {
  type: T;
  payload: P;
}

/**
 * 【ヘルパー関数】: 任意の値が BaseMessage 形状を満たすか判定
 * 【再利用性】: すべての受信箇所の入口で利用
 * 【単一責任】: 形状チェックに限定（意味的検証は各型ガードで実施）
 */
export function isBaseMessage(value: unknown): value is BaseMessage {
  const v = value as Record<string, unknown>;
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v['type'] === 'string' &&
    Object.values(MESSAGE_TYPES).includes(v['type'] as MessageType) &&
    'payload' in v
  );
}

/**
 * 【ヘルパー関数】: type フィールドが一致するかの簡易判定
 * 【処理効率化】: 先にベース形状を満たすかだけ確認して早期return 🟢
 */
function hasType(value: unknown, t: MessageType): boolean {
  if (!isBaseMessage(value)) return false;
  return value.type === t;
}

// 個別型ガード（payloadの必須キー存在のみチェック：詳細は実装で検証）

export function isStartGenerationMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.START_GENERATION, { job: unknown }> {
  if (!hasType(v, MESSAGE_TYPES.START_GENERATION)) return false;
  const p = (v as BaseMessage).payload as Record<string, unknown>;
  return p != null && typeof p === 'object' && 'job' in p;
}

export function isCancelJobMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.CANCEL_JOB, { jobId: string }> {
  if (!hasType(v, MESSAGE_TYPES.CANCEL_JOB)) return false;
  const p = (v as BaseMessage).payload as Record<string, unknown>;
  return typeof p?.jobId === 'string' && p.jobId.length > 0;
}

export function isApplyAndGenerateMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.APPLY_AND_GENERATE, { job: unknown }> {
  if (!hasType(v, MESSAGE_TYPES.APPLY_AND_GENERATE)) return false;
  const p = (v as BaseMessage).payload as Record<string, unknown>;
  return p != null && typeof p === 'object' && 'job' in p;
}

export function isProgressUpdateMsg(v: unknown): v is BaseMessage<
  typeof MESSAGE_TYPES.PROGRESS_UPDATE,
  {
    jobId: string;
    status: string;
    progress: { current: number; total: number; etaSeconds?: number };
  }
> {
  if (!hasType(v, MESSAGE_TYPES.PROGRESS_UPDATE)) return false;
  const p = (v as BaseMessage).payload as any;
  return (
    p &&
    typeof p.jobId === 'string' &&
    typeof p.status === 'string' &&
    p.progress &&
    typeof p.progress.current === 'number' &&
    typeof p.progress.total === 'number'
  );
}

export function isImageReadyMsg(
  v: unknown
): v is BaseMessage<
  typeof MESSAGE_TYPES.IMAGE_READY,
  { jobId: string; url: string; index: number; fileName: string }
> {
  if (!hasType(v, MESSAGE_TYPES.IMAGE_READY)) return false;
  const p = (v as BaseMessage).payload as any;
  return (
    p &&
    typeof p.jobId === 'string' &&
    typeof p.url === 'string' &&
    typeof p.index === 'number' &&
    typeof p.fileName === 'string'
  );
}

export function isDownloadImageMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.DOWNLOAD_IMAGE, { url: string; fileName: string }> {
  if (!hasType(v, MESSAGE_TYPES.DOWNLOAD_IMAGE)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.url === 'string' && typeof p.fileName === 'string';
}

export function isOpenOrFocusTabMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.OPEN_OR_FOCUS_TAB, { url: string }> {
  if (!hasType(v, MESSAGE_TYPES.OPEN_OR_FOCUS_TAB)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.url === 'string' && p.url.length > 0;
}

export function isErrorMsg(
  v: unknown
): v is BaseMessage<
  typeof MESSAGE_TYPES.ERROR,
  { jobId?: string; error: { code: string; message: string } }
> {
  if (!hasType(v, MESSAGE_TYPES.ERROR)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.error?.code === 'string' && typeof p.error?.message === 'string';
}

// Additional message type guards for new message types

export function isApplyPromptMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.APPLY_PROMPT, { prompt: string; parameters: unknown }> {
  if (!hasType(v, MESSAGE_TYPES.APPLY_PROMPT)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.prompt === 'string' && p.parameters && typeof p.parameters === 'object';
}

export function isGenerationCompleteMsg(
  v: unknown
): v is BaseMessage<
  typeof MESSAGE_TYPES.GENERATION_COMPLETE,
  { count: number; downloadedFiles: string[] }
> {
  if (!hasType(v, MESSAGE_TYPES.GENERATION_COMPLETE)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.count === 'number' && Array.isArray(p.downloadedFiles);
}

export function isGenerationErrorMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.GENERATION_ERROR, { error: string }> {
  if (!hasType(v, MESSAGE_TYPES.GENERATION_ERROR)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.error === 'string';
}

export function isGetPageStateMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.GET_PAGE_STATE, unknown> {
  if (!hasType(v, MESSAGE_TYPES.GET_PAGE_STATE)) return false;
  return true; // No payload required
}

// Login Detection Message Type Guards

export function isLoginRequiredCheckMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.LOGIN_REQUIRED_CHECK, { currentJobId?: string }> {
  if (!hasType(v, MESSAGE_TYPES.LOGIN_REQUIRED_CHECK)) return false;
  const p = (v as BaseMessage).payload as any;
  return (
    p === undefined ||
    (typeof p === 'object' && (p.currentJobId === undefined || typeof p.currentJobId === 'string'))
  );
}

export function isLoginRequiredResultMsg(v: unknown): v is BaseMessage<
  typeof MESSAGE_TYPES.LOGIN_REQUIRED_RESULT,
  {
    detected: boolean;
    message?: unknown;
    fallbackResult?: string;
    warning?: string;
    reason?: string;
  }
> {
  if (!hasType(v, MESSAGE_TYPES.LOGIN_REQUIRED_RESULT)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.detected === 'boolean';
}

export function isLoginCompletedCheckMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.LOGIN_COMPLETED_CHECK, { pageTransition: unknown }> {
  if (!hasType(v, MESSAGE_TYPES.LOGIN_COMPLETED_CHECK)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && p.pageTransition && typeof p.pageTransition === 'object';
}

export function isLoginCompletedResultMsg(
  v: unknown
): v is BaseMessage<
  typeof MESSAGE_TYPES.LOGIN_COMPLETED_RESULT,
  { completed: boolean; message: unknown }
> {
  if (!hasType(v, MESSAGE_TYPES.LOGIN_COMPLETED_RESULT)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.completed === 'boolean' && p.message && typeof p.message === 'object';
}

export function isPauseRunningJobMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.PAUSE_RUNNING_JOB, { job: unknown }> {
  if (!hasType(v, MESSAGE_TYPES.PAUSE_RUNNING_JOB)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && p.job && typeof p.job === 'object';
}

export function isJobPauseResultMsg(
  v: unknown
): v is BaseMessage<
  typeof MESSAGE_TYPES.JOB_PAUSE_RESULT,
  { success: boolean; pausedJob: unknown }
> {
  if (!hasType(v, MESSAGE_TYPES.JOB_PAUSE_RESULT)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.success === 'boolean' && p.pausedJob && typeof p.pausedJob === 'object';
}

export function isSaveJobStateMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.SAVE_JOB_STATE, { pausedJob: unknown }> {
  if (!hasType(v, MESSAGE_TYPES.SAVE_JOB_STATE)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && p.pausedJob && typeof p.pausedJob === 'object';
}

export function isJobSaveResultMsg(
  v: unknown
): v is BaseMessage<
  typeof MESSAGE_TYPES.JOB_SAVE_RESULT,
  { storageResult: string; fallbackResult?: string; warning?: string; memoryState?: unknown }
> {
  if (!hasType(v, MESSAGE_TYPES.JOB_SAVE_RESULT)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.storageResult === 'string';
}

export function isResumeSavedJobMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.RESUME_SAVED_JOB, unknown> {
  if (!hasType(v, MESSAGE_TYPES.RESUME_SAVED_JOB)) return false;
  return true; // No payload required
}

export function isJobResumeResultMsg(v: unknown): v is BaseMessage<
  typeof MESSAGE_TYPES.JOB_RESUME_RESULT,
  {
    success: boolean;
    resumedJob?: unknown;
    message?: unknown;
    validationResult?: string;
    action?: string;
    cleanupResult?: string;
  }
> {
  if (!hasType(v, MESSAGE_TYPES.JOB_RESUME_RESULT)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.success === 'boolean';
}

export function isLoginCacheResetMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.LOGIN_CACHE_RESET, unknown> {
  if (!hasType(v, MESSAGE_TYPES.LOGIN_CACHE_RESET)) return false;
  return true; // No payload required
}

export function isLoginCacheClearedMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.LOGIN_CACHE_CLEARED, unknown> {
  if (!hasType(v, MESSAGE_TYPES.LOGIN_CACHE_CLEARED)) return false;
  return true; // No payload required
}

export function isLoginDetectionErrorMsg(
  v: unknown
): v is BaseMessage<typeof MESSAGE_TYPES.LOGIN_DETECTION_ERROR, { code: string; message: string }> {
  if (!hasType(v, MESSAGE_TYPES.LOGIN_DETECTION_ERROR)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.code === 'string' && typeof p.message === 'string';
}

// Network Recovery Message Type Guards

export function isNetworkStateChangedMsg(
  v: unknown
): v is BaseMessage<
  typeof MESSAGE_TYPES.NETWORK_STATE_CHANGED,
  { isOnline: boolean; timestamp: number; affectedJobs?: string[] }
> {
  if (!hasType(v, MESSAGE_TYPES.NETWORK_STATE_CHANGED)) return false;
  const p = (v as BaseMessage).payload as any;
  return p && typeof p.isOnline === 'boolean' && typeof p.timestamp === 'number';
}

export function isJobPausedMsg(
  v: unknown
): v is BaseMessage<
  typeof MESSAGE_TYPES.JOB_PAUSED,
  { jobId: string; reason: string; pausedAt: number }
> {
  if (!hasType(v, MESSAGE_TYPES.JOB_PAUSED)) return false;
  const p = (v as BaseMessage).payload as any;
  return (
    p &&
    typeof p.jobId === 'string' &&
    typeof p.reason === 'string' &&
    typeof p.pausedAt === 'number'
  );
}

export function isJobResumedMsg(
  v: unknown
): v is BaseMessage<
  typeof MESSAGE_TYPES.JOB_RESUMED,
  { jobId: string; reason: string; resumedAt: number }
> {
  if (!hasType(v, MESSAGE_TYPES.JOB_RESUMED)) return false;
  const p = (v as BaseMessage).payload as any;
  return (
    p &&
    typeof p.jobId === 'string' &&
    typeof p.reason === 'string' &&
    typeof p.resumedAt === 'number'
  );
}

/**
 * 【ヘルパー関数】: ダウンロードURLの簡易安全チェック（スキーム限定）
 * 【再利用性】: DOWNLOAD_IMAGE 前の検証に利用
 * 【単一責任】: URL文字列のスキームのみを確認（詳細解析は別責務）
 */
export function isSafeDownloadUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
