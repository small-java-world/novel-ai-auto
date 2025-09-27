import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MultiCharacterSequenceHandler,
  CharacterPrompt,
  MultiCharacterMessage,
  SequenceProgress
} from './multi-character-sequence';

/**
 * マルチキャラクターシーケンスのSelenium改善テスト
 *
 * テスト対象:
 * - 既存content script DOM関数との統合
 * - Seleniumスタイルのキャラクター追加シミュレーション
 * - フォールバック機能
 */

describe('MultiCharacterSequenceHandler - Selenium Integration', () => {
  let handler: MultiCharacterSequenceHandler;
  let mockSendResponse: any;
  let mockHandleApplyPrompt: any;

  beforeEach(() => {
    // DOM環境をクリーンアップ
    document.body.innerHTML = '';

    handler = new MultiCharacterSequenceHandler();
    mockSendResponse = vi.fn();

    // Mock handleApplyPrompt function
    mockHandleApplyPrompt = vi.fn().mockImplementation((message, sendResponse) => {
      sendResponse({ success: true });
    });
    (global.window as any).handleApplyPromptFunction = mockHandleApplyPrompt;

    // Mock chrome runtime for messaging
    global.chrome = {
      runtime: {
        sendMessage: vi.fn()
      }
    } as any;

    // Mock generation waiting methods to skip actual generation
    vi.spyOn(handler as any, 'waitForGeneration').mockImplementation(async () => {
      // Skip actual generation waiting in tests
      return Promise.resolve();
    });

    // Mock clickAddCharacterButton to avoid XPath issues in test environment
    vi.spyOn(handler as any, 'clickAddCharacterButton').mockImplementation(async () => {
      // Create a mock button to simulate successful click
      const mockButton = document.createElement('button');
      mockButton.textContent = 'キャラクターを追加';
      document.body.appendChild(mockButton);
      return Promise.resolve();
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('統合: 既存content script関数の利用', () => {
    test('handleApplyPrompt関数が利用可能な場合は既存関数を使用', async () => {
      const characters: CharacterPrompt[] = [
        {
          id: 'char1',
          name: 'Character 1',
          gender: 'その他',
          positive: 'beautiful girl',
          negative: 'bad quality',
          weight: 1.0
        }
      ];

      const message: MultiCharacterMessage = {
        type: 'APPLY_MULTI_CHARACTER_PROMPT',
        characters,
        common: {
          positive: 'masterpiece',
          negative: 'blurry'
        }
      };

      await handler.handleMultiCharacterSequence(message, mockSendResponse);

      // Verify existing function was called
      expect(mockHandleApplyPrompt).toHaveBeenCalled();

      const callArgs = mockHandleApplyPrompt.mock.calls[0];
      const appliedMessage = callArgs[0];

      expect(appliedMessage.prompt.positive).toBe('masterpiece, beautiful girl');
      expect(appliedMessage.prompt.negative).toBe('blurry, bad quality');
    });

    test('handleApplyPrompt関数が利用不可能な場合はフォールバック', async () => {
      // Remove the function to test fallback
      (global.window as any).handleApplyPromptFunction = undefined;

      // Setup basic DOM for fallback
      document.body.innerHTML = `
        <textarea id="main-prompt" rows="4"></textarea>
        <textarea id="negative-prompt" rows="2"></textarea>
      `;

      const characters: CharacterPrompt[] = [
        {
          id: 'char1',
          name: 'Character 1',
          positive: 'test prompt',
          negative: 'test negative'
        }
      ];

      const message: MultiCharacterMessage = {
        type: 'APPLY_MULTI_CHARACTER_PROMPT',
        characters
      };

      // Spy on console.warn for fallback notification
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await handler.handleMultiCharacterSequence(message, mockSendResponse);

      expect(warnSpy).toHaveBeenCalledWith(
        'handleApplyPrompt not available, using simple prompt setting'
      );

      // Verify fallback DOM manipulation
      const textarea = document.getElementById('main-prompt') as HTMLTextAreaElement;
      expect(textarea.value).toBe('test prompt');
    });
  });

  describe('プロンプト結合ロジック', () => {
    test('共通プロンプト + キャラクター固有プロンプトの結合', async () => {
      const characters: CharacterPrompt[] = [
        {
          id: 'char1',
          name: 'Test Character',
          positive: 'red hair',
          negative: 'blue eyes'
        }
      ];

      const message: MultiCharacterMessage = {
        type: 'APPLY_MULTI_CHARACTER_PROMPT',
        characters,
        common: {
          positive: 'high quality',
          negative: 'low quality'
        }
      };

      await handler.handleMultiCharacterSequence(message, mockSendResponse);

      const callArgs = mockHandleApplyPrompt.mock.calls[0];
      const appliedMessage = callArgs[0];

      expect(appliedMessage.prompt.positive).toBe('high quality, red hair');
      expect(appliedMessage.prompt.negative).toBe('low quality, blue eyes');
    });

    test('共通プロンプトのみの場合', async () => {
      const characters: CharacterPrompt[] = [
        {
          id: 'char1',
          name: 'Test Character',
          positive: 'red hair'
        }
      ];

      const message: MultiCharacterMessage = {
        type: 'APPLY_MULTI_CHARACTER_PROMPT',
        characters,
        common: {
          positive: 'high quality'
        }
      };

      await handler.handleMultiCharacterSequence(message, mockSendResponse);

      const callArgs = mockHandleApplyPrompt.mock.calls[0];
      const appliedMessage = callArgs[0];

      expect(appliedMessage.prompt.positive).toBe('high quality, red hair');
      expect(appliedMessage.prompt.negative).toBe('');
    });

    test('キャラクター固有プロンプトのみの場合', async () => {
      const characters: CharacterPrompt[] = [
        {
          id: 'char1',
          name: 'Test Character',
          positive: 'blue dress',
          negative: 'torn clothes'
        }
      ];

      const message: MultiCharacterMessage = {
        type: 'APPLY_MULTI_CHARACTER_PROMPT',
        characters
      };

      await handler.handleMultiCharacterSequence(message, mockSendResponse);

      const callArgs = mockHandleApplyPrompt.mock.calls[0];
      const appliedMessage = callArgs[0];

      expect(appliedMessage.prompt.positive).toBe('blue dress');
      expect(appliedMessage.prompt.negative).toBe('torn clothes');
    });
  });

  describe('複数キャラクターのシーケンス処理', () => {
    test('複数キャラクターを順次処理', async () => {
      const characters: CharacterPrompt[] = [
        {
          id: 'char1',
          name: 'Character 1',
          positive: 'first character',
          gender: 'その他'
        },
        {
          id: 'char2',
          name: 'Character 2',
          positive: 'second character',
          gender: '女性'
        }
      ];

      const message: MultiCharacterMessage = {
        type: 'APPLY_MULTI_CHARACTER_PROMPT',
        characters
      };

      const progressSpy = vi.spyOn(chrome.runtime, 'sendMessage');

      await handler.handleMultiCharacterSequence(message, mockSendResponse);

      // Verify both characters were processed
      expect(mockHandleApplyPrompt).toHaveBeenCalledTimes(2);

      // Verify progress messages
      expect(progressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MULTI_CHARACTER_PROGRESS',
          progress: expect.objectContaining({
            currentCharacterIndex: 0,
            totalCharacters: 2,
            phase: 'applying_prompt'
          })
        })
      );
    });

    test('処理中のキャンセル', async () => {
      const characters: CharacterPrompt[] = [
        {
          id: 'char1',
          name: 'Character 1',
          positive: 'first character'
        },
        {
          id: 'char2',
          name: 'Character 2',
          positive: 'second character'
        }
      ];

      const message: MultiCharacterMessage = {
        type: 'APPLY_MULTI_CHARACTER_PROMPT',
        characters
      };

      // Start processing
      const processingPromise = handler.handleMultiCharacterSequence(message, mockSendResponse);

      // Cancel after start
      handler.cancel();

      await processingPromise;

      // Should not process all characters
      expect(mockHandleApplyPrompt).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーハンドリング', () => {
    test('キャラクター処理中のエラー', async () => {
      // Mock handleApplyPrompt to fail
      mockHandleApplyPrompt.mockImplementation((message, sendResponse) => {
        sendResponse({ success: false, error: 'DOM manipulation failed' });
      });

      const characters: CharacterPrompt[] = [
        {
          id: 'char1',
          name: 'Character 1',
          positive: 'test prompt'
        }
      ];

      const message: MultiCharacterMessage = {
        type: 'APPLY_MULTI_CHARACTER_PROMPT',
        characters
      };

      const errorSpy = vi.spyOn(chrome.runtime, 'sendMessage');

      await handler.handleMultiCharacterSequence(message, mockSendResponse);

      // Verify error was reported
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MULTI_CHARACTER_ERROR',
          error: expect.stringContaining('Character \'Character 1\' failed')
        })
      );
    });

    test('不正なメッセージ形式', async () => {
      const invalidMessage = {
        type: 'APPLY_MULTI_CHARACTER_PROMPT',
        characters: [
          {
            id: '', // Invalid empty ID
            name: 'Test',
            positive: 'test'
          }
        ]
      } as MultiCharacterMessage;

      const errorSpy = vi.spyOn(chrome.runtime, 'sendMessage');

      await handler.handleMultiCharacterSequence(invalidMessage, mockSendResponse);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MULTI_CHARACTER_ERROR',
          error: expect.stringContaining('Sequence validation failed')
        })
      );
    });
  });

  describe('フォールバック DOM操作', () => {
    test('基本的なプロンプト設定フォールバック', async () => {
      // Remove handleApplyPrompt function
      (global.window as any).handleApplyPromptFunction = undefined;

      document.body.innerHTML = `
        <textarea id="prompt1" rows="4"></textarea>
        <textarea id="prompt2" rows="2"></textarea>
      `;

      const characters: CharacterPrompt[] = [
        {
          id: 'char1',
          name: 'Character 1',
          positive: 'test positive',
          negative: 'test negative'
        }
      ];

      const message: MultiCharacterMessage = {
        type: 'APPLY_MULTI_CHARACTER_PROMPT',
        characters
      };

      await handler.handleMultiCharacterSequence(message, mockSendResponse);

      const textarea1 = document.getElementById('prompt1') as HTMLTextAreaElement;
      const textarea2 = document.getElementById('prompt2') as HTMLTextAreaElement;

      expect(textarea1.value).toBe('test positive');
      expect(textarea2.value).toBe('test negative');
    });

    test('ネガティブプロンプト入力欄がない場合', async () => {
      (global.window as any).handleApplyPromptFunction = undefined;

      document.body.innerHTML = `
        <textarea id="prompt1" rows="4"></textarea>
      `;

      const characters: CharacterPrompt[] = [
        {
          id: 'char1',
          name: 'Character 1',
          positive: 'test positive',
          negative: 'test negative'
        }
      ];

      const message: MultiCharacterMessage = {
        type: 'APPLY_MULTI_CHARACTER_PROMPT',
        characters
      };

      await handler.handleMultiCharacterSequence(message, mockSendResponse);

      const textarea1 = document.getElementById('prompt1') as HTMLTextAreaElement;
      expect(textarea1.value).toBe('test positive');
      // Negative prompt should be ignored if no second textarea
    });
  });

  describe('進捗状況の追跡', () => {
    test('現在の進捗状況を取得', () => {
      // Before processing starts
      expect(handler.getCurrentProgress()).toBeNull();
    });

    test('シーケンス中の進捗状況', async () => {
      const characters: CharacterPrompt[] = [
        {
          id: 'char1',
          name: 'Character 1',
          positive: 'test'
        }
      ];

      const message: MultiCharacterMessage = {
        type: 'APPLY_MULTI_CHARACTER_PROMPT',
        characters
      };

      // Start processing in background
      const processingPromise = handler.handleMultiCharacterSequence(message, mockSendResponse);

      // Check progress during processing (may be null if processing is too fast)
      const progress = handler.getCurrentProgress();
      if (progress) {
        expect(progress.totalCharacters).toBe(1);
        expect(progress.currentCharacter.name).toBe('Character 1');
      }

      await processingPromise;

      // After completion, progress should be null
      expect(handler.getCurrentProgress()).toBeNull();
    });
  });
});