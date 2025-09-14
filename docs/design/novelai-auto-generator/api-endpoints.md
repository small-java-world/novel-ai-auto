# API エンドポイント仕様（拡張内メッセージング）

> 本拡張は外部HTTP APIを持たないため、ここでは拡張内のメッセージ（runtime/tabs）を「エンドポイント」として定義する。

## START_GENERATION
- 種別: runtime message（Popup → Service Worker）
- Payload:
```json
{
  "job": { "id": "uuid", "prompt": "...", "params": { "count": 3, "seed": "random" } }
}
```
- レスポンス: `{"success": true}` または `{"success": false, "error": {...}}`

## APPLY_AND_GENERATE
- 種別: tabs message（Service Worker → Content Script）
- Payload:
```json
{ "job": { "id": "uuid", "prompt": "...", "params": { "steps": 28 } } }
```
- 応答: 非同期。進捗/結果は別メッセージで通知。

## PROGRESS_UPDATE
- 種別: runtime message（Content Script → Service Worker）
- Payload:
```json
{ "jobId": "uuid", "status": "running", "progress": { "current": 1, "total": 3, "etaSeconds": 20 } }
```
- 転送: Service Worker → Popup にブロードキャスト。

## IMAGE_READY
- 種別: runtime message（Content Script → Service Worker）
- Payload:
```json
{ "jobId": "uuid", "url": "https://.../image.png", "index": 1, "fileName": "20240914_prompt_seed_001.png" }
```

## DOWNLOAD_IMAGE
- 種別: runtime message（Service Worker → Service Worker 内部呼び出し）
- Payload:
```json
{ "url": "https://.../image.png", "fileName": "..." }
```
- 結果: `chrome.downloads.download` の結果（downloadId/エラー）。

## CANCEL_JOB
- 種別: runtime message（Popup → Service Worker）
- Payload:
```json
{ "jobId": "uuid" }
```
- 効果: キュー/進行中の再試行・待機を中断し、Content Script にキャンセルを通知。

## OPEN_OR_FOCUS_TAB
- 種別: runtime message（Service Worker → Service Worker 内部）
- Payload:
```json
{ "url": "https://novelai.net/image" }
```
- 効果: 既存タブを探し、なければ作成してアクティブ化。

## ERROR
- 種別: runtime message（任意 → Service Worker）
- Payload:
```json
{ "jobId": "uuid", "error": { "code": "DOM_NOT_FOUND", "message": "selector ...", "details": {} } }
```
- 転送: Popup へ表示用にブロードキャスト、ログに記録。

