import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./storage-download-compatibility-config', () => ({
  STORAGE_DOWNLOAD_CONFIG: {
    LOG_LIMIT: 3,
    MAX_RETRY_DELAY: 2000,
    RETRY_BASE_DELAY: 250,
    RETRY_MULTIPLIER: 2,
    MAX_FILENAME_LENGTH: 255,
    DEFAULT_EXTENSION: '.png',
  },
  LOG_LEVELS: {
    INFO: 'INFO',
    ERROR: 'ERROR',
  },
  ERROR_MESSAGES: {
    LOG_ERROR: 'LOG_ERROR',
  },
}));

import { DownloadLogger } from './download-logger';

const chromeMock = globalThis.chrome as any;

describe('DownloadLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-09-19T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records success entries and persists them', async () => {
    chromeMock.storage.local.get.mockResolvedValue({ logs: [] });
    chromeMock.storage.local.set.mockResolvedValue(undefined);

    await DownloadLogger.logSuccess('download_success', 'image saved');

    expect(chromeMock.storage.local.get).toHaveBeenCalledWith(['logs']);

    const savedLogs = chromeMock.storage.local.set.mock.calls[0][0].logs;
    expect(savedLogs).toHaveLength(1);
    expect(savedLogs[0]).toMatchObject({
      id: 0,
      level: 'INFO',
      message: 'download_success: image saved',
    });
    expect(typeof savedLogs[0].timestamp).toBe('number');
  });

  it('records error entries with override level', async () => {
    chromeMock.storage.local.get.mockResolvedValue({
      logs: [{ id: 3, timestamp: 1, level: 'INFO', message: 'existing' }],
    });
    chromeMock.storage.local.set.mockResolvedValue(undefined);

    await DownloadLogger.logError('download_error', 'missing permissions', {
      overrideLevel: 'CRITICAL',
    });

    const savedLogs = chromeMock.storage.local.set.mock.calls[0][0].logs;
    expect(savedLogs).toHaveLength(2);
    expect(savedLogs[1]).toMatchObject({
      id: 4,
      level: 'CRITICAL',
      message: 'download_error: missing permissions',
    });
  });

  it('rotates logs when limit is exceeded', async () => {
    const seedLogs = [
      { id: 0, timestamp: 1, level: 'INFO', message: 'a' },
      { id: 1, timestamp: 2, level: 'INFO', message: 'b' },
      { id: 2, timestamp: 3, level: 'INFO', message: 'c' },
    ];
    chromeMock.storage.local.get.mockResolvedValue({ logs: seedLogs });
    chromeMock.storage.local.set.mockResolvedValue(undefined);

    await DownloadLogger.logSuccess('rotate', 'new-entry');

    const savedLogs = chromeMock.storage.local.set.mock.calls[0][0].logs;
    expect(savedLogs).toHaveLength(3);
    expect(savedLogs.map((entry: any) => entry.message)).toEqual(['b', 'c', 'rotate: new-entry']);
  });

  it('returns empty array when stored logs are invalid', async () => {
    chromeMock.storage.local.get.mockResolvedValue({ logs: 'not-an-array' });

    const result = await (DownloadLogger as any).getCurrentLogs();
    expect(result).toEqual([]);
  });

  it('returns empty array and warns when retrieval fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    chromeMock.storage.local.get.mockRejectedValue(new Error('quota'));

    const result = await (DownloadLogger as any).getCurrentLogs();
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith('ログ読み込みに失敗しました:', expect.any(Error));
  });

  it('calculates the next id even when Math.max fails', () => {
    const logs = [{ id: 1 }, { id: 2 }];
    const maxSpy = vi.spyOn(Math, 'max').mockImplementation(() => {
      throw new Error('calc failure');
    });

    const nextId = (DownloadLogger as any).generateNextId(logs);
    expect(nextId).toBe(logs.length);
    maxSpy.mockRestore();
  });

  it('saves logs to storage and propagates failures', async () => {
    chromeMock.storage.local.set.mockResolvedValue(undefined);
    await (DownloadLogger as any).saveLogsToStorage([
      { id: 1, timestamp: 1, level: 'INFO', message: 'm' },
    ]);
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({ logs: expect.any(Array) });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    chromeMock.storage.local.set.mockRejectedValueOnce(new Error('persist'));
    await expect((DownloadLogger as any).saveLogsToStorage([])).rejects.toThrow('persist');
    expect(warnSpy).toHaveBeenCalledWith('ログ保存に失敗しました:', expect.any(Error));
  });

  it('warns when log pipeline persistence fails', async () => {
    chromeMock.storage.local.get.mockResolvedValue({ logs: [] });
    chromeMock.storage.local.set.mockRejectedValue(new Error('persist'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await DownloadLogger.logSuccess('download', 'will fail');

    expect(warnSpy).toHaveBeenCalledWith('LOG_ERROR', expect.any(Error));
  });

  it('clears logs and surfaces storage errors', async () => {
    chromeMock.storage.local.set.mockResolvedValue(undefined);
    await DownloadLogger.clearLogs();
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({ logs: [] });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    chromeMock.storage.local.set.mockRejectedValueOnce(new Error('clear'));
    await expect(DownloadLogger.clearLogs()).rejects.toThrow('clear');
    expect(warnSpy).toHaveBeenCalledWith('ログクリアに失敗しました:', expect.any(Error));
  });

  it('exposes read-only access through getLogs', async () => {
    const expected = [{ id: 1, timestamp: 1, level: 'INFO', message: 'x' }];
    chromeMock.storage.local.get.mockResolvedValue({ logs: expected });

    const result = await DownloadLogger.getLogs();
    expect(result).toEqual(expected);
  });
});
