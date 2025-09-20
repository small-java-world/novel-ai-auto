import { describe, it, expect } from 'vitest';
import { SettingsValidator } from './validation';
import { DEFAULT_SETTINGS, ERROR_MESSAGES, VALIDATION_CONSTRAINTS } from './types';

describe('SettingsValidator (TASK-042) - coverage', () => {
  it('validates default settings as valid', () => {
    const res = SettingsValidator.validate(DEFAULT_SETTINGS);
    expect(res.isValid).toBe(true);
    expect(Object.keys(res.errors).length).toBe(0);
  });

  it('flags invalid imageCount and filenameTemplate and retry settings', () => {
    const bad = {
      ...DEFAULT_SETTINGS,
      imageCount: 0,
      filenameTemplate: '',
      retrySettings: { maxAttempts: 0, baseDelayMs: 0, factor: 0 },
    };
    const res = SettingsValidator.validate(bad);
    expect(res.isValid).toBe(false);
    expect(res.errors.imageCount).toBe(ERROR_MESSAGES.imageCount.range);
    expect(res.errors.filenameTemplate).toBe(ERROR_MESSAGES.filenameTemplate.required);
    expect(res.errors.maxAttempts).toBe(ERROR_MESSAGES.retrySettings.maxAttempts);
    expect(res.errors.baseDelayMs).toBe(ERROR_MESSAGES.retrySettings.baseDelayMs);
    expect(res.errors.factor).toBe(ERROR_MESSAGES.retrySettings.factor);
  });

  it('requires seedValue when seedMode is fixed and validates range', () => {
    const bad = { ...DEFAULT_SETTINGS, seedMode: 'fixed', seedValue: undefined } as const;
    const res = SettingsValidator.validate(bad);
    expect(res.isValid).toBe(false);
    expect(res.errors.seedValue).toBe(ERROR_MESSAGES.seedValue.required);

    const tooBig = {
      ...DEFAULT_SETTINGS,
      seedMode: 'fixed',
      seedValue: VALIDATION_CONSTRAINTS.seedValue.max + 1,
    } as const;
    const res2 = SettingsValidator.validate(tooBig);
    expect(res2.isValid).toBe(false);
    expect(res2.errors.seedValue).toBe(ERROR_MESSAGES.seedValue.range);
  });
});
