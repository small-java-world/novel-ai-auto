# TASK-022 Green Phase 実装詳細

## 実装概要

**タスク**: TASK-022 生成開始・進捗監視・完了検知
**フェーズ**: Green（最小実装）
**実装日**: 2025-09-15
**ステータス**: 完了 ✅

## 実装内容

### GenerationMonitor クラス設計

#### クラス構造

```typescript
export class GenerationMonitor {
  private jobId: string | null = null;
  private monitoring = false;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
}
```

#### 主要メソッド

1. **startMonitoring(jobId: string): Promise<boolean>**
   - 【機能】: 生成監視開始
   - 【実装】: 監視フラグ設定、500ms周期タイマー開始
   - 【戻り値】: 成功時 true

2. **isMonitoring(): boolean**
   - 【機能】: 現在の監視状態取得
   - 【実装】: 監視フラグの返却

3. **checkForCompletion(): void**
   - 【機能】: 完了検知処理
   - 【実装】: DOM要素チェック、完了時シグナル送信

### 実装の特徴

#### 日本語コメント体系

各関数・処理ブロックに以下の体系的な日本語コメントを配置:

```typescript
/**
 * 【機能概要】: [この関数が何をするかを日本語で説明]
 * 【実装方針】: [なぜこのような実装方法を選んだかを説明]
 * 【テスト対応】: [どのテストケースを通すための実装かを明記]
 * 🟢🟡🔴 信頼性レベル: [この実装が元資料のどの程度に基づいているか]
 */
```

#### 信頼性レベル指標

- 🟢 **青信号**: 仕様書に基づく確実な実装
- 🟡 **黄信号**: 仕様書から妥当な推測による実装
- 🔴 **赤信号**: 仕様書にない推測による実装

### 核心実装ロジック

#### 1. 500ms周期監視

```typescript
private startProgressMonitoring(): void {
  this.progressInterval = setInterval(() => {
    this.sendProgressUpdate();
    this.checkForCompletion();
  }, 500); // 仕様書の500ms要件
}
```

**設計根拠**: TASK-022仕様書の「進捗/状態の定期送信（500ms）」要件

#### 2. 進捗メッセージ送信

```typescript
private sendProgressUpdate(): void {
  const progressData = {
    type: 'PROGRESS_UPDATE',
    payload: {
      jobId: this.jobId,
      status: 'running',
      progress: { current: 0, total: 1 }, // 固定値（Green段階）
    },
  };
  chrome.runtime.sendMessage(progressData);
}
```

**設計根拠**: 既存の `src/shared/messages.ts` のメッセージ仕様に準拠

#### 3. 完了検知・シグナル送信

```typescript
checkForCompletion(): void {
  const completionSelectors = [
    '.generation-complete', // テスト用要素
  ];

  for (const selector of completionSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      this.handleCompletion(); // 完了シグナル送信
      return;
    }
  }
}
```

**設計根拠**: テスト駆動開発の最小実装原則

## テスト設計

### テストケース体系

#### 1. 生成開始テスト

```typescript
it('should start monitoring after generation begins', async () => {
  const result = await monitor.startMonitoring('test-job-id');
  expect(result).toBe(true);
  expect(monitor.isMonitoring()).toBe(true);
});
```

**検証内容**: 監視開始後のフラグ設定確認

#### 2. 500ms周期テスト

```typescript
it('should send progress updates every 500ms', async () => {
  await monitor.startMonitoring('test-job-id');
  vi.useFakeTimers();
  vi.advanceTimersByTime(600);

  expect(mockSendMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'PROGRESS_UPDATE',
      payload: expect.objectContaining({
        jobId: 'test-job-id',
        status: expect.any(String),
        progress: expect.objectContaining({
          current: expect.any(Number),
          total: expect.any(Number),
        }),
      }),
    })
  );
});
```

**検証内容**: 時間経過による進捗メッセージ送信確認

#### 3. 完了検知テスト

```typescript
it('should detect completion and send completion signal', async () => {
  await monitor.startMonitoring('test-job-id');

  const mockCompletionElement = document.createElement('div');
  mockCompletionElement.className = 'generation-complete';
  document.body.appendChild(mockCompletionElement);

  monitor.checkForCompletion();

  expect(mockSendMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'PROGRESS_UPDATE',
      payload: expect.objectContaining({
        jobId: 'test-job-id',
        status: 'completed',
      }),
    })
  );
});
```

**検証内容**: DOM要素による完了検知とシグナル送信確認

## リファクタリング候補

### 🔴 高優先度

1. **実際のNovelAI DOM要素対応**
   - 現在: `.generation-complete` テスト要素のみ
   - 改善必要: 実際のNovelAI完了要素セレクタ

2. **実際の進捗計算**
   - 現在: `{current: 0, total: 1}` 固定値
   - 改善必要: NovelAI UIからの実際の進捗取得

### 🟡 中優先度

3. **エラーハンドリング強化**
   - DOM要素未検出時の処理
   - Chrome API呼び出し失敗時の処理

4. **既存機能との統合**
   - `content.ts` の `startGeneration()` との連携
   - 生成開始から監視開始までのフロー

## 品質メトリクス

- **テスト成功率**: 3/3 (100%)
- **実装行数**: 167行（適度なサイズ）
- **コメント率**: 40%以上（日本語コメント充実）
- **信頼性**: 基本機能は確実、詳細実装は改善余地あり
- **保守性**: シンプルな構造で理解しやすい

## 次ステップ

Refactorフェーズで以下を実装:
1. 実際のNovelAI DOM要素への対応
2. 実際の進捗計算ロジック
3. エラーハンドリングの強化
4. 既存機能との統合テスト