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
document.title = `${document.title} [v1.0.2 Enhanced FIXED]`;

diag('content-script-enhanced-version', {
  version: '1.0.2-FIXED',
  name: 'Enhanced',
  timestamp: new Date().toISOString(),
  features: ['multi-layer-download', 'enhanced-logging', 'cache-busted', 'debug-logging-enabled']
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

// Multi-character internal event handler
document.addEventListener('novelai-apply-prompt-internal', async (e: any) => {
  try {
    const { type, prompt, selectorProfile, parameters } = e.detail;

    // Reuse existing handleApplyPrompt function
    const mockMessage = {
      type,
      prompt,
      selectorProfile,
      parameters
    };

    const mockSendResponse = (response: any) => {
      // Dispatch completion event
      const completionEvent = new CustomEvent('novelai-prompt-applied', {
        detail: response
      });
      document.dispatchEvent(completionEvent);
    };

    await handleApplyPrompt(mockMessage as any, mockSendResponse);
  } catch (error) {
    // Dispatch error event
    const errorEvent = new CustomEvent('novelai-prompt-applied', {
      detail: {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    document.dispatchEvent(errorEvent);
  }
});

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

/**
 * --- HOTFIX: Robust main positive prompt writer ---
 * 1) 正しいエディタ特定（XPath優先→CSS→ラベル近傍）
 * 2) 可視化＆編集可能化（scroll/focus/ロック解除）
 * 3) 多段フォールバックで確実に入力（insertText→paste→innerText/value）
 * 4) 読み戻し検証（失敗時1回だけ再試行）
 */

async function resolveMainPositiveEditor(): Promise<HTMLElement> {
  const tried: string[] = [];
  const byXP = (xp: string) => {
    tried.push(`XP:${xp}`);
    const r = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return r.singleNodeValue as HTMLElement | null;
  };
  const xps = [
    "//*[contains(normalize-space(),'プロンプト')]/following::textarea[1]",
    "//*[contains(normalize-space(),'プロンプト')]/following::*[@contenteditable='true'][1]",
    "//*[contains(normalize-space(),'Prompt')]/following::textarea[1]",
    "//*[contains(normalize-space(),'Prompt')]/following::*[@contenteditable='true'][1]",
    "//textarea[contains(@placeholder,'Positive') or contains(@aria-label,'Positive')]",
    "//textarea[@rows and not(@readonly)]",
  ];
  for (const xp of xps) { const el = byXP(xp); if (el) return el; }
  const css = [
    '.prompt-input-box-prompt .ProseMirror',
    '.prompt-input-box-prompt textarea',
    '.prompt-input-box-base-prompt .ProseMirror',
    '.prompt-input-box-base-prompt textarea',
    '.ProseMirror[contenteditable="true"]',
  ];
  for (const sel of css) {
    tried.push(`CSS:${sel}`);
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  const label = Array.from(document.querySelectorAll<HTMLElement>('label,span,div,p'))
    .find(n => /^(プロンプト|Prompt)$/i.test(n.textContent?.trim() ?? ''));
  if (label) {
    const scope = label.closest('[class]') ?? label.parentElement ?? document.body;
    const el = scope.querySelector<HTMLElement>('.ProseMirror, textarea');
    if (el) return el;
  }
  console.warn('resolveMainPositiveEditor: not found', tried);
  throw new Error('Positive prompt field not found');
}

function ensureEditableAndVisible(el: HTMLElement) {
  el.scrollIntoView({ block: 'center' });
  const st = getComputedStyle(el);
  if (st.display === 'none' || st.visibility === 'hidden') {
    throw new Error('Editor is hidden');
  }
  const row = el.closest('[class]') ?? el.parentElement ?? undefined;
  const locked = (el as any).readOnly === true || (el as any).disabled === true;
  if (locked && row) {
    const sw = row.querySelector<HTMLElement>('[role="switch"],button[aria-pressed],button[aria-checked]');
    sw?.click();
  }
  el.focus({ preventScroll: true });
}

function fire(el: HTMLElement, type: string, init?: any) {
  const IE = (window as any).InputEvent;
  el.dispatchEvent(IE ? new IE(type, { bubbles: true, ...init }) : new Event(type, { bubbles: true }));
}

async function writeToEditor(el: HTMLElement, text: string) {
  const val = String(text ?? '');
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
    if (setter) setter.call(el, val); else (el as any).value = val;
    fire(el, 'input'); fire(el, 'change'); (el as HTMLElement).blur(); fire(el, 'focusout');
    return;
  }
  const isCE = (el as any).isContentEditable || el.getAttribute('contenteditable') === 'true';
  if (isCE) {
    try {
      const sel = window.getSelection(); sel?.removeAllRanges();
      const r = document.createRange(); r.selectNodeContents(el); sel?.addRange(r);
      document.execCommand('selectAll', false);
      const ok = document.execCommand('insertText', false, val);
      if (ok) { fire(el,'input'); fire(el,'change'); (el as HTMLElement).blur(); fire(el,'focusout'); return; }
    } catch {}
    try {
      const dt = new DataTransfer(); dt.setData('text/plain', val);
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
      fire(el,'input'); fire(el,'change'); (el as HTMLElement).blur(); fire(el,'focusout'); return;
    } catch {}
    try { (el as HTMLElement).innerText = val; } catch { (el as HTMLElement).textContent = val; }
    fire(el,'input'); fire(el,'change'); (el as HTMLElement).blur(); fire(el,'focusout'); return;
  }
  const sub = el.querySelector<HTMLElement>('.ProseMirror, textarea, input[type="text"]');
  if (sub && sub !== el) return writeToEditor(sub, val);
  throw new Error('Unsupported editor element');
}

function norm(s: string) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }
async function confirmApplied(el: HTMLElement, expect: string, tag = 'main-positive') {
  const actual = (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) ? el.value : (el.textContent ?? '');
  const ok = norm(actual).startsWith(norm(expect).slice(0, 24));
  console.debug(`[confirm] ${tag}`, { ok, actual: (actual||'').slice(0,80) });
  if (!ok) throw new Error(`${tag}: readback mismatch`);
}

export async function applyMainPositivePrompt(text: string) {
  const el = await resolveMainPositiveEditor();
  ensureEditableAndVisible(el);
  try {
    await writeToEditor(el, text);
    await confirmApplied(el, text, 'main-positive');
  } catch (e) {
    console.warn('main-positive first attempt failed, retrying once...', e);
    try {
      const sel = window.getSelection(); sel?.removeAllRanges();
      const r = document.createRange(); r.selectNodeContents(el); sel?.addRange(r);
      document.execCommand('delete', false);
    } catch {}
    await writeToEditor(el, text);
    await confirmApplied(el, text, 'main-positive-retry');
  }
}

// Simple cancellation flag for in-flight generation
let CANCEL_REQUESTED = false;

// Last character name for better fallback filename
let LAST_CHARACTER_NAME: string | null = null;
let LAST_DOWNLOAD_TARGET_IMAGE: HTMLImageElement | null = null;
let LAST_DOWNLOAD_USED_FALLBACK = false;

// Multi-character sequence handler
const multiCharacterHandler = new MultiCharacterSequenceHandler();

// Expose handleApplyPrompt for multi-character handler
(window as any).handleApplyPromptFunction = handleApplyPrompt;

// Force cache bust with timestamp
console.log('CONTENT_SCRIPT_LOADED_v1.0.2:', new Date().toISOString());

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  console.log('DEBUG: Received message in content script v1.0.2:', {
    type: message.type,
    hasCharacters: 'characters' in message,
    charactersCount: 'characters' in message ? (message as any).characters?.length : 'N/A',
    timestamp: new Date().toISOString()
  });

  // Handle hotfix message first
  if (message.type === 'APPLY_MAIN_POSITIVE_HOTFIX') {
    (async () => {
      try {
        await applyMainPositivePrompt((message as any).text ?? '');
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

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
      console.log('DEBUG: Handling APPLY_MULTI_CHARACTER_PROMPT', {
        charactersCount: (message as MultiCharacterMessage).characters?.length,
        hasCommon: !!(message as MultiCharacterMessage).common
      });
      multiCharacterHandler
        .handleMultiCharacterSequence(message as MultiCharacterMessage, sendResponse)
        .catch((error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('CRITICAL: Failed to handle multi-character sequence:', errorMessage);
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

    // Capture last character name for fallback download naming
    try {
      const nm = (message as any)?.charMeta?.name;
      LAST_CHARACTER_NAME = typeof nm === 'string' && nm.trim().length > 0 ? nm.trim() : null;
    } catch {}

    // Prompt sending disabled per user request.
    // setInputValue(promptInput, positivePrompt);
    // diag('positive-set', { length: positivePrompt?.length ?? 0 });
    // try {
    //   await confirmTextApplied(promptInput, positivePrompt || '', 'positive');
    //   diag('positive-confirm-ok', { len: (positivePrompt || '').length });
    // } catch (e) {
    //   diag('positive-confirm-failed', { error: (e as any)?.message || String(e) });
    // }
    // Enhanced logging: Before setting negative prompt
    try {
      const anchors = findElementsIncludingText(['キャラクター1', 'キャラクター２', 'キャラクター2', 'キャラクター']);
      if (anchors.length > 0) {
        const near = readNearbyPromptFields(anchors[0]);
        const negEl = findNegativePromptElement();
        diag('confirm-readback-near-caption-before', {
          caption: (anchors[0].textContent || '').trim().slice(0, 40),
          positiveLen: (near.positive || '').length,
          negativeLen: (near.negative || '').length,
          negativeSample: (near.negative || '').slice(0, 50),
          negativeElementFound: !!negEl,
          negativeElementTag: negEl?.tagName,
          negativeElementClass: negEl?.className
        });
      } else {
        const near = readNearbyPromptFields(promptInput);
        const negEl = findNegativePromptElement();
        diag('confirm-readback-generic-before', {
          positiveLen: (near.positive || '').length,
          negativeLen: (near.negative || '').length,
          negativeSample: (near.negative || '').slice(0, 50),
          negativeElementFound: !!negEl,
          negativeElementTag: negEl?.tagName,
          negativeElementClass: negEl?.className
        });
      }
    } catch (error) {
      diag('confirm-readback-before-error', { error: String(error) });
    }

    // await applyNegativePrompt(negativePrompt);
    // diag('negative-set', { length: negativePrompt?.length ?? 0 });
    try {
      const negEl = findNegativePromptElement();
      if (negEl && (negativePrompt ?? '').toString().length > 0) {
        await confirmTextApplied(negEl, (negativePrompt ?? '').toString(), 'negative');
        diag('negative-confirm-ok', { len: (negativePrompt ?? '').toString().length });
      }
    } catch (e) {
      diag('negative-confirm-failed', { error: (e as any)?.message || String(e) });
    }

    // Enhanced logging: After setting negative prompt - detailed verification
    try {
      const anchors = findElementsIncludingText(['キャラクター1', 'キャラクター２', 'キャラクター2', 'キャラクター']);
      const baseEl = anchors[0] || promptInput;
      const near = readNearbyPromptFields(baseEl as HTMLElement);
      const negEl = findNegativePromptElement();

      // Also get the expected text to compare
      const expectedText = negativePrompt || '';
      const actualText = near.negative || '';
      const isMatch = actualText.includes(expectedText.slice(0, 20)) || expectedText.includes(actualText.slice(0, 20));

      diag('confirm-readback-after-negative-detailed', {
        positiveLen: (near.positive || '').length,
        negativeLen: actualText.length,
        negativeSample: actualText.slice(0, 100),
        expectedLen: expectedText.length,
        expectedSample: expectedText.slice(0, 100),
        contentMatch: isMatch,
        negativeElementFound: !!negEl,
        negativeElementTag: negEl?.tagName,
        negativeElementClass: negEl?.className,
        elementId: negEl?.id || 'no-id',
        elementDataAttrs: negEl ? Array.from(negEl.attributes).filter(attr => attr.name.startsWith('data-')).map(attr => `${attr.name}="${attr.value}"`).join(' ') : 'none'
      });
    } catch (error) {
      diag('confirm-readback-after-error', { error: String(error) });
    }

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
          let clicked = await clickPrimaryDownloadButton();
          if (!clicked) {
            // 追加の短い待機後に再試行
            await new Promise((r) => setTimeout(r, 500));
            clicked = await clickPrimaryDownloadButton();
          }

          if (!clicked && !LAST_DOWNLOAD_USED_FALLBACK) {
            diag('download-button-click-failed');
            throw new Error('download-button-failed');
          }

          if (LAST_DOWNLOAD_USED_FALLBACK) {
            successfulCount++;
            chrome.runtime.sendMessage({
              type: 'GENERATION_PROGRESS',
              progress: { current: successfulCount, total: count },
            });
            continue;
          }

           // 生成を詰まらせないため、作成検知（onCreated）で次ループへ進む
           diag('site-download-wait-start', { timeoutMs: 120000 });
          try {
            const ev = await waitForSiteDownloadCreatedOrComplete(10000);
            diag('site-download-event', { event: ev });
            void waitForSiteDownloadComplete(120000)
              .then(() => diag('site-download-complete-async'))
              .catch((err) =>
                diag('site-download-error-async', { error: (err as any)?.message || String(err) })
              );
            successfulCount++;
            chrome.runtime.sendMessage({
              type: 'GENERATION_PROGRESS',
              progress: { current: successfulCount, total: count },
            });
            continue;
          } catch (waitError) {
            diag('site-download-timeout', { error: (waitError as any)?.message || String(waitError) });
            const fallbackOk = await attemptFallbackDownloadFromLastTarget();
            if (fallbackOk) {
              diag('site-download-timeout-fallback-success');
              successfulCount++;
              chrome.runtime.sendMessage({
                type: 'GENERATION_PROGRESS',
                progress: { current: successfulCount, total: count },
              });
              continue;
            }
            throw waitError;
          }
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
  const tried: string[] = [];

  const byXPath = (xp: string): HTMLElement | null => {
    tried.push(`XPATH:${xp}`);
    const r = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return (r.singleNodeValue as HTMLElement) ?? null;
  };

  // 1) Selenium実績のXPath（日本語/英語UI両対応）を最優先
  const xpaths = [
    "//*[contains(normalize-space(),'プロンプト')]/following::textarea[1]",
    "//*[contains(normalize-space(),'プロンプト')]/following::*[@contenteditable='true'][1]",
    "//textarea[contains(@placeholder,'Positive') or contains(@aria-label,'Positive')]",
    "//textarea[@rows and not(@readonly)]",
    "//*[contains(normalize-space(),'Prompt')]/following::textarea[1]",
    "//*[contains(normalize-space(),'Prompt')]/following::*[@contenteditable='true'][1]",
  ];
  for (const xp of xpaths) {
    try {
      const el = byXPath(xp);
      if (el) return el;
    } catch {}
  }

  // 2) 既存の設定プロファイルから解決（CSS）
  try {
    const element = await resolveElement('prompt-input');
    if (element) return element;
  } catch {}

  // 3) 追加CSS候補
  const cssCandidates = [
    '.prompt-input-box-prompt .ProseMirror',
    '.prompt-input-box-prompt textarea',
    '.prompt-input-box-base-prompt textarea',
    '.prompt-input-box-base-prompt .ProseMirror',
    '.ProseMirror[contenteditable="true"]',
  ];
  for (const sel of cssCandidates) {
    tried.push(`CSS:${sel}`);
    try {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) return el;
    } catch {}
  }

  // 4) 近傍探索（ラベル→親→子孫）
  try {
    const label = Array.from(document.querySelectorAll<HTMLElement>('label, span, div, p'))
      .find((n) => /^(プロンプト|Prompt)$/i.test((n.textContent || '').trim()));
    if (label) {
      const scope = label.closest('[class]') || label.parentElement || document.body;
      const el = scope.querySelector<HTMLElement>('.ProseMirror, textarea');
      if (el) return el;
    }
  } catch {}

  // 5) 可視・最前面エディタ優先（ans2.md: pickTopVisibleEditor）
  try {
    const top = pickTopVisibleEditor();
    if (top) return top;
  } catch {}

  console.warn('resolvePromptInput: not found. tried=', tried);
  throw new Error('Positive prompt field not found');
}

async function resolveNegativePromptInput(): Promise<HTMLElement | null> {
  const byXPath = (xp: string): HTMLElement | null => {
    const r = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return (r.singleNodeValue as HTMLElement) ?? null;
  };

  // 1) XPath 優先（日本語/英語UI）
  const negXPath = [
    "//*[contains(normalize-space(),'除外したい要素')]/following::textarea[1]",
    "//*[contains(normalize-space(),'Undesired') or contains(normalize-space(),'Negative')]/following::textarea[1]",
    "//*[contains(normalize-space(),'除外したい要素')]/following::*[@contenteditable='true'][1]",
    "//textarea[contains(@placeholder,'Negative') or contains(@aria-label,'Negative')]",
    "(//textarea[@rows and not(@readonly)])[last()]",
  ];
  for (const xp of negXPath) {
    try {
      const el = byXPath(xp);
      if (el) return el;
    } catch {}
  }

  // 2) 既存プロファイル
  try {
    const element = await resolveElement('negative-input', { required: false });
    if (element) return element;
  } catch {}

  return null;
}

async function applyNegativePrompt(value: string | undefined): Promise<void> {
  const text = (value ?? '').toString();
  console.log('DIAG: negative-prompt-apply', {
    textLength: text.length,
    text: text.substring(0, 100),
  });

  try { logSelectorExploration('negative-input'); } catch {}

  // Prefer semantic target first
  const targetPicked = findNegativeEditor();
  if (targetPicked) {
    try {
      diag('negative-target-picked', {
        path: _domPath(targetPicked),
        id: targetPicked.id || 'no-id',
        cls: targetPicked.className || '',
      });
    } catch {}
    setInputValue(targetPicked as HTMLElement, text);
    await confirmAppliedWithProof(targetPicked as HTMLElement, text, 'negative');
    diag('negative-confirm-ok', { len: text.length });
    return;
  }

  const strategies = [
    // Strategy 0: Find multiple ProseMirror editors and use the correct one
    async () => {
      try {
        const editors = document.querySelectorAll('.ProseMirror') as NodeListOf<HTMLElement>;
        diag('prosemirror-editors-found', { count: editors.length });
        for (let i = 0; i < editors.length; i++) {
          const editor = editors[i];
          const container = editor.closest('div, section, fieldset');
          const containerText = container ? container.textContent || '' : '';
          if (containerText.includes('除外') || containerText.includes('Negative') ||
              containerText.includes('Undesired') || containerText.includes('ネガティブ')) {
            diag('negative-prosemirror-candidate', {
              index: i,
              containerText: containerText.slice(0, 100),
              editorText: (editor.textContent || '').slice(0, 50)
            });
            editor.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as any });
            await new Promise(r => setTimeout(r, 50));
            setInputValue(editor, text);
            const after = readElementValue(editor);
            diag('negative-after-set', { strategy: 0, length: after.length, sample: after.slice(0, 120) });
            await confirmAppliedWithProof(editor, text, 'negative');
            return true;
          }
        }
        if (editors.length >= 2) {
          const secondEditor = editors[1];
          diag('trying-second-prosemirror', { count: editors.length });
          secondEditor.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as any });
          await new Promise(r => setTimeout(r, 50));
          setInputValue(secondEditor, text);
          const after = readElementValue(secondEditor);
          diag('negative-after-set', { strategy: 0, length: after.length, sample: after.slice(0, 120) });
          await confirmAppliedWithProof(secondEditor, text, 'negative');
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
        await confirmAppliedWithProof(target as HTMLElement, text, 'negative');
        return true;
      }
      return false;
    },
    async () => {
      const candidates = document.querySelectorAll(
        'div[contenteditable="true"][data-negative="true"], [data-testid*="negative" i] [contenteditable="true"], [role="textbox"][contenteditable="true"][data-negative="true"], textarea[placeholder*="negative" i], textarea[aria-label*="negative" i], .prompt-input-box-undesired-content .ProseMirror, .prompt-input-box-negative-prompt .ProseMirror, [class*="undesired"] .ProseMirror, [class*="negative"] .ProseMirror, [aria-label*="除外" i] .ProseMirror, [aria-label*="negative" i] .ProseMirror'
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
        await confirmAppliedWithProof(candidate as HTMLElement, text, 'negative');
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
          await confirmAppliedWithProof(textarea, text, 'negative');
          return true;
        }
      }
      return false;
    },
    async () => {
      try {
        const editors = document.querySelectorAll('.ProseMirror') as NodeListOf<HTMLElement>;
        diag('fallback-prosemirror-try', { count: editors.length });
        for (let i = 1; i < editors.length; i++) {
          const editor = editors[i];
          const currentText = readElementValue(editor);
          diag('fallback-prosemirror-attempt', {
            index: i,
            currentLength: currentText.length,
            sample: currentText.slice(0, 50)
          });
          editor.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as any });
          await new Promise(r => setTimeout(r, 100));
          setInputValue(editor, text);
          await new Promise(r => setTimeout(r, 100));
          const after = readElementValue(editor);
          if (after.includes(text.slice(0, 20))) {
            diag('negative-after-set', { strategy: 4, length: after.length, sample: after.slice(0, 120) });
            await confirmAppliedWithProof(editor, text, 'negative');
            return true;
          } else {
            diag('fallback-prosemirror-failed', { index: i, expected: text.slice(0, 20), actual: after.slice(0, 20) });
          }
        }
      } catch {}
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
  const text = typeof value === 'string' ? value : String(value ?? '');

  // 可視化＆フォーカス
  try { element.scrollIntoView({ block: 'center' }); } catch {}
  try { (element as HTMLElement).focus({ preventScroll: true } as any); } catch { try { element.focus(); } catch {} }

  const fire = (type: string, init?: any) =>
    element.dispatchEvent(new ((window as any).InputEvent || Event)(type, { bubbles: true, ...(init || {}) }));

  // ネイティブ <textarea>/<input>
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    try {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
      if (setter) setter.call(element, text); else (element as any).value = text;
    } catch { (element as any).value = text; }
    try { (element as any).defaultValue = text; element.setAttribute('value', text); } catch {}
    fire('input'); fire('change'); fire('blur');
    try {
      const FocusEventCtor = (window as any).FocusEvent as any;
      const ev = FocusEventCtor ? new FocusEventCtor('focusout', { bubbles: true }) : new Event('focusout', { bubbles: true });
      element.dispatchEvent(ev);
    } catch {}
    return;
  }

  // contenteditable (ProseMirror/Slate等)
  const isEditable = (element as any).isContentEditable === true || element.getAttribute('contenteditable') === 'true';
  if (isEditable) {
    // 1) Selection + insertText
    let insertedOk = false;
    try {
      const sel = window.getSelection(); sel?.removeAllRanges();
      const range = document.createRange(); range.selectNodeContents(element); sel?.addRange(range);
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand('selectAll', false);
      // eslint-disable-next-line deprecation/deprecation
      insertedOk = document.execCommand('insertText', false, text);
      if (insertedOk) { fire('input'); fire('change'); (element as any).blur?.(); fire('focusout'); }
    } catch {}

    // 2) Paste 駆動（常に追いpasteで確度を上げる）
    try { void writeRichPaste(element, text); } catch {}

    if (insertedOk) return;

    // 3) 直接書き換え
    try { (element as any).innerText = text; } catch { (element as any).textContent = text; }
    fire('input'); fire('change'); (element as any).blur?.(); fire('focusout');
    return;
  }

  // 最終手段: 子孫に .ProseMirror / textarea を探して再帰
  try {
    const fallback = element.querySelector<HTMLElement>('.ProseMirror, textarea, input[type="text"]');
    if (fallback && fallback !== element) { setInputValue(fallback, text); return; }
  } catch {}
}

async function confirmTextApplied(el: HTMLElement, expected: string, label: string) {
  const actual = (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)
    ? el.value
    : (el.textContent ?? '');
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const ok = norm(actual).startsWith(norm(expected).slice(0, 24));
  console.debug(`[confirm] ${label}`, { ok, actual: actual.slice(0,80), expected: expected.slice(0,80) });
  if (!ok) throw new Error(`${label}: readback mismatch`);
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

  // Negative: Use same detection strategies as applyNegativePrompt()
  const negEl = findNegativePromptElement();

  return {
    positive: posEl ? readElementValue(posEl) : undefined,
    negative: negEl ? readElementValue(negEl) : undefined,
  };
}

/**
 * Find negative prompt element using same strategies as applyNegativePrompt()
 * This ensures read operations target the same elements as write operations
 */
function findNegativePromptElement(): HTMLElement | null {
  // Strategy 0: Context-aware ProseMirror detection
  try {
    const editors = document.querySelectorAll('.ProseMirror') as NodeListOf<HTMLElement>;

    // Look for negative prompt editor by container context
    for (let i = 0; i < editors.length; i++) {
      const editor = editors[i];
      const container = editor.closest('div, section, fieldset');
      const containerText = container ? container.textContent || '' : '';

      // Look for negative/undesired indicators in container
      if (containerText.includes('除外') || containerText.includes('Negative') ||
          containerText.includes('Undesired') || containerText.includes('ネガティブ')) {
        return editor;
      }
    }

    // If no negative-specific editor found, try second ProseMirror (common pattern)
    if (editors.length >= 2) {
      return editors[1];
    }
  } catch {}

  // Strategy 1: Enhanced CSS selectors (same as applyNegativePrompt strategy 2)
  const candidates = document.querySelectorAll(
    'div[contenteditable="true"][data-negative="true"], [data-testid*="negative" i] [contenteditable="true"], [role="textbox"][contenteditable="true"][data-negative="true"], textarea[placeholder*="negative" i], textarea[aria-label*="negative" i], .prompt-input-box-undesired-content .ProseMirror, .prompt-input-box-negative-prompt .ProseMirror, [class*="undesired"] .ProseMirror, [class*="negative"] .ProseMirror, [aria-label*="除外" i] .ProseMirror, [aria-label*="negative" i] .ProseMirror'
  ) as NodeListOf<HTMLElement>;

  if (candidates.length > 0) {
    return candidates[0];
  }

  // Strategy 2: Textarea detection by attributes (same as applyNegativePrompt strategy 3)
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
      return textarea;
    }
  }

  // Strategy 3: Fallback to all ProseMirror editors except the first one
  try {
    const editors = document.querySelectorAll('.ProseMirror') as NodeListOf<HTMLElement>;
    if (editors.length >= 2) {
      return editors[1]; // Skip first editor (usually positive prompt)
    }
  } catch {}

  return null;
}

function setNumericInputValue(element: HTMLInputElement, value: number): void {
  let resolved = value;

  // Focus first (like Selenium)
  element.focus();

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
    // Clear first like Selenium clear()
    element.value = '';
    element.valueAsNumber = resolved;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
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
  // UIへの生成枚数適用は無効化（ユーザー要望）
  // if (typeof parameters.count === 'number' && Number.isFinite(parameters.count)) {
  //   await setImageCount(parameters.count);
  // }
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

  // Selenium-style: ensure element is visible and perform safe click
  try {
    (element as HTMLElement).scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: 'instant' as any,
    });
    // Small pause after scroll (like Selenium ActionChains)
    await new Promise(r => setTimeout(r, 100));
  } catch {}

  // Selenium-style safe click with retry
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
  // Selenium-style find_first approach with multiple strategies
  const seleniumStrategies = [
    // Direct XPath selectors from Selenium code
    "//button[contains(.,'1枚のみ生成') and not(@disabled)]",
    "//button[contains(.,'生成') and not(@disabled)]",
    "//button[contains(.,'Generate') and not(@disabled)]"
  ];

  // Try Selenium XPath approach first
  for (const xpath of seleniumStrategies) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      if (result.singleNodeValue) {
        return result.singleNodeValue as HTMLElement;
      }
    } catch {}
  }

  // Fallback to original selector-based approach
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
  // Selenium-style WebDriverWait equivalent
  const deadline = Date.now() + timeoutMs;
  let sawDisabled = false;
  let lastState: 'disabled' | 'enabled' | 'unknown' = 'unknown';

  function findCurrentGenerateButton(): HTMLElement | null {
    try {
      // Selenium-style: try multiple strategies
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

    LAST_DOWNLOAD_USED_FALLBACK = false;

    LAST_DOWNLOAD_TARGET_IMAGE = null;
    const gallery = (document.querySelector('.novelai-gallery, .image-gallery, [data-testid*="gallery" i]') as HTMLElement | null) || document.body;
    try { diag('dl-gallery', { scoped: gallery !== document.body, classes: (gallery as HTMLElement).className || null }); } catch {}
    const imgs = Array.from(gallery.querySelectorAll('img')) as HTMLImageElement[];
    let targetImg: HTMLImageElement | null = null;
    for (let i = imgs.length - 1; i >= 0; i--) {
      const img = imgs[i];
      if (img.naturalWidth > 0 && img.naturalHeight > 0) { targetImg = img; break; }
    }
    LAST_DOWNLOAD_TARGET_IMAGE = targetImg;

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
      // フォールバック: ギャラリー全体で先頭候補（Deep探索対応済み）
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
          const base = (LAST_CHARACTER_NAME && LAST_CHARACTER_NAME.trim().length > 0) ? safeSlug(LAST_CHARACTER_NAME) : 'novelai';
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          a.download = `${base}_${ts}.png`;
          a.rel = 'noopener';
          a.target = '_blank';
          document.body.appendChild(a);

          LAST_DOWNLOAD_USED_FALLBACK = true;
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
async function attemptFallbackDownloadFromLastTarget(): Promise<boolean> {

  try {

    if (!LAST_DOWNLOAD_TARGET_IMAGE) {

      return false;

    }

    const href = await resolveDownloadHrefFromImage(LAST_DOWNLOAD_TARGET_IMAGE);

    if (!href) {

      return false;

    }

    const a = document.createElement('a');

    a.href = href;

    const base = LAST_CHARACTER_NAME && LAST_CHARACTER_NAME.trim().length > 0 ? safeSlug(LAST_CHARACTER_NAME) : 'novelai';

    const ts = new Date().toISOString().replace(/[:.]/g, '-');

    a.download = `${base}_${ts}.png`;

    a.rel = 'noopener';

    a.target = '_blank';

    document.body.appendChild(a);

    LAST_DOWNLOAD_USED_FALLBACK = true;

    try { chrome.runtime.sendMessage({ type: 'DOWNLOAD_CLICKED', info: { strategy: 'timeout-fallback' } }); } catch {}

    diag('download-clicked-timeout-fallback');

    a.click();

    setTimeout(() => {

      try { a.remove(); } catch {}

    }, 0);

    diag('dl-fallback-anchor', {

      kind: href.startsWith('data:') ? 'data' : href.startsWith('blob:') ? 'blob' : 'http',

      hrefSample: href.slice(0, 60),

    });

    return true;

  } catch (e) {

    diag('dl-timeout-fallback-error', { error: (e as any)?.message || String(e) });

    return false;

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
    // Selenium-style: scroll into view first with pause
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as any });
    await new Promise(r => setTimeout(r, 50)); // Small pause like Selenium ActionChains

    const rect = el.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const opts = { bubbles: true, cancelable: true, composed: true } as any;

    // Selenium-style mouse event sequence with move simulation
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

function safeSlug(input: string): string {
  try {
    return input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/[^a-z0-9-_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
  } catch {
    return 'novelai';
  }
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

function pickTopVisibleEditor(scope: ParentNode = document): HTMLElement | null {
  try {
    const candidates = Array.from(scope.querySelectorAll<HTMLElement>('.ProseMirror, textarea'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      })
      .sort((a, b) => {
        const za = parseInt(getComputedStyle(a).zIndex || '0') || 0;
        const zb = parseInt(getComputedStyle(b).zIndex || '0') || 0;
        return zb - za;
      });
    return candidates[0] || null;
  } catch {
    return null;
  }
}

async function writeRichPaste(el: HTMLElement, text: string): Promise<void> {
  try {
    // Select all then delete
    const sel = window.getSelection();
    sel?.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel?.addRange(range);
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand('delete', false);

    // DataTransfer paste
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const pasteEvt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true } as any);
    el.dispatchEvent(pasteEvt);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } catch {}
}

// ===== Negative editor robust resolver (semantic-first) =====
function findNegativeEditor(): HTMLElement | null {
  try {
    const label = Array.from(document.querySelectorAll<HTMLElement>('label, span, div, p'))
      .find((n) => /(除外したい要素|Undesired|Negative)/i.test(n.textContent || ''));
    if (label) {
      const scope = (label.closest('[class]') as HTMLElement) || label.parentElement || document.body;
      const near = scope.querySelector<HTMLElement>('.ProseMirror, textarea');
      if (near) return near;
    }
    const negInCards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid*="character-card" i], [class*="character-card" i]')
    )
      .map((card) => card.querySelector<HTMLElement>('[placeholder*="Negative" i], .ProseMirror, textarea'))
      .filter(Boolean) as HTMLElement[];
    if (negInCards[0]) return negInCards[negInCards.length - 1];
    const byAttr = document.querySelector<HTMLElement>(
      'textarea[placeholder*="Negative" i], textarea[aria-label*="Negative" i]'
    );
    if (byAttr) return byAttr;
    const editors = Array.from(document.querySelectorAll<HTMLElement>('.ProseMirror'));
    const mainPos = document.querySelector<HTMLElement>('.prompt-input-box-prompt .ProseMirror');
    const candidates = editors.filter((e) => e !== mainPos);
    return candidates[0] || null;
  } catch {
    return null;
  }
}

function _domPath(el: Element): string {
  try {
    const parts: string[] = [];
    for (let e: Element | null = el; e && e.nodeType === 1; e = e.parentElement) {
      const siblings = Array.from(e.parentElement?.children || []).filter((n) => n.tagName === e.tagName);
      const idx = siblings.indexOf(e) + 1;
      const cls = (e as HTMLElement).classList ? '.' + Array.from((e as HTMLElement).classList).join('.') : '';
      parts.unshift(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${cls}${idx > 1 ? `:nth-of-type(${idx})` : ''}`);
    }
    return parts.join(' > ');
  } catch {
    return 'n/a';
  }
}

async function confirmAppliedWithProof(el: HTMLElement, expect: string, tag: string): Promise<void> {
  const actual = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value : el.textContent || '';
  const norm = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim();
  const ok = norm(actual).startsWith(norm(expect).slice(0, 24));
  try {
    diag('confirm-proof', {
      tag,
      ok,
      path: _domPath(el),
      id: (el as HTMLElement).id || 'no-id',
      cls: (el as HTMLElement).className || '',
      sample: String(actual).slice(0, 120),
      attrs: (el as HTMLElement)
        .getAttributeNames()
        .reduce((m: Record<string, string>, k) => ((m[k] = (el as HTMLElement).getAttribute(k) || ''), m), {} as Record<string, string>),
    });
  } catch {}
  if (!ok) throw new Error(`${tag}: readback mismatch`);
}






