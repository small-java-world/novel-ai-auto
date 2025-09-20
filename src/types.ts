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
export interface PromptSegments {\r\n  positive: string;\r\n  negative?: string;\r\n}\r\n\r\nexport interface StartGenerationMessage extends Message {\r\n  type: 'START_GENERATION';\r\n  prompt: PromptSegments;\r\n  parameters: GenerationParameters;\r\n  settings: GenerationSettings;\r\n}\r\n\r\nexport interface CancelJobMessage extends Message {
  type: 'CANCEL_JOB';
  jobId: string;
  reason?: 'user_requested' | 'timeout' | 'error';
}

export interface DownloadImageMessage extends Message {
  type: 'DOWNLOAD_IMAGE';
  url: string;
  filename: string;
}

// Progress Messages
export interface ProgressUpdateMessage extends Message {
  type: 'PROGRESS_UPDATE';
  currentIndex: number;
  totalCount: number;
  status: 'waiting' | 'generating' | 'downloading' | 'completed' | 'error' | 'cancelled';
  eta?: number;
  error?: string;
  timestamp: number;
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
export interface ApplyPromptMessage extends Message {\r\n  type: 'APPLY_PROMPT';\r\n  prompt: PromptSegments;\r\n  parameters: GenerationParameters;\r\n}\r\n\r\nexport interface GetPageStateMessage extends Message {
  type: 'GET_PAGE_STATE';
}

// Data Types
export interface PromptData {
  name: string;
  prompt: string;
  negative?: string;
  parameters?: GenerationParameters;
  // Optional selector profile to force a specific DOM selector profile per character/preset
  selectorProfile?: string;
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
  timestamp: number;
  type: 'success' | 'warning' | 'error';
  message: string;
  context?: any;
}

// TASK-070: Login Detection and Job Resumption Types
export interface LoginRequiredMessage extends Message {
  type: 'LOGIN_REQUIRED';
  currentJobId?: string;
  detectedAt: number;
  redirectUrl: string;
}

export interface JobResumeMessage extends Message {
  type: 'RESUME_JOB';
  jobId: string;
  resumePoint: 'prompt_application' | 'generation_start' | 'download_start';
}

export interface LoginCompletedMessage extends Message {
  type: 'LOGIN_COMPLETED';
  detectedAt: number;
  availableForResume: boolean;
}

// Login Detection Result Types
export interface LoginDetectionResult {
  detected: boolean;
  message?: LoginRequiredMessage;
  fallbackResult?: string;
  warning?: string;
  reason?: string;
}

export interface JobPauseResult {
  success: boolean;
  pausedJob: GenerationJob & { pausedAt: number };
}

export interface SaveStateResult {
  storageResult: 'success' | 'failed';
  fallbackResult?: 'memory_only';
  warning?: string;
  memoryState?: any;
}

export interface LoginCompletedResult {
  completed: boolean;
  message: LoginCompletedMessage;
}

export interface JobResumeResult {
  success: boolean;
  resumedJob?: {
    id: string;
    resumePoint: string;
  };
  message?: JobResumeMessage;
  validationResult?: string;
  action?: string;
  cleanupResult?: string;
}

export interface PageTransition {
  previousUrl: string;
  currentUrl: string;
  pageState: PageState;
}

export interface TabFailureResult {
  tabResult: string;
  userAction: string;
  message: string;
  instructions: string[];
}

export interface DetectionResult {
  detected: boolean;
  reason: string;
}

export interface RateLimitResult {
  blocked: boolean;
  autoResumeEnabled: boolean;
  reason?: string;
}

export interface TimeoutResult {
  completed: boolean;
  withinSLA: boolean;
  warning: boolean;
}

export interface UrlChangeResult {
  handled: boolean;
  fallback: string;
}

// TASK-071: Network Recovery Handler Types
export interface NetworkStateMessage extends Message {
  type: 'NETWORK_STATE_CHANGED';
  isOnline: boolean;
  timestamp: number;
  affectedJobs?: string[];
}

export interface JobPausedMessage extends Message {
  type: 'JOB_PAUSED';
  jobId: string;
  reason: 'network_offline';
  pausedAt: number;
}

export interface JobResumedMessage extends Message {
  type: 'JOB_RESUMED';
  jobId: string;
  reason: 'network_restored';
  resumedAt: number;
}

// Network Recovery Result Types
export interface NetworkStateDetectionResult {
  detected: boolean;
  message?: NetworkStateMessage;
  fallbackMode?: boolean;
  assumedState?: 'online' | 'offline';
  warning?: string;
  monitoringDisabled?: boolean;
}

export interface JobPauseCollectiveResult {
  success: boolean;
  pausedJobs: GenerationJob[];
  messages: JobPausedMessage[];
  pauseResult?: 'success' | 'failed';
  fallbackAction?: 'force_stop';
  errorLog?: string;
  jobStatus?: string;
  userNotification?: string;
}

export interface JobResumeCollectiveResult {
  success: boolean;
  resumedJobs: GenerationJob[];
  messages: JobResumedMessage[];
  resumeResult?: 'success' | 'failed';
  delegatedTo?: 'retry_engine';
  retryScheduled?: boolean;
  maxRetries?: number;
  nextRetryAt?: number;
  userMessage?: string;
}

export interface FlappingPreventionResult {
  detected: boolean;
  reason: 'flapping_prevention' | 'threshold_met' | 'stable_state';
}

export interface StagedResumeResult {
  success: boolean;
  resumeSchedule: Array<{
    jobId: string;
    delayMs: number;
  }>;
  totalJobs: number;
  immediate?: number;
  queued?: number;
  batchCount?: number;
}

// Additional Network Recovery Types
export interface NetworkState {
  isOnline: boolean;
}

export interface PausedJob {
  id: string;
  status: 'paused';
  reason?: string;
  pausedAt: number;
  progress?: GenerationProgress;
  data?: any;
}

export interface BroadcastResult {
  success: boolean;
  deliveryResults: Array<{
    target: string;
    success: boolean;
  }>;
  totalDelivered: number;
}

export interface DirectNotificationResult {
  routerUsed: boolean;
  directNotificationSent: boolean;
  notificationTargets: string[];
  fallbackMethod: string;
  deliveryConfirmed: boolean;
}

export interface IntervalSettingResult {
  applied: number;
  acceptable: boolean;
  capped?: boolean;
  warning?: string;
}

export interface NetworkStateChange {
  isOnline: boolean;
  timestamp: number;
}

// TASK-100: Local File Selection Types
export interface LocalFileLoadResult {
  success: boolean;
  data?: PromptData[];
  error?: string;
  fileSize?: number;
  fileName?: string;
}

