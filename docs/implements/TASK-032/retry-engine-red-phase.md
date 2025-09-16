# TDD Red Phase: retry-engine（リトライエンジン・指数バックオフ）

## テスト設計内容

### 機能概要
リトライエンジン（指数バックオフ）の実装 - TASK-032

### テスト実行コマンド
```bash
npm test -- src/utils/retry-engine.test.ts
```

### テストケース設計

#### 1. 指数バックオフ計算テスト
- **目的**: 指数バックオフ計算式（base * factor^attempts）の動作確認
- **設定**: base=500ms, factor=2.0
- **検証**: 各試行回数での遅延時間が正しく計算されること
- **信頼性**: 🟢 TASK-032要件仕様に基づく

#### 2. カスタム設定テスト
- **目的**: デフォルト以外の設定での動作確認
- **設定**: base=200ms, factor=1.5
- **検証**: カスタムパラメータでの計算が正しいこと
- **信頼性**: 🟡 「設定で変更可」要件からの推測

#### 3. リトライ上限制御テスト
- **目的**: maxRetries設定による再試行停止確認
- **設定**: maxRetries=3
- **検証**: 上限前後でのshouldRetry判定が正しいこと
- **信頼性**: 🟢 「上限到達の扱い」要件に明記

#### 4. 遅延実行テスト
- **目的**: executeWithDelayメソッドの時間制御確認
- **設定**: モックタイマー使用
- **検証**: 指定時間後にコールバック実行されること
- **信頼性**: 🟡 NFR-002要件からの推測

#### 5. 状態リセットテスト
- **目的**: リトライ状態のリセット機能確認
- **設定**: 複数回失敗後にリセット
- **検証**: リセット後に失敗回数が0に戻ること
- **信頼性**: 🟡 「キャンセル/上限到達の扱い」からの推測

#### 6. キャンセル処理テスト
- **目的**: キャンセル状態での処理停止確認
- **設定**: cancel()呼び出し後の動作
- **検証**: キャンセル後はリトライ不可、遅延実行無効
- **信頼性**: 🟡 「キャンセル/上限到達の扱い」からの推測

#### 7. 境界値テスト
- **目的**: maxRetries=0での動作確認
- **設定**: リトライ禁止設定
- **検証**: 初回から常にリトライ不可
- **信頼性**: 🔴 元資料にない境界値ケースの推測

#### 8. エラー伝播テスト
- **目的**: リトライ上限到達時の失敗伝播確認
- **設定**: 必ず失敗する処理でのリトライ
- **検証**: 上限到達時に元エラーが適切に伝播されること
- **信頼性**: 🟢 「リトライ上限到達時に失敗を確定し上位へ伝播」要件に明記

### 期待される失敗メッセージ

```
Error: Not implemented yet: createRetryEngine function
```

### 実装すべきインターフェース

```typescript
interface RetryEngine {
  calculateDelay(attempts: number): number;
  shouldRetry(attempts: number): boolean;
  executeWithDelay(delay: number, callback: () => void): void;
  recordFailure(): void;
  getCurrentAttempts(): number;
  reset(): void;
  cancel(): void;
  executeWithRetry<T>(operation: () => Promise<T>): Promise<T>;
}

function createRetryEngine(config: {
  baseDelay: number;
  factor: number;
  maxRetries: number
}): RetryEngine
```

### 品質基準

**✅ 高品質達成**:
- テスト実行: 成功（8つのテストが期待通りに失敗）
- 期待値: 明確で具体的（数値、boolean、エラーメッセージ）
- アサーション: 適切（各テストケースで目的が明確）
- 実装方針: 明確（必要なインターフェースと関数が特定済み）

### 日本語コメント品質

- テストケース開始時のコメント: 完備
- セットアップ・クリーンアップコメント: 完備
- 各expectステートメントのコメント: 完備
- 信頼性レベル表示: 完備（🟢🟡🔴で明示）

### テスト技術仕様

- **テストフレームワーク**: Vitest
- **モック技術**: vi.useFakeTimers() / vi.useRealTimers()
- **非同期処理**: async/await, Promise.reject
- **タイマー制御**: vi.advanceTimersByTime()

## 成果

✅ **Red Phase 完了**
- 8つのテストケースすべてが期待通りに失敗
- 実装すべき機能とインターフェースが明確に定義
- 品質基準を満たすテストコード作成完了

## 次のステップ

**推奨**: `/tdd-green` でGreenフェーズ（最小実装）を開始します。

実装すべき内容:
1. `RetryEngine`インターフェースの実装
2. `createRetryEngine`関数の実装
3. 指数バックオフ計算ロジック
4. リトライ制御ロジック
5. 状態管理（失敗回数、キャンセル状態）