import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const loginDetectionMessages = {
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

const handleMock = vi.fn().mockResolvedValue(false);
const createLoginDetectionChannelMock = vi.fn(() => ({ handle: handleMock }));

vi.mock('./router/loginDetectionChannel', () => ({
  LOGIN_DETECTION_MESSAGES: loginDetectionMessages,
  createLoginDetectionChannel: createLoginDetectionChannelMock,
}));

type ChromeMock = typeof globalThis.chrome;
const chromeMock = globalThis.chrome as ChromeMock & {
  permissions?: { contains: ReturnType<typeof vi.fn> };
};

async function loadBackgroundModule() {
  vi.resetModules();
  return await import('./background');
}

describe('background.ts handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleMock.mockReset();
    handleMock.mockResolvedValue(false);
    createLoginDetectionChannelMock.mockReset();
    createLoginDetectionChannelMock.mockImplementation(() => ({ handle: handleMock }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes default settings on first install', async () => {
    const { initializeDefaultSettings } = await loadBackgroundModule();
    const expectedSettings = {
      imageCount: 1,
      seed: -1,
      filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
      retrySettings: {
        maxRetries: 5,
        baseDelay: 500,
        factor: 2,
      },
    };

    (chromeMock.storage.local.set as any).mockResolvedValueOnce(undefined);

    await initializeDefaultSettings();

    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      settings: expectedSettings,
    });
  });

  it('logs error when default settings initialization fails', async () => {
    const { initializeDefaultSettings } = await loadBackgroundModule();
    const error = new Error('storage failure');
    (chromeMock.storage.local.set as any).mockRejectedValueOnce(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await initializeDefaultSettings();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to initialize default settings:',
      error.message
    );
  });

  it('ensures existing NovelAI tab is focused', async () => {
    const { ensureNovelAITab } = await loadBackgroundModule();
    const tab = { id: 7, url: 'https://novelai.net/generate' };

    (chromeMock.tabs.query as any).mockResolvedValueOnce([tab]);
    (chromeMock.tabs.update as any).mockResolvedValueOnce(tab);

    const result = await ensureNovelAITab();

    expect(chromeMock.tabs.update).toHaveBeenCalledWith(tab.id, { active: true });
    expect(result).toEqual(tab);
  });

  it('opens new NovelAI tab when none exist', async () => {
    const { ensureNovelAITab } = await loadBackgroundModule();
    const createdTab = { id: 99, url: 'https://novelai.net/' };

    (chromeMock.tabs.query as any).mockResolvedValueOnce([]);
    (chromeMock.tabs.create as any).mockResolvedValueOnce(createdTab);

    const result = await ensureNovelAITab();

    expect(chromeMock.tabs.create).toHaveBeenCalledWith({
      url: 'https://novelai.net/',
      active: true,
    });
    expect(result).toEqual(createdTab);
  });

  it('propagates errors when ensuring NovelAI tab fails', async () => {
    const { ensureNovelAITab } = await loadBackgroundModule();
    const failure = new Error('query failed');
    (chromeMock.tabs.query as any).mockRejectedValueOnce(failure);

    await expect(ensureNovelAITab()).rejects.toThrow('query failed');
  });

  it('handles START_GENERATION success path with PromptSegments', async () => {
    const background = await loadBackgroundModule();
    const message = {
      type: 'START_GENERATION',
      prompt: {
        positive: 'A cozy cabin',
        negative: 'lowres, bad anatomy',
        selectorProfile: 'character-anime'
      },
      parameters: { seed: 42, count: 1 },
      settings: { imageCount: 1 }
    };
    const sendResponse = vi.fn();
    const tab = { id: 3 };

    (chromeMock.tabs.query as any).mockResolvedValueOnce([tab]);
    (chromeMock.tabs.update as any).mockResolvedValueOnce(tab);
    (chromeMock.tabs.sendMessage as any).mockResolvedValueOnce(undefined);

    await background.handleStartGeneration(
      message,
      {} as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(tab.id, {
      type: 'APPLY_PROMPT',
      prompt: {
        positive: 'A cozy cabin',
        negative: 'lowres, bad anatomy',
        selectorProfile: 'character-anime'
      },
      parameters: { seed: 42, count: 1 }
    });
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  it('handles errors during START_GENERATION', async () => {
    const background = await loadBackgroundModule();
    const message = { 
      type: 'START_GENERATION', 
      prompt: { positive: 'error', negative: '', selectorProfile: 'character-anime' }, 
      parameters: {} 
    };
    const sendResponse = vi.fn();
    const error = new Error('no tab');
    (chromeMock.tabs.query as any).mockRejectedValueOnce(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await background.handleStartGeneration(
      message,
      {} as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(
      consoleSpy.mock.calls.some(
        ([label, err]) =>
          label === 'Failed to start generation:' &&
          err instanceof Error &&
          err.message === 'no tab'
      )
    ).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'no tab' });
  });

  it('acknowledges cancel requests and handles failures', async () => {
    const background = await loadBackgroundModule();
    const sendResponse = vi.fn();

    await background.handleCancelJob(
      { type: 'CANCEL_JOB', jobId: 'job-1' },
      {} as chrome.runtime.MessageSender,
      sendResponse
    );
    expect(sendResponse).toHaveBeenCalledWith({ success: true });

    const errorSend = vi.fn();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      throw new Error('log failure');
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await background.handleCancelJob(
      { type: 'CANCEL_JOB', jobId: 'job-2' },
      {} as chrome.runtime.MessageSender,
      errorSend
    );

    expect(
      errorSpy.mock.calls.some(
        ([label, err]) =>
          label === 'Failed to cancel job:' && err instanceof Error && err.message === 'log failure'
      )
    ).toBe(true);
    expect(errorSend).toHaveBeenCalledWith({ success: false, error: 'log failure' });
    logSpy.mockRestore();
  });

  it('handles GENERATION_PROGRESS message broadcasting', async () => {
    const background = await loadBackgroundModule();
    const message = { 
      type: 'GENERATION_PROGRESS', 
      progress: { current: 2, total: 5, eta: 30 } 
    };
    const sendResponse = vi.fn();

    // Mock chrome.runtime.sendMessage to avoid errors
    (chromeMock.runtime.sendMessage as any).mockResolvedValueOnce(undefined);

    // Get the actual message listener
    const messageListener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0];
    
    // Call the message listener directly
    await messageListener(message, {} as chrome.runtime.MessageSender, sendResponse);

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'GENERATION_PROGRESS',
      progress: { current: 2, total: 5, eta: 30 }
    });
  });

  it('handles GENERATION_COMPLETE message broadcasting', async () => {
    const background = await loadBackgroundModule();
    const message = { 
      type: 'GENERATION_COMPLETE', 
      count: 5 
    };
    const sendResponse = vi.fn();

    // Mock chrome.runtime.sendMessage to avoid errors
    (chromeMock.runtime.sendMessage as any).mockResolvedValueOnce(undefined);

    // Get the actual message listener
    const messageListener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0];
    
    // Call the message listener directly
    await messageListener(message, {} as chrome.runtime.MessageSender, sendResponse);

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'GENERATION_COMPLETE',
      count: 5
    });
  });

  it('handles GENERATION_ERROR message broadcasting', async () => {
    const background = await loadBackgroundModule();
    const message = { 
      type: 'GENERATION_ERROR', 
      error: 'Generation failed' 
    };
    const sendResponse = vi.fn();

    // Mock chrome.runtime.sendMessage to avoid errors
    (chromeMock.runtime.sendMessage as any).mockResolvedValueOnce(undefined);

    // Get the actual message listener
    const messageListener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0];
    
    // Call the message listener directly
    await messageListener(message, {} as chrome.runtime.MessageSender, sendResponse);

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'GENERATION_ERROR',
      error: 'Generation failed'
    });
  });

  it('handles download success and failure paths', async () => {
    const background = await loadBackgroundModule();
    const message = { type: 'DOWNLOAD_IMAGE', url: 'https://cdn/image.png', filename: 'image.png' };
    const sendResponse = vi.fn();

    (chromeMock.downloads.download as any).mockResolvedValueOnce(77);

    await background.handleDownloadImage(message, {} as chrome.runtime.MessageSender, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ success: true, downloadId: 77 });

    (chromeMock.downloads.download as any).mockRejectedValueOnce(new Error('network'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorResponse = vi.fn();

    await background.handleDownloadImage(
      message,
      {} as chrome.runtime.MessageSender,
      errorResponse
    );

    expect(errorSpy).toHaveBeenCalledWith('Failed to download image:', expect.any(Error));
    expect(errorResponse).toHaveBeenCalledWith({ success: false, error: 'network' });
  });

  it('delegates login detection messages to the channel', async () => {
    handleMock.mockResolvedValueOnce(true);
    await loadBackgroundModule();
    const listener = (chromeMock.runtime.onMessage.addListener as any).mock.calls[0][0];
    const sendResponse = vi.fn();
    const loginMessage = {
      type: loginDetectionMessages.LOGIN_REQUIRED_CHECK,
      requestId: 'req-123',
    };

    listener(loginMessage, {} as chrome.runtime.MessageSender, sendResponse);

    await vi.waitFor(() => {
      expect(handleMock).toHaveBeenCalledWith(loginMessage);
    });
    expect(sendResponse).not.toHaveBeenCalled();
  });
  it('warns on unknown message types via runtime listener', async () => {
    handleMock.mockResolvedValue(false);
    await loadBackgroundModule();
    const listener = (chromeMock.runtime.onMessage.addListener as any).mock.calls[0][0];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    listener({ type: 'UNKNOWN' }, {} as chrome.runtime.MessageSender, vi.fn());

    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('Unknown message type:', 'UNKNOWN');
    });
  });
});
