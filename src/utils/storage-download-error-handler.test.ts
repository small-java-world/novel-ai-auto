import { describe, it, expect } from 'vitest';
import { DownloadErrorHandler } from './storage-download-error-handler';
import {
  ERROR_MESSAGES,
  STORAGE_DOWNLOAD_CONFIG,
  LOG_LEVELS,
} from './storage-download-compatibility-config';

describe('DownloadErrorHandler', () => {
  it('creates retryable result for download failures', () => {
    const error = new Error('network glitch');
    const result = DownloadErrorHandler.createErrorResult('DOWNLOAD_FAILED', error);

    expect(result).toMatchObject({
      success: false,
      errorCode: 'DOWNLOAD_FAILED',
      errorMessage: ERROR_MESSAGES.DOWNLOAD_FAILED,
      retryable: true,
    });
    expect(result.retryDelay).toBeLessThanOrEqual(STORAGE_DOWNLOAD_CONFIG.MAX_RETRY_DELAY);
  });

  it('honours explicit retry override', () => {
    const result = DownloadErrorHandler.createErrorResult(
      'PERMISSION_DENIED',
      new Error('nope'),
      true
    );
    expect(result.retryable).toBe(true);
    expect(result.retryDelay).toBeLessThanOrEqual(STORAGE_DOWNLOAD_CONFIG.MAX_RETRY_DELAY);
  });

  it('maps error messages to error types', () => {
    expect(DownloadErrorHandler.classifyError(new Error('permission API error: timeout'))).toBe(
      'PERMISSION_API_ERROR'
    );
    expect(DownloadErrorHandler.classifyError(new Error('Permission denied by user'))).toBe(
      'PERMISSION_DENIED'
    );
    expect(DownloadErrorHandler.classifyError(new Error('invalid request body'))).toBe(
      'INVALID_INPUT'
    );
    expect(DownloadErrorHandler.classifyError(new Error('something else'))).toBe('DOWNLOAD_FAILED');
  });

  it('calculates capped retry delay', () => {
    const delay = (DownloadErrorHandler as any).calculateRetryDelay(10);
    expect(delay).toBeLessThanOrEqual(STORAGE_DOWNLOAD_CONFIG.MAX_RETRY_DELAY);
  });

  it('handles errors by classifying and creating results', () => {
    const error = new Error('permission API error: offline');
    const result = DownloadErrorHandler.handleError(error);
    expect(result.errorCode).toBe('PERMISSION_API_ERROR');
    expect(result.errorMessage).toBe(ERROR_MESSAGES.PERMISSION_API_ERROR);
  });
});
