/**
 * Types Tests for NovelAI Auto Generator
 */

import { describe, it, expect } from 'vitest';
import type {
  PromptSegments,
  StartGenerationMessage,
  ApplyPromptMessage,
  GenerationParameters,
  GenerationSettings,
} from './types';

describe('Types', () => {
  describe('PromptSegments', () => {
    it('should accept valid PromptSegments with all fields', () => {
      const prompt: PromptSegments = {
        positive: '1girl, solo, beautiful',
        negative: 'lowres, bad anatomy, bad hands',
        selectorProfile: 'character-anime',
      };

      expect(prompt.positive).toBe('1girl, solo, beautiful');
      expect(prompt.negative).toBe('lowres, bad anatomy, bad hands');
      expect(prompt.selectorProfile).toBe('character-anime');
    });

    it('should accept PromptSegments with only positive field', () => {
      const prompt: PromptSegments = {
        positive: '1girl, solo, beautiful',
      };

      expect(prompt.positive).toBe('1girl, solo, beautiful');
      expect(prompt.negative).toBeUndefined();
      expect(prompt.selectorProfile).toBeUndefined();
    });

    it('should accept PromptSegments with positive and negative fields', () => {
      const prompt: PromptSegments = {
        positive: '1girl, solo, beautiful',
        negative: 'lowres, bad anatomy',
      };

      expect(prompt.positive).toBe('1girl, solo, beautiful');
      expect(prompt.negative).toBe('lowres, bad anatomy');
      expect(prompt.selectorProfile).toBeUndefined();
    });
  });

  describe('StartGenerationMessage', () => {
    it('should accept valid StartGenerationMessage', () => {
      const message: StartGenerationMessage = {
        type: 'START_GENERATION',
        prompt: {
          positive: '1girl, solo, beautiful',
          negative: 'lowres, bad anatomy',
          selectorProfile: 'character-anime',
        },
        parameters: {
          seed: 42,
          count: 5,
        },
        settings: {
          imageCount: 5,
          seed: 42,
          filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
        },
      };

      expect(message.type).toBe('START_GENERATION');
      expect(message.prompt.positive).toBe('1girl, solo, beautiful');
      expect(message.prompt.negative).toBe('lowres, bad anatomy');
      expect(message.prompt.selectorProfile).toBe('character-anime');
      expect(message.parameters.seed).toBe(42);
      expect(message.parameters.count).toBe(5);
      expect(message.settings.imageCount).toBe(5);
    });
  });

  describe('ApplyPromptMessage', () => {
    it('should accept valid ApplyPromptMessage', () => {
      const message: ApplyPromptMessage = {
        type: 'APPLY_PROMPT',
        prompt: {
          positive: '1girl, solo, beautiful',
          negative: 'lowres, bad anatomy',
          selectorProfile: 'character-anime',
        },
        parameters: {
          seed: 42,
          count: 1,
        },
      };

      expect(message.type).toBe('APPLY_PROMPT');
      expect(message.prompt.positive).toBe('1girl, solo, beautiful');
      expect(message.prompt.negative).toBe('lowres, bad anatomy');
      expect(message.prompt.selectorProfile).toBe('character-anime');
      expect(message.parameters.seed).toBe(42);
      expect(message.parameters.count).toBe(1);
    });
  });

  describe('GenerationParameters', () => {
    it('should accept valid GenerationParameters', () => {
      const params: GenerationParameters = {
        seed: 42,
        count: 5,
      };

      expect(params.seed).toBe(42);
      expect(params.count).toBe(5);
    });
  });

  describe('GenerationSettings', () => {
    it('should accept valid GenerationSettings', () => {
      const settings: GenerationSettings = {
        imageCount: 5,
        seed: 42,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
      };

      expect(settings.imageCount).toBe(5);
      expect(settings.seed).toBe(42);
      expect(settings.filenameTemplate).toBe('{date}_{prompt}_{seed}_{idx}');
    });
  });
});
