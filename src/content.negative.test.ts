import { beforeEach, describe, expect, it, vi } from 'vitest';

// Import the content script to register globals and expose handleApplyPromptFunction
import './content';

type AnyMsg = { type: string; step?: string; data?: any };

declare global {
  // eslint-disable-next-line no-var
  var chrome: any;
  interface Window { handleApplyPromptFunction?: (msg: any, send: (res: any) => void) => Promise<void>; }
}

describe('Negative prompt targeting and proof logging', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // minimal chrome shim
    globalThis.chrome = globalThis.chrome || {};
    chrome.runtime = chrome.runtime || {};
    chrome.runtime.sendMessage = vi.fn();
  });

  it('writes negative near the labeled section and emits proof logs', async () => {
    // Arrange DOM: label + nearby ProseMirror for negative, and a separate main positive editor
    const mainWrap = document.createElement('div');
    mainWrap.className = 'prompt-input-box-prompt';
    const mainEditor = document.createElement('div');
    mainEditor.className = 'ProseMirror';
    mainWrap.appendChild(mainEditor);

    const label = document.createElement('label');
    label.textContent = '除外したい要素';
    const negWrap = document.createElement('div');
    const negEditor = document.createElement('div');
    negEditor.className = 'ProseMirror';
    negWrap.appendChild(negEditor);

    document.body.appendChild(mainWrap);
    document.body.appendChild(label);
    document.body.appendChild(negWrap);

    const handle = window.handleApplyPromptFunction!;

    const sent: AnyMsg[] = [];
    (chrome.runtime.sendMessage as any).mockImplementation((msg: AnyMsg) => {
      sent.push(msg);
    });

    // Act
    await handle({
      type: 'APPLY_PROMPT',
      prompt: { positive: 'pos text', negative: 'neg text content' },
      parameters: { count: 1, seed: -1 }
    }, () => {});

    // Assert: negative editor got text
    expect(negEditor.textContent || '').toContain('neg text content');

    // Assert: proof logs emitted
    const diagSteps = sent
      .filter(m => m && m.type === 'GENERATION_DIAGNOSTICS')
      .map(m => (m as any).step);
    expect(diagSteps).toContain('negative-target-picked');
    expect(diagSteps).toContain('confirm-proof');
  });
});


