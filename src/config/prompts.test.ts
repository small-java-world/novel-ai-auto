import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('config/prompts.json', () => {
  const jsonPath = join(process.cwd(), 'config', 'prompts.json');
  const raw = readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);

  // Load allowlist from config so tests match runtime
  const samplersPath = join(process.cwd(), 'config', 'samplers.json');
  const samplersRaw = readFileSync(samplersPath, 'utf-8');
  const samplersParsed = JSON.parse(samplersRaw) as { allowedSamplers: string[] };
  const ALLOWED_SAMPLERS = new Set(samplersParsed.allowedSamplers);

  it('is an array with at least one preset', () => {
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('each preset has required keys with correct types and reasonable bounds', () => {
    const seenNames = new Set<string>();

    for (const preset of data) {
      // name
      expect(typeof preset.name).toBe('string');
      const name = preset.name.trim();
      expect(name.length).toBeGreaterThan(0);
      expect(name.length).toBeLessThanOrEqual(100);
      expect(seenNames.has(name)).toBe(false);
      seenNames.add(name);

      // prompt
      expect(typeof preset.prompt).toBe('string');
      const prompt = preset.prompt.trim();
      expect(prompt.length).toBeGreaterThanOrEqual(5);
      expect(prompt.length).toBeLessThanOrEqual(2000);

      // negative
      expect(typeof preset.negative).toBe('string');
      const negative = preset.negative.trim();
      // allow empty but not absurdly long
      expect(negative.length).toBeLessThanOrEqual(2000);

      // parameters
      expect(preset.parameters && typeof preset.parameters).toBe('object');
      const params = preset.parameters as Record<string, unknown>;

      // steps: integer 1..100
      expect(typeof params.steps).toBe('number');
      expect(Number.isInteger(params.steps as number)).toBe(true);
      expect(params.steps as number).toBeGreaterThanOrEqual(1);
      expect(params.steps as number).toBeLessThanOrEqual(100);

      // cfgScale: number 1..30
      expect(typeof params.cfgScale).toBe('number');
      expect(Number.isFinite(params.cfgScale as number)).toBe(true);
      expect(params.cfgScale as number).toBeGreaterThanOrEqual(1);
      expect(params.cfgScale as number).toBeLessThanOrEqual(30);

      // sampler: in allowlist
      expect(typeof params.sampler).toBe('string');
      const sampler = String(params.sampler);
      expect(ALLOWED_SAMPLERS.has(sampler)).toBe(true);
    }
  });
});
