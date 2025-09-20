import { describe, it, expect, vi } from 'vitest';
import { SettingsStorageAdapter } from './storage-adapter';
import { DEFAULT_SETTINGS } from './types';

describe('SettingsStorageAdapter (TASK-042) - coverage', () => {
  it('saves and loads settings via chrome.storage', async () => {
    const saved: any = {};
    // mock chrome.storage.local
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).chrome.storage.local.set.mockImplementation(async (obj: any) => {
      Object.assign(saved, obj);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).chrome.storage.local.get.mockImplementation(async () => saved);

    const res = await SettingsStorageAdapter.saveSettings(DEFAULT_SETTINGS);
    expect(res.storageStatus).toBe('success');

    const loaded = await SettingsStorageAdapter.loadSettings();
    expect(loaded?.imageCount).toBe(DEFAULT_SETTINGS.imageCount);
  });

  it('handles storage errors gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).chrome.storage.local.set.mockImplementation(async () => {
      throw new Error('quota');
    });

    const res = await SettingsStorageAdapter.saveSettings(DEFAULT_SETTINGS);
    expect(res.storageStatus).toBe('error');
    expect(res.errorMessage).toBeDefined();
  });
});
