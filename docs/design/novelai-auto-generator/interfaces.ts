// 共通型
export type UUID = string;
export type Timestamp = string; // ISO 8601

// プロンプトと設定
export interface PromptPreset {
  id: string;
  name: string;
  prompt: string;
  negative?: string;
  params?: Partial<GenerationParams>;
}

export interface GenerationParams {
  steps: number;
  sampler?: string;
  cfgScale?: number;
  width?: number;
  height?: number;
  seed?: number | "random";
  count?: number; // 生成枚数
}

export interface FileNameTemplateContext {
  date: string; // YYYYMMDD-HHmmss
  prompt: string;
  seed?: string;
  idx?: number;
}

export interface Settings {
  defaultSeed: number | "random";
  defaultCount: number;
  fileNameTemplate: string; // e.g., "{date}_{prompt}_{seed}_{idx}"
  retry: {
    maxAttempts: number; // default 5
    baseDelayMs: number; // default 500
    factor: number; // default 2.0
  };
  accessibility?: {
    highContrast?: boolean;
    keyboardOnly?: boolean;
  };
}

// ジョブと進捗
export type JobStatus =
  | "pending"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "canceled";

export interface GenerationJob {
  id: UUID;
  createdAt: Timestamp;
  presetId?: string;
  prompt: string;
  negative?: string;
  params: GenerationParams;
  status: JobStatus;
  progress?: ProgressInfo;
  error?: ErrorInfo;
}

export interface ProgressInfo {
  current: number; // 完了枚数
  total: number; // 指定枚数
  message?: string;
  etaSeconds?: number;
}

export interface ErrorInfo {
  code: string; // e.g., "DOM_NOT_FOUND", "TIMEOUT", "DOWNLOAD_FAILED"
  message: string;
  details?: unknown;
}

// メッセージング（runtime/tabs）
export type MessageType =
  | "START_GENERATION"
  | "CANCEL_JOB"
  | "APPLY_AND_GENERATE"
  | "PROGRESS_UPDATE"
  | "IMAGE_READY"
  | "DOWNLOAD_IMAGE"
  | "OPEN_OR_FOCUS_TAB"
  | "ERROR";

export interface BaseMessage<T extends MessageType, P = unknown> {
  type: T;
  payload: P;
}

export type StartGenerationMsg = BaseMessage<
  "START_GENERATION",
  { job: GenerationJob }
>;

export type CancelJobMsg = BaseMessage<"CANCEL_JOB", { jobId: UUID }>;

export type ApplyAndGenerateMsg = BaseMessage<
  "APPLY_AND_GENERATE",
  { job: GenerationJob }
>;

export type ProgressUpdateMsg = BaseMessage<
  "PROGRESS_UPDATE",
  { jobId: UUID; progress: ProgressInfo; status: JobStatus }
>;

export type ImageReadyMsg = BaseMessage<
  "IMAGE_READY",
  { jobId: UUID; url: string; index: number; fileName: string }
>;

export type DownloadImageMsg = BaseMessage<
  "DOWNLOAD_IMAGE",
  { url: string; fileName: string }
>;

export type OpenOrFocusTabMsg = BaseMessage<
  "OPEN_OR_FOCUS_TAB",
  { url: string }
>;

export type ErrorMsg = BaseMessage<
  "ERROR",
  { jobId?: UUID; error: ErrorInfo }
>;

export type RuntimeMessage =
  | StartGenerationMsg
  | CancelJobMsg
  | ApplyAndGenerateMsg
  | ProgressUpdateMsg
  | ImageReadyMsg
  | DownloadImageMsg
  | OpenOrFocusTabMsg
  | ErrorMsg;

// ストレージ論理モデル
export interface StorageModel {
  settings: Settings;
  presets: PromptPreset[];
  jobs: Record<UUID, GenerationJob>;
  logs: Array<{ ts: Timestamp; level: "info" | "warn" | "error"; msg: string }>;
}

