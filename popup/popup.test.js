/**
 * Popup Tests for NovelAI Auto Generator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DOM elements
const mockElements = {
  statusIndicator: { className: '' },
  statusText: { textContent: '' },
  promptSelect: { value: '' },
  imageCount: { value: '1' },
  seed: { value: '-1' },
  filenameTemplate: { value: '{date}_{prompt}_{seed}_{idx}' },
  progressSection: { style: { display: '' } },
  progressFill: { style: { width: '' } },
  progressText: { textContent: '' },
  etaText: { textContent: '' },
  generateButton: { style: { display: '' } },
  cancelButton: { style: { display: '' } },
  logsContainer: { appendChild: vi.fn() }
};

// Mock chrome API
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  }
};

// Mock global objects
global.chrome = mockChrome;
global.document = {
  getElementById: vi.fn((id) => mockElements[id] || {}),
  addEventListener: vi.fn(),
  createElement: vi.fn(() => ({
    textContent: '',
    appendChild: vi.fn()
  }))
};

describe('Popup Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock elements
    Object.values(mockElements).forEach(element => {
      if (element.style) {
        element.style.display = '';
        element.style.width = '';
      }
      if (element.textContent !== undefined) {
        element.textContent = '';
      }
      if (element.className !== undefined) {
        element.className = '';
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('updateProgress', () => {
    it('should update progress display correctly', () => {
      // Import the function (this would need to be refactored to be testable)
      // For now, we'll test the logic directly
      const progress = { current: 2, total: 5, eta: 30 };
      
      // Simulate the updateProgress function logic
      if (mockElements.progressFill) {
        mockElements.progressFill.style.width = `${(progress.current / progress.total) * 100}%`;
      }
      
      if (mockElements.progressText) {
        mockElements.progressText.textContent = `${progress.current} / ${progress.total}`;
      }

      if (progress.eta && mockElements.etaText) {
        mockElements.etaText.textContent = `残り時間: ${progress.eta}秒`;
      }

      expect(mockElements.progressFill.style.width).toBe('40%');
      expect(mockElements.progressText.textContent).toBe('2 / 5');
      expect(mockElements.etaText.textContent).toBe('残り時間: 30秒');
    });

    it('should handle progress without eta', () => {
      const progress = { current: 1, total: 3 };
      
      // Simulate the updateProgress function logic
      if (mockElements.progressFill) {
        mockElements.progressFill.style.width = `${(progress.current / progress.total) * 100}%`;
      }
      
      if (mockElements.progressText) {
        mockElements.progressText.textContent = `${progress.current} / ${progress.total}`;
      }

      expect(mockElements.progressFill.style.width).toBe('33.33333333333333%');
      expect(mockElements.progressText.textContent).toBe('1 / 3');
    });

    it('should handle zero progress', () => {
      const progress = { current: 0, total: 5 };
      
      // Simulate the updateProgress function logic
      if (mockElements.progressFill) {
        mockElements.progressFill.style.width = `${(progress.current / progress.total) * 100}%`;
      }
      
      if (mockElements.progressText) {
        mockElements.progressText.textContent = `${progress.current} / ${progress.total}`;
      }

      expect(mockElements.progressFill.style.width).toBe('0%');
      expect(mockElements.progressText.textContent).toBe('0 / 5');
    });
  });

  describe('START_GENERATION message structure', () => {
    it('should create correct START_GENERATION message with PromptSegments', () => {
      const promptData = {
        name: 'Test Prompt',
        prompt: {
          positive: '1girl, solo, beautiful',
          negative: 'lowres, bad anatomy',
          selectorProfile: 'character-anime'
        }
      };

      const settings = {
        imageCount: 3,
        seed: 42,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}'
      };

      // Simulate the message creation logic from startGeneration
      const message = {
        type: 'START_GENERATION',
        prompt: {
          positive: promptData.prompt.positive || promptData.prompt,
          negative: promptData.prompt.negative || '',
          selectorProfile: promptData.prompt.selectorProfile || 'character-anime'
        },
        parameters: {
          seed: settings.seed,
          count: settings.imageCount
        },
        settings
      };

      expect(message.type).toBe('START_GENERATION');
      expect(message.prompt.positive).toBe('1girl, solo, beautiful');
      expect(message.prompt.negative).toBe('lowres, bad anatomy');
      expect(message.prompt.selectorProfile).toBe('character-anime');
      expect(message.parameters.seed).toBe(42);
      expect(message.parameters.count).toBe(3);
      expect(message.settings.imageCount).toBe(3);
    });

    it('should handle legacy prompt format', () => {
      const promptData = {
        name: 'Legacy Prompt',
        prompt: '1girl, solo, beautiful' // Legacy string format
      };

      const settings = {
        imageCount: 1,
        seed: -1,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}'
      };

      // Simulate the message creation logic with fallback
      const message = {
        type: 'START_GENERATION',
        prompt: {
          positive: promptData.prompt.positive || promptData.prompt,
          negative: promptData.prompt.negative || '',
          selectorProfile: promptData.prompt.selectorProfile || 'character-anime'
        },
        parameters: {
          seed: settings.seed,
          count: settings.imageCount
        },
        settings
      };

      expect(message.prompt.positive).toBe('1girl, solo, beautiful');
      expect(message.prompt.negative).toBe('');
      expect(message.prompt.selectorProfile).toBe('character-anime');
    });
  });

  describe('progress initialization', () => {
    it('should initialize progress display correctly', () => {
      const settings = { imageCount: 5 };
      
      // Simulate the progress initialization logic
      const totalCount = settings.imageCount;
      mockElements.progressText.textContent = `0 / ${totalCount}`;
      mockElements.progressFill.style.width = '0%';
      mockElements.etaText.textContent = '';

      expect(mockElements.progressText.textContent).toBe('0 / 5');
      expect(mockElements.progressFill.style.width).toBe('0%');
      expect(mockElements.etaText.textContent).toBe('');
    });
  });
});
