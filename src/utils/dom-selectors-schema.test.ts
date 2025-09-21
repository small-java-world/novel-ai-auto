/**
 * DOM Selectors Schema Validation and Detection Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface SelectorProfile {
  detect?: string[];
  selectors: Record<string, (string | { scope: string; selectors: string[] })[]>;
}

interface DOMSelectorsConfig {
  profiles: Record<string, SelectorProfile>;
}

// Schema validation functions
export function validateDOMSelectorsSchema(config: unknown): config is DOMSelectorsConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const obj = config as Record<string, unknown>;

  if (!obj.profiles || typeof obj.profiles !== 'object') {
    return false;
  }

  const profiles = obj.profiles as Record<string, unknown>;

  for (const [profileName, profile] of Object.entries(profiles)) {
    if (!profile || typeof profile !== 'object') {
      return false;
    }

    const profileObj = profile as Record<string, unknown>;

    // Validate detect array (optional)
    if (profileObj.detect !== undefined) {
      if (!Array.isArray(profileObj.detect)) {
        return false;
      }
      for (const detector of profileObj.detect) {
        if (typeof detector !== 'string') {
          return false;
        }
      }
    }

    // Validate selectors object (required)
    if (!profileObj.selectors || typeof profileObj.selectors !== 'object') {
      return false;
    }

    const selectors = profileObj.selectors as Record<string, unknown>;
    for (const [elementType, selectorList] of Object.entries(selectors)) {
      if (!Array.isArray(selectorList)) {
        return false;
      }

      for (const selector of selectorList) {
        if (typeof selector === 'string') {
          continue; // Valid string selector
        }

        if (selector && typeof selector === 'object') {
          const selectorObj = selector as Record<string, unknown>;
          if (
            typeof selectorObj.scope === 'string' &&
            Array.isArray(selectorObj.selectors) &&
            selectorObj.selectors.every((s: unknown) => typeof s === 'string')
          ) {
            continue; // Valid scoped selector
          }
        }

        return false; // Invalid selector format
      }
    }
  }

  return true;
}

export function detectBestProfile(
  config: DOMSelectorsConfig,
  forcedProfile?: string
): string | null {
  const profiles = config.profiles;
  const defaultNames = ['default', '$default', 'common'];

  // Forced profile selection
  if (forcedProfile && profiles[forcedProfile]) {
    return forcedProfile;
  }

  // Try non-default profiles first (detection-based)
  for (const [name, profile] of Object.entries(profiles)) {
    if (defaultNames.includes(name)) continue;

    if (profile.detect && Array.isArray(profile.detect)) {
      for (const selector of profile.detect) {
        try {
          if (document.querySelector(selector)) {
            return name;
          }
        } catch {
          // Invalid selector, continue
        }
      }
    }
  }

  // Fallback to default profile
  return defaultNames.find((name) => profiles[name]) || Object.keys(profiles)[0] || null;
}

export function validateElementSelectors(
  selectors: (string | { scope: string; selectors: string[] })[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (let i = 0; i < selectors.length; i++) {
    const selector = selectors[i];

    if (typeof selector === 'string') {
      if (selector.trim().length === 0) {
        errors.push(`Empty selector at index ${i}`);
        continue;
      }

      try {
        document.querySelector(selector);
      } catch (error) {
        errors.push(`Invalid CSS selector at index ${i}: "${selector}"`);
      }
    } else if (selector && typeof selector === 'object') {
      const scopedSelector = selector as { scope: string; selectors: string[] };

      if (typeof scopedSelector.scope !== 'string' || scopedSelector.scope.trim().length === 0) {
        errors.push(`Invalid scope at index ${i}: must be non-empty string`);
        continue;
      }

      if (!Array.isArray(scopedSelector.selectors)) {
        errors.push(`Invalid selectors array at index ${i}: must be array`);
        continue;
      }

      for (let j = 0; j < scopedSelector.selectors.length; j++) {
        const subSelector = scopedSelector.selectors[j];
        if (typeof subSelector !== 'string' || subSelector.trim().length === 0) {
          errors.push(`Invalid sub-selector at index ${i}.${j}: must be non-empty string`);
          continue;
        }

        try {
          document.querySelector(`${scopedSelector.scope} ${subSelector}`);
        } catch (error) {
          errors.push(
            `Invalid CSS selector at index ${i}.${j}: "${scopedSelector.scope} ${subSelector}"`
          );
        }
      }
    } else {
      errors.push(`Invalid selector format at index ${i}: must be string or scoped object`);
    }
  }

  return { valid: errors.length === 0, errors };
}

describe('DOM Selectors Schema Validation', () => {
  // Mock DOM environment
  beforeEach(() => {
    // Mock document.querySelector
    vi.stubGlobal('document', {
      querySelector: vi.fn((selector: string) => {
        // Simulate successful queries for known selectors
        const knownSelectors = [
          '.novelai-v3',
          '[data-version="3"]',
          '.mobile-ui',
          '[data-style="anime"]',
          'meta[property="og:site_name"][content="NovelAI"]',
          '#__next',
        ];
        return knownSelectors.some((known) =>
          selector.includes(known.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        )
          ? {}
          : null;
      }),
    });
  });

  describe('validateDOMSelectorsSchema', () => {
    it('should validate a correct schema', () => {
      const validConfig = {
        profiles: {
          $default: {
            detect: ['meta[property="og:site_name"][content="NovelAI"]'],
            selectors: {
              'prompt-input': [
                'textarea[role="textbox"]',
                { scope: '.prompt-area', selectors: ['textarea', 'input'] },
              ],
            },
          },
        },
      };

      expect(validateDOMSelectorsSchema(validConfig)).toBe(true);
    });

    it('should reject invalid top-level structure', () => {
      expect(validateDOMSelectorsSchema(null)).toBe(false);
      expect(validateDOMSelectorsSchema(undefined)).toBe(false);
      expect(validateDOMSelectorsSchema('string')).toBe(false);
      expect(validateDOMSelectorsSchema({})).toBe(false);
      expect(validateDOMSelectorsSchema({ profiles: null })).toBe(false);
    });

    it('should reject invalid profile structure', () => {
      const invalidConfigs = [
        { profiles: { profile1: null } },
        { profiles: { profile1: 'string' } },
        { profiles: { profile1: { selectors: null } } },
        { profiles: { profile1: { selectors: 'string' } } },
      ];

      for (const config of invalidConfigs) {
        expect(validateDOMSelectorsSchema(config)).toBe(false);
      }
    });

    it('should reject invalid detect array', () => {
      const invalidConfig = {
        profiles: {
          profile1: {
            detect: ['valid-selector', 123, 'another-valid'],
            selectors: { 'prompt-input': ['textarea'] },
          },
        },
      };

      expect(validateDOMSelectorsSchema(invalidConfig)).toBe(false);
    });

    it('should reject invalid selector formats', () => {
      const invalidConfigs = [
        {
          profiles: {
            profile1: {
              selectors: { 'prompt-input': ['valid', 123] },
            },
          },
        },
        {
          profiles: {
            profile1: {
              selectors: {
                'prompt-input': [{ scope: 123, selectors: ['textarea'] }],
              },
            },
          },
        },
        {
          profiles: {
            profile1: {
              selectors: {
                'prompt-input': [{ scope: '.valid', selectors: 'not-array' }],
              },
            },
          },
        },
      ];

      for (const config of invalidConfigs) {
        expect(validateDOMSelectorsSchema(config)).toBe(false);
      }
    });
  });

  describe('detectBestProfile', () => {
    const sampleConfig: DOMSelectorsConfig = {
      profiles: {
        $default: {
          detect: ['meta[property="og:site_name"][content="NovelAI"]'],
          selectors: { 'prompt-input': ['textarea'] },
        },
        'novelai-v3-ui': {
          detect: ['.novelai-v3', '[data-version="3"]'],
          selectors: { 'prompt-input': ['.v3-prompt textarea'] },
        },
        mobile: {
          detect: ['.mobile-ui'],
          selectors: { 'prompt-input': ['.mobile-prompt textarea'] },
        },
      },
    };

    it('should return forced profile when available', () => {
      const result = detectBestProfile(sampleConfig, 'novelai-v3-ui');
      expect(result).toBe('novelai-v3-ui');
    });

    it('should ignore forced profile when not available', () => {
      const result = detectBestProfile(sampleConfig, 'non-existent');
      expect(result).toBe('$default'); // Should fallback to default
    });

    it('should detect profile based on DOM elements', () => {
      // Mock querySelector to return elements for v3 selectors
      vi.mocked(document.querySelector).mockImplementation((selector: string) => {
        if (selector === '.novelai-v3') return {} as Element;
        return null;
      });

      const result = detectBestProfile(sampleConfig);
      expect(result).toBe('novelai-v3-ui');
    });

    it('should fallback to default profile when no detection matches', () => {
      // Mock querySelector to return null for all selectors
      vi.mocked(document.querySelector).mockReturnValue(null);

      const result = detectBestProfile(sampleConfig);
      expect(result).toBe('$default');
    });

    it('should return first profile when no default exists', () => {
      const configWithoutDefault: DOMSelectorsConfig = {
        profiles: {
          custom1: { selectors: { 'prompt-input': ['textarea'] } },
          custom2: { selectors: { 'prompt-input': ['input'] } },
        },
      };

      const result = detectBestProfile(configWithoutDefault);
      expect(result).toBe('custom1');
    });
  });

  describe('validateElementSelectors', () => {
    it('should validate correct string selectors', () => {
      const selectors = ['textarea', 'input[type="text"]', '.prompt-input'];
      const result = validateElementSelectors(selectors);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct scoped selectors', () => {
      const selectors = ['textarea', { scope: '.prompt-area', selectors: ['textarea', 'input'] }];
      const result = validateElementSelectors(selectors);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty string selectors', () => {
      const selectors = ['textarea', '', 'input'];
      const result = validateElementSelectors(selectors);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Empty selector at index 1');
    });

    it('should detect invalid CSS selectors', () => {
      vi.mocked(document.querySelector).mockImplementation((selector: string) => {
        if (selector === '###invalid') throw new Error('Invalid CSS');
        return null;
      });

      const selectors = ['textarea', '###invalid'];
      const result = validateElementSelectors(selectors);

      expect(result.valid).toBe(false);
      expect(result.errors.some((err) => err.includes('Invalid CSS selector'))).toBe(true);
    });

    it('should detect invalid scoped selector structure', () => {
      const selectors = [
        'textarea',
        { scope: '', selectors: ['input'] }, // Empty scope
        { scope: '.valid', selectors: 'not-array' }, // Invalid selectors
        { scope: '.valid', selectors: ['', 'input'] }, // Empty sub-selector
      ];
      const result = validateElementSelectors(selectors);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect completely invalid selector formats', () => {
      const selectors = [
        'textarea',
        123, // Invalid type
        null, // Invalid type
        { invalidProperty: 'value' }, // Invalid object structure
      ] as any;

      const result = validateElementSelectors(selectors);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Real DOM Selectors Config Integration', () => {
    it('should validate the actual config file structure', async () => {
      // This would normally load the actual config file
      // For testing, we'll use a sample that matches the real structure
      const realConfigSample = {
        profiles: {
          $default: {
            detect: ['meta[property="og:site_name"][content="NovelAI"]', '#__next'],
            selectors: {
              'prompt-input': [
                '[role="textbox"][contenteditable="true"]',
                'div[contenteditable="true"][role="textbox"]',
                '#__next textarea',
              ],
              'negative-input': [
                '#__next textarea[placeholder*="negative" i]',
                '[role="textbox"][contenteditable="true"][data-negative="true"]',
              ],
              'generate-button': ['#__next button[type="submit"]', 'button[title*="generate" i]'],
            },
          },
          'novelai-mobile': {
            detect: ['.mobile-ui', '[data-view="mobile"]'],
            selectors: {
              'prompt-input': ['.mobile-prompt textarea'],
              'generate-button': ['.mobile-generate-btn'],
            },
          },
        },
      };

      const isValid = validateDOMSelectorsSchema(realConfigSample);
      expect(isValid).toBe(true);
    });

    it('should handle profile detection for various UI types', () => {
      const testCases = [
        {
          name: 'NovelAI V3 UI',
          mockSelectors: ['.novelai-v3'],
          expectedProfile: 'novelai-v3-ui',
        },
        {
          name: 'Mobile UI',
          mockSelectors: ['.mobile-ui'],
          expectedProfile: 'mobile',
        },
        {
          name: 'Default fallback',
          mockSelectors: ['meta[property="og:site_name"][content="NovelAI"]'],
          expectedProfile: '$default',
        },
      ];

      const config: DOMSelectorsConfig = {
        profiles: {
          $default: {
            detect: ['meta[property="og:site_name"][content="NovelAI"]'],
            selectors: { 'prompt-input': ['textarea'] },
          },
          'novelai-v3-ui': {
            detect: ['.novelai-v3'],
            selectors: { 'prompt-input': ['.v3-prompt textarea'] },
          },
          mobile: {
            detect: ['.mobile-ui'],
            selectors: { 'prompt-input': ['.mobile-prompt textarea'] },
          },
        },
      };

      for (const testCase of testCases) {
        vi.mocked(document.querySelector).mockImplementation((selector: string) => {
          return testCase.mockSelectors.includes(selector) ? ({} as Element) : null;
        });

        const result = detectBestProfile(config);
        expect(result).toBe(testCase.expectedProfile);
      }
    });
  });
});
