import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadLocalPromptFile,
  loadLocalPromptFileWithSelector,
  validateFileSize,
  validatePromptData,
  isSupportedFileExtension,
} from './local-file-selector';

function mockFileReaderSuccess() {
  // Minimal FileReader mock that resolves with provided file text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).FileReader = vi.fn(() => ({
    readAsText: vi.fn(function (this: any, file: File) {
      setTimeout(async () => {
        try {
          const text = await file.text();
          this.result = text;
          this.onload && this.onload();
        } catch {
          this.onerror && this.onerror();
        }
      }, 0);
    }),
    result: null,
    error: null,
    onload: null,
    onerror: null,
  })) as unknown as typeof FileReader;
}

function mockFileReaderError() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).FileReader = vi.fn(() => ({
    readAsText: vi.fn(function (this: any) {
      setTimeout(() => {
        this.error = new Error('read error');
        this.onerror && this.onerror();
      }, 0);
    }),
    result: null,
    error: null,
    onload: null,
    onerror: null,
  })) as unknown as typeof FileReader;
}

describe('local-file-selector (TASK-100) - coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads a valid JSON file and returns PromptData[]', async () => {
    mockFileReaderSuccess();
    const content = JSON.stringify([
      { name: '風景', prompt: 'landscape, sunset', negative: 'lowres', parameters: { steps: 28 } },
    ]);
    const file = new File([content], 'valid.json', { type: 'application/json' });

    const res = await loadLocalPromptFile(file);
    expect(res.success).toBe(true);
    expect(res.data?.length).toBe(1);
    expect(res.data?.[0].name).toBe('風景');
  });

  it('handles invalid JSON with friendly error', async () => {
    mockFileReaderSuccess();
    const content = '{invalid json]';
    const file = new File([content], 'invalid.json', { type: 'application/json' });
    const res = await loadLocalPromptFile(file);
    expect(res.success).toBe(false);
    expect(res.error).toBe('ファイル形式が不正です。JSONファイルを確認してください');
  });

  it('rejects empty file', async () => {
    mockFileReaderSuccess();
    const file = new File([], 'empty.json', { type: 'application/json' });
    const res = await loadLocalPromptFile(file);
    expect(res.success).toBe(false);
    expect(res.error).toBe('ファイルにデータが含まれていません');
  });

  it('propagates FileReader errors as user-facing message', async () => {
    mockFileReaderError();
    const file = new File(['x'], 'file.json', { type: 'application/json' });
    const res = await loadLocalPromptFile(file);
    expect(res.success).toBe(false);
    expect(res.error).toBe('ファイルの読み込みに失敗しました。ファイルの状態を確認してください');
  });

  it('exposes helpers: validateFileSize / validatePromptData / isSupportedFileExtension', () => {
    const file = new File(['x'], 'a.json');
    expect(validateFileSize(file, 1)).toBe(true);
    expect(validatePromptData([{ name: 'n', prompt: 'p' }])).toBeNull();
    expect(isSupportedFileExtension('x.json')).toBe(true);
    expect(isSupportedFileExtension('x.naiprompts')).toBe(true);
    expect(isSupportedFileExtension('x.txt')).toBe(false);
  });

  describe('selectorProfile auto-detection', () => {
    it('detects common selectorProfile from characters block', async () => {
      mockFileReaderSuccess();
      const charactersData = {
        version: '1.0',
        characters: {
          char1: {
            name: 'Test Character 1',
            selectorProfile: 'novelai-v2',
            prompts: {
              positive: 'beautiful girl',
              negative: 'bad quality',
            },
          },
          char2: {
            name: 'Test Character 2',
            selectorProfile: 'novelai-v2',
            prompts: {
              positive: 'handsome boy',
              negative: 'ugly',
            },
          },
        },
      };

      const file = new File([JSON.stringify(charactersData)], 'test.json', {
        type: 'application/json',
      });

      const result = await loadLocalPromptFileWithSelector(file);

      expect(result.success).toBe(true);
      expect(result.selectorProfile).toBe('novelai-v2');
      expect(result.data).toHaveLength(2);
    });

    it('returns undefined selectorProfile when multiple different profiles found', async () => {
      mockFileReaderSuccess();
      const charactersData = {
        version: '1.0',
        characters: {
          char1: {
            name: 'Test Character 1',
            selectorProfile: 'novelai-v1',
            prompts: {
              positive: 'beautiful girl',
            },
          },
          char2: {
            name: 'Test Character 2',
            selectorProfile: 'novelai-v2',
            prompts: {
              positive: 'handsome boy',
            },
          },
        },
      };

      const file = new File([JSON.stringify(charactersData)], 'test.json', {
        type: 'application/json',
      });

      const result = await loadLocalPromptFileWithSelector(file);

      expect(result.success).toBe(true);
      expect(result.selectorProfile).toBeUndefined();
      expect(result.data).toHaveLength(2);
    });

    it('detects selectorProfile from PromptData array format', async () => {
      mockFileReaderSuccess();
      const promptDataArray = [
        {
          name: 'Test 1',
          prompt: 'beautiful girl',
          selectorProfile: 'novelai-v1',
        },
        {
          name: 'Test 2',
          prompt: 'handsome boy',
          selectorProfile: 'novelai-v1',
        },
      ];

      const file = new File([JSON.stringify(promptDataArray)], 'test.json', {
        type: 'application/json',
      });

      const result = await loadLocalPromptFileWithSelector(file);

      expect(result.success).toBe(true);
      expect(result.selectorProfile).toBe('novelai-v1');
      expect(result.data).toHaveLength(2);
    });

    it('maintains backward compatibility with loadLocalPromptFile', async () => {
      mockFileReaderSuccess();
      const promptDataArray = [
        {
          name: 'Test 1',
          prompt: 'beautiful girl',
          selectorProfile: 'novelai-v1',
        },
      ];

      const file = new File([JSON.stringify(promptDataArray)], 'test.json', {
        type: 'application/json',
      });

      const result = await loadLocalPromptFile(file);

      expect(result.success).toBe(true);
      expect('selectorProfile' in result).toBe(false); // selectorProfile should not be in basic result
      expect(result.data).toHaveLength(1);
    });
  });
});
