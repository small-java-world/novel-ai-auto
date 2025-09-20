import { describe, it, expect } from 'vitest';
import { PromptSynthesizer } from './promptSynthesizer';

describe('PromptSynthesizer (TASK-101) - unit coverage', () => {
  const synthesizer = new PromptSynthesizer();

  const common = { base: 'masterpiece, best quality', negative: 'lowres' };
  const preset = { positive: '1girl, anime style', negative: 'bad hands' };

  it('synthesizes with default (common-first) rule', () => {
    const result = synthesizer.synthesize(common, preset);
    expect(result.positive).toContain('masterpiece');
    expect(result.positive).toContain('1girl');
    expect(result.negative).toContain('lowres');
    expect(result.negative).toContain('bad hands');
    expect(result.appliedRule.id).toBe('default');
  });

  it('synthesizes with preset-first rule', () => {
    const result = synthesizer.synthesize(common, preset, 'preset-first');
    // first part should include preset prompt before common
    const idxPreset = result.positive.indexOf('1girl');
    const idxCommon = result.positive.indexOf('masterpiece');
    expect(idxPreset).toBeGreaterThanOrEqual(0);
    expect(idxCommon).toBeGreaterThan(idxPreset);
    expect(result.appliedRule.id).toBe('preset-first');
  });

  it('synthesizes with custom rule', () => {
    const result = synthesizer.synthesize(common, preset, 'custom');
    expect(result.positive).toContain('masterpiece');
    expect(result.positive).toContain('1girl');
    expect(result.appliedRule.id).toBe('custom');
    expect(typeof result.characterCount.total).toBe('number');
  });
});
