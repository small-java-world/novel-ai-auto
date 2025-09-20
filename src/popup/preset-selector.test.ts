import { describe, it, expect } from 'vitest';
import { PresetSelector } from './preset-selector';

const makeElements = () => {
  return {
    promptSelect: {
      options: [] as Array<{ textContent: string; value: string }>,
      value: '',
    },
  } as const;
};

const makePresets = () => [
  {
    name: 'テスト<プリセット>1',
    prompt: '1girl, anime style',
    parameters: { steps: 20, cfgScale: 7, sampler: 'euler_a', seed: 0, count: 1 },
  },
  {
    name: '風景2',
    prompt: 'landscape, sunset',
    parameters: { steps: 28, cfgScale: 8, sampler: 'dpm_2m', seed: 0, count: 1 },
  },
];

describe('PresetSelector (TASK-041) - basic coverage', () => {
  it('initializes and loads presets, populates options safely', () => {
    const elements = makeElements();
    const selector = new PresetSelector(elements as unknown as Record<string, any>);

    const presets = makePresets() as any;
    selector.loadPresets(presets);

    // default option + 2 presets
    expect(elements.promptSelect.options.length).toBe(3);
    // first preset name should be escaped
    expect(elements.promptSelect.options[1].textContent).toContain('&lt;');
  });

  it('returns selected preset by index value and filters with search term', () => {
    const elements = makeElements();
    const selector = new PresetSelector(elements as unknown as Record<string, any>);
    selector.loadPresets(makePresets() as any);

    // select second preset (index 1 because first option is default)
    elements.promptSelect.value = '1';
    const selected = selector.getSelectedPreset();
    expect(selected?.name).toBe('風景2');

    // filter by keyword
    selector.filterPresets('風景');
    expect(elements.promptSelect.options.length).toBeGreaterThan(1);
  });
});
