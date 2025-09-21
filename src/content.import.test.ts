import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('content.ts import and message handling', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('imports content and registers message listener; handles GET_PAGE_STATE', async () => {
    const chromeMock = globalThis.chrome as any;
    await import('./content');

    expect(chromeMock.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    const listener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0];

    const sendResponse = vi.fn();
    const returned = listener({ type: 'GET_PAGE_STATE' }, {}, sendResponse);
    expect(returned).toBe(true);
    expect(sendResponse).toHaveBeenCalled();
    const arg = sendResponse.mock.calls[0][0];
    expect(arg).toHaveProperty('success', true);
  });

  it('handles unknown message type via default branch', async () => {
    const chromeMock = globalThis.chrome as any;
    await import('./content');

    const listener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0];
    const sendResponse = vi.fn();
    const returned = listener({ type: 'UNKNOWN' }, {}, sendResponse);
    expect(returned).toBe(true);
  });

  it('handles APPLY_PROMPT when logged in and prompt field exists', async () => {
    const chromeMock = globalThis.chrome as any;
    await import('./content');

    // Prepare DOM (prompt field and generate button)
    const textarea = document.createElement('textarea');
    textarea.setAttribute('placeholder', 'prompt here');
    document.body.appendChild(textarea);

    const button = document.createElement('button');
    button.type = 'submit';
    document.body.appendChild(button);

    // Mock login state to true by ensuring no login form and indicator present
    const indicator = document.createElement('div');
    indicator.className = 'user-menu';
    document.body.appendChild(indicator);

    const listener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0];
    const sendResponse = vi.fn();
    const returned = listener(
      {
        type: 'APPLY_PROMPT',
        prompt: {
          positive: 'Hello',
          negative: 'lowres, bad anatomy',
          selectorProfile: 'character-anime',
        },
        parameters: { seed: 42, count: 1 },
      },
      {},
      sendResponse
    );
    expect(returned).toBe(true);

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalled();
    });

    try {
      expect((textarea as HTMLTextAreaElement).value).toBe('Hello');
    } catch (error) {
      const allTextareas = Array.from(document.querySelectorAll('textarea')).map((node, index) => ({
        index,
        value: (node as HTMLTextAreaElement).value,
      }));
      console.error('Assertion failed: expected textarea value to be "Hello"', {
        actual: (textarea as HTMLTextAreaElement).value,
        allTextareas,
        sendResponseCalls: sendResponse.mock.calls,
      });
      console.error('Stack trace:', error instanceof Error ? error.stack : error);
      throw error;
    }
  });

  it('APPLY_PROMPT responds requiresLogin when not logged in', async () => {
    const chromeMock = globalThis.chrome as any;
    await import('./content');

    // Add a login form (negative indicator) and ensure no user-menu
    const form = document.createElement('form');
    form.setAttribute('action', 'https://novelai.net/login');
    document.body.appendChild(form);

    const listener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0];
    const sendResponse = vi.fn();
    const returned = listener(
      {
        type: 'APPLY_PROMPT',
        prompt: {
          positive: 'Hello',
          negative: 'lowres, bad anatomy',
          selectorProfile: 'character-anime',
        },
      },
      {},
      sendResponse
    );
    expect(returned).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(sendResponse).toBeCalled();
  });
});
