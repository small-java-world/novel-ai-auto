import { describe, it, expect } from 'vitest';
import { MetadataManager } from './metadata-manager';
import type { PromptFileV1, LegacyPromptFile, PresetV1, MetadataV1 } from '../types/metadata';

describe('MetadataManager (coverage)', () => {
  const mm = new MetadataManager();

  const preset: PresetV1 = {
    id: 'p1',
    name: 'プリセット1',
    description: '説明',
    positive: '1girl, anime style',
    negative: 'bad hands',
    parameters: { steps: 28, cfgScale: 7, sampler: 'euler_a' },
    tags: ['anime', 'girl', 'anime'],
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  };

  const file: PromptFileV1 = {
    version: '1.0',
    metadata: { name: 'セット', description: 'desc' },
    presets: [preset],
  } as any;

  const legacy: LegacyPromptFile = {
    presets: [{ id: 'l1', name: '旧', positive: 'old prompt', parameters: { steps: 20 } }],
  };

  it('loads and normalizes a v1 file', async () => {
    const res = await mm.loadPromptFile(file);
    expect(res.version).toBe('1.0');
    expect(res.presets.length).toBe(1);
  });

  it('edits/saves metadata and handles unicode/limits', async () => {
    const md: MetadataV1 = { name: '名', description: '解説' };
    await mm.displayMetadata(md);
    const edited = await mm.editMetadata(md, { name: '更新' });
    expect(edited.name).toBe('更新');
    const saved = await mm.saveMetadata(edited);
    expect(saved).toBe(true);

    const unicode = await mm.normalizeUnicode({ ...md, name: 'テストB' } as any);
    expect(typeof unicode.name).toBe('string');

    const limits = await mm.checkCharacterLimits({ ...md, description: 'x'.repeat(10) });
    expect(limits.valid).toBe(true);
  });

  it('compatibility, conversion, versions', async () => {
    const compat = await mm.checkCompatibility(legacy);
    expect(compat).toBe(true);
    const conv = await mm.convertFromLegacy(legacy);
    expect(conv.success).toBe(true);
    const auto = await mm.autoConvert(legacy);
    expect(auto.success).toBe(true);
    const v = await mm.getVersion(file);
    expect(v).toBe('1.0');
    const cv = await mm.convertVersion(file, '1.0');
    expect(cv.success).toBe(true);
  });

  it('tags, filtering, search', async () => {
    const tags = await mm.extractTags([preset]);
    expect(tags).toContain('anime');
    const filtered = await mm.filterByTags([preset], ['girl']);
    expect(filtered.length).toBe(1);
    const dedup = await mm.removeDuplicateTags(preset);
    expect(dedup.tags?.length).toBe(2);

    const search = await mm.searchByMetadata({ text: 'プリセット' }, [preset]);
    expect(search.matchCount).toBeGreaterThanOrEqual(0);
    const filtered2 = await mm.filterPresets([preset], { tags: ['anime'] });
    expect(filtered2.filteredPresets.length).toBe(1);
  });

  it('validation, schema, size, repair, encoding, perf', async () => {
    const valid = await mm.validateMetadata({ name: 'A' } as any);
    expect(valid.valid).toBe(true);
    const schema = await mm.validateSchema(file);
    expect(schema.valid).toBe(true);
    const size = await mm.checkSizeLimits({ name: 'A' } as any);
    expect(size.valid).toBe(true);
    const repaired = await mm.repairVersionInfo({ presets: [] } as any);
    expect(repaired.version).toBe('1.0');
    const enc = await mm.handleEncoding(file, { encoding: 'utf-8' } as any);
    expect(enc.version).toBe('1.0');
    const perf = await mm.measurePerformance(() => mm.validateMetadata({ name: 'B' } as any));
    expect(perf.itemsProcessed).toBe(1);
  });

  it('loadMetadata and processData', async () => {
    const md = await mm.loadMetadata(file);
    expect(md).toBeDefined();
    const processed = await mm.processData(file);
    expect(processed.metadata.modified).toBeDefined();
  });
});
