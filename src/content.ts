/**
 * Content Script for NovelAI Auto Generator
 * Handles DOM manipulation on NovelAI website
 */

import type {
  ApplyPromptMessage,
  GenerationParameters,
  Message,
  PageState,
} from './types';
import {
  DOMSelectorError,
  ElementType,
  SelectorConfig,
  findElementWithFallback,
  validateElementInteractable,
  waitForElementWithTimeout,
} from './utils/dom-selector-strategy';

console.log('NovelAI Auto Generator Content Script loaded');

const DEFAULT_SELECTOR_TIMEOUT = 5000;

const SELECTOR_CONFIG_MAP: Record<ElementType, SelectorConfig> = {
  'prompt-input': {
    selectors: [
      '#prompt-input',
      '[data-testid="prompt-input"] textarea',
      '[data-testid="prompt-input"]',
      'textarea[aria-label*="prompt" i]',
      'textarea[placeholder*="prompt" i]',
      'textarea[name="prompt"]',
      'textarea[id*="prompt" i]',
      '.prompt-input textarea',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'generate-button': {
    selectors: [
      '[data-testid="generate-button"]',
      'button[aria-label*="generate" i]',
      'button[aria-label*="生成" i]',
      'button[type="submit"]',
      '.generate-button',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'seed-input': {
    selectors: [
      '[data-testid="seed-input"] input',
      '[data-testid="seed-input"]',
      'input[name="seed"]',
      'input[id*="seed" i]',
      'input[aria-label*="seed" i]',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'steps-input': {
    selectors: [
      '[data-testid="steps-input"] input',
      'input[name="steps"]',
      'input[id*="step" i]',
      'input[aria-label*="steps" i]',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'sampler-select': {
    selectors: [
      '[data-testid="sampler-select"] select',
      '[data-testid="sampler-select"]',
      'select[name="sampler"]',
      'select[id*="sampler" i]',
      'select[aria-label*="sampler" i]',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'cfg-scale-input': {
    selectors: [
      '[data-testid="cfg-input"] input',
      'input[name="cfg"]',
      'input[id*="cfg" i]',
      'input[aria-label*="cfg" i]',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'count-input': {
    selectors: [
      '[data-testid="image-count-input"] input',
      'input[name="imageCount"]',
      'input[name="count"]',
      'input[id*="count" i]',
      'input[aria-label*="count" i]',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
};

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  switch (message.type) {
    case 'APPLY_PROMPT':
      handleApplyPrompt(message as ApplyPromptMessage, sendResponse).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to apply prompt:', errorMessage);
        _sendResponse({ success: false, error: errorMessage });
      });
      break;
    case 'GET_PAGE_STATE':
      handleGetPageState(sendResponse);
      break;
    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
  }

  return true;
});

async function handleApplyPrompt(
  message: ApplyPromptMessage,
  _sendResponse: (_response: unknown) => void
): Promise<void> {
  try {
    if (!checkLoginStatus()) {
      _sendResponse({ success: false, error: 'User not logged in', requiresLogin: true });
      return;
    }

    const promptInput = await resolvePromptInput();
    console.log("Resolved prompt matches first textarea:", promptInput === document.querySelector('textarea'));
    setInputValue(promptInput, message.prompt);
    console.log("Prompt value right after initial setInputValue:", promptInput.value);

    if (message.parameters) {
      await applyParameters(message.parameters);
    }

    await startGeneration();
    setInputValue(promptInput, message.prompt);
    console.log("Prompt value after startGeneration setInputValue:", promptInput.value);
    const finalTextarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
    if (finalTextarea && finalTextarea !== promptInput) {
      console.log("Final textarea value before expect (different element):", finalTextarea.value);
    } else if (finalTextarea) {
      console.log("Final textarea value before expect (same element):", finalTextarea.value);
    }

    _sendResponse({ success: true });
  } catch (error) {
    const errorMessage =
      error instanceof DOMSelectorError
        ? `${error.message} (selectors tried: ${error.attemptedSelectors.join(', ')})`
        : error instanceof Error
          ? error.message
          : String(error);

    _sendResponse({ success: false, error: errorMessage });
  }
}

function handleGetPageState(_sendResponse: (_response: unknown) => void): void {
  try {
    const promptConfig = SELECTOR_CONFIG_MAP['prompt-input'];
    const promptElement = promptConfig
      ? findElementWithFallback('prompt-input', promptConfig)
      : null;

    const state: PageState = {
      isNovelAIPage: window.location.hostname === 'novelai.net',
      isLoggedIn: checkLoginStatus(),
      hasPromptInput: Boolean(promptElement),
      currentUrl: window.location.href,
    };

    _sendResponse({ success: true, state });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    _sendResponse({ success: false, error: errorMessage });
  }
}

async function resolvePromptInput(): Promise<HTMLTextAreaElement | HTMLInputElement> {
  const element = await resolveElement('prompt-input');
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element;
  }
  throw new Error('Prompt input field is not an input or textarea element');
}

async function resolveElement(
  elementType: ElementType,
  options: { required?: boolean; interactable?: boolean; timeoutOverride?: number } = {}
): Promise<HTMLElement | null> {
  const config = SELECTOR_CONFIG_MAP[elementType];
  if (!config) {
    console.warn(`No selector configuration registered for element type '${elementType}'`);
    return null;
  }

  const { required = true, interactable = true, timeoutOverride } = options;
  const effectiveConfig: SelectorConfig = timeoutOverride
    ? { ...config, timeout: timeoutOverride }
    : config;

  const startTime = Date.now();

  try {
    if (required) {
      const element = await waitForElementWithTimeout(elementType, effectiveConfig);
      return ensureInteractableElement(element, elementType, interactable, required, effectiveConfig, startTime);
    }

    const element = findElementWithFallback(elementType, effectiveConfig);
    if (!element) {
      return null;
    }
    return ensureInteractableElement(element, elementType, interactable, required, effectiveConfig, startTime);
  } catch (error) {
    if (!required && error instanceof DOMSelectorError && error.type === 'timeout') {
      return null;
    }
    throw error;
  }
}

function ensureInteractableElement(
  element: HTMLElement,
  elementType: ElementType,
  interactable: boolean,
  required: boolean,
  config: SelectorConfig,
  startTime: number
): HTMLElement | null {
  if (!interactable) {
    return element;
  }

  const validation = validateElementInteractable(element);
  if (validation.isInteractable) {
    return element;
  }

  const reason = validation.warnings.join(', ') || 'unknown reason';
  if (required) {
    throw new DOMSelectorError(
      `要素タイプ '${elementType}' は操作できません (理由: ${reason})`,
      elementType,
      'not-interactable',
      config.selectors,
      Date.now() - startTime
    );
  }

  console.warn(`Element type '${elementType}' is not interactable (reason: ${reason})`);
  return null;
}

function checkLoginStatus(): boolean {
  const loginIndicators = ['.user-menu', '[data-testid="user-avatar"]', '.account-info'];
  for (const selector of loginIndicators) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  const loginForm = document.querySelector('form[action*="login" i], .login-form');
  return !loginForm;
}

function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const normalised = typeof value === "string" ? value : String(value ?? "");

  element.focus();
  element.value = normalised;

  if (element instanceof HTMLTextAreaElement) {
    element.textContent = normalised;
  }

  element.defaultValue = normalised;
  element.setAttribute("value", normalised);

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function setNumericInputValue(element: HTMLInputElement, value: number): void {
  let resolved = value;
  if (element.min !== '') {
    const minValue = Number(element.min);
    if (!Number.isNaN(minValue)) {
      resolved = Math.max(resolved, minValue);
    }
  }
  if (element.max !== '') {
    const maxValue = Number(element.max);
    if (!Number.isNaN(maxValue)) {
      resolved = Math.min(resolved, maxValue);
    }
  }

  if (element.type === 'number') {
    element.valueAsNumber = resolved;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  setInputValue(element, resolved.toString());
}

function setSelectValue(element: HTMLSelectElement, value: string): void {
  const hasOption = Array.from(element.options).some(
    (option) => option.value === value || option.text === value
  );

  if (!hasOption) {
    console.warn(`Sampler value '${value}' not available; keeping existing selection`);
    return;
  }

  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

async function applyParameters(parameters: GenerationParameters): Promise<void> {
  if (typeof parameters.seed === 'number' && Number.isFinite(parameters.seed)) {
    await setSeed(parameters.seed);
  }
  if (typeof parameters.steps === 'number' && Number.isFinite(parameters.steps)) {
    await setSteps(parameters.steps);
  }
  if (typeof parameters.cfgScale === 'number' && Number.isFinite(parameters.cfgScale)) {
    await setCfgScale(parameters.cfgScale);
  }
  if (typeof parameters.sampler === 'string' && parameters.sampler.trim().length > 0) {
    await setSampler(parameters.sampler.trim());
  }
  if (typeof parameters.count === 'number' && Number.isFinite(parameters.count)) {
    await setImageCount(parameters.count);
  }
}

async function setSeed(seed: number): Promise<void> {
  const element = await resolveElement('seed-input', { required: false });
  if (element instanceof HTMLInputElement) {
    setNumericInputValue(element, seed);
  } else if (element) {
    console.warn('Seed input element is not an input element; skipping seed application');
  }
}

async function setSteps(steps: number): Promise<void> {
  const element = await resolveElement('steps-input', { required: false });
  if (element instanceof HTMLInputElement) {
    setNumericInputValue(element, steps);
  } else if (element) {
    console.warn('Steps element is not an input; skipping steps application');
  }
}

async function setCfgScale(cfgScale: number): Promise<void> {
  const element = await resolveElement('cfg-scale-input', { required: false });
  if (element instanceof HTMLInputElement) {
    setNumericInputValue(element, cfgScale);
  } else if (element) {
    console.warn('CFG scale element is not an input; skipping cfg application');
  }
}

async function setSampler(sampler: string): Promise<void> {
  const element = await resolveElement('sampler-select', { required: false });
  if (element instanceof HTMLSelectElement) {
    setSelectValue(element, sampler);
  } else if (element) {
    console.warn('Sampler element is not a select; skipping sampler application');
  }
}

async function setImageCount(count: number): Promise<void> {
  const element = await resolveElement('count-input', { required: false });
  if (element instanceof HTMLInputElement) {
    setNumericInputValue(element, count);
  } else if (element) {
    console.warn('Image count element is not an input; skipping count application');
  }
}

async function startGeneration(): Promise<void> {
  const element = await resolveElement('generate-button');
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error('Generate button element is not a button');
  }

  if (element.disabled) {
    throw new Error('Generate button is disabled');
  }

  const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
  element.dispatchEvent(clickEvent);
}




