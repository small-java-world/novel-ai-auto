/**
 * Multi-Character Sequence Handler
 * Ensures proper sequence guarantees and exception handling for multi-character prompts
 */

import type { GenerationParameters } from '../types';

export interface CharacterPrompt {
  id: string;
  name: string;
  gender?: string; // From Selenium: 'その他', '男性', '女性'
  selectorProfile?: string;
  positive: string;
  negative?: string;
  weight?: number; // From Selenium: character weight/strength
}

export interface MultiCharacterMessage {
  type: 'APPLY_MULTI_CHARACTER_PROMPT';
  common?: {
    positive?: string;
    negative?: string;
  };
  characters: CharacterPrompt[];
  parameters?: GenerationParameters;
}

export interface SequenceProgress {
  currentCharacterIndex: number;
  totalCharacters: number;
  currentCharacter: CharacterPrompt;
  phase: 'applying_prompt' | 'generating' | 'completed' | 'error';
  error?: string;
}

export class MultiCharacterSequenceHandler {
  private cancelled = false;
  private currentSequence: CharacterPrompt[] = [];
  private currentIndex = 0;
  private isRunning = false;

  async handleMultiCharacterSequence(
    message: MultiCharacterMessage,
    _sendResponse: (_response: any) => void
  ): Promise<void> {
    try {
      // Validate input
      this.validateMessage(message);

      // Handle empty character list
      if (message.characters.length === 0) {
        _sendResponse({ success: true, message: 'No characters to process' });
        return;
      }

      // Initialize sequence state
      this.currentSequence = [...message.characters];
      this.currentIndex = 0;
      this.cancelled = false;
      this.isRunning = true;

      // Send immediate response to caller
      _sendResponse({ success: true, message: 'Multi-character sequence started' });

      // Process each character in sequence
      console.log('DEBUG: Starting character processing loop', {
        totalCharacters: this.currentSequence.length,
        cancelled: this.cancelled
      });

      for (let i = 0; i < this.currentSequence.length; i++) {
        console.log('DEBUG: Processing character', {
          index: i,
          total: this.currentSequence.length,
          cancelled: this.cancelled,
          characterName: this.currentSequence[i]?.name
        });

        if (this.cancelled) {
          console.log('DEBUG: Sequence cancelled by user');
          await this.sendErrorNotification('Sequence cancelled by user');
          break;
        }

        this.currentIndex = i;
        const character = this.currentSequence[i];

        try {
          // Send progress update
          this.sendProgressUpdate({
            currentCharacterIndex: i,
            totalCharacters: this.currentSequence.length,
            currentCharacter: character,
            phase: 'applying_prompt',
          });

          // Apply character prompt
          console.log('DEBUG: Applying character prompt for:', character.name);
          await this.applyCharacterPrompt(character, message.common);

          // Update phase to generating
          this.sendProgressUpdate({
            currentCharacterIndex: i,
            totalCharacters: this.currentSequence.length,
            currentCharacter: character,
            phase: 'generating',
          });

          // Wait for generation to complete
          console.log('DEBUG: Waiting for generation to complete for:', character.name);
          await this.waitForGeneration();

          // If this is not the last character, add another character slot
          if (i < this.currentSequence.length - 1) {
            console.log('DEBUG: Adding character slot for next character');
            try {
              await this.clickAddCharacterButton();
            } catch (error) {
              const addButtonError = error instanceof Error ? error.message : String(error);
              console.error('CRITICAL: Failed to add next character slot:', addButtonError);
              throw new Error(`Failed to add character slot for next character: ${addButtonError}`);
            }
          }

          // Mark character as completed
          this.sendProgressUpdate({
            currentCharacterIndex: i,
            totalCharacters: this.currentSequence.length,
            currentCharacter: character,
            phase: 'completed',
          });

          console.log('DEBUG: Character completed successfully', {
            index: i,
            name: character.name,
            remaining: this.currentSequence.length - i - 1
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          this.sendProgressUpdate({
            currentCharacterIndex: i,
            totalCharacters: this.currentSequence.length,
            currentCharacter: character,
            phase: 'error',
            error: errorMessage,
          });

          await this.sendErrorNotification(`Character '${character.name}' failed: ${errorMessage}`);
          console.log('DEBUG: Character failed, breaking loop', {
            index: i,
            name: character.name,
            error: errorMessage
          });
          break; // Abort sequence immediately on error
        }
      }

      console.log('DEBUG: Character processing loop completed', {
        finalIndex: this.currentIndex,
        totalCharacters: this.currentSequence.length,
        cancelled: this.cancelled
      });

      // Send completion notification if not cancelled
      // Note: We reach here after processing all characters or breaking on error
      if (!this.cancelled) {
        await this.sendCompletionNotification(this.currentIndex + 1); // +1 because index is 0-based
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.sendErrorNotification(`Sequence validation failed: ${errorMessage}`);
    } finally {
      this.isRunning = false;
      this.currentSequence = [];
      this.currentIndex = 0;
    }
  }

  cancel(): void {
    this.cancelled = true;
  }

  getCurrentProgress(): SequenceProgress | null {
    if (!this.isRunning || this.currentSequence.length === 0) {
      return null;
    }

    return {
      currentCharacterIndex: this.currentIndex,
      totalCharacters: this.currentSequence.length,
      currentCharacter: this.currentSequence[this.currentIndex],
      phase: 'applying_prompt',
    };
  }

  private validateMessage(message: MultiCharacterMessage): void {
    if (!message || typeof message !== 'object') {
      throw new Error('Invalid message format');
    }

    if (!Array.isArray(message.characters)) {
      throw new Error('Characters must be an array');
    }

    // Validate each character
    for (let i = 0; i < message.characters.length; i++) {
      const character = message.characters[i];

      if (!character || typeof character !== 'object') {
        throw new Error(`Character at index ${i} is invalid`);
      }

      if (!character.id || typeof character.id !== 'string' || character.id.trim().length === 0) {
        throw new Error(`Character at index ${i} has invalid ID`);
      }

      if (
        !character.name ||
        typeof character.name !== 'string' ||
        character.name.trim().length === 0
      ) {
        throw new Error(`Character at index ${i} has invalid name`);
      }

      if (
        !character.positive ||
        typeof character.positive !== 'string' ||
        character.positive.trim().length === 0
      ) {
        throw new Error(`Character at index ${i} has invalid positive prompt`);
      }
    }
  }

  private async applyCharacterPrompt(character: CharacterPrompt, common?: any): Promise<void> {
    // Merge common prompts with character-specific prompts
    const mergedPositive = this.mergePrompts(common?.positive, character.positive);
    const mergedNegative = this.mergePrompts(common?.negative, character.negative);

    // Prepare the APPLY_PROMPT message
    const applyMessage = {
      type: 'APPLY_PROMPT',
      prompt: {
        positive: mergedPositive,
        negative: mergedNegative,
      },
      selectorProfile: character.selectorProfile,
    };

    // In a real implementation, this would integrate with content script DOM functions
    // For now, simulate the application with potential error scenarios
    await this.simulatePromptApplication(applyMessage);
  }

  private mergePrompts(common?: string, character?: string): string {
    const parts: string[] = [];

    if (common && common.trim().length > 0) {
      parts.push(common.trim());
    }

    if (character && character.trim().length > 0) {
      parts.push(character.trim());
    }

    return parts.join(', ');
  }

  private async simulatePromptApplication(message: any): Promise<void> {
    // Use content script's existing DOM manipulation by calling handleApplyPrompt directly
    try {
      // This will be resolved at runtime when the content script loads this module
      const handleApplyPrompt = (window as any).handleApplyPromptFunction;

      if (typeof handleApplyPrompt === 'function') {
        // Use existing robust DOM manipulation
        await new Promise((resolve, reject) => {
          const mockSendResponse = (response: any) => {
            if (response.success) {
              resolve(undefined);
            } else {
              reject(new Error(response.error || 'Prompt application failed'));
            }
          };

          handleApplyPrompt(message, mockSendResponse);
        });
      } else {
        // Fallback: simple prompt setting for now
        console.warn('handleApplyPrompt not available, using simple prompt setting');
        await this.fallbackSimplePromptSet(message.prompt.positive, message.prompt.negative);
      }
    } catch (error) {
      throw new Error(`Prompt application failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async fallbackSimplePromptSet(positive: string, negative?: string): Promise<void> {
    // Fallback: Basic prompt setting using simple DOM manipulation
    const promptInput = document.querySelector('textarea') as HTMLTextAreaElement;
    if (promptInput) {
      promptInput.focus();
      promptInput.value = positive;
      promptInput.dispatchEvent(new Event('input', { bubbles: true }));
      promptInput.dispatchEvent(new Event('change', { bubbles: true }));
      promptInput.blur();
    }

    // Simple negative prompt setting
    if (negative) {
      const textareas = document.querySelectorAll('textarea');
      const negativeInput = textareas[textareas.length - 1] as HTMLTextAreaElement;
      if (negativeInput && negativeInput !== promptInput) {
        negativeInput.focus();
        negativeInput.value = negative;
        negativeInput.dispatchEvent(new Event('input', { bubbles: true }));
        negativeInput.dispatchEvent(new Event('change', { bubbles: true }));
        negativeInput.blur();
      }
    }

    await new Promise(r => setTimeout(r, 500)); // Wait for UI update
  }

  private async applyCharacterPromptToDOM(message: any): Promise<void> {
    // Selenium-style character addition workflow
    const character = this.currentSequence[this.currentIndex];
    await this.clickAddCharacterButton();
    await this.selectCharacterGender(character?.gender || 'その他'); // Use character gender or default
    await this.fillCharacterCard(message.prompt.positive, message.prompt.negative, character?.weight);
  }

  private async clickAddCharacterButton(): Promise<void> {
    console.log('DEBUG: Starting clickAddCharacterButton');

    // Selenium equivalent: click_add_character_and_choose
    const addButtonSelectors = [
      "//button[contains(normalize-space(),'キャラクターを追加')]",
      "//button[.//span[contains(.,'キャラクター') and contains(.,'追加')]]",
      "//button[contains(.,'キャラクター') and contains(.,'追加')]",
      "[data-testid*='add-character' i]",
      "button[class*='add' i][class*='character' i]",
      ".add-character-button"
    ];

    // Detailed diagnostic logging
    console.log('DEBUG: Searching for character add button with selectors:', addButtonSelectors);

    // First, log current DOM state for debugging
    const allButtons = document.querySelectorAll('button');
    console.log('DEBUG: Total buttons found on page:', allButtons.length);

    const buttonTexts = Array.from(allButtons).slice(0, 10).map(btn => ({
      tag: btn.tagName,
      text: btn.textContent?.trim().slice(0, 50) || '',
      className: btn.className,
      id: btn.id
    }));
    console.log('DEBUG: Sample button texts (first 10):', buttonTexts);

    let addButton: Element | null = null;
    const attemptResults: Array<{selector: string, found: boolean, error?: string}> = [];

    // Try XPath selectors
    for (const xpath of addButtonSelectors.slice(0, 3)) {
      try {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const found = result.singleNodeValue instanceof Element;
        attemptResults.push({ selector: xpath, found });

        if (found) {
          addButton = result.singleNodeValue;
          console.log('DEBUG: Found add button with XPath:', xpath);
          break;
        }
      } catch (error) {
        attemptResults.push({
          selector: xpath,
          found: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Try CSS selectors if XPath failed
    if (!addButton) {
      for (const cssSelector of addButtonSelectors.slice(3)) {
        try {
          const element = document.querySelector(cssSelector);
          const found = element instanceof Element;
          attemptResults.push({ selector: cssSelector, found });

          if (found) {
            addButton = element;
            console.log('DEBUG: Found add button with CSS:', cssSelector);
            break;
          }
        } catch (error) {
          attemptResults.push({
            selector: cssSelector,
            found: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    // Detailed failure logging
    if (!addButton) {
      console.error('CRITICAL: キャラクター追加ボタンが見つかりません');
      console.error('DEBUG: All selector attempts:', attemptResults);

      // Try fuzzy matching for debugging
      const fuzzyMatches = Array.from(allButtons).filter(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('キャラ') || text.includes('追加') || text.includes('add') || text.includes('character');
      }).map(btn => ({
        text: btn.textContent?.trim(),
        className: btn.className,
        id: btn.id
      }));

      console.error('DEBUG: Potential character-related buttons found:', fuzzyMatches);

      throw new Error(`キャラクター追加ボタンが見つかりません。詳細: ${JSON.stringify({
        totalButtons: allButtons.length,
        selectorAttempts: attemptResults.length,
        potentialMatches: fuzzyMatches.length
      })}`);
    }

    // Selenium-style safe click
    console.log('DEBUG: Clicking add button:', {
      tag: addButton.tagName,
      text: addButton.textContent?.trim().slice(0, 50),
      className: (addButton as HTMLElement).className
    });

    (addButton as HTMLElement).scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as any });
    await new Promise(r => setTimeout(r, 50));
    (addButton as HTMLElement).click();
    console.log('DEBUG: Add button clicked successfully');
    // Wait for menu to appear via MutationObserver (portal/shadow friendly)
    await this.waitForMenu();
  }

  private async selectCharacterGender(genderText: string): Promise<void> {
    // Selenium equivalent: choose gender from dropdown
    const genderSelectors = [
      `//div[contains(@role,'menu') or @role='listbox' or contains(@class,'popover') or contains(@class,'menu')]//button[normalize-space()='${genderText}']`,
      `//*[self::li or self::button or self::div][normalize-space()='${genderText}']`
    ];

    let genderOption: Element | null = null;
    for (const xpath of genderSelectors) {
      try {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue && result.singleNodeValue instanceof Element) {
          genderOption = result.singleNodeValue;
          break;
        }
      } catch {}
    }

    if (!genderOption) {
      throw new Error(`性別メニューの項目が見つかりません: ${genderText}`);
    }

    // Selenium-style safe click
    (genderOption as HTMLElement).scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as any });
    await new Promise(r => setTimeout(r, 50));
    (genderOption as HTMLElement).click();
    // Wait for card creation (detect last card increased) and target only that
    const newCard = await this.waitLastCharacterCard();
    // Immediately fill that new card only
    try { await this.fillCharacterCardInternal(newCard as HTMLElement); } catch {}
  }

  private async fillCharacterCard(positive: string, negative?: string, weight?: number): Promise<void> {
    // Selenium equivalent: fill_character_card
    const card = this.getLastCharacterCard();
    if (!card) {
      throw new Error('追加したキャラカードが見つかりません');
    }
    await this.fillCharacterCardInternal(card as HTMLElement, positive, negative, weight);
    await new Promise(r => setTimeout(r, 200)); // Selenium-style pause
  }

  private async fillCharacterCardInternal(card: HTMLElement, positive?: string, negative?: string, weight?: number): Promise<void> {
    if (positive) {
      const positiveArea = (card.querySelector('.ProseMirror, textarea, [contenteditable="true"]') as HTMLElement) || null;
      if (positiveArea) { this.setCardInputValue(positiveArea, positive); }
    }
    if (negative != null) {
      const negativeArea = (card.querySelector('[placeholder*="Negative" i], .ProseMirror + * .ProseMirror, textarea') as HTMLElement) || null;
      if (negativeArea) { this.setCardInputValue(negativeArea, negative); }
    }
    if (typeof weight === 'number') {
      await this.setCharacterWeight(card, weight);
    }
  }

  private getLastCharacterCard(): Element | null {
    //現実的な戦略: 実際のNovelAI UIに基づく

    const strategies = [
      // Strategy 1: Find containers with multiple ProseMirror editors (character cards pattern)
      () => {
        const containers = document.querySelectorAll('section, div, fieldset');
        let lastCardWithEditors: Element | null = null;

        containers.forEach(container => {
          const proseMirrors = container.querySelectorAll('.ProseMirror');
          const textareas = container.querySelectorAll('textarea');
          const inputs = container.querySelectorAll('input');

          // Character cards typically have multiple input elements
          if (proseMirrors.length >= 2 || textareas.length >= 2 ||
              (proseMirrors.length + textareas.length) >= 2) {
            lastCardWithEditors = container;
          }
        });

        return lastCardWithEditors;
      },

      // Strategy 2: Look for recently added/visible character sections
      () => {
        const cards = document.querySelectorAll(
          '[class*="character"], [data-character], [data-testid*="character"], section, div'
        );

        // Find the last visible card with input elements
        for (let i = cards.length - 1; i >= 0; i--) {
          const card = cards[i];
          const rect = card.getBoundingClientRect();
          const hasInputs = card.querySelectorAll('textarea, input, .ProseMirror').length > 0;

          if (hasInputs && rect.width > 0 && rect.height > 0) {
            return card;
          }
        }
        return null;
      },

      // Strategy 3: Fallback - find any container with multiple input elements
      () => {
        const allContainers = document.querySelectorAll('*');
        let lastContainer: Element | null = null;

        allContainers.forEach(container => {
          const inputElements = container.querySelectorAll('textarea, input[type="text"], input[type="number"], .ProseMirror');
          if (inputElements.length >= 3) { // Character cards usually have 3+ inputs (positive, negative, weight)
            lastContainer = container;
          }
        });

        return lastContainer;
      }
    ];

    // Try each strategy
    for (const strategy of strategies) {
      const card = strategy();
      if (card) {
        return card;
      }
    }

    return null;
  }

  private async waitForMenu(maxMs = 1200): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        try { obs.disconnect(); } catch {}
        reject(new Error('menu timeout'));
      }, maxMs);

      const pick = () => {
        const cand = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"], [role="listbox"], [class*="menu"], [class*="popover"]'))
          .find(e => (e.offsetParent !== null) || e.getClientRects().length > 0);
        if (cand) { clearTimeout(t); try { obs.disconnect(); } catch {} resolve(cand); }
      };

      const obs = new MutationObserver(pick);
      obs.observe(document.documentElement, { childList: true, subtree: true });
      pick();
    });
  }

  private async waitLastCharacterCard(maxMs = 1500): Promise<HTMLElement> {
    const initial = Array.from(document.querySelectorAll<HTMLElement>('[class*="character-card"], [data-testid*="character-card"]'));
    return new Promise((resolve, reject) => {
      const deadline = performance.now() + maxMs;
      const tick = () => {
        const now = Array.from(document.querySelectorAll<HTMLElement>('[class*="character-card"], [data-testid*="character-card"]'));
        if (now.length > initial.length) { resolve(now[now.length - 1]); return; }
        if (performance.now() > deadline) return reject(new Error('card timeout'));
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  private findElementInCard(card: Element, xpaths: string[]): Element | null {
    for (const xpath of xpaths) {
      try {
        const result = document.evaluate(xpath, card, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue && result.singleNodeValue instanceof Element) {
          return result.singleNodeValue;
        }
      } catch {}
    }
    return null;
  }

  private setCardInputValue(element: Element, value: string): void {
    // Selenium-style input value setting with enhanced reliability
    const el = element as HTMLElement;

    // Selenium-style: scroll into view first
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as any });

    // Focus with retry (like Selenium wait for element)
    el.focus();

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      // Selenium clear() + send_keys() pattern
      el.value = '';
      el.value = value;
      el.defaultValue = value;
      el.setAttribute('value', value);

      // Fire comprehensive events like Selenium js_set_value_and_fire
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('keyup', { bubbles: true }));
    } else if ((el as any).isContentEditable === true || el.getAttribute('contenteditable') === 'true') {
      // For contenteditable elements
      try {
        // Try modern approach first
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          const range = document.createRange();
          range.selectNodeContents(el);
          selection.addRange(range);
        }

        // Use execCommand for better compatibility
        document.execCommand('selectAll', false);
        const inserted = document.execCommand('insertText', false, value);
        if (!inserted) {
          el.textContent = value;
        }
      } catch {
        el.textContent = value;
      }

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    el.blur();

    // Selenium-style: small pause after setting value
    setTimeout(() => {
      // Verify value was set correctly
      const currentValue = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        ? el.value
        : el.textContent || '';
      if (currentValue.trim() !== value.trim()) {
        console.warn('Character card input value may not have been set correctly', {
          expected: value,
          actual: currentValue
        });
      }
    }, 100);
  }

  private async setCharacterWeight(card: Element, weight: number): Promise<void> {
    // Selenium equivalent: setting character weight/strength
    const weightInput = this.findElementInCard(card, [
      ".//*[contains(normalize-space(),'強度') or contains(translate(., 'WEIGHT','weight'),'weight')]/following::input[@type='number'][1]",
      ".//input[@type='number' and (contains(@name,'weight') or contains(@aria-label,'weight') or contains(@aria-label,'強度'))]",
      ".//input[@type='number']", // Fallback to any number input
      ".//input[@type='range']" // Slider fallback
    ]);

    if (weightInput) {
      const el = weightInput as HTMLInputElement;
      el.focus();

      if (el.type === 'range') {
        // Selenium slider handling
        el.value = String(weight);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (el.type === 'number') {
        // Selenium number input handling
        el.value = '';
        el.valueAsNumber = weight;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      el.blur();
    } else {
      console.warn('Character weight input not found in card');
    }
  }

  private async waitForGeneration(): Promise<void> {
    // Real generation waiting - Selenium-style WebDriverWait equivalent
    const maxWaitTime = 120000; // 2 minutes like Selenium MAX_WAIT_GEN
    const deadline = Date.now() + maxWaitTime;

    // First, trigger generation
    await this.clickGenerateButton();

    // Wait for generation cycle completion
    await this.waitForGenerateButtonCycle(deadline);

    // Check for cancellation during generation
    if (this.cancelled) {
      throw new Error('Generation cancelled');
    }
  }

  private async clickGenerateButton(): Promise<void> {
    // Selenium equivalent: click_generate
    const generateSelectors = [
      "//button[contains(.,'1枚のみ生成') and not(@disabled)]",
      "//button[contains(.,'生成') and not(@disabled)]",
      "//button[contains(.,'Generate') and not(@disabled)]"
    ];

    let generateButton: Element | null = null;
    for (const xpath of generateSelectors) {
      try {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue && result.singleNodeValue instanceof Element) {
          generateButton = result.singleNodeValue;
          break;
        }
      } catch {}
    }

    if (!generateButton) {
      throw new Error('Generate button not found');
    }

    // Selenium-style safe click
    (generateButton as HTMLElement).scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as any });
    await new Promise(r => setTimeout(r, 50));
    (generateButton as HTMLElement).click();
  }

  private async waitForGenerateButtonCycle(deadline: number): Promise<void> {
    // Selenium-style wait for button disable→enable cycle
    let sawDisabled = false;

    while (Date.now() < deadline) {
      if (this.cancelled) {
        throw new Error('Generation cancelled');
      }

      const button = this.findCurrentGenerateButton();
      if (button) {
        const isDisabled = this.isButtonDisabled(button);
        if (isDisabled) {
          sawDisabled = true;
        } else if (sawDisabled) {
          // Button was disabled and is now enabled - generation complete
          return;
        }
      }

      await new Promise(r => setTimeout(r, 500)); // Poll every 500ms
    }

    throw new Error('Generation timeout');
  }

  private findCurrentGenerateButton(): Element | null {
    const generateSelectors = [
      "//button[contains(.,'1枚のみ生成')]",
      "//button[contains(.,'生成')]",
      "//button[contains(.,'Generate')]"
    ];

    for (const xpath of generateSelectors) {
      try {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue && result.singleNodeValue instanceof Element) {
          return result.singleNodeValue;
        }
      } catch {}
    }
    return null;
  }

  private isButtonDisabled(button: Element): boolean {
    const el = button as HTMLElement;
    const aria = el.getAttribute('aria-disabled');
    if (aria === 'true') return true;
    if ((el as any).disabled === true) return true;

    const cls = (el.className || '').toLowerCase();
    if (/(^|\s)(disabled|is-disabled|loading|busy|processing)(\s|$)/.test(cls)) return true;

    try {
      const pe = getComputedStyle(el).pointerEvents;
      if (pe === 'none') return true;
    } catch {}

    return false;
  }

  private sendProgressUpdate(progress: SequenceProgress): void {
    // Send progress update message
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const result = chrome.runtime.sendMessage({
          type: 'MULTI_CHARACTER_PROGRESS',
          progress,
        });
        // Handle both promise and non-promise returns
        if (result && typeof result.catch === 'function') {
          result.catch(() => {
            // Ignore messaging errors during testing
          });
        }
      } catch {
        // Ignore messaging errors during testing
      }
    }
  }

  private async sendErrorNotification(error: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const result = chrome.runtime.sendMessage({
          type: 'MULTI_CHARACTER_ERROR',
          error,
        });
        // Handle both promise and non-promise returns
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch {
        // Ignore messaging errors during testing
      }
    }
  }

  private async sendCompletionNotification(count: number): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const result = chrome.runtime.sendMessage({
          type: 'MULTI_CHARACTER_COMPLETE',
          count,
        });
        // Handle both promise and non-promise returns
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch {
        // Ignore messaging errors during testing
      }
    }
  }
}
