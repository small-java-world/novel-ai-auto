import { beforeEach, describe, expect, it, vi } from 'vitest';

const permissionManagerMock = vi.hoisted(() => ({
  checkPermissionStatus: vi.fn(),
  requestPermission: vi.fn(),
  resetPermissionState: vi.fn(),
  getCurrentState: vi.fn(),
}));

const filenameSanitizerMock = vi.hoisted(() => ({
  sanitize: vi.fn((filename: string) => `sanitized-${filename}`),
}));

const downloadLoggerMock = vi.hoisted(() => ({
  logSuccess: vi.fn(),
  logError: vi.fn(),
}));

const errorHandlerMock = vi.hoisted(() => ({
  createErrorResult: vi.fn(),
  handleError: vi.fn(),
}));

vi.mock('./permission-manager', () => ({
  PermissionManager: permissionManagerMock,
}));

vi.mock('./filename-sanitizer', () => ({
  FilenameSanitizer: filenameSanitizerMock,
}));

vi.mock('./download-logger', () => ({
  DownloadLogger: downloadLoggerMock,
}));

vi.mock('./storage-download-error-handler', () => ({
  DownloadErrorHandler: errorHandlerMock,
}));

import { ensureDownloadPermissionAndDownload } from './storage-download-compatibility';

const chromeMock = globalThis.chrome as any;

describe('ensureDownloadPermissionAndDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorHandlerMock.createErrorResult.mockReturnValue({
      success: false,
      errorCode: 'INVALID_INPUT',
    });
    errorHandlerMock.handleError.mockReturnValue({ success: false, errorCode: 'DOWNLOAD_FAILED' });
  });

  it('returns validation error when request is invalid', async () => {
    const result = await ensureDownloadPermissionAndDownload({ url: '', fileName: '' });

    expect(errorHandlerMock.createErrorResult).toHaveBeenCalledWith(
      'INVALID_INPUT',
      expect.any(Error),
      false
    );
    expect(result).toEqual({ success: false, errorCode: 'INVALID_INPUT' });
  });

  it('aborts when permission API reports unrecoverable state', async () => {
    permissionManagerMock.checkPermissionStatus.mockResolvedValue({
      hasPermission: false,
      isPending: false,
      nextAction: 'abort',
      message: 'permission API error',
    });

    const result = await ensureDownloadPermissionAndDownload({
      url: 'https://example.com/file.png',
      fileName: 'file.png',
    });

    expect(errorHandlerMock.createErrorResult).toHaveBeenCalledWith(
      'PERMISSION_API_ERROR',
      expect.any(Error),
      false
    );
    expect(result).toEqual({ success: false, errorCode: 'INVALID_INPUT' });
  });

  it('logs and returns error when permission request is denied', async () => {
    permissionManagerMock.checkPermissionStatus.mockResolvedValue({
      hasPermission: false,
      isPending: false,
      nextAction: 'request',
      message: 'needs prompt',
    });
    permissionManagerMock.requestPermission.mockResolvedValue({
      granted: false,
      previousState: false,
      userResponse: 'denied',
      message: 'user rejected',
    });
    errorHandlerMock.createErrorResult.mockReturnValue({
      success: false,
      errorCode: 'PERMISSION_DENIED',
    });

    const result = await ensureDownloadPermissionAndDownload({
      url: 'https://example.com/file.png',
      fileName: 'file.png',
    });

    expect(downloadLoggerMock.logError).toHaveBeenCalledWith(
      'permission_denied',
      expect.stringContaining('file.png')
    );
    expect(result).toEqual({ success: false, errorCode: 'PERMISSION_DENIED' });
  });

  it('downloads file when permission is granted', async () => {
    permissionManagerMock.checkPermissionStatus.mockResolvedValue({
      hasPermission: true,
      isPending: false,
      nextAction: 'proceed',
      message: 'ready',
    });
    chromeMock.downloads.download.mockResolvedValue(42);
    downloadLoggerMock.logSuccess.mockResolvedValue(undefined);

    const result = await ensureDownloadPermissionAndDownload({
      url: 'https://example.com/file.png',
      fileName: 'file.png',
    });

    expect(filenameSanitizerMock.sanitize).toHaveBeenCalledWith('file.png');
    expect(chromeMock.downloads.download).toHaveBeenCalledWith({
      url: 'https://example.com/file.png',
      filename: 'sanitized-file.png',
      conflictAction: 'uniquify',
    });
    expect(downloadLoggerMock.logSuccess).toHaveBeenCalledWith(
      'download_success',
      expect.stringContaining('sanitized-file.png')
    );
    expect(result).toEqual({ success: true, downloadId: 42 });
  });

  it('returns handled error when download fails', async () => {
    permissionManagerMock.checkPermissionStatus.mockResolvedValue({
      hasPermission: true,
      isPending: false,
      nextAction: 'proceed',
      message: 'ready',
    });
    chromeMock.downloads.download.mockRejectedValue(new Error('network'));
    errorHandlerMock.handleError.mockReturnValue({ success: false, errorCode: 'DOWNLOAD_FAILED' });

    const result = await ensureDownloadPermissionAndDownload({
      url: 'https://example.com/file.png',
      fileName: 'file.png',
    });

    expect(downloadLoggerMock.logError).toHaveBeenCalledWith(
      'download_error',
      expect.stringContaining('network')
    );
    expect(errorHandlerMock.handleError).toHaveBeenCalled();
    expect(result).toEqual({ success: false, errorCode: 'DOWNLOAD_FAILED' });
  });
});
