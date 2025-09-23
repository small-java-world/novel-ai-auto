/**
 * Content Script for NovelAI Auto Generator
 * Handles DOM manipulation on NovelAI website
 */

import type { ApplyPromptMessage, GenerationParameters, Message, PageState } from './types';
// simplified mode: no external monitor or URL extractor
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
import {
  findPerImageDownloadButtons,
  findDownloadForImage,
  clickDownloadButton,
  waitForDownloadButtons,
} from './utils/download-button-finder';

console.log('🚀🚀🚀 NovelAI Auto Generator ENHANCED - Version 1.0.1 🚀🚀🚀');
console.log('✨ この表示が出ればキャッシュクリア成功です！ ✨');
console.log('📦 新機能: 多層防御ダウンロードシステム搭載');
console.log('🔧 Build Time:', new Date().toISOString());

// ページタイトルも一時的に変更してバージョン確認
document.title = `${document.title} [v1.0.1 Enhanced]`;

diag('content-script-enhanced-version', {
  version: '1.0.1',
  name: 'Enhanced',
  timestamp: new Date().toISOString(),
  features: ['multi-layer-download', 'enhanced-logging', 'cache-busted']
});

// 複数回のバージョン確認
[500, 1000, 2000].forEach((delay, index) => {
  setTimeout(() => {
    console.log(`🔄 Version Check ${index + 1}: v1.0.1 Enhanced - ${new Date().toLocaleTimeString()}`);
  }, delay);
});

// アラート表示（一度だけ）
setTimeout(() => {
  if (!sessionStorage.getItem('novelai-enhanced-shown')) {
    alert('✨ NovelAI Auto Generator Enhanced v1.0.1 が読み込まれました！\n新しいダウンロードシステムが有効です。');
    sessionStorage.setItem('novelai-enhanced-shown', 'true');
  }
}, 3000);

function diag(step: string, data?: any): void {
  try {
    chrome.runtime.sendMessage({
      type: 'GENERATION_DIAGNOSTICS',
      step,
      data: { ts: Date.now(), ...(data || {}) },
    });
  } catch {}
}

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
      '.prompt-input-box-undesired-content .ProseMirror',
      '.prompt-input-box-negative-prompt .ProseMirror',
      '.prompt-input-box-undesired-content',
      '.prompt-input-box-negative-prompt',
      '[data-testid="negative-prompt"] [contenteditable="true"]',
      '[data-testid="negative-prompt"] textarea',
      '[role="textbox"][contenteditable="true"][data-negative="true"]',
      'div[contenteditable="true"][data-field="negative"]',
      '#__next textarea[placeholder*="negative" i]',
      'textarea[aria-label*="negative" i]',
      'textarea[placeholder*="negative" i]',
      'textarea[name="negative"]',
      'textarea[id*="negative" i]',
      '.prompt-negative textarea'
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
  'download-anchor': {
    selectors: [
      '.image-gallery a[download]',
      '[data-testid*="download" i] a[download]',
      'a[download]'
    ],
    timeout: DEFAULT_SELECTOR_TIMEOUT,
  },
  'download-button': {
    selectors: [
      '[data-testid*="download" i]',
      'button[aria-label*="download" i]',
      'button[aria-label*="ダウンロード" i]',
      'button[aria-label*="save" i]',
      'button[aria-label*="保存" i]',
      '[data-tooltip*="download" i]',
      '.download-button',
      '[class*="download" i] button',
      '.sc-4f026a5f-2.sc-883533e0-1',
      'button.sc-4f026a5f-2.sc-883533e0-1',
    ],
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

    try { diag('selector-profile-selected', { profile: selectedProfileName }); } catch {}

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

    // Merge override selectors with fallback selectors to avoid overly-narrow profiles breaking resolution
    const fallbackSelectors = (FALLBACK_SELECTOR_CONFIG as any)?.[elementType]?.selectors ?? [];
    const mergedSelectors = Array.from(new Set([...(config.selectors || []), ...fallbackSelectors]));

    SELECTOR_CONFIG_MAP[elementType] = {
      ...config,
      selectors: mergedSelectors,
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

// Forward page-context diagnostics (e.g., network probes) to background
try {
  window.addEventListener('message', (event: MessageEvent) => {
    try {
      if (!event || event.source !== window) return;
      const data: any = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.__nai_network_probe__ === true) {
        chrome.runtime.sendMessage({ type: 'NETWORK_ACTIVITY', method: data.method, url: data.url });
      }
    } catch {}
  });
} catch {}

async function handleApplyPrompt(
  message: ApplyPromptMessage,
  _sendResponse: (_response: unknown) => void
): Promise<void> {
  try {
    // Install lightweight diagnostics for network and UI activity
    try {
      await installNetworkProbes();
    } catch {}
    // Click toggle to enable editing if required by UI
    try { await clickEnableButtonIfPresent(); } catch {}
    if (!checkLoginStatus()) {
      try {
        chrome.runtime.sendMessage({
          type: 'GENERATION_DIAGNOSTICS',
          step: 'login-check',
          data: { loggedIn: false },
        });
      } catch {}
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
    diag('prompt-input-found', {
      tag: promptInput.tagName,
      editable: (promptInput as any).isContentEditable === true,
    });
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

    try {
      diag('apply-payload', {
        charMeta: (message as any)?.charMeta || null,
        selectorProfile: (message as any)?.selectorProfile || null,
        posLen: (positivePrompt || '').length,
        negLen: (negativePrompt || '').toString().length,
      });
    } catch {}

    setInputValue(promptInput, positivePrompt);
    diag('positive-set', { length: positivePrompt?.length ?? 0 });
    // Confirm current field and also log nearby caption-scoped values
    try {
      const anchors = findElementsIncludingText(['キャラクター1', 'キャラクター２', 'キャラクター2', 'キャラクター']);
      if (anchors.length > 0) {
        const near = readNearbyPromptFields(anchors[0]);
        diag('confirm-readback-near-caption', { caption: (anchors[0].textContent || '').trim().slice(0, 40), positiveLen: (near.positive || '').length, negativeLen: (near.negative || '').length });
      } else {
        const near = readNearbyPromptFields(promptInput);
        diag('confirm-readback-generic', { positiveLen: (near.positive || '').length, negativeLen: (near.negative || '').length });
      }
    } catch {}
    await applyNegativePrompt(negativePrompt);
    diag('negative-set', { length: negativePrompt?.length ?? 0 });
    // After negative apply, capture readback again for verification
    try {
      const anchors = findElementsIncludingText(['キャラクター1', 'キャラクター２', 'キャラクター2', 'キャラクター']);
      const baseEl = anchors[0] || promptInput;
      const near = readNearbyPromptFields(baseEl as HTMLElement);
      diag('confirm-readback-after-negative', { positiveLen: (near.positive || '').length, negativeLen: (near.negative || '').length });
    } catch {}

    const currentValue =
      (promptInput as any).value ?? (promptInput as HTMLElement).textContent ?? '';
    console.log('Prompt value right after initial setInputValue:', currentValue);

    if (message.parameters) {
      await applyParameters(message.parameters);
      diag('params-applied', { params: message.parameters });
    }

    // 最小生成ループは非同期に実行し、呼び出しへは即時応答
    const count =
      typeof message.parameters?.count === 'number' && Number.isFinite(message.parameters.count)
        ? Math.max(1, Math.floor(message.parameters.count))
        : 1;
    diag('run-parameters', { requestedCount: count });

    _sendResponse({ success: true });

    (async () => {
      const jobId = `job-${Date.now()}`;
      diag('simple-mode-start', { jobId, count });

      let successfulCount = 0;
      let hadError = false;
      for (let i = 0; i < count; i++) {
        diag('next-iteration-start', { index: i + 1, total: count });
        if (CANCEL_REQUESTED) {
          chrome.runtime.sendMessage({ type: 'GENERATION_ERROR', error: 'cancelled' });
          break;
        }
        // 生成開始
        diag('before-generate-click', { attempt: i + 1 });
        await startGeneration();
        diag('after-generate-click', { attempt: i + 1 });

        // ボタンの 無効化→再有効化 サイクルで完了を判定
        try {
          await waitForGenerateButtonCycle(120000);
          diag('generate-cycle-complete', { attempt: i + 1 });
        } catch (e) {
          hadError = true;
          diag('generate-cycle-timeout', { error: (e as any)?.message || String(e) });
          chrome.runtime.sendMessage({ type: 'GENERATION_ERROR', error: 'generate-cycle-timeout' });
          break;
        }

        // ダウンロードボタンを押下（URL抽出はしない）
        try {
          const clicked = await clickPrimaryDownloadButton();
          if (!clicked) {
            // 追加の短い待機後に再試行
            await new Promise((r) => setTimeout(r, 500));
            await clickPrimaryDownloadButton();
          }
           // 生成を詰まらせないため、作成検知（onCreated）で次ループへ進む
           diag('site-download-wait-start', { timeoutMs: 120000 });
           const ev = await waitForSiteDownloadCreatedOrComplete(10000);
           diag('site-download-event', { event: ev });
           // 完了検知はバックグラウンドで待つ（成否はDIAGに記録）
           void waitForSiteDownloadComplete(120000)
             .then(() => diag('site-download-complete-async'))
             .catch((e) => diag('site-download-error-async', { error: (e as any)?.message || String(e) }));
          successfulCount++;
          chrome.runtime.sendMessage({ type: 'GENERATION_PROGRESS', progress: { current: successfulCount, total: count } });
          continue;
        } catch (e) {
          hadError = true;
          diag('site-download-timeout', { error: (e as any)?.message || String(e) });
          chrome.runtime.sendMessage({ type: 'GENERATION_ERROR', error: 'site-download-timeout' });
          break;
        }
      }

      if (!CANCEL_REQUESTED && !hadError && successfulCount === count) {
        console.log('[生成完了] 画像生成が完了しました。成功数:', successfulCount);
        diag('generation-completed-successfully', { count: successfulCount, timestamp: new Date().toISOString() });
        chrome.runtime.sendMessage({ type: 'GENERATION_COMPLETE', count: successfulCount });
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
    try {
      chrome.runtime.sendMessage({
        type: 'GENERATION_DIAGNOSTICS',
        step: 'error',
        data: { error: errorMessage },
      });
    } catch {}
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
  console.log('DIAG: negative-prompt-apply', {
    textLength: text.length,
    text: text.substring(0, 100),
  });

  try { logSelectorExploration('negative-input'); } catch {}

  const strategies = [
    // Strategy 0: If ProseMirror editor exists, insert via its root and check for label siblings
    async () => {
      try {
        const editor = document.querySelector('.ProseMirror') as HTMLElement | null;
        if (!editor) return false;
        // Heuristic: find label containing Negative/Undesired near the editor
        const label = editor.closest('[class*="prompt-input-box"], [class*="negative"], [aria-label], [role="group"]');
        if (label) {
          setInputValue(editor, text);
          const after = readElementValue(editor);
          diag('negative-after-set', { strategy: 0, length: after.length, sample: after.slice(0, 120) });
          return true;
        }
      } catch {}
      return false;
    },
    async () => {
      const target = await resolveNegativePromptInput();
      if (target) {
        const beforeText = readElementValue(target as HTMLElement).slice(0, 100);
        console.log('DIAG: negative-strategy-1', {
          tag: target.tagName,
          contentEditable: (target as any).isContentEditable,
          before: beforeText,
        });
        setInputValue(target as HTMLElement, text);
        const afterText = readElementValue(target as HTMLElement);
        diag('negative-after-set', { strategy: 1, length: afterText.length, sample: afterText.slice(0, 120) });
        return true;
      }
      return false;
    },
    async () => {
      const candidates = document.querySelectorAll(
        'div[contenteditable="true"][data-negative="true"], [data-testid*="negative" i] [contenteditable="true"], [role="textbox"][contenteditable="true"][data-negative="true"], textarea[placeholder*="negative" i], textarea[aria-label*="negative" i], .prompt-input-box-undesired-content .ProseMirror, .prompt-input-box-negative-prompt .ProseMirror'
      ) as NodeListOf<HTMLElement>;

      diag('negative-candidates', { count: candidates.length });
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i] as HTMLElement;
        const beforeText = readElementValue(candidate as HTMLElement).slice(0, 100);
        console.log('DIAG: negative-strategy-2-candidate', {
          tag: candidate.tagName,
          dataNegative: candidate.getAttribute('data-negative'),
          testId: candidate.getAttribute('data-testid'),
          before: beforeText,
        });
        setInputValue(candidate as HTMLElement, text);
        const afterText = readElementValue(candidate as HTMLElement);
        diag('negative-after-set', { strategy: 2, length: afterText.length, sample: afterText.slice(0, 120) });
        return true;
      }
      return false;
    },
    async () => {
      const textareas = document.querySelectorAll('textarea') as NodeListOf<HTMLTextAreaElement>;
      for (let i = 0; i < textareas.length; i++) {
        const textarea = textareas[i];
        const placeholder = (textarea.placeholder || '').toLowerCase();
        const ariaLabel = (textarea.getAttribute('aria-label') || '').toLowerCase();
        const name = (textarea.name || '').toLowerCase();
        const id = (textarea.id || '').toLowerCase();

        if (
          placeholder.includes('negative') ||
          ariaLabel.includes('negative') ||
          name.includes('negative') ||
          id.includes('negative')
        ) {
          const beforeText = readElementValue(textarea).slice(0, 100);
          console.log('DIAG: negative-strategy-3-textarea', { placeholder, ariaLabel, name, id, before: beforeText });
          setInputValue(textarea, text);
          const afterText = readElementValue(textarea);
          diag('negative-after-set', { strategy: 3, length: afterText.length, sample: afterText.slice(0, 120) });
          return true;
        }
      }
      return false;
    },
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
    try {
      chrome.runtime.sendMessage({
        type: 'GENERATION_DIAGNOSTICS',
        step: 'negative-failed',
        data: { textLength: text.length },
      });
    } catch {}
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
    diag('resolve-element-start', {
      elementType,
      required,
      interactable,
      timeout: effectiveConfig.timeout,
      selectorsTried: effectiveConfig.selectors.length,
    });
  } catch {}

  try {
    if (required) {
      const element = await waitForElementWithTimeout(elementType, effectiveConfig);
      const ensured = ensureInteractableElement(
          element,
          elementType,
          interactable,
          required,
          effectiveConfig,
          startTime
        );
      if (ensured) {
        try {
          const rect = ensured.getBoundingClientRect();
          diag('resolve-element-ok', {
            elementType,
            tag: ensured.tagName,
            classes: (ensured as HTMLElement).className,
            rect: { w: rect.width, h: rect.height },
          });
        } catch {}
      }
      return ensured;
    }

    const element = findElementWithFallback(elementType, effectiveConfig);
    if (!element) {
      return null;
    }
    const ensured = ensureInteractableElement(
        element,
        elementType,
        interactable,
        required,
        effectiveConfig,
        startTime
      );
    if (ensured) {
      try {
        const rect = ensured.getBoundingClientRect();
        diag('resolve-element-ok', {
          elementType,
          tag: ensured.tagName,
          classes: (ensured as HTMLElement).className,
          rect: { w: rect.width, h: rect.height },
        });
      } catch {}
    }
    return ensured;
  } catch (error) {
    if (!required && error instanceof DOMSelectorError && error.type === 'timeout') {
      try {
        diag('resolve-element-timeout', { elementType, durationMs: Date.now() - startTime });
      } catch {}
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
  try {
    diag('element-not-interactable', {
      elementType,
      reason,
      selectors: config.selectors.slice(0, 10),
      durationMs: Date.now() - startTime,
    });
  } catch {}
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
  const isEditable =
    (element as any).isContentEditable === true ||
    element.getAttribute('contenteditable') === 'true';
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

function readElementValue(element: HTMLElement): string {
  try {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value || '';
    }
    const isEditable = (element as any).isContentEditable === true || element.getAttribute('contenteditable') === 'true';
    if (isEditable) {
      return (element.textContent || '').trim();
    }
    return (element.textContent || '').trim();
  } catch {
    return '';
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
  return input
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ');
}

function normalizeText(input: string | null | undefined): string {
  const txt = (input || '').toLowerCase();
  return toHalfWidth(txt).replace(/\s+/g, ' ').trim();
}

// Try to click an enable/toggle button before editing, if present
async function clickEnableButtonIfPresent(): Promise<void> {
  try {
    const btn = document.querySelector('button.sc-4f026a5f-2.iaNkyw') as HTMLButtonElement | null;
    if (!btn) return;
    const label = (btn.textContent || '').trim();
    // Only click when the button looks like a toggle and is not disabled
    const disabled = btn.getAttribute('aria-disabled') === 'true' || (btn as any).disabled === true;
    if (disabled) return;
    await clickElementRobustly(btn);
    diag('enable-toggle-clicked', { label: label.slice(0, 40) });
    await new Promise((r) => setTimeout(r, 150));
  } catch {}
}

function findElementsIncludingText(patterns: string[]): HTMLElement[] {
  try {
    const all = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, label, div, span')) as HTMLElement[];
    const out: HTMLElement[] = [];
    const lowers = patterns.map((p) => normalizeText(p));
    for (const el of all) {
      const t = normalizeText(el.textContent || '');
      if (lowers.some((p) => p.length > 0 && t.includes(p))) {
        out.push(el);
      }
    }
    return out;
  } catch {
    return [];
  }
}

function readNearbyPromptFields(anchor: HTMLElement): { positive?: string; negative?: string } {
  const scope: HTMLElement = (anchor.closest('[class*="section"], [role="group"], [class*="card"], [class*="panel"]') as HTMLElement) || anchor.parentElement || document.body;
  // Positive: prefer ProseMirror without [data-negative]
  const posEl = (scope.querySelector('.ProseMirror:not([data-negative])') as HTMLElement)
    || (scope.querySelector('textarea') as HTMLElement)
    || (scope.querySelector('[contenteditable="true"]') as HTMLElement);
  // Negative: prefer elements with negative hints
  const negEl = (scope.querySelector('.prompt-input-box-undesired-content .ProseMirror, .prompt-input-box-negative-prompt .ProseMirror') as HTMLElement)
    || (scope.querySelector('[data-negative="true"]') as HTMLElement)
    || (scope.querySelector('textarea[aria-label*="negative" i], textarea[placeholder*="negative" i]') as HTMLElement);
  return {
    positive: posEl ? readElementValue(posEl) : undefined,
    negative: negEl ? readElementValue(negEl) : undefined,
  };
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
    try {
      await setSteps(parameters.steps);
    } catch (error) {
      // 【エラーハンドリング】: stepsバリデーションエラーをキャッチしてUIに送信
      const errorMessage = error instanceof Error ? error.message : 'Steps設定でエラーが発生しました';
      
      try {
        chrome.runtime.sendMessage({
          type: 'GENERATION_ERROR',
          error: errorMessage,
          step: 'parameters-application',
          data: { 
            parameter: 'steps',
            value: parameters.steps,
            maxAllowed: 27
          },
        });
      } catch {
        // メッセージ送信エラーは無視
      }
      
      // 【例外再投げ】: エラーを上位に伝播
      throw error;
    }
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
  // 【バリデーション】: steps値が28以上の場合はエラーとして処理
  if (steps >= 28) {
    const errorMessage = `Steps値が制限を超えています: ${steps} (最大値: 27)`;
    
    // 【UIログ表示】: エラーメッセージをUIに送信
    try {
      chrome.runtime.sendMessage({
        type: 'GENERATION_DIAGNOSTICS',
        step: 'steps-validation',
        data: { 
          error: errorMessage,
          steps: steps,
          maxAllowed: 27
        },
      });
    } catch {
      // メッセージ送信エラーは無視
    }
    
    // 【コンソールログ】: デバッグ用のログ出力
    console.error('Steps validation failed:', errorMessage);
    
    // 【エラー例外】: バリデーション失敗で例外を投げる
    throw new Error(errorMessage);
  }
  
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
    diag('generate-target', { found: false });
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
    diag('generate-target', data);
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
    (element as HTMLElement).scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: 'instant' as any,
    });
  } catch {}

  // Robust click sequence
  await clickElementRobustly(element as HTMLElement);

  // Fallback: also try Enter / Ctrl+Enter on prompt editor
  try {
    const maybePrompt = await resolveElement('prompt-input', {
      required: false,
      interactable: true,
    });
    if (maybePrompt) {
      sendKey(maybePrompt as HTMLElement, 'Enter');
      sendKey(maybePrompt as HTMLElement, 'Enter', { ctrl: true });
      diag('generate-enter-fallback');
    }
  } catch {
    // ignore
  }

  // Post-click: handle potential confirmation dialogs
  await handlePossibleConfirmationModal();

  // Post-click verification: if generate button didn't become disabled or no progress markers, try form submit
  try {
    const changed = await waitForCondition(() => {
      const disabled = element?.getAttribute('aria-disabled') === 'true' || (element as any)?.disabled === true;
      const progress = document.querySelector('[role="progressbar"], .progress-bar');
      return !!disabled || !!progress;
    }, 800);
    if (!changed) {
      diag('generate-no-state-change');
      const form = (element as HTMLElement).closest('form');
      if (form) {
        try {
          (form as HTMLFormElement).requestSubmit?.();
          diag('generate-form-submit', { method: 'requestSubmit' });
        } catch {
          try {
            (form as HTMLFormElement).submit();
            diag('generate-form-submit', { method: 'submit' });
          } catch {}
        }
      }
    } else {
      diag('generate-state-change-detected');
    }
  } catch {}
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

// ===== シンプル完了判定: 生成ボタンの 無効化→再有効化 サイクル待機 =====
async function waitForGenerateButtonCycle(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let sawDisabled = false;
  let lastState: 'disabled' | 'enabled' | 'unknown' = 'unknown';

  function findCurrentGenerateButton(): HTMLElement | null {
    try {
      // interactable=false で無効状態でも拾えるようにする
      return (
        (waitlessResolveGenerate(false)) ||
        fallbackFindGenerateControl()
      );
    } catch {
      return fallbackFindGenerateControl();
    }
  }

  function isDisabled(el: HTMLElement | null): boolean {
    if (!el) return false;
    // 属性/プロパティ
    const aria = el.getAttribute('aria-disabled');
    if (aria === 'true') return true;
    if ((el as any).disabled === true) return true;
    // CSSクラスでの無効/処理中表現
    const cls = (el.className || '').toLowerCase();
    if (/(^|\s)(disabled|is-disabled|loading|busy|processing)(\s|$)/.test(cls)) return true;
    // pointer-eventsでのブロック
    try {
      const pe = getComputedStyle(el).pointerEvents;
      if (pe === 'none') return true;
    } catch {}
    // 祖先に無効表現
    const anc = el.closest('[aria-disabled="true"], .disabled, .is-disabled');
    if (anc) return true;
    // 進捗インジケータ: 値が max 未満のときのみ生成中とみなす
    const bar = document.querySelector('[role="progressbar"], .progress-bar') as HTMLElement | null;
    if (bar) {
      const nowAttr = bar.getAttribute('aria-valuenow');
      const maxAttr = bar.getAttribute('aria-valuemax');
      if (nowAttr !== null && maxAttr !== null) {
        const now = parseFloat(nowAttr);
        const max = parseFloat(maxAttr);
        if (Number.isFinite(now) && Number.isFinite(max)) {
          if (now < max) return true; // generating
          if (now >= max) return false; // completed
        }
      }
      // 代替: アクティブ状態のクラス名で判定（なければ既定は非生成とする）
      const bcls = (bar.className || '').toLowerCase();
      if (/(active|loading|indeterminate|busy)/.test(bcls)) return true;
    }
    return false;
  }

  function waitlessResolveGenerate(interactable: boolean): HTMLElement | null {
    try {
      // 1秒の低タイムアウトで素早く探す
      const cfg = SELECTOR_CONFIG_MAP['generate-button'];
      if (!cfg) return null;
      const quick: SelectorConfig = { ...cfg, timeout: 200 } as any;
      const el = findElementWithFallback('generate-button', quick);
      if (!el) return null;
      if (!interactable) return el;
      const v = validateElementInteractable(el);
      return v.isInteractable ? el : el; // interactable要求でも参照だけ返す
    } catch {
      return null;
    }
  }

  while (Date.now() < deadline) {
    const btn = findCurrentGenerateButton();
    const disabled = isDisabled(btn);
    const state: 'disabled' | 'enabled' = disabled ? 'disabled' : 'enabled';
    if (state !== lastState) {
      lastState = state;
      diag('generate-button-state', { state });
    }
    if (disabled) {
      sawDisabled = true;
    } else if (sawDisabled && !disabled) {
      // 無効化を一度でも観測後、再有効化で完了
      await new Promise((r) => setTimeout(r, 300));
      return;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error('generate-button-cycle-timeout');
}

// ===== ダウンロードボタン押下（URL抽出せず、サイトのDL機構に任せる） =====
async function clickPrimaryDownloadButton(): Promise<boolean> {
  // 直近画像の近傍ボタン優先 → ギャラリー内スコープ → 監視フォールバック
  try {
    const gallery = (document.querySelector('.novelai-gallery, .image-gallery, [data-testid*="gallery" i]') as HTMLElement | null) || document.body;
    try { diag('dl-gallery', { scoped: gallery !== document.body, classes: (gallery as HTMLElement).className || null }); } catch {}
    const imgs = Array.from(gallery.querySelectorAll('img')) as HTMLImageElement[];
    let targetImg: HTMLImageElement | null = null;
    for (let i = imgs.length - 1; i >= 0; i--) {
      const img = imgs[i];
      if (img.naturalWidth > 0 && img.naturalHeight > 0) { targetImg = img; break; }
    }
    try {
      if (targetImg) {
        const r = targetImg.getBoundingClientRect();
        diag('dl-target-image', { src: (targetImg.getAttribute('src') || '').slice(0, 120), rect: { w: Math.round(r.width), h: Math.round(r.height) } });
      } else {
        diag('dl-target-image', { src: null });
      }
    } catch {}

    let button: HTMLElement | null = null;
    if (targetImg) {
      button = findDownloadForImage(targetImg as any);
    }

    const scopeForList: Element =
      (button?.closest('[class*="card"], [class*="history"], [class*="image"]') as Element) ||
      (targetImg?.closest('[class*="card"], [class*="history"], [class*="image"]') as Element) ||
      gallery;

    // 候補列挙（ギャラリー/カードに限定）
    const rawCandidates = findPerImageDownloadButtons(scopeForList);
    const candidates = Array.from(rawCandidates);

    function isInBlockedContext(el: Element): boolean {
      const blocked = el.closest('[role="dialog"], [aria-modal="true"], .modal, .ReactModal__Content');
      if (blocked) return true;
      const classes = (el.className || '').toString().toLowerCase();
      if (classes.includes('osano') || classes.includes('consent')) return true;
      return false;
    }

    function scoreCandidate(el: HTMLElement): { score: number; reasons: string[] } {
      const reasons: string[] = [];
      let score = 0;
      // 近接度（画像右上近傍）
      if (targetImg) {
        try {
          const ir = targetImg.getBoundingClientRect();
          const br = el.getBoundingClientRect();
          const cx = Math.max(0, Math.max(ir.left - br.right, br.left - ir.right));
          const cy = Math.max(0, Math.max(ir.top - br.bottom, br.top - ir.bottom));
          const dist = Math.sqrt(cx * cx + cy * cy);
          const prox = Math.max(0, 200 - Math.min(200, dist)) / 20; // 0..10
          score += prox;
          reasons.push(`prox+${prox.toFixed(1)}`);
          if (br.left >= ir.right - 120 && br.top <= ir.top + 120) { score += 2; reasons.push('ru-corner+2'); }
        } catch {}
      }
      // サイズ（小さめアイコン優遇）
      try {
        const br = el.getBoundingClientRect();
        if (br.width <= 48 && br.height <= 48) { score += 1; reasons.push('small+1'); }
        if (br.width <= 28 && br.height <= 28) { score += 1; reasons.push('tiny+1'); }
      } catch {}
      // 属性/テキスト
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      const text = (el.textContent || '').toLowerCase();
      if (/download|保存|save/.test(aria + ' ' + title + ' ' + text)) { score += 4; reasons.push('label+4'); }
      // クラスヒント
      const cls = (el.className || '').toString().toLowerCase();
      if (cls.includes('download')) { score += 5; reasons.push('class-download+5'); }
      if (cls.includes('sc-883533e0-1')) { score += 1; reasons.push('nai-class+1'); }
      // ブロック文脈
      if (isInBlockedContext(el)) { score -= 100; reasons.push('blocked-ctx-100'); }
      return { score, reasons };
    }

    let annotated = candidates.map((el) => {
      const { score, reasons } = scoreCandidate(el);
      const br = el.getBoundingClientRect();
      return {
        el,
        score,
        reasons,
        tag: el.tagName,
        classes: (el.className || '').toString(),
        ariaLabel: el.getAttribute('aria-label') || '',
        title: el.getAttribute('title') || '',
        text: (el.textContent || '').slice(0, 40) || '',
        rect: { w: Math.round(br.width), h: Math.round(br.height) },
      };
    }).sort((a, b) => b.score - a.score);

    try {
      diag('dl-candidates', {
        scope: scopeForList !== document.body ? 'scoped' : 'body',
        total: annotated.length,
        top: annotated.slice(0, 5).map((a) => ({
          score: Number(a.score.toFixed(2)),
          reasons: a.reasons,
          tag: a.tag,
          classes: a.classes,
          ariaLabel: a.ariaLabel,
          title: a.title,
          text: a.text,
          rect: a.rect,
        })),
      });
    } catch {}

    // ヒントベース候補（aria/title/img/src/use=save|download）: 候補0件時の救済
    if (annotated.length === 0) {
      try {
        // ホバーで制御表示
        if (targetImg) {
          const opts = { bubbles: true, cancelable: true, composed: true } as any;
          targetImg.dispatchEvent(new MouseEvent('mouseover', opts));
          targetImg.dispatchEvent(new MouseEvent('mousemove', { ...opts, clientX: targetImg.getBoundingClientRect().right - 4, clientY: targetImg.getBoundingClientRect().top + 4 }));
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {}

      const hintScope: Element = overlayOr(scopeForList);
      const hintSel = [
        '[title*="save" i]','[aria-label*="save" i]','[data-testid*="save" i]',
        '[title*="download" i]','[aria-label*="download" i]','[data-testid*="download" i]',
        'img[src*="save" i]','img[src*="download" i]','svg[aria-label*="save" i]','svg[aria-label*="download" i]','use[href*="save" i]','use[href*="download" i]'
      ].join(',');
      const hintNodes = Array.from(hintScope.querySelectorAll(hintSel)) as HTMLElement[];
      const hintButtons: HTMLElement[] = [];
      for (const node of hintNodes) {
        const clickable = (node.closest('button, [role="button"], a') as HTMLElement) || node;
        if (clickable && !isInBlockedContext(clickable)) hintButtons.push(clickable);
      }
      const dedup = Array.from(new Set(hintButtons));
      annotated = dedup.map((el) => {
        const { score, reasons } = scoreCandidate(el);
        const br = el.getBoundingClientRect();
        return {
          el,
          score,
          reasons: ['hint', ...reasons],
          tag: el.tagName,
          classes: (el.className || '').toString(),
          ariaLabel: el.getAttribute('aria-label') || '',
          title: el.getAttribute('title') || '',
          text: (el.textContent || '').slice(0, 40) || '',
          rect: { w: Math.round(br.width), h: Math.round(br.height) },
        };
      }).sort((a, b) => b.score - a.score);
      try { diag('dl-hint-candidates', { total: annotated.length, top: annotated.slice(0, 5).map(a => ({ score: Number(a.score.toFixed(2)), reasons: a.reasons, tag: a.tag, classes: a.classes })) }); } catch {}
    }

    function overlayOr(base: Element): Element {
      const ov = document.querySelector('[role="dialog"], .ReactModal__Content, .Dialog') as HTMLElement | null;
      return ov || base;
    }

    if (!button && annotated.length > 0 && annotated[0].score > -50) {
      button = annotated[0].el;
      try { diag('dl-selected', { strategy: 'scored-near-image', score: annotated[0].score, classes: annotated[0].classes }); } catch {}
    }

    if (!button) {
      // フォールバック: ギャラリー全体で先頭候補
      const buttons = findPerImageDownloadButtons(gallery);
      button = buttons[0] || null;
      try { if (button) diag('dl-selected', { strategy: 'gallery-first', classes: (button as HTMLElement).className || '' }); } catch {}
    }

    if (!button) {
      // 少し待って監視で拾う
      const found = await new Promise<HTMLElement | null>((resolve) => {
        const mo = waitForDownloadButtons((btns) => resolve(btns[0] || null), 3000);
        setTimeout(() => { try { mo.disconnect(); } catch {} resolve(null); }, 3100);
      });
      button = found;
      try { if (button) diag('dl-selected', { strategy: 'observer', classes: (button as HTMLElement).className || '' }); } catch {}
    }

    if (!button && targetImg) {
      // オーバーレイを開いてから再検索（画像ビューア内の保存ボタン）
      try {
        await clickElementRobustly(targetImg);
        await new Promise((r) => setTimeout(r, 250));
        const overlay = document.querySelector('[role="dialog"], .ReactModal__Content, .Dialog') as HTMLElement | null;
        if (overlay) {
          // オーバーレイ内の save/download 明示ボタン優先
          const explicit = overlay.querySelector('button[aria-label*="save" i], button[title*="save" i], [data-testid*="save" i], button[aria-label*="download" i], button[title*="download" i]') as HTMLElement | null;
          if (explicit) {
            button = explicit;
            try { diag('dl-selected', { strategy: 'overlay-explicit', classes: (button as HTMLElement).className || '' }); } catch {}
          }
          if (!button) {
            const inOverlay = findPerImageDownloadButtons(overlay);
            if (inOverlay && inOverlay.length > 0) {
              button = inOverlay[0];
              try { diag('dl-selected', { strategy: 'overlay', classes: (button as HTMLElement).className || '' }); } catch {}
            }
          }
        }
      } catch {}
    }

    if (button) {
      try { chrome.runtime.sendMessage({ type: 'DOWNLOAD_CLICKED', info: { tag: button.tagName, classes: button.className } }); } catch {}
      // 事前にホバーでオーバーレイを表示（NovelAIはホバーで出ることがある）
      try {
        const opts = { bubbles: true, cancelable: true, composed: true } as any;
        button.dispatchEvent(new MouseEvent('mouseover', opts));
        (button.closest('[class*="card"], [class*="image"], [class*="history"]') as HTMLElement | null)?.dispatchEvent(new MouseEvent('mouseover', opts));
      } catch {}
      const ok = clickDownloadButton(button);
      if (ok) {
        diag('download-button-clicked-simple');
        return true;
      }
    }
    diag('download-button-not-found-simple');

    // 最終フォールバック: 表示中の画像の data/blob を直接ダウンロード
    try {
      if (targetImg && typeof targetImg.src === 'string' && targetImg.src.length > 0) {
        const href = await resolveDownloadHrefFromImage(targetImg);
        if (href) {
          const a = document.createElement('a');
          a.href = href;
          a.download = `novelai_${Date.now()}.png`;
          a.rel = 'noopener';
          a.target = '_blank';
          document.body.appendChild(a);
            try { chrome.runtime.sendMessage({ type: 'DOWNLOAD_CLICKED', info: { strategy: 'fallback-anchor' } }); } catch {}
            diag('download-clicked-fallback');
          a.click();
          setTimeout(() => { try { a.remove(); } catch {} }, 0);
          diag('dl-fallback-anchor', { kind: href.startsWith('data:') ? 'data' : href.startsWith('blob:') ? 'blob' : 'http', hrefSample: href.slice(0, 60) });
          return true;
        }
      }
    } catch (e) {
      diag('dl-fallback-error', { error: (e as any)?.message || String(e) });
    }
    return false;
  } catch (e) {
    diag('download-button-error-simple', { error: (e as any)?.message || String(e) });
    return false;
  }
}

async function resolveDownloadHrefFromImage(img: HTMLImageElement): Promise<string | null> {
  try {
    const src = img.src || '';
    if (src.startsWith('data:')) return src;
    if (src.startsWith('blob:')) {
      const r = await fetch(src);
      const b = await r.blob();
      return await new Promise<string>((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ''));
        fr.onerror = () => resolve('');
        fr.readAsDataURL(b);
      });
    }
    return src || null;
  } catch {
    return null;
  }
}

// ===== 生成完了待機 =====
async function _waitForGenerationCompletion(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastImageCount = 0;
  let lastNow: string | null = null;
  let lastMax: string | null = null;
  
  console.log('DIAG: generation-wait-start', { timeoutMs });
  
  while (Date.now() < deadline) {
    // 1) テスト用完了マーカー
    if (document.querySelector('.generation-complete')) {
      console.log('DIAG: generation-complete-marker-found');
      return;
    }
    
    // 2) プログレスバー100%相当
    const bar = document.querySelector('[role="progressbar"], .progress-bar') as HTMLElement | null;
    if (bar) {
      const nowAttr = bar.getAttribute('aria-valuenow');
      const maxAttr = bar.getAttribute('aria-valuemax');
      if (nowAttr !== lastNow || maxAttr !== lastMax) {
        lastNow = nowAttr;
        lastMax = maxAttr;
        diag('generation-progress', { now: nowAttr, max: maxAttr });
      }
      if (nowAttr && maxAttr && parseFloat(nowAttr) >= parseFloat(maxAttr)) {
        console.log('DIAG: generation-progress-complete', { now: nowAttr, max: maxAttr });
        return;
      }
    }
    
    // 3) 画像要素の出現を監視（ギャラリー配下に限定して誤検知を低減）
    const galleryScope = (document.querySelector('.novelai-gallery, .image-gallery, [data-testid*="gallery" i]') as HTMLElement | null) || document.body;
    const images = galleryScope.querySelectorAll('img[src*="https"]');
    if (images.length > lastImageCount) {
      console.log('DIAG: new-image-detected', { count: images.length, previous: lastImageCount });
      diag('images-count-increase', { count: images.length, previous: lastImageCount });
      lastImageCount = images.length;
      // 新しい画像が出現したら少し待ってから完了とみなす
      await new Promise((r) => setTimeout(r, 2000));
      return;
    }
    
    // 4) 生成ボタンの状態変化を監視
    const generateButton = document.querySelector('button[aria-disabled="true"]');
    if (generateButton) {
      // 生成中は待機継続
    } else {
      // 生成ボタンが有効になったら完了の可能性
      const hasImages = document.querySelectorAll('img[src*="https"]').length > 0;
      if (hasImages) {
        console.log('DIAG: generation-button-enabled-with-images');
        await new Promise((r) => setTimeout(r, 1000));
        return;
      }
    }
    
    await new Promise((r) => setTimeout(r, 500));
  }
  
  console.log('DIAG: generation-wait-timeout', { timeoutMs });
}

// ===== 補助: クリック強化・確認ダイアログ対応・診断 =====
let _NETWORK_PROBES_INSTALLED = false;
async function installNetworkProbes(): Promise<void> {
  // ページCSPのため、ネットワークプローブ注入は無効化（webRequest/ダウンロードAPIで代替）
  _NETWORK_PROBES_INSTALLED = true;
}

async function clickElementRobustly(el: HTMLElement): Promise<void> {
  try {
    const rect = el.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const opts = { bubbles: true, cancelable: true, composed: true } as any;
    el.dispatchEvent(new PointerEvent('pointerover', opts));
    el.dispatchEvent(new MouseEvent('mouseover', opts));
    el.dispatchEvent(new PointerEvent('pointerenter', opts));
    el.dispatchEvent(new MouseEvent('mouseenter', opts));
    el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: center.x, clientY: center.y }));
    el.dispatchEvent(new MouseEvent('mousedown', { ...opts, clientX: center.x, clientY: center.y, button: 0 }));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: center.x, clientY: center.y }));
    el.dispatchEvent(new MouseEvent('mouseup', { ...opts, clientX: center.x, clientY: center.y, button: 0 }));
    if (typeof (el as any).click === 'function') {
      (el as any).click();
    } else {
      el.dispatchEvent(new MouseEvent('click', { ...opts, clientX: center.x, clientY: center.y }));
    }
  } catch {
    try {
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
    } catch {}
  }
}

async function handlePossibleConfirmationModal(): Promise<void> {
  try {
    // Wait briefly for dialog
    await waitForCondition(() => {
      return !!document.querySelector('[role="dialog"], .modal, .Dialog, .ReactModal__Content');
    }, 600);

    const dialog = document.querySelector('[role="dialog"], .modal, .Dialog, .ReactModal__Content') as HTMLElement | null;
    if (!dialog) return;
  diag('confirm-dialog-found');

    const wanted = ['generate', 'yes', 'ok', 'confirm', 'use', 'start', 'はい', '生成', '確定', '続行'];
    const buttons = Array.from(dialog.querySelectorAll('button, [role="button"], .primary')) as HTMLElement[];
    let best: HTMLElement | null = null;
    let bestScore = -1;
    for (const b of buttons) {
      const text = normalizeText(b.textContent);
      let score = 0;
      for (const w of wanted) if (text.includes(w)) score += 2;
      if (b.className.toLowerCase().includes('primary')) score += 1;
      if (score > bestScore) { best = b; bestScore = score; }
    }
    if (best) {
      await clickElementRobustly(best);
    diag('confirm-dialog-clicked', { text: normalizeText(best.textContent).slice(0, 64) });
    }
  } catch {}
}

async function waitForCondition(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (predicate()) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

// ===== NovelAI 内蔵ダウンロードの優先クリック → URL取得 =====
async function _tryBuiltInDownload(timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  try {
    diag('builtin-download-start-new-version', { timestamp: new Date().toISOString() });
    console.log('[ダウンロード] 新しいダウンロードボタン検索を開始');

    // 1) 新しいダウンロードボタン検索機能を優先使用
    let downloadButtons: HTMLElement[] = [];
    try {
      downloadButtons = findPerImageDownloadButtons();
      console.log('[ダウンロード] 新機能でボタン検索結果:', downloadButtons.length);
    } catch (error) {
      console.warn('[ダウンロード] 新機能でエラー:', error);
      diag('download-new-function-error', { error: String(error) });
    }

    diag('download-buttons-found-new', { count: downloadButtons.length });

    if (downloadButtons.length > 0) {
      const button = downloadButtons[0];
      diag('download-button-found-new', {
        tag: button.tagName,
        classes: button.className,
        text: button.textContent?.substring(0, 50) || '',
        ariaLabel: button.getAttribute('aria-label') || '',
        title: button.getAttribute('title') || ''
      });

      try {
        chrome.runtime.sendMessage({ type: 'DOWNLOAD_CLICKED', info: { tag: button.tagName, classes: button.className } });
      } catch {}

      const clickSuccess = clickDownloadButton(button);
      if (clickSuccess) {
        diag('download-button-clicked-new');
        await new Promise((r) => setTimeout(r, 300));

        const waitStart = Date.now();
        diag('download-waiting-start');
        while (Date.now() < deadline) {
          const a = document.querySelector('a[download]') as HTMLAnchorElement | null;
          if (a?.href) {
            diag('download-anchor-after-click', { href: a.href.substring(0, 200) });
            return a.href;
          }
          const dataUrlEl = document.querySelector('[data-download-url]') as HTMLElement | null;
          const dataUrl = dataUrlEl?.getAttribute?.('data-download-url') || '';
          if (dataUrl.startsWith('http') || dataUrl.startsWith('data:')) {
            diag('download-data-attr-found', { href: dataUrl.substring(0, 200) });
            return dataUrl;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
        diag('download-waiting-timeout', { waitedMs: Date.now() - waitStart });
      } else {
        diag('download-button-click-failed-new');
      }
    }

    // 2) 追加の強力なダウンロードボタン検索
    console.log('[ダウンロード] 追加検索を実行');
    const additionalButtons = document.querySelectorAll(`
      button[aria-label*="download" i],
      button[title*="download" i],
      button[aria-label*="ダウンロード"],
      button[title*="ダウンロード"],
      a[download],
      [role="button"][aria-label*="download" i],
      [role="button"][title*="download" i]
    `) as NodeListOf<HTMLElement>;

    diag('download-additional-search', { count: additionalButtons.length });
    console.log('[ダウンロード] 追加検索結果:', additionalButtons.length);

    if (additionalButtons.length > 0) {
      for (const button of Array.from(additionalButtons) as HTMLElement[]) {
        console.log('[ダウンロード] 追加検索ボタン:', {
          tag: button.tagName,
          ariaLabel: button.getAttribute('aria-label'),
          title: button.getAttribute('title'),
          text: button.textContent?.substring(0, 30)
        });

        try {
          (button as HTMLElement).click?.();
          console.log('[ダウンロード] 追加検索ボタンをクリック');
          await new Promise((r) => setTimeout(r, 500));

          const anchor = document.querySelector('a[download]') as HTMLAnchorElement | null;
          if (anchor?.href) {
            diag('download-anchor-after-additional', { href: anchor.href.substring(0, 200) });
            console.log('[ダウンロード] 追加検索でダウンロードURL取得:', anchor.href.substring(0, 100));
            return anchor.href;
          }
        } catch (error) {
          console.warn('[ダウンロード] 追加検索ボタンクリックエラー:', error);
        }
      }
    }

    // 3) フォールバック: 既存のセレクターベース検索
    try { logSelectorExploration('download-anchor'); } catch {}
    try { logSelectorExploration('download-button'); } catch {}

    const anchor = await resolveElement('download-anchor', { required: false, interactable: true });
    if (anchor instanceof HTMLAnchorElement && typeof anchor.href === 'string' && anchor.href.length > 0) {
      diag('download-anchor-found-fallback', { href: anchor.href.substring(0, 200) });
      return anchor.href;
    }

    const button = await resolveElement('download-button', { required: false, interactable: true });
    if (button) {
      diag('download-button-found-fallback', { tag: (button as HTMLElement).tagName, classes: (button as HTMLElement).className });
      try {
        chrome.runtime.sendMessage({ type: 'DOWNLOAD_CLICKED', info: { tag: (button as HTMLElement).tagName, classes: (button as HTMLElement).className } });
      } catch {}
      try {
        (button as HTMLElement).focus();
        (button as HTMLElement).dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      } catch {}
      await clickElementRobustly(button as HTMLElement);
      await new Promise((r) => setTimeout(r, 300));

      const waitStart = Date.now();
      while (Date.now() < deadline) {
        const a = document.querySelector('a[download]') as HTMLAnchorElement | null;
        if (a?.href) {
          diag('download-anchor-after-fallback', { href: a.href.substring(0, 200) });
          return a.href;
        }
        const dataUrlEl = document.querySelector('[data-download-url]') as HTMLElement | null;
        const dataUrl = dataUrlEl?.getAttribute?.('data-download-url') || '';
        if (dataUrl.startsWith('http') || dataUrl.startsWith('data:')) {
          diag('download-data-attr-found', { href: dataUrl.substring(0, 200) });
          return dataUrl;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      diag('download-waiting-timeout', { waitedMs: Date.now() - waitStart });
    }

    // 3) 最終フォールバック: ヒューリスティック検索
    const heuristic = findDownloadButtonHeuristic();
    if (heuristic) {
      diag('download-button-heuristic', { classes: heuristic.className });
      await clickElementRobustly(heuristic);
      const heuristicDeadline = Date.now() + 1000;
      while (Date.now() < heuristicDeadline) {
        const a = document.querySelector('a[download]') as HTMLAnchorElement | null;
        if (a?.href) {
          diag('download-anchor-after-heuristic', { href: a.href.substring(0, 200) });
          return a.href;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  } catch (e) {
    diag('download-built-in-probe-error', { error: (e as any)?.message || String(e) });
  }
  return null;
}

function findDownloadButtonHeuristic(): HTMLElement | null {
  try {
    // 画像またはギャラリー領域を特定
    const gallery = document.querySelector('.novelai-gallery, .image-gallery, [data-testid*="gallery" i]') as HTMLElement | null;
    const images = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
    let targetImage: HTMLImageElement | null = null;
    for (const img of images) {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        targetImage = img;
        break;
      }
    }
    const scope: HTMLElement = (gallery || document.body);

    // 候補ボタンを列挙
    const buttons = Array.from(scope.querySelectorAll('button, [role="button"]')) as HTMLElement[];
    let best: { el: HTMLElement; score: number } | null = null;
    const ranked: { classes: string; score: number; w: number; h: number }[] = [];
    for (const b of buttons) {
      const rect = b.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // 小さめのアイコンボタンを優先
      let score = 0;
      if (rect.width <= 40 && rect.height <= 40) score += 3;
      if (rect.width <= 24 && rect.height <= 24) score += 2;
      const cls = (b.className || '').toLowerCase();
      if (cls.includes('download')) score += 5;
      if (cls.includes('sc-4f026a5f-2') || cls.includes('sc-883533e0-1')) score += 2;
      if (targetImage) {
        const ir = targetImage.getBoundingClientRect();
        const cx = Math.max(0, Math.max(ir.left - rect.right, rect.left - ir.right));
        const cy = Math.max(0, Math.max(ir.top - rect.bottom, rect.top - ir.bottom));
        const dist = Math.sqrt(cx * cx + cy * cy);
        // 近いほど高スコア
        score += Math.max(0, 200 - Math.min(200, dist)) / 50;
        // 画像の右上付近をさらに優先
        if (rect.left >= ir.right - 120 && rect.top <= ir.top + 120) score += 2;
      }
      if (!best || score > best.score) best = { el: b, score };
      ranked.push({ classes: b.className, score, w: Math.round(rect.width), h: Math.round(rect.height) });
    }
    try {
      ranked.sort((a, b) => b.score - a.score);
      diag('download-heuristic-candidates', { top: ranked.slice(0, 5) });
    } catch {}
    return best?.el || null;
  } catch {
    return null;
  }
}

function logSelectorExploration(elementType: ElementType): void {
  try {
    const config = SELECTOR_CONFIG_MAP[elementType];
    if (!config) return;
    const results: any[] = [];
    for (const sel of config.selectors) {
      try {
        const list = document.querySelectorAll(sel);
        const first = list.item(0) as HTMLElement | null;
        const sample = first
          ? {
              tag: first.tagName,
              classes: first.className,
              text: (first.textContent || '').slice(0, 40),
            }
          : null;
        results.push({ sel, count: list.length, sample });
      } catch (e) {
        results.push({ sel, error: 'invalid-selector' });
      }
    }
    diag('selector-explore', { elementType, results });
  } catch {}
}

// ===== 背景経由の保存／サイト発火DL待機ユーティリティ =====
function _downloadViaBackground(url: string, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'DOWNLOAD_IMAGE', url, filename }, (res) => {
        const ok = !!(res && (res.success === true));
        resolve(ok);
      });
    } catch {
      resolve(false);
    }
  });
}

function waitForSiteDownloadComplete(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { chrome.runtime.onMessage.removeListener(listener); } catch {}
      reject(new Error('site-download-timeout'));
    }, timeoutMs);

    function done() {
      clearTimeout(timer);
      try { chrome.runtime.onMessage.removeListener(listener); } catch {}
      resolve();
    }

    function listener(msg: any) {
      try {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'SITE_DOWNLOAD_COMPLETE') {
          diag('site-download-complete', { id: msg.downloadId });
          done();
        } else if (msg.type === 'SITE_DOWNLOAD_ERROR') {
          diag('site-download-error', { id: msg.downloadId, error: msg.error });
          clearTimeout(timer);
          try { chrome.runtime.onMessage.removeListener(listener); } catch {}
          reject(new Error(String(msg.error || 'site-download-error')));
        }
      } catch {}
    }

    try { chrome.runtime.onMessage.addListener(listener); } catch {
      clearTimeout(timer);
      reject(new Error('listener-attach-failed'));
    }
  });
}

function waitForSiteDownloadCreatedOrComplete(timeoutMs: number): Promise<'created' | 'complete'> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { chrome.runtime.onMessage.removeListener(listener); } catch {}
      reject(new Error('site-download-created-timeout'));
    }, timeoutMs);

    function done(result: 'created' | 'complete') {
      clearTimeout(timer);
      try { chrome.runtime.onMessage.removeListener(listener); } catch {}
      resolve(result);
    }

    function listener(msg: any) {
      try {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'SITE_DOWNLOAD_COMPLETE') {
          diag('site-download-complete', { id: msg.downloadId });
          done('complete');
        } else if (msg.type === 'DOWNLOAD_DETECTED') {
          diag('site-download-created', { id: msg?.item?.id, url: (msg?.item?.url || '').slice(0, 120) });
          done('created');
        } else if (msg.type === 'SITE_DOWNLOAD_ERROR') {
          diag('site-download-error', { id: msg.downloadId, error: msg.error });
          clearTimeout(timer);
          try { chrome.runtime.onMessage.removeListener(listener); } catch {}
          reject(new Error(String(msg.error || 'site-download-error')));
        }
      } catch {}
    }

    try { chrome.runtime.onMessage.addListener(listener); } catch {
      clearTimeout(timer);
      reject(new Error('listener-attach-failed'));
    }
  });
}
