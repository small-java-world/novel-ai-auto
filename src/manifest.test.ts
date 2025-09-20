import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Chrome Manifest (MV3) minimal permissions', () => {
  const manifestPath = path.resolve(process.cwd(), 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as any;

  it('uses Manifest V3', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  it('declares only required permissions', () => {
    expect(Array.isArray(manifest.permissions)).toBe(true);
    const perms: string[] = manifest.permissions ?? [];
    // Required
    expect(perms).toEqual(expect.arrayContaining(['downloads', 'storage', 'tabs']));
    // Not used → should not be present
    expect(perms).not.toEqual(expect.arrayContaining(['scripting', 'activeTab']));
  });

  it('restricts host permissions to NovelAI domain', () => {
    const hosts: string[] = manifest.host_permissions ?? [];
    expect(hosts).toEqual(
      expect.arrayContaining(['https://novelai.net/*', 'https://*.novelai.net/*'])
    );
    // No wildcard hosts
    const hasWildcard = hosts.some((h) => h === '<all_urls>' || h.includes('*://*/*'));
    expect(hasWildcard).toBe(false);
  });

  it('configures background service worker and content scripts correctly', () => {
    expect(manifest.background?.service_worker).toBeTruthy();
    expect(manifest.background?.type).toBe('module');
    expect(Array.isArray(manifest.content_scripts)).toBe(true);
    const cs = manifest.content_scripts?.[0];
    expect(cs?.matches).toEqual(
      expect.arrayContaining(['https://novelai.net/*', 'https://*.novelai.net/*'])
    );
    expect(Array.isArray(cs?.js)).toBe(true);
  });
});
