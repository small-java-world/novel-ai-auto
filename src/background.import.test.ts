import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('background.ts import and listeners', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('imports background and registers runtime listeners', async () => {
    const chromeMock = globalThis.chrome as any;
    await import('./background');

    expect(chromeMock.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
    expect(chromeMock.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);

    // Invoke onInstalled to cover initialization path
    const onInstalledCb = chromeMock.runtime.onInstalled.addListener.mock.calls[0][0];
    chromeMock.storage.local.set.mockResolvedValue(undefined);
    await onInstalledCb({ reason: 'install' });
    expect(chromeMock.storage.local.set).toHaveBeenCalled();
  });

  it('handles DOWNLOAD_IMAGE and CANCEL_JOB messages', async () => {
    const chromeMock = globalThis.chrome as any;
    await import('./background');

    const listener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0];

    // DOWNLOAD_IMAGE
    chromeMock.downloads.download.mockResolvedValue(456);
    const sendResponse1 = vi.fn();
    const ret1 = listener(
      { type: 'DOWNLOAD_IMAGE', url: 'https://x/y.png', filename: 'y.png' },
      {},
      sendResponse1
    );
    expect(ret1).toBe(true);
    // allow async branch to resolve
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(chromeMock.downloads.download).toHaveBeenCalledWith({
      url: 'https://x/y.png',
      filename: 'y.png',
      conflictAction: 'uniquify',
    });

    // CANCEL_JOB
    const sendResponse2 = vi.fn();
    const ret2 = listener({ type: 'CANCEL_JOB', jobId: 'job-1' }, {}, sendResponse2);
    expect(ret2).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(sendResponse2).toBeCalled();
  });
});
