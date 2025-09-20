import { createLoginDetectionChannel } from './router/loginDetectionChannel';

/**
 * Service Worker for NovelAI Auto Generator
 * Handles background tasks, messaging, and downloads
 */

console.log('NovelAI Auto Generator Service Worker loaded');

// Service Worker event listeners
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);

  if (details.reason === 'install') {
    // Initialize default settings on first install
    initializeDefaultSettings();
  }
});

const loginDetectionChannel = createLoginDetectionChannel();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  (async () => {
    const handled = await loginDetectionChannel.handle(message);
    if (handled) {
      return;
    }

    switch (message?.type) {
      case 'START_GENERATION':
        await handleStartGeneration(message, sender, sendResponse);
        break;
      case 'CANCEL_JOB':
        await handleCancelJob(message, sender, sendResponse);
        break;
      case 'DOWNLOAD_IMAGE':
        await handleDownloadImage(message, sender, sendResponse);
        break;
      default:
        console.warn('Unknown message type:', message?.type);
    }
  })().catch((error) => {
    console.error('Failed to handle background message:', error);
  });

  // Return true to keep the message channel open for async response
  return true;
});

/**
 * Initialize default settings
 */
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

    // Send generation command to content script
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'APPLY_PROMPT',
        prompt: message.prompt,
        parameters: message.parameters,
      });
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
    // TODO: Implement job cancellation logic
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
    const { url, filename } = message;
    console.log('Downloading image:', filename);

    const downloadId = await chrome.downloads.download({
      url,
      filename,
      conflictAction: 'uniquify',
    });

    _sendResponse({ success: true, downloadId });
  } catch (error) {
    console.error('Failed to download image:', error);
    _sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
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
      return tab;
    }
  } catch (error) {
    console.error('Failed to ensure NovelAI tab:', error);
    throw error;
  }
}





