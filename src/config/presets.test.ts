import { describe, expect, it } from 'vitest';
import { loadPresetsFromFile, validatePresets, loadAllowedSamplers, type Presets } from './presets';
import { join } from 'path';

describe('presets runtime validation', () => {
  it('loadPresetsFromFile loads and validates the real config', () => {
    const file = join(process.cwd(), 'config', 'prompts.json');
    const presets = loadPresetsFromFile(file);
    expect(Array.isArray(presets)).toBe(true);
    expect(presets.length).toBeGreaterThan(0);
  });

  it('validatePresets rejects invalid shapes with useful messages', () => {
    const allowed = loadAllowedSamplers();
    const invalid: unknown = [
      {
        name: '', // invalid empty
        prompt: 'abc', // too short
        negative: 'x'.repeat(3000), // too long
        parameters: { steps: 0, cfgScale: 1000, sampler: 'unknown' }, // out-of-range
      },
      {
        name: 'dup',
        prompt: 'valid prompt that is long enough',
        negative: '',
        parameters: { steps: 10, cfgScale: 7, sampler: 'euler_a' },
      },
      {
        name: 'dup', // duplicate name
        prompt: 'another valid prompt that is long enough',
        negative: '',
        parameters: { steps: 15.5, cfgScale: -1, sampler: '' }, // bad types/values
      },
    ];

    const res = validatePresets(invalid, allowed);
    expect(res.ok).toBe(false);
    if (res.ok === false) {
      const msgs = res.issues.map((i) => `${i.path}: ${i.message}`).join('\n');
      expect(msgs).toMatch(/\[0\]\.name/);
      expect(msgs).toMatch(/\[0\]\.prompt/);
      expect(msgs).toMatch(/\[0\]\.negative/);
      expect(msgs).toMatch(/\[0\]\.parameters\.steps/);
      expect(msgs).toMatch(/\[0\]\.parameters\.cfgScale/);
      expect(msgs).toMatch(/\[0\]\.parameters\.sampler/);
      expect(msgs).toMatch(/\[2\]\.name/); // duplicate name
    }
  });

  it('validatePresets accepts a minimal valid config', () => {
    const allowed = loadAllowedSamplers();
    const valid: Presets = [
      {
        name: 'example',
        prompt: 'a sufficiently long prompt',
        negative: '',
        parameters: { steps: 20, cfgScale: 7, sampler: 'euler_a' },
      },
    ];
    const res = validatePresets(valid, allowed);
    expect(res.ok).toBe(true);
  });
});
