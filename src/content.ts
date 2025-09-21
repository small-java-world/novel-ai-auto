/**
 * Content Script for NovelAI Auto Generator
 * Handles DOM manipulation on NovelAI website
 */

import type { ApplyPromptMessage, GenerationParameters, Message, PageState } from './types';
import { createGenerationMonitor } from './utils/generation-monitor';
import { createImageUrlExtractor } from './utils/image-url-extractor';
import {
  DOMSelectorError,
  ElementType,
  SelectorConfig,
  findElementWithFallback,
  validateElementInteractable,
  waitForElementWithTimeout,
} from './utils/dom-selector-strategy';
import {
  MultiCharacterSequenceHandler,
  type MultiCharacterMessage,
} from './utils/multi-character-sequence';

console.log('NovelAI Auto Generator Content Script loaded');

const DEFAULT_SELECTOR_TIMEOUT = 5000;

const SELECTOR_CONFIG_URL = chrome.runtime.getURL('config/dom-selectors.json');

// Forced selector profile name, when provided from the UI/prompt
let FORCED_SELECTOR_PROFILE: string | null = null;
function setForcedSelectorProfile(profileName: string | null): void {
  if (typeof profileName === 'string' && profileName.trim().length > 0) {
    FORCED_SELECTOR_PROFILE = profileName.trim();
  } else {
    FORCED_SELECTOR_PROFILE = null;
  }
}

const FALLBACK_SELECTOR_CONFIG: Record<ElementType, SelectorConfig> = {
  'prompt-input': {
    selectors: [
      '#prompt-input',
      '[data-testid="prompt-input"] textarea',
      '[data-testid="prompt-input"]',
      'div[data-slate-editor] [contenteditable="true"]',
      'div[contenteditable="true"]:not([data-negative])',
      '[role="textbox"][contenteditable="true"]',
      'textarea[aria-label*="prompt" i]',
      'textarea[placeholder*="prompt" i]',
      'textarea[name="prompt"]',
      'textarea[id*="prompt" i]',
      '.prompt-input textarea',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'negative-input': {
    selectors: [
      '#negative-prompt-input',
      'div[data-slate-editor] [contenteditable="true"][data-negative="true"]',
      '[data-testid="negative-prompt"] [contenteditable="true"]',
      '[data-testid="negative-prompt"] textarea',
      '[data-testid="negative-prompt"]',
      '[role="textbox"][contenteditable="true"][data-negative="true"]',
      'div[contenteditable="true"][data-field="negative"]',
      'textarea[aria-label*="negative" i]',
      'textarea[placeholder*="negative" i]',
      'textarea[name="negative"]',
      'textarea[id*="negative" i]',
      '.prompt-negative textarea',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'generate-button': {
    selectors: [
      '[data-testid="generate-button"]',
      '[role="button"][aria-label*="generate" i]',
      'button[aria-label*="generate" i]',
      'button[aria-label*="生成" i]',
      'button[type="submit"]',
      '.generate-button',
      '[data-action="generate"]',
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
  'progress-indicator': {
    selectors: ['[role="progressbar"]', '.progress-bar'],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'image-gallery': {
    selectors: ['.image-gallery', '.novelai-gallery'],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
};

const SELECTOR_CONFIG_MAP: Record<ElementType, SelectorConfig> =
  cloneSelectorConfigMap(FALLBACK_SELECTOR_CONFIG);

const ELEMENT_TYPES: ElementType[] = [
  'prompt-input',
  'negative-input',
  'generate-button',
  'seed-input',
  'steps-input',
  'sampler-select',
  'cfg-scale-input',
  'count-input',
  'progress-indicator',
  'image-gallery',
];

void loadSelectorConfigOverrides();

function cloneSelectorConfigMap(
  source: Record<ElementType, SelectorConfig>
): Record<ElementType, SelectorConfig> {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      {
        ...value,
        selectors: [...value.selectors],
        retry: value.retry ? { ...value.retry } : undefined,
      },
    ])
  ) as Record<ElementType, SelectorConfig>;
}

async function loadSelectorConfigOverrides(): Promise<void> {
  try {
    const response = await fetch(SELECTOR_CONFIG_URL, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to load selector config: ${response.status}`);
    }

    const rawConfig = (await response.json()) as unknown;
    const overrides = normalizeSelectorOverrides(rawConfig);
    applySelectorOverrides(overrides);
  } catch (error) {
    console.warn('Using fallback selector configuration due to load failure:', error);
  }
}

// Supports two schemas:
// 1) Flat: { [elementType]: (string | { scope: string; selectors: string[] })[] }
// 2) Profiles: { profiles: { [profileName]: { detect?: string[]; selectors: { [elementType]: (string | { scope: string; selectors: string[] })[] } } } }
function normalizeSelectorOverrides(data: unknown): Partial<Record<ElementType, SelectorConfig>> {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const record = data as Record<string, unknown>;

  // Profile-aware schema
  if (typeof record['profiles'] === 'object' && record['profiles'] !== null) {
    const profiles = record['profiles'] as Record<
      string,
      { detect?: unknown; selectors?: unknown }
    >;

    // Select profile by forced name → detection (first matching) → fallback to 'default'/'$default' or the first entry
    let selectedProfileName: string | undefined;
    const defaultNames = ['default', '$default', 'common'];

    // Forced profile selection from UI/prompt
    if (FORCED_SELECTOR_PROFILE && profiles[FORCED_SELECTOR_PROFILE]) {
      selectedProfileName = FORCED_SELECTOR_PROFILE;
    }

    // Try non-default profiles first
    if (!selectedProfileName) {
      for (const [name, profile] of Object.entries(profiles)) {
        if (defaultNames.includes(name)) continue;
        const detect = Array.isArray(profile.detect)
          ? (profile.detect as unknown[]).filter((s): s is string => typeof s === 'string')
          : [];
        if (
          detect.some((sel) => {
            try {
              return !!document.querySelector(sel);
            } catch {
              return false;
            }
          })
        ) {
          selectedProfileName = name;
          break;
        }
      }
    }

    if (!selectedProfileName) {
      selectedProfileName = defaultNames.find((n) => n in profiles) || Object.keys(profiles)[0];
    }

    const selected = profiles[selectedProfileName] || {};
    const selectorsMap = (selected.selectors || {}) as Record<string, unknown>;
    return buildOverridesFromFlatMap(selectorsMap);
  }

  // Flat schema
  return buildOverridesFromFlatMap(record);
}

function buildOverridesFromFlatMap(
  map: Record<string, unknown>
): Partial<Record<ElementType, SelectorConfig>> {
  const overrides: Partial<Record<ElementType, SelectorConfig>> = {};
  for (const [key, value] of Object.entries(map)) {
    if (!isElementType(key) || !Array.isArray(value)) continue;

    const selectors = flattenSelectorEntries(value);
    if (selectors.length === 0) continue;

    overrides[key as ElementType] = {
      selectors,
      timeout: DEFAULT_SELECTOR_TIMEOUT,
    };
  }
  return overrides;
}

function flattenSelectorEntries(entries: unknown[]): string[] {
  const out: string[] = [];
  for (const entry of entries) {
    if (typeof entry === 'string') {
      const sel = entry.trim();
      if (sel.length > 0) out.push(sel);
      continue;
    }
    if (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as any).scope === 'string' &&
      Array.isArray((entry as any).selectors)
    ) {
      const scope = ((entry as any).scope as string).trim();
      const scopedList = ((entry as any).selectors as unknown[])
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => `${scope} ${s}`);
      out.push(...scopedList);
      continue;
    }
  }
  return out;
}

function applySelectorOverrides(overrides: Partial<Record<ElementType, SelectorConfig>>): void {
  for (const elementType of Object.keys(overrides) as ElementType[]) {
    const config = overrides[elementType];
    if (!config) {
      continue;
    }

    SELECTOR_CONFIG_MAP[elementType] = {
      ...config,
      selectors: [...config.selectors],
    };
  }
}

function isElementType(value: string): value is ElementType {
  return (ELEMENT_TYPES as string[]).includes(value);
}

// Simple cancellation flag for in-flight generation
let CANCEL_REQUESTED = false;

// Multi-character sequence handler
const multiCharacterHandler = new MultiCharacterSequenceHandler();

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  switch (message.type) {
    case 'PING':
      // Respond to ping to indicate content script is ready
      try {
        sendResponse?.({ type: 'PONG' });
      } catch (e) {
        console.error('Failed to send PONG response:', e);
      }
      break;
    case 'APPLY_PROMPT':
      handleApplyPrompt(message as ApplyPromptMessage, sendResponse).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to apply prompt:', errorMessage);
        try {
          sendResponse?.({ success: false, error: errorMessage });
        } catch (e) {
          console.error('Failed to send response:', e);
        }
      });
      break;
    case 'APPLY_MULTI_CHARACTER_PROMPT':
      multiCharacterHandler
        .handleMultiCharacterSequence(message as MultiCharacterMessage, sendResponse)
        .catch((error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Failed to handle multi-character sequence:', errorMessage);
          try {
            sendResponse?.({ success: false, error: errorMessage });
          } catch (e) {
            console.error('Failed to send response:', e);
          }
        });
      break;
    case 'GET_PAGE_STATE':
      handleGetPageState(sendResponse);
      break;
    case 'CANCEL_JOB': {
      CANCEL_REQUESTED = true;
      multiCharacterHandler.cancel(); // Also cancel multi-character sequences
      try {
        sendResponse?.({ success: true });
      } catch (e) {
        console.error('Failed to send response:', e);
      }
      break;
    }
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
      try { chrome.runtime.sendMessage({ type: 'GENERATION_DIAGNOSTICS', step: 'login-check', data: { loggedIn: false } }); } catch {}
      _sendResponse({ success: false, error: 'User not logged in', requiresLogin: true });
      return;
    }

    // Optional: force selector profile via message.selectorProfile (after quick login check to reply fast)
    const forcedProfile = (message as any)?.selectorProfile;
    setForcedSelectorProfile(typeof forcedProfile === 'string' ? forcedProfile : null);
    // Reload overrides to apply the forced profile immediately
    await loadSelectorConfigOverrides();

    // Reset cancellation flag for this run
    CANCEL_REQUESTED = false;

    const promptInput = await resolvePromptInput();
    try { chrome.runtime.sendMessage({ type: 'GENERATION_DIAGNOSTICS', step: 'prompt-input-found', data: { tag: promptInput.tagName, editable: (promptInput as any).isContentEditable === true } }); } catch {}
    console.log(
      'Resolved prompt matches first textarea:',
      promptInput === document.querySelector('textarea')
    );

    const positivePrompt =
      typeof (message as any).prompt === 'string'
        ? ((message as any).prompt as string)
        : ((message as any).prompt?.positive ?? '');
    const negativePrompt =
      typeof (message as any).prompt === 'object' && (message as any).prompt !== null
        ? (message as any).prompt.negative
        : undefined;

    setInputValue(promptInput, positivePrompt);
    try { chrome.runtime.sendMessage({ type: 'GENERATION_DIAGNOSTICS', step: 'positive-set', data: { length: positivePrompt?.length ?? 0 } }); } catch {}
    await applyNegativePrompt(negativePrompt);
    try { chrome.runtime.sendMessage({ type: 'GENERATION_DIAGNOSTICS', step: 'negative-set', data: { length: negativePrompt?.length ?? 0 } }); } catch {}

    const currentValue =
      (promptInput as any).value ??
      (promptInput as HTMLElement).textContent ??
      '';
    console.log('Prompt value right after initial setInputValue:', currentValue);

    if (message.parameters) {
      await applyParameters(message.parameters);
      try { chrome.runtime.sendMessage({ type: 'GENERATION_DIAGNOSTICS', step: 'params-applied', data: { params: message.parameters } }); } catch {}
    }

    try { chrome.runtime.sendMessage({ type: 'GENERATION_DIAGNOSTICS', step: 'before-generate-click' }); } catch {}
    await startGeneration();
    try { chrome.runtime.sendMessage({ type: 'GENERATION_DIAGNOSTICS', step: 'after-generate-click' }); } catch {}
    // 最小生成ループは非同期に実行し、呼び出しへは即時応答
    const count =
      typeof message.parameters?.count === 'number' && Number.isFinite(message.parameters.count)
        ? Math.max(1, Math.floor(message.parameters.count))
        : 1;

    _sendResponse({ success: true });

    (async () => {
      const jobId = `job-${Date.now()}`;
      const monitor = createGenerationMonitor();
      const extractor = createImageUrlExtractor();

      await monitor.startMonitoring(jobId);

      for (let i = 0; i < count; i++) {
        if (CANCEL_REQUESTED) {
          chrome.runtime.sendMessage({ type: 'GENERATION_ERROR', error: 'cancelled' });
          break;
        }
        // 簡易完了待機: 生成完了のテスト用シグナルを監視 or 一定待機
        await waitForGenerationCompletion(5000);

        // 画像URL抽出→DOWNLOAD_IMAGE送信
        console.log('DIAG: extracting-image-urls', { attempt: i + 1 });
        const urls = await extractor.extractImageUrls(1);
        console.log('DIAG: extracted-urls', { count: urls.length, urls: urls.map(u => u.substring(0, 100)) });
        
        if (urls.length > 0) {
          const fileName = `NovelAI_${Date.now()}_${i + 1}.png`;
          console.log('DIAG: sending-download-request', { fileName, url: urls[0].substring(0, 100) });
          chrome.runtime.sendMessage({ type: 'DOWNLOAD_IMAGE', url: urls[0], filename: fileName });
        } else {
          console.warn('DIAG: no-images-found', { attempt: i + 1 });
        }

        chrome.runtime.sendMessage({
          type: 'GENERATION_PROGRESS',
          progress: { current: i + 1, total: count },
        });
      }

      if (!CANCEL_REQUESTED) {
        chrome.runtime.sendMessage({ type: 'GENERATION_COMPLETE', count });
      }
    })().catch(() => {
      // 非同期処理中のエラーはGENERATION_ERRORで扱うのが望ましいが、最小実装では無視
    });
  } catch (error) {
    const errorMessage =
      error instanceof DOMSelectorError
        ? `${error.message} (selectors tried: ${error.attemptedSelectors.join(', ')})`
        : error instanceof Error
          ? error.message
          : String(error);
    try { chrome.runtime.sendMessage({ type: 'GENERATION_DIAGNOSTICS', step: 'error', data: { error: errorMessage } }); } catch {}
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

async function resolvePromptInput(): Promise<HTMLElement> {
  const element = await resolveElement('prompt-input');
  if (element) {
    return element;
  }
  throw new Error('Prompt input field is not available');
}

async function resolveNegativePromptInput(): Promise<HTMLElement | null> {
  const element = await resolveElement('negative-input', { required: false });
  if (!element) {
    return null;
  }

  return element;
}

async function applyNegativePrompt(value: string | undefined): Promise<void> {
  const text = (value ?? '').toString();
  console.log('DIAG: negative-prompt-apply', { textLength: text.length, text: text.substring(0, 100) });

  // Try multiple strategies to find and set negative prompt
  const strategies = [
    // Strategy 1: Use configured selector
    async () => {
      const target = await resolveNegativePromptInput();
      if (target) {
        console.log('DIAG: negative-strategy-1', { tag: target.tagName, contentEditable: (target as any).isContentEditable });
        setInputValue(target as HTMLElement, text);
        return true;
      }
      return false;
    },
    
    // Strategy 2: Search for any contenteditable with negative indicators
    async () => {
      const candidates = document.querySelectorAll(
        'div[contenteditable="true"][data-negative="true"], [data-testid*="negative" i] [contenteditable="true"], [role="textbox"][contenteditable="true"][data-negative="true"], textarea[placeholder*="negative" i], textarea[aria-label*="negative" i]'
      ) as NodeListOf<HTMLElement>;
      
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        console.log('DIAG: negative-strategy-2-candidate', { tag: candidate.tagName, dataNegative: candidate.getAttribute('data-negative'), testId: candidate.getAttribute('data-testid') });
        setInputValue(candidate, text);
        return true;
      }
      return false;
    },
    
    // Strategy 3: Search for textarea with negative-related attributes
    async () => {
      const textareas = document.querySelectorAll('textarea') as NodeListOf<HTMLTextAreaElement>;
      for (let i = 0; i < textareas.length; i++) {
        const textarea = textareas[i];
        const placeholder = (textarea.placeholder || '').toLowerCase();
        const ariaLabel = (textarea.getAttribute('aria-label') || '').toLowerCase();
        const name = (textarea.name || '').toLowerCase();
        const id = (textarea.id || '').toLowerCase();
        
        if (placeholder.includes('negative') || ariaLabel.includes('negative') || name.includes('negative') || id.includes('negative')) {
          console.log('DIAG: negative-strategy-3-textarea', { placeholder, ariaLabel, name, id });
          setInputValue(textarea, text);
          return true;
        }
      }
      return false;
    }
  ];

  let success = false;
  for (let i = 0; i < strategies.length; i++) {
    try {
      success = await strategies[i]();
      if (success) {
        console.log(`DIAG: negative-strategy-${i + 1}-success`);
        break;
      }
    } catch (error) {
      console.log(`DIAG: negative-strategy-${i + 1}-error`, error);
    }
  }

  if (!success && text.trim().length > 0) {
    console.warn('DIAG: negative-prompt-failed', 'All strategies failed to set negative prompt');
    try { chrome.runtime.sendMessage({ type: 'GENERATION_DIAGNOSTICS', step: 'negative-failed', data: { textLength: text.length } }); } catch {}
  }
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
      return ensureInteractableElement(
        element,
        elementType,
        interactable,
        required,
        effectiveConfig,
        startTime
      );
    }

    const element = findElementWithFallback(elementType, effectiveConfig);
    if (!element) {
      return null;
    }
    return ensureInteractableElement(
      element,
      elementType,
      interactable,
      required,
      effectiveConfig,
      startTime
    );
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

function setInputValue(element: HTMLElement, value: string): void {
  const normalised = typeof value === 'string' ? value : String(value ?? '');

  element.focus();

  // Standard inputs/textareas
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.value = normalised;
    if (element instanceof HTMLTextAreaElement) {
      element.textContent = normalised;
    }
    element.defaultValue = normalised;
    element.setAttribute('value', normalised);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  // contenteditable elements
  const isEditable = (element as any).isContentEditable === true || element.getAttribute('contenteditable') === 'true';
  if (isEditable) {
    try {
      // Try execCommand path to inform editors like Slate/ProseMirror
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.addRange(range);
      }
      // Select all then insert text
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand('selectAll', false);
      // eslint-disable-next-line deprecation/deprecation
      const inserted = document.execCommand('insertText', false, normalised);
      if (!inserted) {
        element.textContent = normalised;
      }
    } catch {
      element.textContent = normalised;
    }
    // Fire input-like events to trigger frameworks' listeners
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    // Commit edits in some editors that listen to blur/focusout
    element.dispatchEvent(new Event('blur'));
    element.dispatchEvent(new Event('focusout', { bubbles: true } as any));
    return;
  }
}

function sendKey(el: HTMLElement, key: string, opts: { ctrl?: boolean } = {}): void {
  const options: any = {
    key,
    bubbles: true,
    cancelable: true,
    ctrlKey: !!opts.ctrl,
  };
  el.dispatchEvent(new KeyboardEvent('keydown', options));
  el.dispatchEvent(new KeyboardEvent('keypress', options));
  el.dispatchEvent(new KeyboardEvent('keyup', options));
}

function toHalfWidth(input: string): string {
  return input.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ');
}

function normalizeText(input: string | null | undefined): string {
  const txt = (input || '').toLowerCase();
  return toHalfWidth(txt).replace(/\s+/g, ' ').trim();
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
  let element: HTMLElement | null = null;
  try {
    element = await resolveElement('generate-button', { required: false, interactable: true });
  } catch {
    element = null;
  }
  if (!element) {
    element = fallbackFindGenerateControl();
  }
  if (!element) {
    try { chrome.runtime.sendMessage({ type: 'GENERATION_DIAGNOSTICS', step: 'generate-target', data: { found: false } }); } catch {}
    throw new Error('Generate control not found');
  }

  try {
    const data = {
      tag: (element as HTMLElement).tagName,
      classes: (element as HTMLElement).className,
      text: ((element as HTMLElement).textContent || '').slice(0, 64),
      ariaDisabled: element.getAttribute('aria-disabled') || null,
      disabled: (element as any).disabled === true,
    };
    chrome.runtime.sendMessage({ type: 'GENERATION_DIAGNOSTICS', step: 'generate-target', data });
  } catch {}

  // Wait up to ~3s for clickable state
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const ariaDisabled = element.getAttribute('aria-disabled');
    const isDisabled = (element as any).disabled === true || ariaDisabled === 'true';
    const rect = (element as HTMLElement).getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0;
    const pe = getComputedStyle(element as HTMLElement).pointerEvents !== 'none';
    if (!isDisabled && visible && pe) break;
    await new Promise((r) => setTimeout(r, 150));
  }

  // Ensure element is visible in viewport to avoid blocked events
  try {
    (element as HTMLElement).scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as any });
  } catch {}

  // Prefer native click if available
  if (typeof (element as any).click === 'function') {
    // Send a full click sequence for frameworks that expect it
    const el = element as HTMLElement;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    (element as any).click();
  } else {
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    element.dispatchEvent(clickEvent);
  }

  // Fallback: also try Enter / Ctrl+Enter on prompt editor
  try {
    const maybePrompt = await resolveElement('prompt-input', { required: false, interactable: true });
    if (maybePrompt) {
      sendKey(maybePrompt as HTMLElement, 'Enter');
      sendKey(maybePrompt as HTMLElement, 'Enter', { ctrl: true });
    }
  } catch {
    // ignore
  }
}

function fallbackFindGenerateControl(): HTMLElement | null {
  const selector = [
    '[data-testid*="generate" i]',
    '[data-action*="generate" i]',
    'button',
    '[role="button"]',
    '.sc-4f026a5f-2.sc-883533e0-3',
  ].join(', ');
  const all = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  const wanted = ['generate', 'start', 'run', '生成', '枚', '一枚', '1枚', 'anlas'];
  let best: { el: HTMLElement; score: number } | null = null;

  for (const raw of all) {
    // Prefer the nearest clickable ancestor if this is a span/div
    const el = (raw.closest('button,[role="button"]') as HTMLElement) || raw;
    const text = normalizeText(el.textContent);
    let score = 0;
    for (const w of wanted) if (text.includes(w)) score += 3;
    if (text.includes('1枚のみ生成') || text.includes('1枚') || text.includes('一枚')) score += 4;
    if (text.includes('anlas')) score += 2;
    const rect = el.getBoundingClientRect();
    if (rect.width > 160) score += 1;
    if (el.getAttribute('data-testid')?.toLowerCase().includes('generate')) score += 2;
    if (!best || score > best.score) best = { el, score };
  }

  return best?.el || null;
}

// ===== 最小完了待機 =====
async function waitForGenerationCompletion(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  // 1) テスト用完了マーカー
  while (Date.now() < deadline) {
    if (document.querySelector('.generation-complete')) return;
    // 2) プログレスバー100%相当
    const bar = document.querySelector('[role="progressbar"], .progress-bar') as HTMLElement | null;
    if (bar) {
      const nowAttr = bar.getAttribute('aria-valuenow');
      const maxAttr = bar.getAttribute('aria-valuemax');
      if (nowAttr && maxAttr && parseFloat(nowAttr) >= parseFloat(maxAttr)) return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}
