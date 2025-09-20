import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  detectLoginRequired,
  pauseCurrentJob,
  saveJobState,
  detectLoginCompleted,
  resumeSavedJob,
} from './login-detection-manager';
import { LoginDetectionManager } from './login-detection-manager';
import {
  LOGIN_DETECTION_DEFAULTS,
  LOGIN_DETECTION_MESSAGES,
  LOGIN_DETECTION_THRESHOLDS,
  LOGIN_DETECTION_URLS,
} from './login-detection-config';
import type { GenerationJob, PageTransition } from '../types';

const chromeStorage = (globalThis.chrome as any).storage.local;

function createGenerationJob(overrides: Partial<GenerationJob> = {}): GenerationJob {
  const settings = overrides.settings ?? {
    imageCount: 1,
    seed: 42,
    filenameTemplate: 'image',
    retrySettings: { maxRetries: 1, baseDelay: 100, factor: 2 },
  };

  const progress = overrides.progress ?? {
    current: 0,
    total: 10,
    status: 'waiting' as const,
  };

  return {
    id: overrides.id ?? 'job-123',
    prompt: overrides.prompt ?? 'generate a dragon',
    parameters: overrides.parameters ?? {},
    settings,
    status: overrides.status ?? 'running',
    createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2024-01-01T00:00:00Z'),
    progress,
    error: overrides.error,
  };
}

function createPageTransition(overrides: Partial<PageTransition> = {}): PageTransition {
  return {
    previousUrl: overrides.previousUrl ?? LOGIN_DETECTION_URLS.NOVELAI_LOGIN,
    currentUrl: overrides.currentUrl ?? LOGIN_DETECTION_URLS.NOVELAI_MAIN,
    pageState: overrides.pageState ?? {
      isLoggedIn: true,
      hasPromptInput: true,
      isNovelAIPage: true,
      currentUrl: LOGIN_DETECTION_URLS.NOVELAI_MAIN,
    },
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  LoginDetectionManager.clearDOMCache();
});

afterEach(() => {
  document.body.innerHTML = '';
  LoginDetectionManager.clearDOMCache();
  vi.useRealTimers();
});

describe('detectLoginRequired', () => {
  test('returns handled fallback when job id is null', () => {
    const result = detectLoginRequired(null);

    expect(result.detected).toBe(false);
    expect((result as any).handled).toBe(true);
    expect((result as any).fallback).toBe(LOGIN_DETECTION_DEFAULTS.DEFAULT_JOB_ID);
  });

  test('detects login form elements and sanitizes job id', () => {
    document.body.innerHTML = `
      <form class="login-form">
        <input type="email" name="email" />
        <input type="password" name="password" />
      </form>
    `;

    const result = detectLoginRequired('  job-456  ');

    expect(result.detected).toBe(true);
    expect(result.message?.currentJobId).toBe('job-456');
    expect(result.message?.redirectUrl).toBe(LOGIN_DETECTION_URLS.NOVELAI_LOGIN);
  });

  test('uses cached elements until the cache duration expires', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    document.body.innerHTML = `
      <form class="login-form">
        <input type="email" />
        <input type="password" />
      </form>
    `;

    const first = detectLoginRequired('job-cached');
    expect(first.detected).toBe(true);

    document.body.innerHTML = '';

    const cached = detectLoginRequired('job-cached');
    expect(cached.detected).toBe(true);

    vi.advanceTimersByTime(1000);

    const expired = detectLoginRequired('job-cached');
    expect(expired.detected).toBe(false);
    expect(expired.warning).toBe(LOGIN_DETECTION_MESSAGES.WARNINGS.LOGIN_ELEMENTS_NOT_FOUND);
  });

  test('clearDOMCache invalidates cached references immediately', () => {
    document.body.innerHTML = `
      <form class="login-form">
        <input type="email" />
        <input type="password" />
      </form>
    `;

    detectLoginRequired('job-cache-reset');
    document.body.innerHTML = '';

    LoginDetectionManager.clearDOMCache();
    const result = detectLoginRequired('job-cache-reset');

    expect(result.detected).toBe(false);
    expect(result.warning).toBe(LOGIN_DETECTION_MESSAGES.WARNINGS.LOGIN_ELEMENTS_NOT_FOUND);
  });
});

describe('detectLoginCompleted', () => {
  test('returns fallback when transition is missing', () => {
    const result = detectLoginCompleted(undefined);

    expect(result.completed).toBe(false);
    expect((result as any).handled).toBe(true);
    expect((result as any).fallback).toBe(LOGIN_DETECTION_DEFAULTS.FALLBACK_STATE);
  });

  test('returns incomplete when URLs are outside NovelAI', () => {
    const transition = createPageTransition({
      previousUrl: 'https://example.com/login',
      currentUrl: 'https://example.com/app',
      pageState: {
        isLoggedIn: true,
        hasPromptInput: true,
        isNovelAIPage: false,
        currentUrl: 'https://example.com/app',
      },
    });

    const result = detectLoginCompleted(transition);

    expect(result.completed).toBe(false);
    expect(result.message.availableForResume).toBe(false);
  });

  test('detects completion when URL transition and state match expectations', () => {
    const transition = createPageTransition();

    const result = detectLoginCompleted(transition);

    expect(result.completed).toBe(true);
    expect(result.message.availableForResume).toBe(true);
  });
});

describe('pauseCurrentJob', () => {
  test('throws when job is invalid', () => {
    expect(() => pauseCurrentJob({} as GenerationJob)).toThrow(
      LOGIN_DETECTION_MESSAGES.VALIDATION_ERRORS.INVALID_JOB
    );
  });

  test('throws when job status is not running', () => {
    const job = createGenerationJob({ status: 'pending' });

    expect(() => pauseCurrentJob(job)).toThrow();
  });

  test('marks job as paused with timestamps', () => {
    const job = createGenerationJob();

    const result = pauseCurrentJob(job);

    expect(result.success).toBe(true);
    expect(result.pausedJob.status).toBe('paused');
    expect(typeof result.pausedJob.pausedAt).toBe('number');
    expect(result.pausedJob.updatedAt instanceof Date).toBe(true);
  });
});

describe('saveJobState', () => {
  test('throws when paused job is missing required fields', async () => {
    await expect(saveJobState({} as any)).rejects.toThrow();
  });

  test('persists paused job to chrome storage on first attempt', async () => {
    const pausedJob = { ...createGenerationJob(), status: 'paused', pausedAt: Date.now() };
    chromeStorage.set.mockResolvedValue(undefined);

    const result = await saveJobState(pausedJob);

    expect(chromeStorage.set).toHaveBeenCalledWith({
      paused_jobs: [
        expect.objectContaining({
          id: pausedJob.id,
          status: 'paused',
          pausedAt: pausedJob.pausedAt,
        }),
      ],
    });
    expect(result.storageResult).toBe('success');
  });

  test('returns fallback result after exhausting retries', async () => {
    vi.useFakeTimers();
    const pausedJob = { ...createGenerationJob(), status: 'paused', pausedAt: Date.now() };
    chromeStorage.set.mockRejectedValue(new Error('quota exceeded'));

    const resultPromise = saveJobState(pausedJob);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(chromeStorage.set).toHaveBeenCalledTimes(LOGIN_DETECTION_THRESHOLDS.STORAGE_RETRY_COUNT);
    expect(result.storageResult).toBe('failed');
    expect(result.fallbackResult).toBe('memory_only');
    expect(result.warning).toBe(LOGIN_DETECTION_MESSAGES.WARNINGS.STORAGE_FAILED_MEMORY_FALLBACK);
    expect(result.memoryState).toEqual({
      jobId: pausedJob.id,
      tempStatus: pausedJob.status,
    });
  });
});

describe('resumeSavedJob', () => {
  test('returns action when no paused jobs exist', async () => {
    chromeStorage.get.mockResolvedValue({ paused_jobs: [] });

    const result = await resumeSavedJob();

    expect(result.success).toBe(false);
    expect(result.action).toBe('no_jobs_to_resume');
  });

  test('cleans corrupted data and returns validation failure', async () => {
    chromeStorage.get.mockResolvedValue({
      paused_jobs: [{ id: '', status: 'paused', pausedAt: null }],
    });
    chromeStorage.remove.mockResolvedValue(undefined);

    const result = await resumeSavedJob();

    expect(chromeStorage.remove).toHaveBeenCalledWith('paused_jobs');
    expect(result.success).toBe(false);
    expect(result.validationResult).toBe('failed');
    expect(result.action).toBe('skip_restoration');
  });

  test('returns saved job when data is valid', async () => {
    const savedJob = {
      id: 'job-999',
      status: 'paused',
      pausedAt: Date.now(),
      resumePoint: 'download_start',
    };
    chromeStorage.get.mockResolvedValue({ paused_jobs: [savedJob] });

    const result = await resumeSavedJob();

    expect(result.success).toBe(true);
    expect(result.resumedJob).toEqual({
      id: savedJob.id,
      resumePoint: savedJob.resumePoint,
    });
    expect(result.message).toMatchObject({
      type: 'RESUME_JOB',
      jobId: savedJob.id,
      resumePoint: savedJob.resumePoint,
    });
  });

  test('propagates storage errors with user facing message', async () => {
    chromeStorage.get.mockRejectedValue(new Error('storage offline'));

    const result = await resumeSavedJob();

    expect(result.success).toBe(false);
    expect(result.action).toBe('storage_error');
    expect(typeof result.message).toBe('string');
  });
});

describe('LoginDetectionManager helpers', () => {
  test('handleTabActivationFailure provides manual guidance', () => {
    const result = LoginDetectionManager.handleTabActivationFailure(5, 'activate');

    expect(result.tabResult).toBe('failed');
    expect(result.userAction).toBe('manual_required');
    expect(result.instructions).toEqual(LOGIN_DETECTION_MESSAGES.USER_GUIDANCE.INSTRUCTIONS);
  });

  test('handleTabActivationFailure throws for invalid tab id', () => {
    expect(() => LoginDetectionManager.handleTabActivationFailure(0, 'activate')).toThrow();
  });

  test('detectWithDuration enforces thresholds and reasons', () => {
    expect(() => LoginDetectionManager.detectWithDuration('job', -1)).toThrow();
    expect(LoginDetectionManager.detectWithDuration('job', 100)).toEqual({
      detected: false,
      reason: 'below_threshold',
    });
    expect(
      LoginDetectionManager.detectWithDuration(
        'job',
        LOGIN_DETECTION_THRESHOLDS.MIN_DETECTION_DURATION_MS
      )
    ).toEqual({
      detected: true,
      reason: 'threshold_met',
    });
    expect(
      LoginDetectionManager.detectWithDuration(
        'job',
        LOGIN_DETECTION_THRESHOLDS.MIN_DETECTION_DURATION_MS + 1
      )
    ).toEqual({
      detected: true,
      reason: 'above_threshold',
    });
  });

  test('checkRateLimit blocks at configured ceiling', () => {
    expect(() => LoginDetectionManager.checkRateLimit(-1, 0)).toThrow();
    expect(LoginDetectionManager.checkRateLimit(4, 0)).toEqual({
      blocked: false,
      autoResumeEnabled: true,
    });
    expect(
      LoginDetectionManager.checkRateLimit(LOGIN_DETECTION_THRESHOLDS.MAX_ATTEMPTS_PER_WINDOW, 0)
    ).toEqual({
      blocked: true,
      autoResumeEnabled: false,
      reason: 'rate_limit_exceeded',
    });
  });

  test('detectWithTimeout returns SLA flags', () => {
    expect(() => LoginDetectionManager.detectWithTimeout('job', -1)).toThrow();
    expect(LoginDetectionManager.detectWithTimeout('job', 500)).toEqual({
      completed: true,
      withinSLA: true,
      warning: false,
    });
    expect(LoginDetectionManager.detectWithTimeout('job', 1200)).toEqual({
      completed: true,
      withinSLA: false,
      warning: true,
    });
  });

  test('handleUrlChange supplies fallbacks', () => {
    expect(LoginDetectionManager.handleUrlChange(null)).toEqual({
      handled: true,
      fallback: '',
    });
    expect(LoginDetectionManager.handleUrlChange('https://novelai.net')).toEqual({
      handled: true,
      fallback: LOGIN_DETECTION_DEFAULTS.DEFAULT_JOB_ID,
    });
  });
});
