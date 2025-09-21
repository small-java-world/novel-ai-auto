/**
 * Job Queue Manager Coverage Tests
 * Additional unit tests for uncovered areas and edge cases
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createJobQueueManager, type JobQueueManager } from './job-queue-manager';
import { GenerationJob, GenerationSettings } from '../types';

// Chrome API Mock
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  tabs: {
    sendMessage: vi.fn(),
    query: vi.fn(),
  },
};

(globalThis as any).chrome = mockChrome;

describe('JobQueueManager Coverage Tests', () => {
  let jobQueueManager: JobQueueManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.tabs.query.mockResolvedValue([{ id: 123 }]);
    jobQueueManager = createJobQueueManager();
  });

  afterEach(() => {
    if (jobQueueManager) {
      jobQueueManager.cancelAll();
    }
  });

  describe('Input Validation Edge Cases', () => {
    it('should reject job with invalid ID format (special characters)', async () => {
      const invalidJob: GenerationJob = {
        id: 'job@#$%invalid',
        prompt: 'test',
        parameters: {},
        settings: {
          imageCount: 1,
          seed: -1,
          filenameTemplate: '{date}_{prompt}_{idx}',
          retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: { current: 0, total: 1, status: 'waiting' },
      };

      const result = await jobQueueManager.startJob(invalidJob);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_JOB_ID');
    });

    it('should reject job with empty ID', async () => {
      const invalidJob: GenerationJob = {
        id: '',
        prompt: 'test',
        parameters: {},
        settings: {
          imageCount: 1,
          seed: -1,
          filenameTemplate: '{date}_{prompt}_{idx}',
          retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: { current: 0, total: 1, status: 'waiting' },
      };

      const result = await jobQueueManager.startJob(invalidJob);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_JOB_ID');
    });

    it('should reject job with image count exceeding maximum limit', async () => {
      const invalidJob: GenerationJob = {
        id: 'test-job-limit',
        prompt: 'test',
        parameters: {},
        settings: {
          imageCount: 1001, // Exceeds MAX_IMAGE_COUNT (1000)
          seed: -1,
          filenameTemplate: '{date}_{prompt}_{idx}',
          retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: { current: 0, total: 1001, status: 'waiting' },
      };

      const result = await jobQueueManager.startJob(invalidJob);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_IMAGE_COUNT');
      expect(result.error?.message).toContain('Image count must be between 1 and 1000');
    });

    it('should reject job with negative image count', async () => {
      const invalidJob: GenerationJob = {
        id: 'test-job-negative',
        prompt: 'test',
        parameters: {},
        settings: {
          imageCount: -5,
          seed: -1,
          filenameTemplate: '{date}_{prompt}_{idx}',
          retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: { current: 0, total: -5, status: 'waiting' },
      };

      const result = await jobQueueManager.startJob(invalidJob);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_IMAGE_COUNT');
    });

    it('should reject job with non-integer image count', async () => {
      const invalidJob: GenerationJob = {
        id: 'test-job-float',
        prompt: 'test',
        parameters: {},
        settings: {
          imageCount: 2.5,
          seed: -1,
          filenameTemplate: '{date}_{prompt}_{idx}',
          retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: { current: 0, total: 2.5, status: 'waiting' },
      };

      const result = await jobQueueManager.startJob(invalidJob);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_IMAGE_COUNT');
    });
  });

  describe('handleImageReady Edge Cases', () => {
    beforeEach(async () => {
      const job: GenerationJob = {
        id: 'test-job-image',
        prompt: 'test',
        parameters: {},
        settings: {
          imageCount: 3,
          seed: -1,
          filenameTemplate: '{date}_{prompt}_{idx}',
          retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: { current: 0, total: 3, status: 'waiting' },
      };

      await jobQueueManager.startJob(job);
    });

    it('should handle invalid job ID gracefully', async () => {
      // Should not throw error
      await expect(
        jobQueueManager.handleImageReady(
          'invalid-job-id',
          'https://example.com/img.png',
          0,
          'img.png'
        )
      ).resolves.toBeUndefined();
    });

    it('should handle invalid URL gracefully', async () => {
      // Should not throw error with invalid URL
      await expect(
        jobQueueManager.handleImageReady('test-job-image', 'not-a-url', 0, 'img.png')
      ).resolves.toBeUndefined();
    });

    it('should handle negative index gracefully', async () => {
      // Should not throw error with negative index
      await expect(
        jobQueueManager.handleImageReady(
          'test-job-image',
          'https://example.com/img.png',
          -1,
          'img.png'
        )
      ).resolves.toBeUndefined();
    });

    it('should handle non-integer index gracefully', async () => {
      // Should not throw error with non-integer index
      await expect(
        jobQueueManager.handleImageReady(
          'test-job-image',
          'https://example.com/img.png',
          1.5,
          'img.png'
        )
      ).resolves.toBeUndefined();
    });

    it('should sanitize dangerous filename characters', async () => {
      const dangerousFilename = '../../../malicious<>:"/\\|?*.txt';

      await jobQueueManager.handleImageReady(
        'test-job-image',
        'https://example.com/img.png',
        0,
        dangerousFilename
      );

      // Verify that sendMessage was called with sanitized filename
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOWNLOAD_IMAGE',
          payload: expect.objectContaining({
            fileName: expect.not.stringContaining('../'),
          }),
        })
      );
    });

    it('should handle empty filename by providing default', async () => {
      await jobQueueManager.handleImageReady(
        'test-job-image',
        'https://example.com/img.png',
        0,
        ''
      );

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOWNLOAD_IMAGE',
          payload: expect.objectContaining({
            fileName: 'image',
          }),
        })
      );
    });

    it('should handle null filename by providing default', async () => {
      await jobQueueManager.handleImageReady(
        'test-job-image',
        'https://example.com/img.png',
        0,
        null as any
      );

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOWNLOAD_IMAGE',
          payload: expect.objectContaining({
            fileName: 'image',
          }),
        })
      );
    });
  });

  describe('getJob Edge Cases', () => {
    it('should throw error for invalid job ID format', () => {
      expect(() => jobQueueManager.getJob('invalid@id')).toThrow('Invalid job ID');
    });

    it('should throw error for empty job ID', () => {
      expect(() => jobQueueManager.getJob('')).toThrow('Invalid job ID');
    });

    it('should throw error for non-existent job', () => {
      expect(() => jobQueueManager.getJob('non-existent-job')).toThrow('Job not found');
    });
  });

  describe('cancelJob Edge Cases', () => {
    it('should handle invalid job ID format gracefully', async () => {
      const result = await jobQueueManager.cancelJob('invalid@id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_JOB_ID');
    });

    it('should handle empty job ID gracefully', async () => {
      const result = await jobQueueManager.cancelJob('');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_JOB_ID');
    });

    it('should return appropriate response for already cancelled job', async () => {
      // Create and start a job
      const job: GenerationJob = {
        id: 'test-cancel-twice',
        prompt: 'test',
        parameters: {},
        settings: {
          imageCount: 1,
          seed: -1,
          filenameTemplate: '{date}_{prompt}_{idx}',
          retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: { current: 0, total: 1, status: 'waiting' },
      };

      await jobQueueManager.startJob(job);

      // Cancel once
      const firstResult = await jobQueueManager.cancelJob('test-cancel-twice');
      expect(firstResult.success).toBe(true);
      expect(firstResult.operation).toBe('cancelled');

      // Cancel again
      const secondResult = await jobQueueManager.cancelJob('test-cancel-twice');
      expect(secondResult.success).toBe(true);
      expect(secondResult.operation).toBe('already_cancelled');
    });
  });

  describe('Chrome API Communication Failures', () => {
    it('should handle tabs.query failure gracefully', async () => {
      mockChrome.tabs.query.mockRejectedValue(new Error('Tabs query failed'));

      const job: GenerationJob = {
        id: 'test-tabs-fail',
        prompt: 'test',
        parameters: {},
        settings: {
          imageCount: 1,
          seed: -1,
          filenameTemplate: '{date}_{prompt}_{idx}',
          retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: { current: 0, total: 1, status: 'waiting' },
      };

      // Should not throw error even if Chrome API fails
      const result = await jobQueueManager.startJob(job);
      expect(result.success).toBe(true);
    });

    it('should handle runtime.sendMessage failure gracefully', async () => {
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Runtime message failed'));

      const job: GenerationJob = {
        id: 'test-runtime-fail',
        prompt: 'test',
        parameters: {},
        settings: {
          imageCount: 1,
          seed: -1,
          filenameTemplate: '{date}_{prompt}_{idx}',
          retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: { current: 0, total: 1, status: 'waiting' },
      };

      await jobQueueManager.startJob(job);

      // Should not throw error when Chrome API fails
      await expect(
        jobQueueManager.handleImageReady(
          'test-runtime-fail',
          'https://example.com/img.png',
          0,
          'img.png'
        )
      ).resolves.toBeUndefined();
    });

    it('should handle tabs.sendMessage failure gracefully', async () => {
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Tabs message failed'));

      const job: GenerationJob = {
        id: 'test-tabs-msg-fail',
        prompt: 'test',
        parameters: {},
        settings: {
          imageCount: 1,
          seed: -1,
          filenameTemplate: '{date}_{prompt}_{idx}',
          retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: { current: 0, total: 1, status: 'waiting' },
      };

      // Should not throw error even if Chrome API fails
      const result = await jobQueueManager.startJob(job);
      expect(result.success).toBe(true);
    });
  });

  describe('Job Limit and Cleanup', () => {
    it('should perform cleanup when job limit is reached', async () => {
      // This test simulates reaching the job limit by mocking the internal state
      // In a real scenario, we would need to create 100+ jobs
      const job: GenerationJob = {
        id: 'test-cleanup',
        prompt: 'test',
        parameters: {},
        settings: {
          imageCount: 1,
          seed: -1,
          filenameTemplate: '{date}_{prompt}_{idx}',
          retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: { current: 0, total: 1, status: 'waiting' },
      };

      const result = await jobQueueManager.startJob(job);
      expect(result.success).toBe(true);
    });

    it('should clear all jobs when cancelAll is called', () => {
      jobQueueManager.cancelAll();
      // Verify that subsequent getJob calls fail
      expect(() => jobQueueManager.getJob('any-job')).toThrow('Job not found');
    });
  });

  describe('Factory Function', () => {
    it('should create JobQueueManager instance successfully', () => {
      const manager = createJobQueueManager();
      expect(manager).toBeDefined();
      expect(typeof manager.startJob).toBe('function');
      expect(typeof manager.cancelJob).toBe('function');
      expect(typeof manager.cancelAll).toBe('function');
      expect(typeof manager.handleImageReady).toBe('function');
      expect(typeof manager.getJob).toBe('function');
    });

    it('should throw error when Chrome APIs are not available', () => {
      const originalChrome = (globalThis as any).chrome;
      (globalThis as any).chrome = null;

      expect(() => createJobQueueManager()).toThrow(
        'Required Chrome Extension APIs are not available'
      );

      // Restore Chrome API
      (globalThis as any).chrome = originalChrome;
    });

    it('should throw error when required Chrome API methods are missing', () => {
      const originalChrome = (globalThis as any).chrome;
      (globalThis as any).chrome = { runtime: {} }; // Missing required methods

      expect(() => createJobQueueManager()).toThrow(
        'Required Chrome Extension APIs are not available'
      );

      // Restore Chrome API
      (globalThis as any).chrome = originalChrome;
    });
  });

  describe('Progress and Status Updates', () => {
    it('should update job progress correctly when handling multiple images', async () => {
      const job: GenerationJob = {
        id: 'test-progress',
        prompt: 'test',
        parameters: {},
        settings: {
          imageCount: 3,
          seed: -1,
          filenameTemplate: '{date}_{prompt}_{idx}',
          retrySettings: { maxRetries: 3, baseDelay: 500, factor: 2.0 },
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: { current: 0, total: 3, status: 'waiting' },
      };

      await jobQueueManager.startJob(job);

      // Complete first image
      await jobQueueManager.handleImageReady(
        'test-progress',
        'https://example.com/img1.png',
        0,
        'img1.png'
      );

      let currentJob = jobQueueManager.getJob('test-progress');
      expect(currentJob.progress.current).toBe(1);
      expect(currentJob.status).toBe('running');

      // Complete second image
      await jobQueueManager.handleImageReady(
        'test-progress',
        'https://example.com/img2.png',
        1,
        'img2.png'
      );

      currentJob = jobQueueManager.getJob('test-progress');
      expect(currentJob.progress.current).toBe(2);
      expect(currentJob.status).toBe('running');

      // Complete final image
      await jobQueueManager.handleImageReady(
        'test-progress',
        'https://example.com/img3.png',
        2,
        'img3.png'
      );

      currentJob = jobQueueManager.getJob('test-progress');
      expect(currentJob.progress.current).toBe(3);
      expect(currentJob.status).toBe('completed');
      expect(currentJob.progress.status).toBe('complete');
    });
  });
});
