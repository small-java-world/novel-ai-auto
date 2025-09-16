// テストファイル: src/utils/retry-engine.adapter.red.test.ts
import { describe, test, expect } from 'vitest';
import type { RetryEngine } from './retry-engine';
import type { RetrySettings } from '../types';
// まだ未実装の関数を想定してインポート（Redフェーズ用）
// 実装予定: src/utils/retry-engine.adapter.ts
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createRetryEngineFromRetrySettings } from './retry-engine.adapter';

describe('Retry Engine（指数バックオフ）設定アダプタ', () => {
  test('RetrySettings から RetryEngine を生成し、指数バックオフが正しく計算される', () => {
    // 【テスト目的】: 設定（RetrySettings）からアダプタ経由で RetryEngine を生成し、指数バックオフの遅延計算が仕様どおりになることを確認する
    // 【テスト内容】: 未実装の createRetryEngineFromRetrySettings を用いてエンジンを生成し、calculateDelay(0..2) の値を検証する
    // 【期待される動作】: 0回目=500ms, 1回目=1000ms, 2回目=2000ms を返す（baseDelay=500, factor=2.0）
    // 🟢 信頼性レベル: architecture.mdの既定値（base=500ms, factor=2.0）および既存実装の数式に直接整合

    // 【テストデータ準備】: 既定相当のリトライ設定を用意（maxRetries はこのテストでは遅延計算に影響しない）
    // 【初期条件設定】: 設定→アダプタ→エンジン生成という流れを想定
    const settings: RetrySettings = { baseDelay: 500, factor: 2.0, maxRetries: 5 };

    // 【実際の処理実行】: アダプタ関数で RetryEngine を生成
    // 【処理内容】: createRetryEngineFromRetrySettings(settings) を呼び出し
    const engine: RetryEngine = createRetryEngineFromRetrySettings(settings);

    // 【結果検証】: calculateDelay の返却値を検証
    // 【期待値確認】: 仕様どおり 500, 1000, 2000 を返すこと
    expect(engine.calculateDelay(0)).toBe(500); // 【確認内容】: attempt=0 の遅延が baseDelay×factor^0 になること 🟢
    expect(engine.calculateDelay(1)).toBe(1000); // 【確認内容】: attempt=1 の遅延が baseDelay×factor^1 になること 🟢
    expect(engine.calculateDelay(2)).toBe(2000); // 【確認内容】: attempt=2 の遅延が baseDelay×factor^2 になること 🟢
  });
});
