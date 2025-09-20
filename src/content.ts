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
      '[data-testid=\"prompt-input\"] textarea',
      '[data-testid=\"prompt-input\"]',
      'textarea[aria-label*=\"prompt\" i]',
      'textarea[placeholder*=\"prompt\" i]',
      'textarea[name=\"prompt\"]',
      'textarea[id*=\"prompt\" i]',
      '.prompt-input textarea',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'negative-input': {
    selectors: [
      '#negative-prompt-input',
      '[data-testid=\"negative-prompt\"] textarea',
      '[data-testid=\"negative-prompt\"]',
      'textarea[aria-label*=\"negative\" i]',
      'textarea[placeholder*=\"negative\" i]',
      'textarea[name=\"negative\"]',
      'textarea[id*=\"negative\" i]',
      '.prompt-negative textarea',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'generate-button': {
    selectors: [
      '[data-testid=\"generate-button\"]',
      'button[aria-label*=\"generate\" i]',
      'button[aria-label*=\"生成\" i]',
      'button[type=\"submit\"]',
      '.generate-button',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'seed-input': {
    selectors: [
      '[data-testid=\"seed-input\"] input',
      '[data-testid=\"seed-input\"]',
      'input[name=\"seed\"]',
      'input[id*=\"seed\" i]',
      'input[aria-label*=\"seed\" i]',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'steps-input': {
    selectors: [
      '[data-testid=\"steps-input\"] input',
      'input[name=\"steps\"]',
      'input[id*=\"step\" i]',
      'input[aria-label*=\"steps\" i]',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'sampler-select': {
    selectors: [
      '[data-testid=\"sampler-select\"] select',
      '[data-testid=\"sampler-select\"]',
      'select[name=\"sampler\"]',
      'select[id*=\"sampler\" i]',
      'select[aria-label*=\"sampler\" i]',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'cfg-scale-input': {
    selectors: [
      '[data-testid=\"cfg-input\"] input',
      'input[name=\"cfg\"]',
      'input[id*=\"cfg\" i]',
      'input[aria-label*=\"cfg\" i]',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'count-input': {
    selectors: [
      '[data-testid=\"image-count-input\"] input',
      'input[name=\"imageCount\"]',
      'input[name=\"count\"]',
      'input[id*=\"count\" i]',
      'input[aria-label*=\"count\" i]',
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'progress-indicator': {
    selectors: ['[role=\"progressbar\"]', '.progress-bar'],
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

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  switch (message.type) {
    case 'APPLY_PROMPT':
      handleApplyPrompt(message as ApplyPromptMessage, sendResponse).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to apply prompt:', errorMessage);
        try {
          sendResponse?.({ success: false, error: errorMessage });
        } catch {}
      });
      break;
    case 'GET_PAGE_STATE':
      handleGetPageState(sendResponse);
      break;
    case 'CANCEL_JOB': {
      CANCEL_REQUESTED = true;
      try {
        sendResponse?.({ success: true });
      } catch {}
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
    await applyNegativePrompt(negativePrompt);

    console.log('Prompt value right after initial setInputValue:', promptInput.value);

    if (message.parameters) {
      await applyParameters(message.parameters);
    }

    await startGeneration();
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
        const urls = await extractor.extractImageUrls(1);
        if (urls.length > 0) {
          const fileName = `image_${Date.now()}_${i + 1}.png`;
          chrome.runtime.sendMessage({ type: 'DOWNLOAD_IMAGE', url: urls[0], filename: fileName });
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

async function resolveNegativePromptInput(): Promise<
  HTMLTextAreaElement | HTMLInputElement | null
> {
  const element = await resolveElement('negative-input', { required: false });
  if (!element) {
    return null;
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element;
  }

  console.warn('Negative prompt element is not an input or textarea element; skipping update.');
  return null;
}

async function applyNegativePrompt(value: string | undefined): Promise<void> {
  const target = await resolveNegativePromptInput();
  if (!target) {
    if (value && value.trim().length > 0) {
      console.warn('Negative prompt input was not found; unable to apply provided value.');
    }
    return;
  }

  setInputValue(target, value ?? '');
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

function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const normalised = typeof value === 'string' ? value : String(value ?? '');

  element.focus();
  element.value = normalised;

  if (element instanceof HTMLTextAreaElement) {
    element.textContent = normalised;
  }

  element.defaultValue = normalised;
  element.setAttribute('value', normalised);

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
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
