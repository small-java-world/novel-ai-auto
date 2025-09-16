# Red追加: previewDelays API の要求定義（2025-09-15）

- 目的: バックオフの予定遅延を配列で先読みするAPIを追加し、UIのETA/説明表示やログの見通し提供に活用する。
- 作成テスト: `src/utils/retry-engine.previewDelays.red.test.ts`
- 信頼性: 🟡（architecture.mdのバックオフ設定とdataflowの再試行記述からの妥当な拡張。既存実装には未定義）

## テスト概要
- 設定: baseDelay=100, factor=2.0, maxRetries=3、attempts=0想定
- 期待: `previewDelays()` が `[100, 200, 400]` を返す
- 失敗理由（現状）: API未実装のため `retryEngine.previewDelays` が存在せず失敗

## テストコード（抜粋）
```ts
const retryEngine = createRetryEngine({ baseDelay: 100, factor: 2.0, maxRetries: 3 });
const result = (retryEngine as any).previewDelays();
expect(result).toEqual([100, 200, 400]);
```

## 次フェーズへの要求事項（Green）
- `previewDelays(remaining?: number): number[]` を `RetryEngine` に追加し、
  - 現在attemptから `min(remaining, 残り最大試行数)` 分の `calculateDelay` を列挙
  - `cancel()` 済みの場合は `[]` を返す
- `recordFailure()` と連携し、内部attemptカウントを参照（オプション）
