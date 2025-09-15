/**
 * Content Script for NovelAI Auto Generator
 * Handles DOM manipulation on NovelAI website
 */

console.log('NovelAI Auto Generator Content Script loaded');

// Message listener for background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);

  switch (message.type) {
    case 'APPLY_PROMPT':
      handleApplyPrompt(message, sendResponse);
      break;
    case 'GET_PAGE_STATE':
      handleGetPageState(sendResponse);
      break;
    default:
      console.warn('Unknown message type:', message.type);
  }

  // Return true to keep the message channel open for async response
  return true;
});

/**
 * Handle applying prompt and parameters to the page
 */
async function handleApplyPrompt(
  message: any,
  _sendResponse: (_response: any) => void
): Promise<void> {
  try {
    console.log('Applying prompt:', message.prompt);

    // Check if user is logged in
    const isLoggedIn = await checkLoginStatus();
    if (!isLoggedIn) {
      _sendResponse({
        success: false,
        error: 'User not logged in',
        requiresLogin: true,
      });
      return;
    }

    // Find and fill prompt input
    const promptInput = await findPromptInput();
    if (promptInput) {
      setInputValue(promptInput, message.prompt);
      console.log('Prompt applied successfully');
    } else {
      throw new Error('Prompt input field not found');
    }

    // Apply parameters if provided
    if (message.parameters) {
      await applyParameters(message.parameters);
    }

    // Start generation
    await startGeneration();

    _sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to apply prompt:', error);
    _sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle getting current page state
 */
function handleGetPageState(_sendResponse: (_response: any) => void): void {
  try {
    const state = {
      isNovelAIPage: window.location.hostname === 'novelai.net',
      isLoggedIn: checkLoginStatus(),
      hasPromptInput: !!document.querySelector('textarea[placeholder*="prompt" i]'),
      currentUrl: window.location.href,
    };

    _sendResponse({ success: true, state });
  } catch (error) {
    console.error('Failed to get page state:', error);
    _sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check if user is logged in
 */
async function checkLoginStatus(): Promise<boolean> {
  // Look for common indicators that user is logged in
  // This is a placeholder - actual implementation will depend on NovelAI's UI structure
  const loginIndicators = ['.user-menu', '[data-testid="user-avatar"]', '.account-info'];

  for (const selector of loginIndicators) {
    if (document.querySelector(selector)) {
      return true;
    }
  }

  // Check for login form as negative indicator
  const loginForm = document.querySelector('form[action*="login" i], .login-form');
  return !loginForm;
}

/**
 * Find the prompt input field with fallback selectors
 */
async function findPromptInput(): Promise<HTMLTextAreaElement | HTMLInputElement | null> {
  const selectors = [
    'textarea[placeholder*="prompt" i]',
    'textarea[placeholder*="describe" i]',
    'textarea[name="prompt"]',
    'textarea[id*="prompt" i]',
    '.prompt-input textarea',
    '[data-testid="prompt-input"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLTextAreaElement | HTMLInputElement;
    if (element && element.offsetParent !== null) {
      // Check if visible
      return element;
    }
  }

  // Wait a bit and try again
  await new Promise((resolve) => setTimeout(resolve, 1000));

  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLTextAreaElement | HTMLInputElement;
    if (element && element.offsetParent !== null) {
      return element;
    }
  }

  return null;
}

/**
 * Set value of input element and trigger events
 */
function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  // Clear existing value
  element.value = '';
  element.focus();

  // Set new value
  element.value = value;

  // Trigger events to notify the page of the change
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.blur();
}

/**
 * Apply generation parameters
 */
async function applyParameters(parameters: any): Promise<void> {
  console.log('Applying parameters:', parameters);

  // Apply seed if specified
  if (parameters.seed !== undefined) {
    await setSeed(parameters.seed);
  }

  // Apply other parameters as needed
  // This is a placeholder for parameter application logic
}

/**
 * Set seed value
 */
async function setSeed(seed: number): Promise<void> {
  const seedSelectors = [
    'input[name="seed"]',
    'input[id*="seed" i]',
    '[data-testid="seed-input"] input',
  ];

  for (const selector of seedSelectors) {
    const element = document.querySelector(selector) as HTMLInputElement;
    if (element) {
      setInputValue(element, seed.toString());
      return;
    }
  }

  console.warn('Seed input not found');
}

/**
 * Start image generation
 */
async function startGeneration(): Promise<void> {
  const generateSelectors = [
    'button[type="submit"]',
    'button[data-testid="generate-button"]',
    '.generate-button',
    '[data-testid="generate-button"]',
    'button[aria-label*="generate" i]',
    'button[aria-label*="生成" i]',
  ];

  for (const selector of generateSelectors) {
    const button = document.querySelector(selector) as HTMLButtonElement;
    if (button && !button.disabled && button.offsetParent !== null) {
      button.click();
      console.log('Generation started');
      return;
    }
  }

  throw new Error('Generate button not found or disabled');
}
