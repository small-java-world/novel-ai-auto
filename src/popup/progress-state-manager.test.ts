import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProgressStateManager } from './progress-state-manager';

describe('ProgressStateManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('validates messages and rejects invalid payloads', () => {
    const manager = new ProgressStateManager();

    expect(manager.validateMessage(null)).toBe(false);
    expect(manager.validateMessage({ type: 'WRONG' })).toBe(false);
    expect(manager.validateMessage({ type: 'PROGRESS_UPDATE', currentIndex: '1' })).toBe(false);
    expect(
      manager.validateMessage({
        type: 'PROGRESS_UPDATE',
        currentIndex: 5,
        totalCount: 2,
      }),
    ).toBe(false);

    expect(
      manager.validateMessage({ type: 'PROGRESS_UPDATE', currentIndex: 1, totalCount: 3 }),
    ).toBe(true);
  });

  it('maps status codes to non-empty text variants', () => {
    const manager = new ProgressStateManager();

    const waiting = manager.getStatusText('waiting');
    const generating = manager.getStatusText('generating');
    const downloading = manager.getStatusText('downloading');
    const completed = manager.getStatusText('completed');
    const error = manager.getStatusText('error');
    const cancelled = manager.getStatusText('cancelled');
    const fallback = manager.getStatusText('unknown');

    [waiting, generating, downloading, completed, error, cancelled, fallback].forEach((text) => {
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });

    expect(waiting).not.toBe(fallback);
    expect(cancelled).not.toBe(completed);
    expect(error).not.toBe(generating);
  });

  it('tracks cancellation and completion messaging', () => {
    const manager = new ProgressStateManager();
    expect(manager.shouldIgnoreCompletionMessage('completed')).toBe(false);

    manager.setCancelledState();
    expect(manager.isCancelledState()).toBe(true);
    expect(manager.shouldIgnoreCompletionMessage('completed')).toBe(true);
  });

  it('invokes timeout callback when communication stalls', () => {
    const manager = new ProgressStateManager();
    const timeoutSpy = vi.fn();
    manager.setTimeoutCallback(timeoutSpy);

    vi.advanceTimersByTime(5001);

    expect(timeoutSpy).toHaveBeenCalledTimes(1);
    expect(manager.isCommunicationTimedOut()).toBe(true);
  });

  it('resets timeout when messages arrive in time', () => {
    const manager = new ProgressStateManager();
    const timeoutSpy = vi.fn();
    manager.setTimeoutCallback(timeoutSpy);

    vi.advanceTimersByTime(3000);
    manager.updateLastMessageTime();
    vi.advanceTimersByTime(4000);

    expect(timeoutSpy).not.toHaveBeenCalled();
    expect(manager.isCommunicationTimedOut()).toBe(false);
  });

  it('cleans up timers when requested', () => {
    const manager = new ProgressStateManager();

    manager.cleanup();
    vi.advanceTimersByTime(6000);

    expect(manager.isCommunicationTimedOut()).toBe(false);
  });

  it('stores metadata for the active job', () => {
    const manager = new ProgressStateManager();
    manager.setCurrentJobId('job-123');
    manager.setStartTime(111);

    expect(manager.getCurrentJobId()).toBe('job-123');
    expect(manager.getStartTime()).toBe(111);
  });
});
