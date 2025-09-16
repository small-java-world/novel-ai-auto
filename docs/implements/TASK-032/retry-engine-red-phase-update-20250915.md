# TASK-032 Redフェーズ更新: 設定アダプタ経由のRetryEngine生成テスト（失敗テスト）

## 対象テストケース
- テスト名: RetrySettings から RetryEngine を生成し、指数バックオフが正しく計算される
- 信頼性レベル: 🟢（architecture.md 既定値と既存 `calculateDelay` 数式に整合）

## 追加したテストコード
- ファイル: `src/utils/retry-engine.adapter.red.test.ts`
- 目的: 未実装アダプタ `createRetryEngineFromRetrySettings(settings)` を先にテスト化
- 概要:
  - 入力: `RetrySettings = { baseDelay: 500, factor: 2.0, maxRetries: 5 }`
  - 期待: `calculateDelay(0..2)` が `500, 1000, 2000` を返す

```ts
import { describe, test, expect } from 'vitest';
import type { RetryEngine } from './retry-engine';
import type { RetrySettings } from '../types';
import { createRetryEngineFromRetrySettings } from './retry-engine.adapter';

describe('Retry Engine（指数バックオフ）設定アダプタ', () => {
  test('RetrySettings から RetryEngine を生成し、指数バックオフが正しく計算される', () => {
    // 【テスト目的】: 設定→アダプタ→エンジンの遅延計算を検証
    // 【期待される動作】: 0:500ms, 1:1000ms, 2:2000ms
    // 🟢 信頼性: 設計既定/実装数式に整合
    const settings: RetrySettings = { baseDelay: 500, factor: 2.0, maxRetries: 5 };
    const engine: RetryEngine = createRetryEngineFromRetrySettings(settings);
    expect(engine.calculateDelay(0)).toBe(500);
    expect(engine.calculateDelay(1)).toBe(1000);
    expect(engine.calculateDelay(2)).toBe(2000);
  });
});
```

## テスト実行コマンド
- `npm test` または `npx vitest run`

## 期待される失敗メッセージ（例）
- モジュール未実装に起因:
  - Failed to resolve import "./retry-engine.adapter" from "src/utils/retry-engine.adapter.red.test.ts".
  - 或いは TypeScript エラー: Cannot find module './retry-engine.adapter' or its corresponding type declarations.

## コメントの意図
- 日本語コメントで Given/When/Then・検証項目・信号🟢を明示し、設計資料とのトレーサビリティを確保。

## 次フェーズ（Green）で実装する内容
- `src/utils/retry-engine.adapter.ts` を新規実装:
  - `export function createRetryEngineFromRetrySettings(settings: RetrySettings): RetryEngine` を提供
  - 既存 `createRetryEngine({ baseDelay, factor, maxRetries })` を内部で呼び出すアダプタ
  - 将来の命名差異（maxAttempts/baseDelayMs 等）に対する集約ポイントとして活用
