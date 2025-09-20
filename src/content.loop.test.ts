import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('content.ts generation loop integration (minimal)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '';

    // progressbar and completion hooks will be toggled in tests
  });

  it('applies prompt, clicks generate, waits completion, sends download and progress', async () => {
    const chromeMock = globalThis.chrome as any;

    // Prepare DOM: prompt textarea, generate button, progress bar
    const textarea = document.createElement('textarea');
    textarea.setAttribute('placeholder', 'prompt');
    document.body.appendChild(textarea);

    const button = document.createElement('button');
    button.type = 'submit';
    document.body.appendChild(button);

    const progress = document.createElement('div');
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-valuenow', '0');
    progress.setAttribute('aria-valuemax', '1');
    document.body.appendChild(progress);

    await import('./content');
    const listener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0];
    const sendResponse = vi.fn();

    // Logged-in marker
    const indicator = document.createElement('div');
    indicator.className = 'user-menu';
    document.body.appendChild(indicator);

    // Fire APPLY_PROMPT with count=2
    const returned = listener(
      { type: 'APPLY_PROMPT', prompt: 'Hello', parameters: { count: 2 } },
      {},
      sendResponse
    );
    expect(returned).toBe(true);

    // Simulate one image becoming ready by adding an https url img in gallery
    const gallery = document.createElement('div');
    gallery.className = 'novelai-gallery';
    const img = document.createElement('img');
    img.src = 'https://images.novelai.net/test.png';
    gallery.appendChild(img);
    document.body.appendChild(gallery);

    // Mark progress complete for first round
    progress.setAttribute('aria-valuenow', '1');

    // Allow loop to run
    await new Promise((r) => setTimeout(r, 50));

    // Reset for second iteration: remove completion then re-add
    progress.setAttribute('aria-valuenow', '0');
    setTimeout(() => {
      progress.setAttribute('aria-valuenow', '1');
    }, 20);

    // Wait for sendResponse and GENERATION_COMPLETE message side effects
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalled();
    });

    // Validate that download messages were sent at least once
    const calls = chromeMock.runtime.sendMessage.mock.calls.map((c: any[]) => c[0]);
    expect(calls.some((m: any) => m?.type === 'DOWNLOAD_IMAGE')).toBe(true);
    expect(calls.some((m: any) => m?.type === 'GENERATION_PROGRESS')).toBe(true);
    expect(calls.some((m: any) => m?.type === 'GENERATION_COMPLETE')).toBe(true);
  });
});
