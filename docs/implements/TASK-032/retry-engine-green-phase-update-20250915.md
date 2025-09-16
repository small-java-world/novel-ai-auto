# TASK-032 Greenフェーズ更新: 設定アダプタ最小実装

## 実装ファイル
- `src/utils/retry-engine.adapter.ts`

## 実装方針（最小）
- `RetrySettings`（`src/types.ts`）→ `createRetryEngine` への橋渡しのみ実装
- 命名は既存と一致（`baseDelay`/`factor`/`maxRetries`）のため、そのまま委譲
- 入力検証は次フェーズで拡張（Greenでは最小限）

```ts
import { createRetryEngine, type RetryEngine } from './retry-engine';
import type { RetrySettings } from '../types';

/**
 * 【機能概要】: RetrySettings から RetryEngine を生成
 * 【実装方針】: 最小の値委譲のみ（Redテスト通過優先）
 * 【テスト対応】: adapter.red.test の calculateDelay 検証
 * 🟢 信頼性: 設計の既定値/既存実装の整合に基づく
 */
export function createRetryEngineFromRetrySettings(settings: RetrySettings): RetryEngine {
  return createRetryEngine({
    baseDelay: settings.baseDelay,
    factor: settings.factor,
    maxRetries: settings.maxRetries,
  });
}
```

## テスト結果
- 実行: `npm run test:unit`
- 結果: 本アダプタのRedテストは通過を確認
- 備考: 既存の別Redテスト（`retry-engine.previewDelays.red.test.ts`）は意図的に失敗状態のまま

## 課題・改善点（Refactor候補）
- 入力検証（境界/型の厳格化）を adapter でも実施
- Settings（設計の `baseDelayMs`/`maxAttempts` 等の揺れ）との用語マッピング集約
