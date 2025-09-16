import { describe, test, expect } from 'vitest';
import { createRetryEngine } from './retry-engine';

// テストファイル: src/utils/retry-engine.previewDelays.red.test.ts
describe('リトライエンジン previewDelays', () => {
  test('バックオフ予定配列の事前算出を返す（previewDelays）', () => {
    // 【テスト目的】: バックオフの次回以降の遅延スケジュールを配列で取得できることを確認
    // 【テスト内容】: 新規API previewDelays(remaining?) を呼び出し、現在のattemptから上限までの遅延(ms)配列を得る
    // 【期待される動作】: baseDelay=100, factor=2.0, maxRetries=3 の場合、[100, 200, 400] を返す（attempts=0開始）
    // 🟡 信頼性レベル: 設計(architecture.md: バックオフ設定)とdataflowのバックオフ記述に基づく妥当な拡張（既存実装に未定義のため推測）

    // 【テストデータ準備】: 既定に近い設定で算出結果の直感性を確保
    // 【初期条件設定】: まだ失敗記録なし（attempts=0想定）
    const retryEngine = createRetryEngine({ baseDelay: 100, factor: 2.0, maxRetries: 3 });

    // 【実際の処理実行】: previewDelays を呼び出す（未実装メソッドを意図的に使用）
    // 【処理内容】: 次の試行までの待機時間を先読みし配列で取得
    const result = (retryEngine as any).previewDelays();

    // 【結果検証】: 次の3回分の待機が [100,200,400] であること
    // 【期待値確認】: calculateDelay(attempt=0..2) と一致することが理由
    expect(result).toEqual([100, 200, 400]); // 【確認内容】: スケジュール配列が設計通りに生成されること 🟡
  });
});
