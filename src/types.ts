/**
 * Type definitions for NovelAI Auto Generator
 */

// Chrome Extension Message Types
export interface Message {
  type: string;
  [key: string]: any;
}

export interface MessageResponse {
  success: boolean;
  error?: string;
  [key: string]: any;
}

// Generation Messages
export interface StartGenerationMessage extends Message {
  type: 'START_GENERATION';
  prompt: string;
  parameters: GenerationParameters;
  settings: GenerationSettings;
}

export interface CancelJobMessage extends Message {
  type: 'CANCEL_JOB';
  jobId: string;
}

export interface DownloadImageMessage extends Message {
  type: 'DOWNLOAD_IMAGE';
  url: string;
  filename: string;
}

// Progress Messages
export interface ProgressUpdateMessage extends Message {
  type: 'GENERATION_PROGRESS';
  progress: GenerationProgress;
}

export interface GenerationCompleteMessage extends Message {
  type: 'GENERATION_COMPLETE';
  count: number;
  downloadedFiles: string[];
}

export interface GenerationErrorMessage extends Message {
  type: 'GENERATION_ERROR';
  error: string;
}

// Content Script Messages
export interface ApplyPromptMessage extends Message {
  type: 'APPLY_PROMPT';
  prompt: string;
  parameters: GenerationParameters;
}

export interface GetPageStateMessage extends Message {
  type: 'GET_PAGE_STATE';
}

// Data Types
export interface PromptData {
  name: string;
  prompt: string;
  negative?: string;
  parameters?: GenerationParameters;
}

export interface GenerationParameters {
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  seed?: number;
  count?: number;
}

export interface GenerationSettings {
  imageCount: number;
  seed: number;
  filenameTemplate: string;
  retrySettings: RetrySettings;
}

// File Name Template Types (TASK-011)
export interface FileNameTemplateContext {
  date: string; // YYYYMMDD-HHmmss format
  prompt: string;
  seed?: string;
  idx?: number;
}

export interface FileNameSanitizeOptions {
  maxLength?: number; // Default: 255 (excluding extension)
  forbiddenChars?: RegExp | string[]; // Default: Windows compatible chars
  replacement?: string; // Default: "_"
  collisionResolver?: (_base: string, _i: number) => string;
}

export interface RetrySettings {
  maxRetries: number;
  baseDelay: number;
  factor: number;
}

export interface GenerationProgress {
  current: number;
  total: number;
  eta?: number;
  status: 'waiting' | 'generating' | 'downloading' | 'complete' | 'error';
}

export interface PageState {
  isNovelAIPage: boolean;
  isLoggedIn: boolean;
  hasPromptInput: boolean;
  currentUrl: string;
}

export interface GenerationJob {
  id: string;
  prompt: string;
  parameters: GenerationParameters;
  settings: GenerationSettings;
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'error';
  createdAt: Date;
  updatedAt: Date;
  progress: GenerationProgress;
  error?: string;
}

// Storage Data Types
export interface StorageData {
  settings?: GenerationSettings;
  jobs?: GenerationJob[];
  logs?: LogEntry[];
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: any;
}
