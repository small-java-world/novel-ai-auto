// utils/dom-helper.js

export const SELECTORS = {
  positivePrompt: 'textarea[placeholder*="prompt" i], textarea[aria-label*="prompt" i]',
  negativePrompt: 'textarea[placeholder*="negative" i], textarea[aria-label*="negative" i]',
  generateButton: 'button, [role="button"]', // refined in findGenerateButton
  generatedImage: 'img'
};

export class DOMHelper {
  static async waitForElement(selector, timeoutMs = 15000) {
    const start = Date.now();
    const found = document.querySelector(selector);
    if (found) return found;

    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });

      const checkInterval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(checkInterval);
          observer.disconnect();
          resolve(el);
        }
        if (Date.now() - start > timeoutMs) {
          clearInterval(checkInterval);
          observer.disconnect();
          reject(new Error(`Timeout waiting for selector: ${selector}`));
        }
      }, 200);
    });
  }

  static setInputValue(element, value) {
    if (!element) return;

    const tag = element.tagName?.toLowerCase();
    const type = element.type?.toLowerCase();

    // Handle range/number inputs
    if (tag === 'input' && (type === 'range' || type === 'number' || type === 'text')) {
      const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeValueSetter?.call(element, String(value));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    // Handle textarea
    if (tag === 'textarea') {
      const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      nativeValueSetter?.call(element, String(value));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    // Fallback for contenteditable
    if (element.getAttribute && element.getAttribute('contenteditable') === 'true') {
      element.textContent = String(value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  static findGenerateButton() {
    // Try to find a button with text "Generate"
    const candidates = Array.from(document.querySelectorAll(SELECTORS.generateButton));
    const targetTexts = ['generate', 'start', 'render'];
    return candidates.find((btn) => targetTexts.some((t) => btn.textContent?.trim().toLowerCase().includes(t)));
  }
}
