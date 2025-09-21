import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createLoginDetectionChannel, LOGIN_DETECTION_MESSAGES } from './loginDetectionChannel';
import type {
  LoginDetectionResult,
  LoginCompletedResult,
  JobPauseResult,
  SaveStateResult,
  JobResumeResult,
} from '../types';

const runtimeSend = (globalThis.chrome as any).runtime.sendMessage as Mock;

type ChannelDeps = Parameters<typeof createLoginDetectionChannel>[0];

function createDeps(overrides: Partial<ChannelDeps> = {}): ChannelDeps {
  const defaults: ChannelDeps = {
    detectLoginRequired: vi.fn<[], LoginDetectionResult>().mockReturnValue({ detected: false }),
    detectLoginCompleted: vi.fn<[], LoginCompletedResult>().mockReturnValue({
      completed: false,
      message: { type: 'LOGIN_COMPLETED', detectedAt: Date.now(), availableForResume: false },
    }),
    pauseCurrentJob: vi.fn().mockReturnValue({
      success: true,
      pausedJob: { id: 'job', status: 'paused', pausedAt: Date.now() },
    } as JobPauseResult),
    saveJobState: vi.fn().mockResolvedValue({ storageResult: 'success' } as SaveStateResult),
    resumeSavedJob: vi.fn().mockResolvedValue({ success: true } as JobResumeResult),
    clearDOMCache: vi.fn(),
  };

  return { ...defaults, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('login-detection channel', () => {
  test('LOGIN_REQUIRED_CHECK delegates to detectLoginRequired and forwards result', async () => {
    const detection: LoginDetectionResult = { detected: true };
    const deps = createDeps({ detectLoginRequired: vi.fn().mockReturnValue(detection) });
    const channel = createLoginDetectionChannel(deps);

    const handled = await channel.handle({
      type: LOGIN_DETECTION_MESSAGES.LOGIN_REQUIRED_CHECK,
      payload: { currentJobId: 'job-42' },
      requestId: 'req-1',
    });

    expect(handled).toBe(true);
    expect(deps.detectLoginRequired).toHaveBeenCalledWith('job-42');
    expect(runtimeSend).toHaveBeenCalledWith({
      type: LOGIN_DETECTION_MESSAGES.LOGIN_REQUIRED_RESULT,
      payload: detection,
      requestId: 'req-1',
    });
  });

  test('LOGIN_COMPLETED_CHECK calls detectLoginCompleted and replies', async () => {
    const completion: LoginCompletedResult = {
      completed: true,
      message: { type: 'LOGIN_COMPLETED', detectedAt: 123, availableForResume: true },
    };
    const deps = createDeps({ detectLoginCompleted: vi.fn().mockReturnValue(completion) });
    const channel = createLoginDetectionChannel(deps);
    const transition = {
      previousUrl: 'https://novelai.net/login',
      currentUrl: 'https://novelai.net/',
      pageState: {
        isNovelAIPage: true,
        isLoggedIn: true,
        hasPromptInput: true,
        currentUrl: 'https://novelai.net/',
      },
    };

    const handled = await channel.handle({
      type: LOGIN_DETECTION_MESSAGES.LOGIN_COMPLETED_CHECK,
      payload: { pageTransition: transition },
    });

    expect(handled).toBe(true);
    expect(deps.detectLoginCompleted).toHaveBeenCalledWith(transition);
    expect(runtimeSend).toHaveBeenCalledWith({
      type: LOGIN_DETECTION_MESSAGES.LOGIN_COMPLETED_RESULT,
      payload: completion,
    });
  });

  test('PAUSE_RUNNING_JOB invokes pauseCurrentJob', async () => {
    const job = { id: 'job', status: 'running' } as any;
    const pauseResult: JobPauseResult = {
      success: true,
      pausedJob: { ...job, status: 'paused', pausedAt: Date.now() },
    };
    const deps = createDeps({ pauseCurrentJob: vi.fn().mockReturnValue(pauseResult) });
    const channel = createLoginDetectionChannel(deps);

    const handled = await channel.handle({
      type: LOGIN_DETECTION_MESSAGES.PAUSE_RUNNING_JOB,
      payload: { job },
    });

    expect(handled).toBe(true);
    expect(deps.pauseCurrentJob).toHaveBeenCalledWith(job);
    expect(runtimeSend).toHaveBeenCalledWith({
      type: LOGIN_DETECTION_MESSAGES.JOB_PAUSE_RESULT,
      payload: pauseResult,
    });
  });

  test('SAVE_JOB_STATE awaits saveJobState and includes request id', async () => {
    const pausedJob = { id: 'job', status: 'paused', pausedAt: 111 } as any;
    const saveResult: SaveStateResult = {
      storageResult: 'success',
      fallbackResult: undefined,
    };
    const deps = createDeps({ saveJobState: vi.fn().mockResolvedValue(saveResult) });
    const channel = createLoginDetectionChannel(deps);

    const handled = await channel.handle({
      type: LOGIN_DETECTION_MESSAGES.SAVE_JOB_STATE,
      payload: { pausedJob },
      requestId: 'req-save',
    });

    expect(handled).toBe(true);
    expect(deps.saveJobState).toHaveBeenCalledWith(pausedJob);
    expect(runtimeSend).toHaveBeenCalledWith({
      type: LOGIN_DETECTION_MESSAGES.JOB_SAVE_RESULT,
      payload: saveResult,
      requestId: 'req-save',
    });
  });

  test('RESUME_SAVED_JOB relays async result', async () => {
    const resumeResult: JobResumeResult = {
      success: true,
      resumedJob: { id: 'job', resumePoint: 'generation_start' },
    };
    const deps = createDeps({ resumeSavedJob: vi.fn().mockResolvedValue(resumeResult) });
    const channel = createLoginDetectionChannel(deps);

    const handled = await channel.handle({
      type: LOGIN_DETECTION_MESSAGES.RESUME_SAVED_JOB,
      payload: {},
    });

    expect(handled).toBe(true);
    expect(deps.resumeSavedJob).toHaveBeenCalled();
    expect(runtimeSend).toHaveBeenCalledWith({
      type: LOGIN_DETECTION_MESSAGES.JOB_RESUME_RESULT,
      payload: resumeResult,
    });
  });

  test('LOGIN_CACHE_RESET clears DOM cache and acknowledges', async () => {
    const deps = createDeps();
    const channel = createLoginDetectionChannel(deps);

    const handled = await channel.handle({
      type: LOGIN_DETECTION_MESSAGES.LOGIN_CACHE_RESET,
    });

    expect(handled).toBe(true);
    expect(deps.clearDOMCache).toHaveBeenCalled();
    expect(runtimeSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: LOGIN_DETECTION_MESSAGES.LOGIN_CACHE_CLEARED,
      })
    );
  });

  test('missing payload yields INVALID_PAYLOAD error', async () => {
    const deps = createDeps();
    const channel = createLoginDetectionChannel(deps);

    const handled = await channel.handle({
      type: LOGIN_DETECTION_MESSAGES.SAVE_JOB_STATE,
    });

    expect(handled).toBe(true);
    expect(runtimeSend).toHaveBeenCalledWith({
      type: LOGIN_DETECTION_MESSAGES.LOGIN_DETECTION_ERROR,
      payload: {
        code: 'INVALID_PAYLOAD',
        message: expect.stringContaining('pausedJob'),
      },
    });
  });

  test('handler exception surfaces LOGIN_DETECTION_ERROR', async () => {
    const deps = createDeps({
      detectLoginRequired: vi.fn().mockImplementation(() => {
        throw new Error('boom');
      }),
    });
    const channel = createLoginDetectionChannel(deps);

    const handled = await channel.handle({
      type: LOGIN_DETECTION_MESSAGES.LOGIN_REQUIRED_CHECK,
      payload: {},
      requestId: 'req-err',
    });

    expect(handled).toBe(true);
    expect(runtimeSend).toHaveBeenCalledWith({
      type: LOGIN_DETECTION_MESSAGES.LOGIN_DETECTION_ERROR,
      requestId: 'req-err',
      payload: { code: 'HANDLER_EXCEPTION', message: 'boom' },
    });
  });

  test('unknown message returns false and does nothing', async () => {
    const deps = createDeps();
    const channel = createLoginDetectionChannel(deps);

    const handled = await channel.handle({ type: 'SOMETHING_ELSE' });

    expect(handled).toBe(false);
    expect(runtimeSend).not.toHaveBeenCalled();
  });
});
