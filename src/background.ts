import { createLoginDetectionChannel } from './router/loginDetectionChannel.js';

/**
 * Service Worker for NovelAI Auto Generator
 * Handles background tasks, messaging, and downloads
 */

console.log('NovelAI Auto Generator Service Worker loaded');

// Function declarations (hoisted)
export async function initializeDefaultSettings(): Promise<void> {
  try {
    const defaultSettings = {
      imageCount: 1,
      seed: -1, // Random seed
      filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
      retrySettings: {
        maxRetries: 5,
        baseDelay: 500,
        factor: 2.0,
      },
    };

    await chrome.storage.local.set({ settings: defaultSettings });
    console.log('Default settings initialized');
  } catch (error) {
    console.error(
      'Failed to initialize default settings:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Service Worker event listeners
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);

  if (details.reason === 'install') {
    // Initialize default settings on first install
    initializeDefaultSettings().catch(console.error);
  }
});

const loginDetectionChannel = createLoginDetectionChannel();

// Track last tab that clicked a download button (for mapping downloads without tabId)
let lastClickedTabId: number | null = null;

// ===== In-memory log buffer with persistence =====
const MAX_LOG_ENTRIES = 2000;
let diagLogBuffer: any[] = [];

async function initLogBuffer(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(['diagLogs']);
    const logs = Array.isArray(stored?.diagLogs) ? stored.diagLogs : [];
    diagLogBuffer = logs.slice(-MAX_LOG_ENTRIES);
  } catch {
    diagLogBuffer = [];
  }
}

async function persistLogs(): Promise<void> {
  try {
    await chrome.storage.local.set({ diagLogs: diagLogBuffer.slice(-MAX_LOG_ENTRIES) });
  } catch {}
}

function addLog(kind: string, data: any): void {
  const entry = {
    ts: Date.now(),
    kind,
    data,
  };
  diagLogBuffer.push(entry);
  if (diagLogBuffer.length > MAX_LOG_ENTRIES) {
    diagLogBuffer.splice(0, diagLogBuffer.length - MAX_LOG_ENTRIES);
  }
  // fire-and-forget persistence
  void persistLogs();
}

void initLogBuffer();

// Passive network tap: observe requests to NovelAI domains even if page hooks fail
try {
  const URL_FILTERS: chrome.webRequest.RequestFilter = { urls: ['https://novelai.net/*', 'https://*.novelai.net/*'] } as any;

  if (chrome.webRequest?.onBeforeRequest?.addListener) {
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        try {
          console.log('WR: before', { method: (details as any).method, type: details.type, url: details.url });
          addLog('WR_BEFORE', { method: (details as any).method, type: details.type, url: details.url });
        } catch {}
      },
      URL_FILTERS
    );
  }

  if (chrome.webRequest?.onCompleted?.addListener) {
    chrome.webRequest.onCompleted.addListener(
      (details) => {
        try {
          console.log('WR: completed', {
            method: (details as any).method,
            type: details.type,
            url: details.url,
            statusCode: (details as any).statusCode,
          });
          addLog('WR_COMPLETED', {
            method: (details as any).method,
            type: details.type,
            url: details.url,
            statusCode: (details as any).statusCode,
          });
        } catch {}
      },
      URL_FILTERS
    );
  }

  if (chrome.webRequest?.onErrorOccurred?.addListener) {
    chrome.webRequest.onErrorOccurred.addListener(
      (details) => {
        try {
          console.log('WR: error', { method: (details as any).method, type: details.type, url: details.url, error: details.error });
          addLog('WR_ERROR', { method: (details as any).method, type: details.type, url: details.url, error: details.error });
        } catch {}
      },
      URL_FILTERS
    );
  }
} catch {}

// Observe downloads created by the site and forward to the originating tab
try {
  chrome.downloads.onCreated.addListener((item) => {
    try {
      const info = {
        id: item.id,
        url: (item as any)?.url ? String((item as any).url).slice(0, 200) : undefined,
        filename: item.filename,
        tabId: (item as any)?.tabId,
      };
      console.log('DIAG: dl-created', info);
      try { addLog('DL_CREATED_RAW', info); } catch {}
      // 記録: 完了時に対象タブへ通知するためのマッピング
      try {
        const explicitTabId = (item as any)?.tabId;
        if (typeof explicitTabId === 'number') {
          (globalThis as any).__dlTabMap = (globalThis as any).__dlTabMap || new Map<number, number>();
          (globalThis as any).__dlTabMap.set(item.id, explicitTabId);
        } else if (typeof lastClickedTabId === 'number') {
          (globalThis as any).__dlTabMap = (globalThis as any).__dlTabMap || new Map<number, number>();
          (globalThis as any).__dlTabMap.set(item.id, lastClickedTabId);
          try { addLog('DL_CREATED_MAPPED', { id: item.id, mappedTabId: lastClickedTabId }); } catch {}
          // one-shot mapping; keep lastClickedTabId for subsequent clicks
        }
      } catch {}
      const tabId = (item as any)?.tabId;
      if (typeof tabId === 'number') {
        try {
          chrome.tabs.sendMessage(tabId, { type: 'DOWNLOAD_DETECTED', item: info });
        } catch {}
      }
      addLog('DL_CREATED', info);
    } catch {}
  });
} catch {}

// Site-initiated download completion/error notification to tab
try {
  chrome.downloads.onChanged.addListener((delta) => {
    try {
      if (!delta || typeof delta.id !== 'number' || !delta.state) return;
      const dlMap: Map<number, number> | undefined = (globalThis as any).__dlTabMap;
      const tabId = dlMap?.get(delta.id);
      if (typeof tabId !== 'number') return;
      const state = delta.state.current;
      if (state === 'complete') {
        try { chrome.tabs.sendMessage(tabId, { type: 'SITE_DOWNLOAD_COMPLETE', downloadId: delta.id }); } catch {}
        addLog('DL_COMPLETE', { id: delta.id, tabId });
      } else if (state === 'interrupted') {
        try { chrome.tabs.sendMessage(tabId, { type: 'SITE_DOWNLOAD_ERROR', downloadId: delta.id, error: (delta as any)?.error }); } catch {}
        addLog('DL_INTERRUPTED', { id: delta.id, tabId, error: (delta as any)?.error });
      }
    } catch {}
  });
} catch {}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  try { addLog('MSG', { from: sender?.tab?.id ?? null, type: (message as any)?.type }); } catch {}

  const handleMessageAsync = async (): Promise<void> => {
    const handled = await loginDetectionChannel.handle(message);
    if (handled) {
      return;
    }

    switch (message?.type) {
      case 'GENERATION_DIAGNOSTICS':
      try {
        console.log('DIAG:', (message as any).step, (message as any).data);
        addLog('DIAG', { step: (message as any).step, data: (message as any).data });
      } catch {
        // Ignore diagnostic logging errors
      }
        break;
      case 'START_GENERATION':
        await handleStartGeneration(message, sender, sendResponse);
        addLog('START', { from: sender?.tab?.id ?? null });
        break;
      case 'CANCEL_JOB':
        await handleCancelJob(message, sender, sendResponse);
        break;
      case 'DOWNLOAD_IMAGE':
        await handleDownloadImage(message, sender, sendResponse);
        break;
      case 'GENERATION_PROGRESS':
        // Broadcast to popup (and any listeners)
        try {
          await chrome.runtime.sendMessage({
            type: 'GENERATION_PROGRESS',
            progress: message.progress,
          });
        } catch (e) {
          console.error('Failed to forward GENERATION_PROGRESS:', e);
        }
        break;
      case 'PROGRESS_UPDATE':
        // Handle progress updates from content script
        try {
          console.log('DIAG: progress-update', message.payload);
          addLog('PROGRESS', message.payload);
          // Try to forward to popup, but don't fail if popup is closed
          try {
            await chrome.runtime.sendMessage({
              type: 'GENERATION_PROGRESS',
              progress: message.payload,
            });
          } catch (popupError) {
            // Popup is likely closed, this is normal
            console.log('DIAG: popup-closed', 'Progress update not forwarded (popup closed)');
          }
        } catch (e) {
          console.error('Failed to process PROGRESS_UPDATE:', e);
        }
        break;
      case 'EXPORT_LOGS': {
        try {
          const { format, fileName, max } = (message as any) || {};
          const fmt = (typeof format === 'string' ? format : 'ndjson').toLowerCase();
          const now = new Date();
          const yyyy = String(now.getFullYear());
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const hh = String(now.getHours()).padStart(2, '0');
          const mi = String(now.getMinutes()).padStart(2, '0');
          const ss = String(now.getSeconds()).padStart(2, '0');
          const defaultName = `logs-${yyyy}${mm}${dd}-${hh}${mi}${ss}.${fmt === 'json' ? 'json' : 'ndjson'}`;
          const name = typeof fileName === 'string' && fileName.trim().length > 0 ? fileName.trim() : defaultName;

          // Read from storage to ensure latest persisted logs
          const stored = await chrome.storage.local.get(['diagLogs']);
          let logs: any[] = Array.isArray(stored?.diagLogs) ? stored.diagLogs : [];
          if (typeof max === 'number' && max > 0) {
            logs = logs.slice(-max);
          }

          const content = fmt === 'json'
            ? JSON.stringify(logs, null, 2)
            : logs.map((e) => JSON.stringify({ ts: e?.ts, iso: new Date(e?.ts || Date.now()).toISOString(), kind: e?.kind, data: e?.data })).join('\n');

          const blob = new Blob([content], { type: 'application/json' });
          let url: string | undefined;
          try {
            url = URL.createObjectURL(blob);
          } catch {
            // Fallback to data URL if object URL fails
            url = `data:application/json;charset=utf-8,${encodeURIComponent(content)}`;
          }

          await new Promise<void>((resolve, reject) => {
            chrome.downloads.download(
              {
                url: url!,
                filename: name,
                saveAs: true,
              },
              (downloadId) => {
                const lastError = chrome.runtime.lastError;
                if (lastError || typeof downloadId !== 'number') {
                  reject(new Error(lastError?.message || 'download failed'));
                } else {
                  resolve();
                }
              }
            );
          });

          try { addLog('EXPORT_DONE', { count: logs.length, format: fmt, fileName: name }); } catch {}
          sendResponse?.({ success: true, count: logs.length, fileName: name });
        } catch (e) {
          console.error('Failed to export logs:', e);
          try { addLog('EXPORT_ERROR', { error: String(e) }); } catch {}
          sendResponse?.({ success: false, error: e instanceof Error ? e.message : String(e) });
        }
        // async response handled via sendResponse above
        break;
      }
      case 'DOWNLOAD_CLICKED':
        try {
          console.log('DIAG: download-clicked', (message as any)?.info || null);
          addLog('DL_CLICKED', (message as any)?.info || null);
          if (typeof sender?.tab?.id === 'number') {
            lastClickedTabId = sender!.tab!.id!;
            try { addLog('DL_CLICKED_TAB', { tabId: lastClickedTabId }); } catch {}
          }
        } catch {}
        break;
      case 'NETWORK_ACTIVITY':
        try {
          const { method, url, phase, status, error } = message as any;
          console.log('DIAG: network', { phase, method, status, url, error });
          addLog('NETWORK', { phase, method, status, url, error });
        } catch (e) {
          // ignore
        }
        break;
      case 'ERROR':
        // Handle errors from content script
        try {
          console.error('DIAG: content-error', JSON.stringify(message.payload, null, 2));
          await chrome.runtime.sendMessage({
            type: 'GENERATION_ERROR',
            error: message.payload,
          });
        } catch (e) {
          console.error('Failed to forward ERROR:', e);
        }
        break;
      case 'GENERATION_COMPLETE':
        try {
          await chrome.runtime.sendMessage({ type: 'GENERATION_COMPLETE', count: message.count });
          addLog('COMPLETE', { count: message.count });
        } catch (e) {
          console.error('Failed to forward GENERATION_COMPLETE:', e);
        }
        break;
      case 'GENERATION_ERROR':
        try {
          await chrome.runtime.sendMessage({ type: 'GENERATION_ERROR', error: message.error });
          addLog('ERROR', { error: message.error });
        } catch (e) {
          console.error('Failed to forward GENERATION_ERROR:', e);
        }
        break;
      default:
        console.warn('Unknown message type:', message?.type);
    }
  };

  handleMessageAsync().catch((error) => {
    console.error('Failed to handle background message:', error);
    try { addLog('BG_MSG_ERROR', { messageType: (message as any)?.type, error: String(error) }); } catch {}
  });

  // Return true to keep the message channel open for async response
  return true;
});

/**
 * Handle start generation message
 */
export async function handleStartGeneration(
  message: any,
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (_response: any) => void
): Promise<void> {
  try {
    console.log('Starting generation with prompt:', message.prompt);

    // Ensure NovelAI tab is active
    const tab = await ensureNovelAITab();

    // Best-effort: inject content script and wait briefly for readiness
    if (tab.id) {
      try {
        // @ts-ignore
        const scripting: any = (chrome as any)?.scripting;
        if (scripting?.executeScript) {
          await scripting.executeScript({
            target: { tabId: tab.id },
            files: ['dist/content.enhanced.js'],
          });
        }
      } catch (_) {
        // Ignore script injection errors
      }
      // Small readiness wait via ping
      for (let i = 0; i < 3; i++) {
        if (await isContentScriptReady(tab.id)) break;
        await new Promise((r) => setTimeout(r, 500));
      }
      // Optional page state check to surface clearer errors
      try {
        const stateResp: any = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_STATE' });
        const state = stateResp?.state;
        if (state && state.isNovelAIPage === false) {
          throw new Error('NovelAI ページではありません。https://novelai.net/ を開いてください。');
        }
        if (state && state.isLoggedIn === false) {
          throw new Error('ログインが必要です。NovelAI にサインインしてください。');
        }
        if (state && state.hasPromptInput === false) {
          console.warn(
            'プロンプト入力欄が見つかりませんでした。セレクタープロファイルを変更して再試行してください。'
          );
        }
      } catch (_) {
        // ignore; CS が未準備でも後続の sendMessageWithRetry で再試行します
      }
    }

    // Send generation command to content script with retry
    if (tab.id) {
      const composite = message?.prompt;

      // Merge settings.imageCount into parameters.count if not provided
      const baseParams = { ...(message.parameters || {}) } as any;
      if (
        (baseParams.count === undefined || baseParams.count === null) &&
        typeof message?.settings?.imageCount === 'number'
      ) {
        baseParams.count = message.settings.imageCount;
      }

      const selectorProfileFromPopup =
        typeof message.selectorProfile === 'string' &&
        message.selectorProfile.trim().length > 0 &&
        message.selectorProfile !== 'auto'
          ? message.selectorProfile
          : undefined;

      // If multi-character payload, run sequentially per character
      if (composite && typeof composite === 'object' && Array.isArray(composite.characters)) {
        addLog('START_PAYLOAD_SHAPE', { composite: true, characters: composite.characters.length });
        addLog('MULTI_START', { characters: composite.characters.length });

        const commonPos = (composite.common?.positive ?? '').toString();
        const commonNeg = (composite.common?.negative ?? '').toString();

        // Policy switch: even when count===1, process all characters once (can be made configurable via UI)
        const processAllCharacters = true;
        const lastIndex = processAllCharacters
          ? composite.characters.length
          : (baseParams.count === 1 ? Math.min(1, composite.characters.length) : composite.characters.length);
        for (let idx = 0; idx < lastIndex; idx++) {
          const ch = composite.characters[idx] ?? {};
          const charPos = (ch.positive ?? '').toString();
          const charNeg = (ch.negative ?? '').toString();
          const mergedPrompt = {
            positive: [commonPos, charPos]
              .filter((s) => s && s.trim().length > 0)
              .join(', '),
            negative: [commonNeg, charNeg]
              .filter((s) => s && s.trim().length > 0)
              .join(', '),
          };

          const csMessage: any = {
            type: 'APPLY_PROMPT',
            prompt: mergedPrompt,
            parameters: baseParams,
          };
          // Prefer character-specific selector profile over popup default
          const profile = (ch.selectorProfile as string | undefined) || selectorProfileFromPopup;
          if (typeof profile === 'string' && profile.trim().length > 0) {
            csMessage.selectorProfile = profile;
          }
          csMessage.charMeta = {
            id: (ch.id as string) || `char-${idx + 1}`,
            name: (ch.name as string) || `Character ${idx + 1}`,
            index: idx,
            total: lastIndex,
          };

          addLog('MULTI_CHAR_APPLY', {
            index: idx,
            name: ch.name || ch.id || `char-${idx + 1}`,
            posLen: mergedPrompt.positive.length,
            negLen: mergedPrompt.negative.length,
          });

          await sendMessageWithRetry(tab.id, csMessage);
          const ok = await waitForSingleRunDone(300000); // up to 5 minutes per character
          addLog(ok ? 'MULTI_CHAR_DONE' : 'MULTI_CHAR_ERROR', {
            index: idx,
            name: ch.name || ch.id || `char-${idx + 1}`,
            ok,
          });
          if (!ok) break;
        }
        if (baseParams.count === 1 && composite.characters.length > 1) {
          addLog('MULTI_CHAR_SKIPPED', { skipped: composite.characters.length - 1 });
        }
      } else {
        addLog('START_PAYLOAD_SHAPE', { composite: false, characters: 0 });
        // Single prompt path
        const normalizedPrompt = composite;
        const csMessage: any = {
          type: 'APPLY_PROMPT',
          prompt: normalizedPrompt,
          parameters: baseParams,
        };
        if (selectorProfileFromPopup) csMessage.selectorProfile = selectorProfileFromPopup;
        await sendMessageWithRetry(tab.id, csMessage);
      }
    }

    _sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to start generation:', error);
    _sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function waitForSingleRunDone(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { chrome.runtime.onMessage.removeListener(listener); } catch {}
      resolve(false);
    }, timeoutMs);

    function finish(ok: boolean) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { chrome.runtime.onMessage.removeListener(listener); } catch {}
      resolve(ok);
    }

    function listener(msg: any) {
      try {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'GENERATION_COMPLETE') {
          finish(true);
        } else if (msg.type === 'GENERATION_ERROR') {
          finish(false);
        }
      } catch {}
    }

    try { chrome.runtime.onMessage.addListener(listener); } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

/**
 * Handle cancel job message
 */
export async function handleCancelJob(
  message: any,
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (_response: any) => void
): Promise<void> {
  try {
    console.log('Cancelling job:', message.jobId);
    // Broadcast cancel request to all tabs on novelai.net
    const tabs = (await chrome.tabs.query({ url: 'https://novelai.net/*' })) || [];
    for (const t of tabs) {
      if (!t || !t.id) continue;
      try {
        await chrome.tabs.sendMessage(t.id, { type: 'CANCEL_JOB', jobId: message.jobId });
      } catch (e) {
        // ignore per-tab errors
      }
    }
    _sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to cancel job:', error);
    _sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle download image message
 */
export async function handleDownloadImage(
  message: any,
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (_response: any) => void
): Promise<void> {
  try {
    const { url, filename } = message as { url: string; filename?: string };
    const safeName = typeof filename === 'string' && filename.trim().length > 0 ? filename.trim() : `NovelAI_${Date.now()}.png`;
    const startInfo = { url: url?.substring(0, 200), filename: safeName };
    console.log('DIAG: download-start', startInfo);
    addLog('DL_START', startInfo);

    // Check permission
    const hasPermission = await chrome.permissions.contains({ permissions: ['downloads'] });
    if (!hasPermission) {
      console.error('DIAG: download-permission-denied', 'Downloads permission not granted');
      _sendResponse({ success: false, error: 'Downloads permission not granted.' });
      return;
    }

    // Decide strategy
    const isHttp = typeof url === 'string' && /^https?:\/\//i.test(url);
    const isData = typeof url === 'string' && /^data:/i.test(url);
    const isBlob = typeof url === 'string' && /^blob:/i.test(url);

    let downloadSourceUrl = url;
    let finalFileName = safeName;

    if (isBlob) {
      // blob: は SW では直接解決できないので、失敗を返す（content 側で抽出URLにフォールバック）
      const info = { url: url.substring(0, 200) };
      console.error('DIAG: download-unsupported-blob-url', info);
      addLog('DL_UNSUPPORTED_BLOB', info);
      _sendResponse({ success: false, error: 'blob-url not supported in background' });
      return;
    }

    if (!isHttp && !isData) {
      // 不明なスキームは試さない
      const info2 = { url: url.substring(0, 200) };
      console.error('DIAG: download-unsupported-scheme', info2);
      addLog('DL_UNSUPPORTED_SCHEME', info2);
      _sendResponse({ success: false, error: 'unsupported url scheme' });
      return;
    }

    if (isHttp) {
      // そのままURLで保存（Chromeが最も安定）
      const downloadId = await chrome.downloads.download({
        url: downloadSourceUrl,
        filename: finalFileName,
        conflictAction: 'uniquify',
        saveAs: false,
      });
      const state = await waitForDownloadCompletion(downloadId, 120000, downloadSourceUrl, finalFileName);
      if (state === 'complete') {
        const info3 = { downloadId, filename: finalFileName, url: downloadSourceUrl.substring(0, 200) };
        console.log('DIAG: download-complete', info3);
        addLog('DL_BG_COMPLETE', info3);
        _sendResponse({ success: true, downloadId, filename: finalFileName });
        return;
      } else {
        const info4 = { downloadId, filename: finalFileName, url: downloadSourceUrl.substring(0, 200) };
        console.error('DIAG: download-interrupted', info4);
        addLog('DL_BG_INTERRUPTED', info4);
        _sendResponse({ success: false, error: 'download interrupted' });
        return;
      }
    }

    // data: URL（または必要に応じて変換して data: にする）
    if (isData) {
      const downloadId = await chrome.downloads.download({
        url: downloadSourceUrl,
        filename: finalFileName,
        conflictAction: 'uniquify',
        saveAs: false,
      });
      const state = await waitForDownloadCompletion(downloadId, 120000, downloadSourceUrl, finalFileName);
      if (state === 'complete') {
        const info5 = { downloadId, filename: finalFileName, url: downloadSourceUrl.substring(0, 200) };
        console.log('DIAG: download-complete', info5);
        addLog('DL_BG_COMPLETE', info5);
        _sendResponse({ success: true, downloadId, filename: finalFileName });
        return;
      } else {
        const info6 = { downloadId, filename: finalFileName, url: downloadSourceUrl.substring(0, 200) };
        console.error('DIAG: download-interrupted', info6);
        addLog('DL_BG_INTERRUPTED', info6);
        _sendResponse({ success: false, error: 'download interrupted' });
        return;
      }
    }
  } catch (error) {
    console.error('DIAG: download-error', error);
    try { addLog('DL_ERROR', { error: error instanceof Error ? error.message : String(error) }); } catch {}
    _sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function waitForDownloadCompletion(
  downloadId: number,
  timeoutMs: number,
  url?: string,
  filename?: string
): Promise<'complete' | 'interrupted' | 'timeout'> {
  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { chrome.downloads.onChanged.removeListener(listener); } catch {}
        console.error('DIAG: download-timeout', { downloadId, url: (url || '').substring(0, 200), filename });
        resolve('timeout');
      }
    }, timeoutMs);

    function done(state: 'complete' | 'interrupted') {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try { chrome.downloads.onChanged.removeListener(listener); } catch {}
      resolve(state);
    }

    function listener(delta: chrome.downloads.DownloadDelta) {
      if (delta?.id !== downloadId) return;
      const state = delta.state?.current;
      if (state === 'complete') {
        console.log('DIAG: download-onChanged-complete', { downloadId, url: (url || '').substring(0, 200), filename });
        done('complete');
      } else if (state === 'interrupted') {
        console.error('DIAG: download-onChanged-interrupted', { downloadId, url: (url || '').substring(0, 200), filename, error: (delta as any)?.error });
        done('interrupted');
      }
    }

    try { chrome.downloads.onChanged.addListener(listener); } catch {
      // 監視に失敗した場合はタイムアウトで終了
    }
  });
}

/**
 * Check if content script is ready by sending a ping message
 */
async function isContentScriptReady(tabId: number): Promise<boolean> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    return response?.type === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Send message to content script with retry mechanism
 */
async function sendMessageWithRetry(
  tabId: number,
  message: any,
  maxRetries: number = 5,
  baseDelay: number = 500
): Promise<void> {
  let lastError: Error | null = null;

  // Try programmatic injection once (best-effort)
  try {
    // @ts-ignore
    const scripting: any = (chrome as any)?.scripting;
    if (scripting?.executeScript) {
      await scripting.executeScript({ target: { tabId }, files: ['dist/content.enhanced.js'] });
    }
  } catch (e) {
    // ignore injection failure
  }

  // Ensure content script is ready
  console.log(`Checking if content script is ready in tab ${tabId}...`);
  for (let pingAttempt = 0; pingAttempt < 3; pingAttempt++) {
    if (await isContentScriptReady(tabId)) {
      console.log(`Content script is ready in tab ${tabId}`);
      break;
    }

    if (pingAttempt < 2) {
      console.log(`Content script not ready, waiting 1s before ping attempt ${pingAttempt + 2}...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      console.warn(`Content script not responding to ping in tab ${tabId}, proceeding anyway...`);
    }
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
      console.log(`Message sent successfully to tab ${tabId} on attempt ${attempt + 1}`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `Attempt ${attempt + 1} failed to send message to tab ${tabId}:`,
        lastError.message
      );

      // If this is the last attempt, don't wait
      if (attempt === maxRetries - 1) {
        break;
      }

      // Wait with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(
    `Failed to send message to content script after ${maxRetries} attempts. Last error: ${lastError?.message}`
  );
}

/**
 * Ensure NovelAI tab is open and active
 */
export async function ensureNovelAITab(): Promise<chrome.tabs.Tab> {
  try {
    // Check for existing NovelAI tab
    const tabs = await chrome.tabs.query({ url: 'https://novelai.net/*' });

    if (tabs.length > 0 && tabs[0]) {
      // Focus existing tab
      await chrome.tabs.update(tabs[0].id!, { active: true });
      return tabs[0];
    } else {
      // Create new tab
      const tab = await chrome.tabs.create({
        url: 'https://novelai.net/',
        active: true,
      });

      // Wait a bit for the tab to load and content script to initialize
      console.log('Waiting for new tab to load...');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return tab;
    }
  } catch (error) {
    console.error('Failed to ensure NovelAI tab:', error);
    throw error;
  }
}
