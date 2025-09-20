/**
 * Integration Manager Tests for NovelAI Auto Generator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationManager } from './integration-manager.js';

describe('IntegrationManager', () => {
  let integrationManager;

  beforeEach(() => {
    integrationManager = new IntegrationManager();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(integrationManager).toBeInstanceOf(IntegrationManager);
    });

    it('should log initialization message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      new IntegrationManager();
      expect(consoleSpy).toHaveBeenCalledWith('IntegrationManager initialized (Simplified Version)');
      consoleSpy.mockRestore();
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const result = await integrationManager.initialize();
      expect(result).toEqual({ success: true });
    });

    it('should log initialization message', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await integrationManager.initialize();
      expect(consoleSpy).toHaveBeenCalledWith('Integration functionality initialized');
      consoleSpy.mockRestore();
    });
  });

  describe('loadFile', () => {
    it('should load valid JSON file successfully', async () => {
      const mockFile = {
        text: vi.fn().mockResolvedValue('{"presets": [{"id": "test", "name": "Test"}]}')
      };

      const result = await integrationManager.loadFile(mockFile);

      expect(result).toEqual({
        success: true,
        data: { presets: [{ id: 'test', name: 'Test' }] },
        processingTime: 0
      });
    });

    it('should handle invalid JSON file', async () => {
      const mockFile = {
        text: vi.fn().mockResolvedValue('invalid json')
      };

      const result = await integrationManager.loadFile(mockFile);

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Unexpected token'),
        processingTime: 0
      });
    });

    it('should handle file reading error', async () => {
      const mockFile = {
        text: vi.fn().mockRejectedValue(new Error('File read error'))
      };

      const result = await integrationManager.loadFile(mockFile);

      expect(result).toEqual({
        success: false,
        error: 'File read error',
        processingTime: 0
      });
    });
  });

  describe('convertFormat', () => {
    it('should convert format successfully', async () => {
      const mockData = { presets: [{ id: 'test', name: 'Test' }] };
      const options = { autoConvert: true };

      const result = await integrationManager.convertFormat(mockData, options);

      expect(result).toEqual({
        success: true,
        data: mockData,
        processingTime: 0
      });
    });

    it('should handle null data gracefully', async () => {
      const mockData = null;
      const options = { autoConvert: true };

      const result = await integrationManager.convertFormat(mockData, options);

      expect(result).toEqual({
        success: true,
        data: null,
        processingTime: 0
      });
    });
  });
});
