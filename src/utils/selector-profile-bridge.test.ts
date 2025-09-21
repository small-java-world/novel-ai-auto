/**
 * Selector Profile Bridge Tests
 * Tests for ensuring selectorProfile is properly bridged from popup to content script
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    getURL: vi.fn(),
  },
  tabs: {
    sendMessage: vi.fn(),
    query: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

(globalThis as any).chrome = mockChrome;

// Mock the actual background script logic for selectorProfile handling
const handleStartGeneration = async (message: any, sender: any, sendResponse: any) => {
  try {
    // Simulate the background script logic with proper selectorProfile filtering
    const tab = { id: 123 };

    // Prepare the message for content script (mirroring background.ts logic)
    const csMessage: any = {
      type: 'APPLY_PROMPT',
      prompt: message.prompt,
      parameters: message.parameters,
    };

    // Only forward selectorProfile if it's a valid, non-auto profile
    if (
      typeof message.selectorProfile === 'string' &&
      message.selectorProfile.trim().length > 0 &&
      message.selectorProfile !== 'auto'
    ) {
      csMessage.selectorProfile = message.selectorProfile;
    }

    await mockChrome.tabs.sendMessage(tab.id, csMessage);
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

describe('Selector Profile Bridge Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });
  });

  describe('selectorProfile transmission to content script', () => {
    it('should transmit specific profile when selected', async () => {
      const message = {
        type: 'START_GENERATION',
        prompt: { positive: 'test prompt' },
        parameters: { steps: 28 },
        selectorProfile: 'character-anime',
      };

      const sendResponse = vi.fn();
      await handleStartGeneration(message, {}, sendResponse);

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          type: 'APPLY_PROMPT',
          selectorProfile: 'character-anime',
        })
      );
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('should NOT transmit selectorProfile when "auto" is selected', async () => {
      const message = {
        type: 'START_GENERATION',
        prompt: { positive: 'test prompt' },
        parameters: { steps: 28 },
        selectorProfile: 'auto',
      };

      const sendResponse = vi.fn();
      await handleStartGeneration(message, {}, sendResponse);

      // When selectorProfile is 'auto', it should not be included in the message
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          type: 'APPLY_PROMPT',
          prompt: message.prompt,
          parameters: message.parameters,
        })
      );

      // Verify selectorProfile is NOT included in the sent message
      const sentMessage = mockChrome.tabs.sendMessage.mock.calls[0][1];
      expect(sentMessage).not.toHaveProperty('selectorProfile');
    });

    it('should NOT transmit selectorProfile when empty string', async () => {
      const message = {
        type: 'START_GENERATION',
        prompt: { positive: 'test prompt' },
        parameters: { steps: 28 },
        selectorProfile: '',
      };

      const sendResponse = vi.fn();
      await handleStartGeneration(message, {}, sendResponse);

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          type: 'APPLY_PROMPT',
          prompt: message.prompt,
          parameters: message.parameters,
        })
      );

      // Verify selectorProfile is NOT included in the sent message
      const sentMessage = mockChrome.tabs.sendMessage.mock.calls[0][1];
      expect(sentMessage).not.toHaveProperty('selectorProfile');
    });

    it('should NOT transmit selectorProfile when undefined', async () => {
      const message = {
        type: 'START_GENERATION',
        prompt: { positive: 'test prompt' },
        parameters: { steps: 28 },
        // No selectorProfile property
      };

      const sendResponse = vi.fn();
      await handleStartGeneration(message, {}, sendResponse);

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          type: 'APPLY_PROMPT',
          prompt: message.prompt,
          parameters: message.parameters,
        })
      );

      // Verify selectorProfile is NOT included in the sent message
      const sentMessage = mockChrome.tabs.sendMessage.mock.calls[0][1];
      expect(sentMessage).not.toHaveProperty('selectorProfile');
    });

    it('should transmit valid profile names', async () => {
      const validProfiles = [
        'character-anime',
        'character-realistic',
        'character-fantasy',
        'character-sci-fi',
        'character-horror',
        'novelai-mobile',
        'novelai-v3-ui',
        'novelai-nai-diffusion',
        'novelai-image-2-image',
        'novelai-inpainting',
      ];

      for (const profile of validProfiles) {
        vi.clearAllMocks();

        const message = {
          type: 'START_GENERATION',
          prompt: { positive: 'test prompt' },
          parameters: { steps: 28 },
          selectorProfile: profile,
        };

        const sendResponse = vi.fn();
        await handleStartGeneration(message, {}, sendResponse);

        expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
          123,
          expect.objectContaining({
            type: 'APPLY_PROMPT',
            selectorProfile: profile,
          })
        );
      }
    });

    it('should handle transmission failure gracefully', async () => {
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Tab not found'));

      const message = {
        type: 'START_GENERATION',
        prompt: { positive: 'test prompt' },
        parameters: { steps: 28 },
        selectorProfile: 'character-anime',
      };

      const sendResponse = vi.fn();
      await handleStartGeneration(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Tab not found',
      });
    });
  });

  describe('popup selectorProfile selection logic', () => {
    it('should detect profile from prompt data when single profile', () => {
      const promptData = {
        characters: [
          { selectorProfile: 'character-anime' },
          { selectorProfile: 'character-anime' },
        ],
      };

      // Mock the popup logic
      const detectProfileFromPrompt = (data: any) => {
        if (Array.isArray(data.characters) && data.characters.length > 0) {
          const profiles = data.characters
            .map((c: any) => c?.selectorProfile)
            .filter((v: any) => typeof v === 'string');
          const unique = Array.from(new Set(profiles));
          return unique.length === 1 ? unique[0] : null;
        }
        return null;
      };

      const detected = detectProfileFromPrompt(promptData);
      expect(detected).toBe('character-anime');
    });

    it('should NOT auto-detect when multiple different profiles', () => {
      const promptData = {
        characters: [
          { selectorProfile: 'character-anime' },
          { selectorProfile: 'character-realistic' },
        ],
      };

      const detectProfileFromPrompt = (data: any) => {
        if (Array.isArray(data.characters) && data.characters.length > 0) {
          const profiles = data.characters
            .map((c: any) => c?.selectorProfile)
            .filter((v: any) => typeof v === 'string');
          const unique = Array.from(new Set(profiles));
          return unique.length === 1 ? unique[0] : null;
        }
        return null;
      };

      const detected = detectProfileFromPrompt(promptData);
      expect(detected).toBeNull();
    });

    it('should detect from single prompt.selectorProfile', () => {
      const promptData = {
        prompt: {
          selectorProfile: 'character-fantasy',
        },
      };

      const detectProfileFromPrompt = (data: any) => {
        if (data?.prompt?.selectorProfile && typeof data.prompt.selectorProfile === 'string') {
          return data.prompt.selectorProfile;
        }
        return null;
      };

      const detected = detectProfileFromPrompt(promptData);
      expect(detected).toBe('character-fantasy');
    });
  });

  describe('content script profile application', () => {
    it('should apply forced profile when provided', () => {
      let currentForcedProfile: string | null = null;

      const setForcedSelectorProfile = (profileName: string | null) => {
        if (typeof profileName === 'string' && profileName.trim().length > 0) {
          currentForcedProfile = profileName.trim();
        } else {
          currentForcedProfile = null;
        }
      };

      // Test valid profile
      setForcedSelectorProfile('character-anime');
      expect(currentForcedProfile).toBe('character-anime');

      // Test empty string
      setForcedSelectorProfile('');
      expect(currentForcedProfile).toBeNull();

      // Test null
      setForcedSelectorProfile(null);
      expect(currentForcedProfile).toBeNull();

      // Test undefined
      setForcedSelectorProfile(undefined as any);
      expect(currentForcedProfile).toBeNull();

      // Test whitespace only
      setForcedSelectorProfile('   ');
      expect(currentForcedProfile).toBeNull();
    });

    it('should prioritize forced profile over auto-detection', () => {
      let currentForcedProfile: string | null = null;

      const setForcedSelectorProfile = (profileName: string | null) => {
        if (typeof profileName === 'string' && profileName.trim().length > 0) {
          currentForcedProfile = profileName.trim();
        } else {
          currentForcedProfile = null;
        }
      };

      const selectProfile = (forcedProfile: string | null, autoDetected: string | null) => {
        if (forcedProfile) return forcedProfile;
        return autoDetected;
      };

      setForcedSelectorProfile('character-realistic');
      const selected = selectProfile(currentForcedProfile, 'character-anime');
      expect(selected).toBe('character-realistic');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed selectorProfile gracefully', async () => {
      const malformedCases = [
        { selectorProfile: 123 },
        { selectorProfile: {} },
        { selectorProfile: [] },
        { selectorProfile: true },
      ];

      for (const testCase of malformedCases) {
        vi.clearAllMocks();

        const message = {
          type: 'START_GENERATION',
          prompt: { positive: 'test prompt' },
          parameters: { steps: 28 },
          ...testCase,
        };

        const sendResponse = vi.fn();
        await handleStartGeneration(message, {}, sendResponse);

        // Should not transmit malformed profile
        expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
          123,
          expect.objectContaining({
            type: 'APPLY_PROMPT',
            prompt: message.prompt,
            parameters: message.parameters,
          })
        );

        // Verify selectorProfile is NOT included in the sent message
        const sentMessage = mockChrome.tabs.sendMessage.mock.calls[0][1];
        expect(sentMessage).not.toHaveProperty('selectorProfile');
      }
    });

    it('should handle very long profile names', async () => {
      const longProfileName = 'a'.repeat(1000);

      const message = {
        type: 'START_GENERATION',
        prompt: { positive: 'test prompt' },
        parameters: { steps: 28 },
        selectorProfile: longProfileName,
      };

      const sendResponse = vi.fn();
      await handleStartGeneration(message, {}, sendResponse);

      // Should still transmit (content script will validate)
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          type: 'APPLY_PROMPT',
          selectorProfile: longProfileName,
        })
      );
    });

    it('should handle special characters in profile names', async () => {
      const specialProfileName = 'profile-with-special_chars123';

      const message = {
        type: 'START_GENERATION',
        prompt: { positive: 'test prompt' },
        parameters: { steps: 28 },
        selectorProfile: specialProfileName,
      };

      const sendResponse = vi.fn();
      await handleStartGeneration(message, {}, sendResponse);

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          type: 'APPLY_PROMPT',
          selectorProfile: specialProfileName,
        })
      );
    });
  });
});
