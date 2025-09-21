import { createLoginDetectionChannel } from './router/loginDetectionChannel';

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
      case 'GENERATION_COMPLETE':
        try {
          await chrome.runtime.sendMessage({ type: 'GENERATION_COMPLETE', count: message.count });
        } catch (e) {
          console.error('Failed to forward GENERATION_COMPLETE:', e);
        }
        break;
      case 'GENERATION_ERROR':
        try {
          await chrome.runtime.sendMessage({ type: 'GENERATION_ERROR', error: message.error });
        } catch (e) {
          console.error('Failed to forward GENERATION_ERROR:', e);
        }
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

    // Send generation command to content script with retry
    if (tab.id) {
      // Prepare the message for content script
      const csMessage: any = {
        type: 'APPLY_PROMPT',
        prompt: message.prompt,
        parameters: message.parameters,
      };

      // Only forward selectorProfile if it's a valid, non-auto profile
      if (
        typeof message.selectorProfile === 'string' &&
        message.selectorProfile.trim().length > 0 &&
        message.selectorProfile !== 'auto'
      ) {
        csMessage.selectorProfile = message.selectorProfile;
      }

      // Retry sending message to content script with exponential backoff
      await sendMessageWithRetry(tab.id, csMessage);
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

  // First, ensure content script is ready
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
