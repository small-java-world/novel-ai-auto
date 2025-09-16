import { readFileSync } from 'fs';
import { join } from 'path';

export type PresetParameters = {
  steps: number;
  cfgScale: number;
  sampler: string;
};

export type Preset = {
  name: string;
  prompt: string;
  negative: string;
  parameters: PresetParameters;
};

export type Presets = Preset[];

export function loadAllowedSamplers(
  filePath = join(process.cwd(), 'config', 'samplers.json')
): Set<string> {
  const raw = readFileSync(filePath, 'utf-8');
  try {
    const parsed = JSON.parse(raw) as { allowedSamplers?: unknown };
    const list = Array.isArray(parsed.allowedSamplers) ? parsed.allowedSamplers : [];
    return new Set(list.filter((x): x is string => typeof x === 'string'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse samplers JSON at ${filePath}: ${msg}`);
  }
}

export type ValidationIssue = {
  path: string;
  message: string;
};

export function validatePresets(
  data: unknown,
  allowedSamplers: Set<string>
): { ok: true; value: Presets } | { ok: false; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(data)) {
    return { ok: false, issues: [{ path: '', message: 'Expected top-level array' }] };
  }

  const seenNames = new Set<string>();
  data.forEach((preset, i) => {
    const base = `[${i}]`;
    if (typeof preset !== 'object' || preset === null) {
      issues.push({ path: base, message: 'Expected object' });
      return;
    }

    // name
    const name = String((preset as any).name ?? '');
    if (name.trim().length === 0) {
      issues.push({ path: `${base}.name`, message: 'Name must be a non-empty string' });
    } else if (name.trim().length > 100) {
      issues.push({ path: `${base}.name`, message: 'Name must be <= 100 chars' });
    } else if (seenNames.has(name.trim())) {
      issues.push({ path: `${base}.name`, message: 'Name must be unique' });
    } else {
      seenNames.add(name.trim());
    }

    // prompt
    const prompt = String((preset as any).prompt ?? '');
    if (prompt.trim().length < 5) {
      issues.push({ path: `${base}.prompt`, message: 'Prompt must be at least 5 chars' });
    } else if (prompt.trim().length > 2000) {
      issues.push({ path: `${base}.prompt`, message: 'Prompt must be <= 2000 chars' });
    }

    // negative
    const negativeVal = (preset as any).negative;
    const negative = negativeVal == null ? '' : String(negativeVal);
    if (negative.trim().length > 2000) {
      issues.push({ path: `${base}.negative`, message: 'Negative must be <= 2000 chars' });
    }

    // parameters
    const params = (preset as any).parameters;
    if (typeof params !== 'object' || params == null) {
      issues.push({ path: `${base}.parameters`, message: 'Parameters must be an object' });
    } else {
      const steps = (params as any).steps;
      const cfgScale = (params as any).cfgScale;
      const sampler = (params as any).sampler;

      if (typeof steps !== 'number' || !Number.isInteger(steps)) {
        issues.push({ path: `${base}.parameters.steps`, message: 'Steps must be an integer' });
      } else if (steps < 1 || steps > 100) {
        issues.push({ path: `${base}.parameters.steps`, message: 'Steps must be within 1..100' });
      }

      if (typeof cfgScale !== 'number' || !Number.isFinite(cfgScale)) {
        issues.push({ path: `${base}.parameters.cfgScale`, message: 'cfgScale must be a number' });
      } else if (cfgScale < 1 || cfgScale > 30) {
        issues.push({
          path: `${base}.parameters.cfgScale`,
          message: 'cfgScale must be within 1..30',
        });
      }

      if (typeof sampler !== 'string' || sampler.trim().length === 0) {
        issues.push({
          path: `${base}.parameters.sampler`,
          message: 'Sampler must be a non-empty string',
        });
      } else if (!allowedSamplers.has(sampler)) {
        issues.push({
          path: `${base}.parameters.sampler`,
          message: `Sampler '${sampler}' is not allowed`,
        });
      }
    }
  });

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: data as Presets };
}

export function loadPresetsFromFile(
  filePath = join(process.cwd(), 'config', 'prompts.json')
): Presets {
  const raw = readFileSync(filePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse JSON at ${filePath}: ${msg}`);
  }

  const allowed = loadAllowedSamplers();
  const result = validatePresets(parsed, allowed);
  if (!result.ok) {
    // Build descriptive error
    const errorResult = result as { ok: false; issues: ValidationIssue[] };
    const details = errorResult.issues
      .map((i: ValidationIssue) => `${i.path}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid presets in ${filePath}:\n${details}`);
  }
  return result.value;
}
