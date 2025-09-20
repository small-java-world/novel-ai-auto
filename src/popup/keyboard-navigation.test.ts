import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyboardNavigationManager } from './keyboard-navigation';

describe('KeyboardNavigationManager', () => {
  let cancelButton: HTMLButtonElement;
  let secondaryButton: HTMLButtonElement;
  let generateButton: HTMLButtonElement;
  let summary: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="cancelButton">Cancel</button>
      <button id="generateButton">Generate</button>
      <details id="details">
        <summary id="detailsSummary">More</summary>
        <div>Content</div>
      </details>
      <button id="secondaryButton">Another</button>
    `;
    cancelButton = document.getElementById('cancelButton') as HTMLButtonElement;
    generateButton = document.getElementById('generateButton') as HTMLButtonElement;
    secondaryButton = document.getElementById('secondaryButton') as HTMLButtonElement;
    summary = document.getElementById('detailsSummary')!;
  });

  const dispatchKey = (target: EventTarget, key: string, init: any = {}) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };

  it('manages focus traversal with Tab and Shift+Tab', () => {
    new KeyboardNavigationManager();
    secondaryButton.focus();
    secondaryButton.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    const tabEvent = dispatchKey(secondaryButton, 'Tab');
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cancelButton);

    cancelButton.focus();
    cancelButton.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    const shiftTab = dispatchKey(cancelButton, 'Tab', { shiftKey: true });
    expect(shiftTab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(secondaryButton);
  });

  it('activates controls with Enter/Space and toggles details', () => {
    const manager = new KeyboardNavigationManager();
    const clickSpy = vi.spyOn(generateButton, 'click');

    generateButton.focus();
    generateButton.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    dispatchKey(generateButton, 'Enter');
    expect(clickSpy).toHaveBeenCalled();

    const details = document.getElementById('details') as HTMLDetailsElement;
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    Object.defineProperty(spaceEvent, 'target', { value: summary });
    (manager as any).handleActivation(spaceEvent);
    expect(spaceEvent.defaultPrevented).toBe(true);
    expect(details.getAttribute('aria-expanded')).toBe('true');
  });

  it('handles escape key by invoking cancel or resetting focus', () => {
    new KeyboardNavigationManager();
    const cancelSpy = vi.spyOn(cancelButton, 'click');

    cancelButton.focus();
    cancelButton.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    dispatchKey(cancelButton, 'Escape');
    expect(cancelSpy).toHaveBeenCalled();

    cancelButton.hidden = true;
    secondaryButton.focus();
    secondaryButton.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    dispatchKey(secondaryButton, 'Escape');
    expect(document.activeElement).toBe(cancelButton);
  });

  it('moves to extremes with Home and End keys', () => {
    new KeyboardNavigationManager();

    secondaryButton.focus();
    secondaryButton.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    dispatchKey(secondaryButton, 'Home');
    expect(document.activeElement).toBe(cancelButton);

    dispatchKey(cancelButton, 'End');
    expect(document.activeElement).toBe(secondaryButton);
  });

  it('updates accessibility attributes and focuses elements directly', () => {
    const manager = new KeyboardNavigationManager();

    manager.updateElementAccessibility('generateButton', false);
    expect(generateButton.getAttribute('disabled')).toBe('true');
    expect(generateButton.getAttribute('aria-disabled')).toBe('true');

    manager.updateElementAccessibility('generateButton', true);
    expect(generateButton.hasAttribute('disabled')).toBe(false);
    expect(generateButton.hasAttribute('aria-disabled')).toBe(false);

    manager.focusElement('secondaryButton');
    expect(document.activeElement).toBe(secondaryButton);
  });
});
