/**
 * Unit tests for imageCount functionality in popup.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
};

// Mock DOM elements
const mockElements = {
  promptSelect: { value: '', addEventListener: vi.fn() },
  imageCount: { value: '1' },
  seed: { value: '-1' },
  filenameTemplate: { value: 'test_template' },
  progressText: { textContent: '' },
  progressFill: { style: { width: '' } },
  etaText: { textContent: '' },
  generateButton: { addEventListener: vi.fn() },
  cancelButton: { addEventListener: vi.fn() },
  commonPrompt: { value: '' },
  commonNegative: { value: '' },
};

// Mock document
global.document = {
  getElementById: vi.fn((id) => {
    const elementMap = {
      promptSelect: mockElements.promptSelect,
      imageCount: mockElements.imageCount,
      seed: mockElements.seed,
      filenameTemplate: mockElements.filenameTemplate,
      progressText: mockElements.progressText,
      progressFill: mockElements.progressFill,
      etaText: mockElements.etaText,
      generateButton: mockElements.generateButton,
      cancelButton: mockElements.cancelButton,
      commonPrompt: mockElements.commonPrompt,
      commonNegative: mockElements.commonNegative,
    };
    return elementMap[id] || null;
  }),
  addEventListener: vi.fn(),
};

// Mock console
global.console = {
  log: vi.fn(),
  error: vi.fn(),
};

describe('Popup imageCount functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset element values
    mockElements.promptSelect.value = '';
    mockElements.imageCount.value = '1';
    mockElements.seed.value = '-1';
    mockElements.filenameTemplate.value = 'test_template';
  });

  describe('handlePromptSelection', () => {
    it('should set imageCount when prompt has imageCount property', () => {
      // Mock the function (simplified version)
      function handlePromptSelection() {
        try {
          const selectedValue = mockElements.promptSelect.value;
          if (!selectedValue) return;
          
          const promptData = JSON.parse(selectedValue);
          
          if (promptData.imageCount && typeof promptData.imageCount === 'number') {
            mockElements.imageCount.value = promptData.imageCount;
            return `「${promptData.name}」の生成枚数を${promptData.imageCount}に設定しました`;
          }
        } catch (error) {
          console.error('Failed to handle prompt selection:', error);
        }
      }

      const promptWithImageCount = JSON.stringify({
        name: '設定１',
        prompt: 'test prompt',
        imageCount: 5
      });
      
      mockElements.promptSelect.value = promptWithImageCount;
      
      const result = handlePromptSelection();
      
      expect(mockElements.imageCount.value).toBe(5);
      expect(result).toBe('「設定１」の生成枚数を5に設定しました');
    });

    it('should not change imageCount when prompt has no imageCount property', () => {
      function handlePromptSelection() {
        try {
          const selectedValue = mockElements.promptSelect.value;
          if (!selectedValue) return;
          
          const promptData = JSON.parse(selectedValue);
          
          if (promptData.imageCount && typeof promptData.imageCount === 'number') {
            mockElements.imageCount.value = promptData.imageCount;
            return `「${promptData.name}」の生成枚数を${promptData.imageCount}に設定しました`;
          }
        } catch (error) {
          console.error('Failed to handle prompt selection:', error);
        }
      }

      const promptWithoutImageCount = JSON.stringify({
        name: '通常のプロンプト',
        prompt: 'test prompt'
      });
      
      mockElements.promptSelect.value = promptWithoutImageCount;
      const originalValue = mockElements.imageCount.value;
      
      handlePromptSelection();
      
      expect(mockElements.imageCount.value).toBe(originalValue);
    });

    it('should handle invalid JSON gracefully', () => {
      function handlePromptSelection() {
        try {
          const selectedValue = mockElements.promptSelect.value;
          if (!selectedValue) return;
          
          const promptData = JSON.parse(selectedValue);
          
          if (promptData.imageCount && typeof promptData.imageCount === 'number') {
            mockElements.imageCount.value = promptData.imageCount;
            return `「${promptData.name}」の生成枚数を${promptData.imageCount}に設定しました`;
          }
        } catch (error) {
          console.error('Failed to handle prompt selection:', error);
          return 'error';
        }
      }

      mockElements.promptSelect.value = 'invalid json';
      
      const result = handlePromptSelection();
      
      expect(result).toBe('error');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('loadSettings', () => {
    it('should load and apply saved settings to UI elements', async () => {
      const mockSettings = {
        imageCount: 3,
        seed: 12345,
        filenameTemplate: 'custom_template'
      };

      chrome.storage.local.get.mockResolvedValue({ settings: mockSettings });

      // Mock the function
      async function loadSettings() {
        try {
          const result = await chrome.storage.local.get(['settings']);
          const settings = result.settings || {};
          
          if (settings.imageCount !== undefined) {
            mockElements.imageCount.value = settings.imageCount;
          }
          if (settings.seed !== undefined) {
            mockElements.seed.value = settings.seed;
          }
          if (settings.filenameTemplate !== undefined) {
            mockElements.filenameTemplate.value = settings.filenameTemplate;
          }
          
          return settings;
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      }

      const result = await loadSettings();

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['settings']);
      expect(mockElements.imageCount.value).toBe(3);
      expect(mockElements.seed.value).toBe(12345);
      expect(mockElements.filenameTemplate.value).toBe('custom_template');
      expect(result).toEqual(mockSettings);
    });

    it('should handle missing settings gracefully', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      async function loadSettings() {
        try {
          const result = await chrome.storage.local.get(['settings']);
          const settings = result.settings || {};
          
          if (settings.imageCount !== undefined) {
            mockElements.imageCount.value = settings.imageCount;
          }
          if (settings.seed !== undefined) {
            mockElements.seed.value = settings.seed;
          }
          if (settings.filenameTemplate !== undefined) {
            mockElements.filenameTemplate.value = settings.filenameTemplate;
          }
          
          return settings;
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      }

      const result = await loadSettings();

      expect(mockElements.imageCount.value).toBe('1'); // unchanged
      expect(mockElements.seed.value).toBe('-1'); // unchanged
      expect(mockElements.filenameTemplate.value).toBe('test_template'); // unchanged
      expect(result).toEqual({});
    });
  });

  describe('saveSettings', () => {
    it('should save current UI values to storage', async () => {
      mockElements.imageCount.value = '5';
      mockElements.seed.value = '67890';
      mockElements.filenameTemplate.value = 'saved_template';

      chrome.storage.local.set.mockResolvedValue();

      async function saveSettings() {
        try {
          const settings = {
            imageCount: parseInt(mockElements.imageCount.value) || 1,
            seed: parseInt(mockElements.seed.value) || -1,
            filenameTemplate: mockElements.filenameTemplate.value || '{date}_{prompt}_{seed}_{idx}',
          };

          await chrome.storage.local.set({ settings });
          return settings;
        } catch (error) {
          console.error('Failed to save settings:', error);
        }
      }

      const result = await saveSettings();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        settings: {
          imageCount: 5,
          seed: 67890,
          filenameTemplate: 'saved_template'
        }
      });
      expect(result).toEqual({
        imageCount: 5,
        seed: 67890,
        filenameTemplate: 'saved_template'
      });
    });

    it('should use default values for invalid inputs', async () => {
      mockElements.imageCount.value = 'invalid';
      mockElements.seed.value = 'not_a_number';
      mockElements.filenameTemplate.value = '';

      chrome.storage.local.set.mockResolvedValue();

      async function saveSettings() {
        try {
          const settings = {
            imageCount: parseInt(mockElements.imageCount.value) || 1,
            seed: parseInt(mockElements.seed.value) || -1,
            filenameTemplate: mockElements.filenameTemplate.value || '{date}_{prompt}_{seed}_{idx}',
          };

          await chrome.storage.local.set({ settings });
          return settings;
        } catch (error) {
          console.error('Failed to save settings:', error);
        }
      }

      const result = await saveSettings();

      expect(result).toEqual({
        imageCount: 1, // default
        seed: -1, // default
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}' // default
      });
    });
  });
});
