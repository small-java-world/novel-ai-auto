declare const chrome:
  | {
      runtime?: {
        sendMessage?: (_message: unknown) => void;
      };
    }
  | undefined;

import {
  detectLoginRequired,
  pauseCurrentJob,
  saveJobState,
  detectLoginCompleted,
  resumeSavedJob,
  LoginDetectionManager,
} from '../utils/login-detection-manager';

const runtime = typeof chrome !== 'undefined' ? chrome.runtime : undefined;

export const LOGIN_DETECTION_MESSAGES = {
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
} as const;

export type LoginDetectionMessageType =
  (typeof LOGIN_DETECTION_MESSAGES)[keyof typeof LOGIN_DETECTION_MESSAGES];

export interface LoginDetectionChannelDeps {
  detectLoginRequired: typeof detectLoginRequired;
  detectLoginCompleted: typeof detectLoginCompleted;
  pauseCurrentJob: typeof pauseCurrentJob;
  saveJobState: typeof saveJobState;
  resumeSavedJob: typeof resumeSavedJob;
  clearDOMCache: typeof LoginDetectionManager.clearDOMCache;
}

const defaultDeps: LoginDetectionChannelDeps = {
  detectLoginRequired,
  detectLoginCompleted,
  pauseCurrentJob,
  saveJobState,
  resumeSavedJob,
  clearDOMCache: LoginDetectionManager.clearDOMCache,
};

interface BaseMessage {
  type?: string;
  payload?: Record<string, unknown> | undefined;
  requestId?: string;
}

function sendRuntimeMessage(message: Record<string, unknown>): void {
  runtime?.sendMessage?.(message);
}

function extractRequestId(msg: BaseMessage): string | undefined {
  const fromRoot = msg.requestId;
  const fromPayload =
    typeof msg.payload === 'object' && msg.payload !== null
      ? (msg.payload.requestId as string | undefined)
      : undefined;
  return fromRoot ?? fromPayload ?? undefined;
}

function respond(
  type: LoginDetectionMessageType,
  requestId: string | undefined,
  payload?: unknown
): void {
  const message: Record<string, unknown> = { type };
  if (requestId !== undefined) {
    message.requestId = requestId;
  }
  if (payload !== undefined) {
    message.payload = payload;
  }
  sendRuntimeMessage(message);
}

function respondError(requestId: string | undefined, code: string, message: string): void {
  respond(LOGIN_DETECTION_MESSAGES.LOGIN_DETECTION_ERROR, requestId, { code, message });
}

export interface LoginDetectionChannel {
  handle: (_msg: unknown) => Promise<boolean>;
}

export function createLoginDetectionChannel(
  deps: LoginDetectionChannelDeps = defaultDeps
): LoginDetectionChannel {
  return {
    async handle(_msg: unknown): Promise<boolean> {
      if (!_msg || typeof _msg !== 'object') {
        return false;
      }

      const base = _msg as BaseMessage;
      const { type } = base;
      if (typeof type !== 'string') {
        return false;
      }

      const requestId = extractRequestId(base);
      const payload = base.payload ?? {};

      try {
        switch (type) {
          case LOGIN_DETECTION_MESSAGES.LOGIN_REQUIRED_CHECK: {
            const currentJobId = payload.currentJobId as string | null | undefined;
            const result = deps.detectLoginRequired(currentJobId ?? undefined);
            respond(LOGIN_DETECTION_MESSAGES.LOGIN_REQUIRED_RESULT, requestId, result);
            return true;
          }

          case LOGIN_DETECTION_MESSAGES.LOGIN_COMPLETED_CHECK: {
            const transition = payload.pageTransition;
            if (!transition) {
              respondError(requestId, 'INVALID_PAYLOAD', 'pageTransition is required');
              return true;
            }
            const result = deps.detectLoginCompleted(transition as any);
            respond(LOGIN_DETECTION_MESSAGES.LOGIN_COMPLETED_RESULT, requestId, result);
            return true;
          }

          case LOGIN_DETECTION_MESSAGES.PAUSE_RUNNING_JOB: {
            if (!payload.job) {
              respondError(requestId, 'INVALID_PAYLOAD', 'job is required');
              return true;
            }
            const result = deps.pauseCurrentJob(payload.job as any);
            respond(LOGIN_DETECTION_MESSAGES.JOB_PAUSE_RESULT, requestId, result);
            return true;
          }

          case LOGIN_DETECTION_MESSAGES.SAVE_JOB_STATE: {
            if (!payload.pausedJob) {
              respondError(requestId, 'INVALID_PAYLOAD', 'pausedJob is required');
              return true;
            }
            const result = await deps.saveJobState(payload.pausedJob as any);
            respond(LOGIN_DETECTION_MESSAGES.JOB_SAVE_RESULT, requestId, result);
            return true;
          }

          case LOGIN_DETECTION_MESSAGES.RESUME_SAVED_JOB: {
            const result = await deps.resumeSavedJob();
            respond(LOGIN_DETECTION_MESSAGES.JOB_RESUME_RESULT, requestId, result);
            return true;
          }

          case LOGIN_DETECTION_MESSAGES.LOGIN_CACHE_RESET: {
            deps.clearDOMCache();
            respond(LOGIN_DETECTION_MESSAGES.LOGIN_CACHE_CLEARED, requestId);
            return true;
          }

          default:
            return false;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        respondError(requestId, 'HANDLER_EXCEPTION', message);
        return true;
      }
    },
  };
}
