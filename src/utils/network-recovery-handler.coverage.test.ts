/**
 * Network Recovery Handler Coverage Tests
 * Additional unit tests for uncovered areas and edge cases
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  NetworkRecoveryHandler,
  detectNetworkStateChange,
  pauseJobsOnOffline,
  resumeJobsOnOnline,
  handleFlappingPrevention,
  stageResumeMultipleJobs,
} from './network-recovery-handler';
import { NetworkState, GenerationJob, PausedJob, RetrySettings } from '../types';
import { ERROR_MESSAGES } from './network-recovery-config';

// Mock dependencies
const mockNavigator = {
  onLine: true,
};

const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

// Global mocks
(globalThis as any).navigator = mockNavigator;
(globalThis as any).chrome = mockChrome;

describe('Network Recovery Handler Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigator.onLine = true;
  });

  afterEach(() => {
    mockNavigator.onLine = true;
  });

  describe('detectNetworkStateChange Edge Cases', () => {
    it('should handle event without type property', () => {
      const eventWithoutType = {} as Event;
      const result = detectNetworkStateChange(eventWithoutType, Date.now(), 'test-job');

      expect(result.detected).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should handle unknown event types gracefully', () => {
      const unknownEvent = { type: 'unknown' } as Event;
      const result = detectNetworkStateChange(unknownEvent, Date.now(), 'test-job');

      expect(result.detected).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should handle negative timestamp', () => {
      const result = detectNetworkStateChange(null, -1000, 'test-job');

      expect(result.detected).toBe(false);
      expect(result.errorMessage).toBe(ERROR_MESSAGES.INVALID_TIMESTAMP);
    });

    it('should handle zero timestamp', () => {
      const result = detectNetworkStateChange(null, 0, 'test-job');

      expect(result.detected).toBe(false);
      expect(result.errorMessage).toBe(ERROR_MESSAGES.INVALID_TIMESTAMP);
    });

    it('should handle very large timestamp', () => {
      const futureTimestamp = Date.now() + 1000 * 60 * 60 * 24 * 365; // 1 year in future
      const result = detectNetworkStateChange(null, futureTimestamp, 'test-job');

      expect(result.detected).toBe(false);
      expect(result.errorMessage).toBe(ERROR_MESSAGES.INVALID_TIMESTAMP);
    });

    it('should handle jobId with special valid characters', () => {
      const validJobId = 'job-123_test';
      const result = detectNetworkStateChange(null, Date.now(), validJobId);

      expect(result.detected).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should handle very long valid jobId', () => {
      const longJobId = 'a'.repeat(100); // Max length according to CONFIG
      const result = detectNetworkStateChange(null, Date.now(), longJobId);

      expect(result.detected).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should reject jobId exceeding maximum length', () => {
      const tooLongJobId = 'a'.repeat(257); // Exceeds max length
      const result = detectNetworkStateChange(null, Date.now(), tooLongJobId);

      expect(result.detected).toBe(false);
      expect(result.errorMessage).toBe(ERROR_MESSAGES.INVALID_JOB_ID);
    });

    it('should handle missing navigator object', () => {
      const originalNavigator = (globalThis as any).navigator;
      (globalThis as any).navigator = undefined;

      const result = detectNetworkStateChange(null, Date.now(), 'test-job');

      expect(result.fallbackMode).toBe(true);
      expect(result.assumedState).toBe('online');

      // Restore navigator
      (globalThis as any).navigator = originalNavigator;
    });

    it('should handle navigator without onLine property', () => {
      const originalNavigator = (globalThis as any).navigator;
      (globalThis as any).navigator = {};

      const result = detectNetworkStateChange(null, Date.now(), 'test-job');

      expect(result.fallbackMode).toBe(true);
      expect(result.monitoringDisabled).toBe(true);

      // Restore navigator
      (globalThis as any).navigator = originalNavigator;
    });
  });

  describe('pauseJobsOnOffline Edge Cases', () => {
    it('should handle null jobs array', () => {
      const result = pauseJobsOnOffline(null as any, { isOnline: false }, Date.now());

      expect(result.success).toBe(false);
      expect(result.pausedJobs).toHaveLength(0);
      expect(result.errorLog).toContain('Invalid jobs array provided');
    });

    it('should handle undefined jobs array', () => {
      const result = pauseJobsOnOffline(undefined as any, { isOnline: false }, Date.now());

      expect(result.success).toBe(false);
      expect(result.pausedJobs).toHaveLength(0);
      expect(result.errorLog).toContain('Invalid jobs array provided');
    });

    it('should handle non-array jobs parameter', () => {
      const result = pauseJobsOnOffline('not-an-array' as any, { isOnline: false }, Date.now());

      expect(result.success).toBe(false);
      expect(result.pausedJobs).toHaveLength(0);
      expect(result.errorLog).toContain('Invalid jobs array provided');
    });

    it('should handle empty jobs array', () => {
      const result = pauseJobsOnOffline([], { isOnline: false }, Date.now());

      expect(result.success).toBe(true);
      expect(result.pausedJobs).toHaveLength(0);
    });

    it('should handle jobs with mixed statuses', () => {
      const jobs: GenerationJob[] = [
        {
          id: 'running-job',
          status: 'running',
          prompt: 'test',
          parameters: {},
          settings: {
            imageCount: 1,
            seed: -1,
            filenameTemplate: '',
            retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          progress: { current: 0, total: 1, status: 'waiting' },
        },
        {
          id: 'completed-job',
          status: 'completed',
          prompt: 'test',
          parameters: {},
          settings: {
            imageCount: 1,
            seed: -1,
            filenameTemplate: '',
            retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          progress: { current: 1, total: 1, status: 'complete' },
        },
        {
          id: 'pending-job',
          status: 'pending',
          prompt: 'test',
          parameters: {},
          settings: {
            imageCount: 1,
            seed: -1,
            filenameTemplate: '',
            retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          progress: { current: 0, total: 1, status: 'waiting' },
        },
      ];

      const result = pauseJobsOnOffline(jobs, { isOnline: false }, Date.now());

      expect(result.success).toBe(true);
      expect(result.pausedJobs).toHaveLength(1); // Only running job should be paused
      expect(result.pausedJobs[0].id).toBe('running-job');
      expect(result.pausedJobs[0].status).toBe('paused');
    });

    it('should handle null networkState', () => {
      const jobs: GenerationJob[] = [
        {
          id: 'running-job',
          status: 'running',
          prompt: 'test',
          parameters: {},
          settings: {
            imageCount: 1,
            seed: -1,
            filenameTemplate: '',
            retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          progress: { current: 0, total: 1, status: 'waiting' },
        },
      ];

      const result = pauseJobsOnOffline(jobs, null as any, Date.now());

      expect(result.success).toBe(true);
      expect(result.userNotification).toContain('Network state assumed online');
    });

    it('should handle network state with isOnline true', () => {
      const jobs: GenerationJob[] = [
        {
          id: 'running-job',
          status: 'running',
          prompt: 'test',
          parameters: {},
          settings: {
            imageCount: 1,
            seed: -1,
            filenameTemplate: '',
            retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          progress: { current: 0, total: 1, status: 'waiting' },
        },
      ];

      const result = pauseJobsOnOffline(jobs, { isOnline: true }, Date.now());

      expect(result.success).toBe(true);
      expect(result.pausedJobs).toHaveLength(0);
      expect(result.userNotification).toContain('Network is online, no pause needed');
    });
  });

  describe('resumeJobsOnOnline Edge Cases', () => {
    it('should handle null pausedJobs array', () => {
      const result = resumeJobsOnOnline(null as any, { isOnline: true }, Date.now());

      expect(result.success).toBe(false);
      expect(result.resumedJobs).toHaveLength(0);
      expect(result.userMessage).toContain('Invalid paused jobs array provided');
    });

    it('should handle undefined pausedJobs array', () => {
      const result = resumeJobsOnOnline(undefined as any, { isOnline: true }, Date.now());

      expect(result.success).toBe(false);
      expect(result.resumedJobs).toHaveLength(0);
      expect(result.userMessage).toContain('Invalid paused jobs array provided');
    });

    it('should handle non-array pausedJobs parameter', () => {
      const result = resumeJobsOnOnline('not-an-array' as any, { isOnline: true }, Date.now());

      expect(result.success).toBe(false);
      expect(result.resumedJobs).toHaveLength(0);
      expect(result.userMessage).toContain('Invalid paused jobs array provided');
    });

    it('should handle empty pausedJobs array', () => {
      const result = resumeJobsOnOnline([], { isOnline: true }, Date.now());

      expect(result.success).toBe(true);
      expect(result.resumedJobs).toHaveLength(0);
    });

    it('should handle networkState with isOnline false', () => {
      const pausedJobs: PausedJob[] = [
        { id: 'paused-job', status: 'paused', reason: 'network_offline', pausedAt: Date.now() },
      ];

      const result = resumeJobsOnOnline(pausedJobs, { isOnline: false }, Date.now());

      expect(result.success).toBe(false);
      expect(result.resumedJobs).toHaveLength(0);
      expect(result.userMessage).toContain('Network is still offline');
    });

    it('should handle null networkState', () => {
      const pausedJobs: PausedJob[] = [
        { id: 'paused-job', status: 'paused', reason: 'network_offline', pausedAt: Date.now() },
      ];

      const result = resumeJobsOnOnline(pausedJobs, null as any, Date.now());

      expect(result.success).toBe(false);
      expect(result.resumedJobs).toHaveLength(0);
      expect(result.userMessage).toContain('Network is still offline');
    });
  });

  describe('handleFlappingPrevention Edge Cases', () => {
    it('should handle null jobId', () => {
      const result = handleFlappingPrevention(null as any, 5000);

      expect(result.detected).toBe(false);
      expect(result.reason).toBe('flapping_prevention');
    });

    it('should handle empty jobId', () => {
      const result = handleFlappingPrevention('', 5000);

      expect(result.detected).toBe(false);
      expect(result.reason).toBe('flapping_prevention');
    });

    it('should handle negative duration', () => {
      const result = handleFlappingPrevention('test-job', -1000);

      expect(result.detected).toBe(false);
      expect(result.reason).toBe('flapping_prevention');
    });

    it('should handle zero duration', () => {
      const result = handleFlappingPrevention('test-job', 0);

      expect(result.detected).toBe(false);
      expect(result.reason).toBe('flapping_prevention');
    });

    it('should handle non-number duration', () => {
      const result = handleFlappingPrevention('test-job', 'not-a-number' as any);

      expect(result.detected).toBe(false);
      expect(result.reason).toBe('flapping_prevention');
    });

    it('should handle Infinity duration', () => {
      const result = handleFlappingPrevention('test-job', Infinity);

      expect(result.detected).toBe(true);
      expect(result.reason).toBe('stable_state');
    });

    it('should handle very large duration', () => {
      const result = handleFlappingPrevention('test-job', Number.MAX_SAFE_INTEGER);

      expect(result.detected).toBe(true);
      expect(result.reason).toBe('stable_state');
    });

    it('should handle exact threshold boundary (5000ms)', () => {
      const result = handleFlappingPrevention('test-job', 5000);

      expect(result.detected).toBe(true);
      expect(result.reason).toBe('stable_state');
    });

    it('should handle just below threshold (4999ms)', () => {
      const result = handleFlappingPrevention('test-job', 4999);

      expect(result.detected).toBe(false);
      expect(result.reason).toBe('flapping_prevention');
    });
  });

  describe('NetworkRecoveryHandler Class Edge Cases', () => {
    let handler: NetworkRecoveryHandler;

    beforeEach(() => {
      handler = new NetworkRecoveryHandler();
    });

    describe('broadcastNetworkStateChange', () => {
      it('should handle null message', () => {
        const result = handler.broadcastNetworkStateChange(null as any, ['popup']);

        expect(result.success).toBe(false);
        expect(result.deliveryResults).toHaveLength(0);
        expect(result.totalDelivered).toBe(0);
      });

      it('should handle null targets', () => {
        const message = {
          type: 'NETWORK_STATE_CHANGED' as const,
          isOnline: false,
          timestamp: Date.now(),
          affectedJobs: [],
        };
        const result = handler.broadcastNetworkStateChange(message, null as any);

        expect(result.success).toBe(false);
        expect(result.deliveryResults).toHaveLength(0);
      });

      it('should handle empty targets array', () => {
        const message = {
          type: 'NETWORK_STATE_CHANGED' as const,
          isOnline: false,
          timestamp: Date.now(),
          affectedJobs: [],
        };
        const result = handler.broadcastNetworkStateChange(message, []);

        expect(result.success).toBe(true);
        expect(result.deliveryResults).toHaveLength(0);
        expect(result.totalDelivered).toBe(0);
      });

      it('should handle non-array targets', () => {
        const message = {
          type: 'NETWORK_STATE_CHANGED' as const,
          isOnline: false,
          timestamp: Date.now(),
          affectedJobs: [],
        };
        const result = handler.broadcastNetworkStateChange(message, 'not-an-array' as any);

        expect(result.success).toBe(false);
        expect(result.deliveryResults).toHaveLength(0);
      });
    });

    describe('notifyDirectly', () => {
      it('should handle null stateChange', () => {
        const result = handler.notifyDirectly(null as any, ['popup'], new Error('test'));

        expect(result.routerUsed).toBe(false);
        expect(result.directNotificationSent).toBe(false);
        expect(result.fallbackMethod).toBe('none');
      });

      it('should handle null targets', () => {
        const stateChange = { isOnline: false, timestamp: Date.now() };
        const result = handler.notifyDirectly(stateChange, null as any, new Error('test'));

        expect(result.routerUsed).toBe(false);
        expect(result.directNotificationSent).toBe(false);
      });

      it('should handle null error', () => {
        const stateChange = { isOnline: false, timestamp: Date.now() };
        const result = handler.notifyDirectly(stateChange, ['popup'], null as any);

        expect(result.routerUsed).toBe(false);
        expect(result.directNotificationSent).toBe(false);
      });

      it('should handle valid parameters', () => {
        const stateChange = { isOnline: false, timestamp: Date.now() };
        const result = handler.notifyDirectly(stateChange, ['popup'], new Error('test'));

        expect(result.routerUsed).toBe(false);
        expect(result.directNotificationSent).toBe(true);
        expect(result.notificationTargets).toEqual(['popup']);
        expect(result.fallbackMethod).toBe('chrome.runtime.sendMessage');
        expect(result.deliveryConfirmed).toBe(true);
      });
    });

    describe('setMonitoringInterval', () => {
      it('should handle non-number interval', () => {
        const result = handler.setMonitoringInterval('not-a-number' as any);

        expect(result.applied).toBe(1000);
        expect(result.acceptable).toBe(false);
        expect(result.warning).toContain('Invalid interval provided');
      });

      it('should handle negative interval', () => {
        const result = handler.setMonitoringInterval(-1000);

        expect(result.applied).toBe(1000);
        expect(result.acceptable).toBe(false);
        expect(result.warning).toContain('Invalid interval provided');
      });

      it('should handle zero interval', () => {
        const result = handler.setMonitoringInterval(0);

        expect(result.applied).toBe(1000);
        expect(result.acceptable).toBe(false);
        expect(result.warning).toContain('Invalid interval provided');
      });

      it('should handle interval exceeding maximum', () => {
        const result = handler.setMonitoringInterval(2000);

        expect(result.applied).toBe(1000);
        expect(result.acceptable).toBe(false);
        expect(result.capped).toBe(true);
        expect(result.warning).toContain('Interval capped to 1000ms');
      });

      it('should handle valid interval within limits', () => {
        const result = handler.setMonitoringInterval(500);

        expect(result.applied).toBe(500);
        expect(result.acceptable).toBe(true);
        expect(result.warning).toBeUndefined();
      });

      it('should handle exact maximum interval', () => {
        const result = handler.setMonitoringInterval(1000);

        expect(result.applied).toBe(1000);
        expect(result.acceptable).toBe(true);
        expect(result.warning).toBeUndefined();
      });

      it('should handle Infinity interval', () => {
        const result = handler.setMonitoringInterval(Infinity);

        expect(result.applied).toBe(1000);
        expect(result.acceptable).toBe(false);
        expect(result.capped).toBe(true);
      });

      it('should handle NaN interval', () => {
        const result = handler.setMonitoringInterval(NaN);

        expect(result.applied).toBe(1000);
        expect(result.acceptable).toBe(false);
        expect(result.warning).toContain('Invalid interval provided');
      });
    });
  });
});
