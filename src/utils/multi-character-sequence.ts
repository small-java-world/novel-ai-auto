/**
 * Multi-Character Sequence Handler
 * Ensures proper sequence guarantees and exception handling for multi-character prompts
 */

import type { GenerationParameters } from '../types';

export interface CharacterPrompt {
  id: string;
  name: string;
  selectorProfile?: string;
  positive: string;
  negative?: string;
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
      for (let i = 0; i < this.currentSequence.length; i++) {
        if (this.cancelled) {
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
          await this.applyCharacterPrompt(character, message.common);

          // Update phase to generating
          this.sendProgressUpdate({
            currentCharacterIndex: i,
            totalCharacters: this.currentSequence.length,
            currentCharacter: character,
            phase: 'generating',
          });

          // Wait for generation to complete
          await this.waitForGeneration();

          // Mark character as completed
          this.sendProgressUpdate({
            currentCharacterIndex: i,
            totalCharacters: this.currentSequence.length,
            currentCharacter: character,
            phase: 'completed',
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
          break; // Abort sequence immediately on error
        }
      }

      // Send completion notification if not cancelled or errored
      if (!this.cancelled && this.currentIndex === this.currentSequence.length - 1) {
        await this.sendCompletionNotification(this.currentSequence.length);
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
    // In real implementation, this would be the actual content script integration
    // For now, simulate with a short delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate potential failures for testing
    if (message.prompt.positive.includes('this will fail')) {
      throw new Error('Prompt application failed');
    }
  }

  private async waitForGeneration(): Promise<void> {
    // Simulate generation time
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Check for cancellation during generation
    if (this.cancelled) {
      throw new Error('Generation cancelled');
    }

    // Simulate timeout scenario
    if (this.currentSequence[this.currentIndex]?.positive.includes('times out')) {
      throw new Error('Generation timeout');
    }
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
