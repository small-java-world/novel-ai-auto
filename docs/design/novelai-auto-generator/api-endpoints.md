# API エンドポイント仕様（拡張内メッセージング）

> 本拡張は外部HTTP APIを持たないため、ここでは拡張内のメッセージ（runtime/tabs）を「エンドポイント」として定義する。

## 基本メッセージ構造

すべてのメッセージは以下の基本構造に従います：

```typescript
interface BaseMessage<T extends MessageType = MessageType, P = unknown> {
  type: T;
  payload: P;
}
```

## 生成関連メッセージ

### START_GENERATION

- 種別: runtime message（Popup → Service Worker）
- Payload:

```json
{
  "job": {
    "id": "uuid",
    "prompt": "...",
    "parameters": { "steps": 28, "cfgScale": 5, "sampler": "k_euler", "seed": 123, "count": 3 },
    "settings": { "imageCount": 3, "seed": 123, "filenameTemplate": "{date}_{prompt}_{seed}_{idx}", "retrySettings": {...} }
  }
}
```

- レスポンス: `{"success": true}` または `{"success": false, "error": {...}}`

### APPLY_AND_GENERATE

- 種別: tabs message（Service Worker → Content Script）
- Payload:

```json
{
  "job": {
    "id": "uuid",
    "prompt": "...",
    "parameters": { "steps": 28, "cfgScale": 5, "sampler": "k_euler" }
  }
}
```

- 応答: 非同期。進捗/結果は別メッセージで通知。

### APPLY_PROMPT

- 種別: runtime message（Service Worker → Content Script）
- Payload:

```json
{
  "prompt": "...",
  "parameters": { "steps": 28, "cfgScale": 5, "sampler": "k_euler" }
}
```

- 効果: Content Scriptでプロンプトとパラメータを適用

### PROGRESS_UPDATE

- 種別: runtime message（Content Script → Service Worker）
- Payload:

```json
{
  "jobId": "uuid",
  "status": "running",
  "progress": { "current": 1, "total": 3, "etaSeconds": 20 }
}
```

- 転送: Service Worker → Popup にブロードキャスト。

### IMAGE_READY

- 種別: runtime message（Content Script → Service Worker）
- Payload:

```json
{
  "jobId": "uuid",
  "url": "https://.../image.png",
  "index": 1,
  "fileName": "20240914_prompt_seed_001.png"
}
```

### GENERATION_COMPLETE

- 種別: runtime message（Content Script → Service Worker）
- Payload:

```json
{
  "count": 3,
  "downloadedFiles": ["file1.png", "file2.png", "file3.png"]
}
```

### GENERATION_ERROR

- 種別: runtime message（Content Script → Service Worker）
- Payload:

```json
{
  "error": "Error message"
}
```

## ダウンロード関連メッセージ

### DOWNLOAD_IMAGE

- 種別: runtime message（Service Worker → Service Worker 内部呼び出し）
- Payload:

```json
{ "url": "https://.../image.png", "fileName": "..." }
```

- 結果: `chrome.downloads.download` の結果（downloadId/エラー）。

## ジョブ制御メッセージ

### CANCEL_JOB

- 種別: runtime message（Popup → Service Worker）
- Payload:

```json
{
  "jobId": "uuid",
  "reason": "user_requested" // optional: "user_requested" | "timeout" | "error"
}
```

- 効果: キュー/進行中の再試行・待機を中断し、Content Script にキャンセルを通知。

## タブ管理メッセージ

### OPEN_OR_FOCUS_TAB

- 種別: runtime message（Service Worker → Service Worker 内部）
- Payload:

```json
{ "url": "https://novelai.net/image" }
```

- 効果: 既存タブを探し、なければ作成してアクティブ化。

## ページ状態メッセージ

### GET_PAGE_STATE

- 種別: runtime message（Service Worker → Content Script）
- Payload: なし
- 応答:

```json
{
  "isNovelAIPage": true,
  "isLoggedIn": true,
  "hasPromptInput": true,
  "currentUrl": "https://novelai.net/image"
}
```

## ログイン検出関連メッセージ（TASK-070）

### LOGIN_REQUIRED_CHECK

- 種別: runtime message（Service Worker → Login Detection Channel）
- Payload:

```json
{
  "currentJobId": "uuid" // optional
}
```

- 応答: `LOGIN_REQUIRED_RESULT`

### LOGIN_REQUIRED_RESULT

- 種別: runtime message（Login Detection Channel → Service Worker）
- Payload:

```json
{
  "detected": true,
  "message": {
    "type": "LOGIN_REQUIRED",
    "currentJobId": "uuid",
    "detectedAt": 1234567890,
    "redirectUrl": "https://novelai.net/login"
  },
  "fallbackResult": "string",
  "warning": "string",
  "reason": "string"
}
```

### LOGIN_COMPLETED_CHECK

- 種別: runtime message（Service Worker → Login Detection Channel）
- Payload:

```json
{
  "pageTransition": {
    "previousUrl": "https://novelai.net/login",
    "currentUrl": "https://novelai.net/image",
    "pageState": { ... }
  }
}
```

- 応答: `LOGIN_COMPLETED_RESULT`

### LOGIN_COMPLETED_RESULT

- 種別: runtime message（Login Detection Channel → Service Worker）
- Payload:

```json
{
  "completed": true,
  "message": {
    "type": "LOGIN_COMPLETED",
    "detectedAt": 1234567890,
    "availableForResume": true
  }
}
```

### PAUSE_RUNNING_JOB

- 種別: runtime message（Service Worker → Login Detection Channel）
- Payload:

```json
{
  "job": {
    "id": "uuid",
    "status": "running"
    // ... other job properties
  }
}
```

- 応答: `JOB_PAUSE_RESULT`

### JOB_PAUSE_RESULT

- 種別: runtime message（Login Detection Channel → Service Worker）
- Payload:

```json
{
  "success": true,
  "pausedJob": {
    "id": "uuid",
    "status": "paused",
    "pausedAt": 1234567890
    // ... other job properties
  }
}
```

### SAVE_JOB_STATE

- 種別: runtime message（Service Worker → Login Detection Channel）
- Payload:

```json
{
  "pausedJob": {
    "id": "uuid",
    "status": "paused",
    "pausedAt": 1234567890
    // ... other job properties
  }
}
```

- 応答: `JOB_SAVE_RESULT`

### JOB_SAVE_RESULT

- 種別: runtime message（Login Detection Channel → Service Worker）
- Payload:

```json
{
  "storageResult": "success", // "success" | "failed"
  "fallbackResult": "memory_only", // optional
  "warning": "string", // optional
  "memoryState": {} // optional
}
```

### RESUME_SAVED_JOB

- 種別: runtime message（Service Worker → Login Detection Channel）
- Payload: なし
- 応答: `JOB_RESUME_RESULT`

### JOB_RESUME_RESULT

- 種別: runtime message（Login Detection Channel → Service Worker）
- Payload:

```json
{
  "success": true,
  "resumedJob": {
    "id": "uuid",
    "resumePoint": "prompt_application" // "prompt_application" | "generation_start" | "download_start"
  },
  "message": {
    "type": "RESUME_JOB",
    "jobId": "uuid",
    "resumePoint": "prompt_application"
  },
  "validationResult": "string", // optional
  "action": "string", // optional
  "cleanupResult": "string" // optional
}
```

### LOGIN_CACHE_RESET

- 種別: runtime message（Service Worker → Login Detection Channel）
- Payload: なし
- 応答: `LOGIN_CACHE_CLEARED`

### LOGIN_CACHE_CLEARED

- 種別: runtime message（Login Detection Channel → Service Worker）
- Payload: なし

### LOGIN_DETECTION_ERROR

- 種別: runtime message（Login Detection Channel → Service Worker）
- Payload:

```json
{
  "code": "HANDLER_EXCEPTION",
  "message": "Error message"
}
```

## ネットワーク復旧関連メッセージ（TASK-071）

### NETWORK_STATE_CHANGED

- 種別: runtime message（Network Monitor → Service Worker）
- Payload:

```json
{
  "isOnline": true,
  "timestamp": 1234567890,
  "affectedJobs": ["job1", "job2"] // optional
}
```

### JOB_PAUSED

- 種別: runtime message（Service Worker → Popup）
- Payload:

```json
{
  "jobId": "uuid",
  "reason": "network_offline",
  "pausedAt": 1234567890
}
```

### JOB_RESUMED

- 種別: runtime message（Service Worker → Popup）
- Payload:

```json
{
  "jobId": "uuid",
  "reason": "network_restored",
  "resumedAt": 1234567890
}
```

## エラーメッセージ

### ERROR

- 種別: runtime message（任意 → Service Worker）
- Payload:

```json
{
  "jobId": "uuid", // optional
  "error": {
    "code": "DOM_NOT_FOUND",
    "message": "selector ...",
    "details": {}
  }
}
```

- 転送: Popup へ表示用にブロードキャスト、ログに記録。
