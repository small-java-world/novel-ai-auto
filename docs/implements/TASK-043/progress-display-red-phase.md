# TASK-043 Red フェーズ詳細レポート

## フェーズ概要

- **フェーズ名**: Red（失敗するテスト作成）
- **実行日時**: 2025-01-27
- **対象機能**: 進捗/残枚数/ETA/ログ表示 + キャンセル
- **テストファイル**: `src/popup/progress-display.red.test.ts`

## テスト設計方針

### 1. 包括的テストカバレッジ戦略

#### 正常系テストケース（4件）
- **TC-043-001**: 基本的な進捗表示の更新
- **TC-043-002**: キャンセルボタンによる処理停止
- **TC-043-003**: 完了状態の表示
- **TC-043-004**: ログエントリの表示更新

#### 異常系テストケース（4件）
- **TC-043-005**: メッセージ通信断絶の検出
- **TC-043-006**: 不正なPROGRESS_UPDATEメッセージの処理
- **TC-043-008**: キャンセル処理の競合状態

#### 境界値テストケース（4件）
- **TC-043-009**: 進捗値の境界値テスト
- **TC-043-010**: ETA値の境界値テスト
- **TC-043-012**: null・undefined値の堅牢性テスト

### 2. 技術スタック選択の根拠

#### プログラミング言語: TypeScript
- **選択理由**: 既存コードベースがTypeScriptで統一されており、メッセージ通信の型安全性が確保できる
- **テストに適した機能**: Chrome Extension APIのモック作成、メッセージパッシングの型チェック、DOM操作の型安全性
- **信頼性レベル**: 🟢 既存のpackage.jsonとvitest.config.tsで確認済み

#### テストフレームワーク: Vitest + Happy-DOM
- **選択理由**: 既存プロジェクトでVitest採用済み、リアルタイム更新とメッセージハンドリングのテストに適している
- **テスト実行環境**: Chrome Extension環境モック、DOM操作モック、timer/intervalモック環境
- **信頼性レベル**: 🟢 既存のpackage.jsonとvitest.config.tsで確認済み

## テストケース詳細分析

### 代表的テストケース: TC-043-001

```typescript
test('PROGRESS_UPDATEメッセージ受信時の進捗表示更新', () => {
  // 【テスト目的】: Service WorkerからのPROGRESS_UPDATEメッセージを受信した際のUI更新処理が正確に動作することを確認
  // 【テスト内容】: 進捗バー、残枚数、ETA、状態表示の同期更新をテスト
  // 【期待される動作】: メッセージ受信から100ms以内にすべてのUI要素が正確に更新される
  // 🟢 信頼性レベル: 要件定義書のメッセージ仕様とNFR-002（500ms周期）に基づく

  // Given: 典型的な進捗状況（5枚中3枚目を処理中、残り45秒）
  const progressMessage: ProgressUpdateMessage = {
    type: 'PROGRESS_UPDATE',
    currentIndex: 2,
    totalCount: 5,
    status: 'generating',
    eta: 45,
    timestamp: Date.now(),
  };

  // When: updateProgress メソッドを呼び出してUI更新処理を実行
  progressManager.updateProgress(progressMessage);

  // Then: UI要素が期待される値で正確に更新されたことを確認
  expect(mockProgressBar.style.width).toBe('40%'); // 進捗バーが(2/5)*100=40%で表示
  expect(mockRemainingCount.textContent).toBe('残り3枚'); // 残枚数が(5-2)=3枚で表示
  expect(mockEtaDisplay.textContent).toBe('約45秒'); // ETA表示が45秒で表示
  expect(mockStatusText.textContent).toBe('生成中'); // ステータスが'generating'から「生成中」に変換
});
```

### キャンセル機能テスト: TC-043-002

```typescript
test('ユーザーキャンセル操作とCANCEL_JOBメッセージ送信', () => {
  // 【テスト目的】: キャンセルボタン押下時のCANCEL_JOBメッセージ送信とUI状態変更が正確に動作することを確認
  // 🟢 信頼性レベル: 要件定義書のCANCEL_JOBメッセージ仕様とNFR-202要件に基づく

  // Given: 生成中状態でのキャンセル操作を模擬
  const currentJobId = 'test-job-123';
  progressManager.setCurrentJobId(currentJobId);

  // When: キャンセルボタンのクリックイベントを発火
  mockCancelButton.click();

  // Then: CANCEL_JOBメッセージの送信とUI状態変更を確認
  const expectedCancelMessage: CancelJobMessage = {
    type: 'CANCEL_JOB',
    jobId: currentJobId,
    reason: 'user_requested',
  };

  expect(mockSendMessage).toHaveBeenCalledWith(expectedCancelMessage);
  expect(mockStatusText.textContent).toBe('キャンセル中...');
  expect(mockCancelButton.disabled).toBe(true);
});
```

### 競合状態テスト: TC-043-008

```typescript
test('キャンセル処理中の完了通知受信時の状態整合', () => {
  // 【テスト目的】: CANCEL_JOB送信とPROGRESS_UPDATE(completed)の競合時の状態管理が正確に動作することを確認
  // 🟢 信頼性レベル: 要件定義書のキャンセル競合エッジケースに基づく

  // Given: 生成中状態からキャンセル操作を開始
  const jobId = 'test-job-race';
  progressManager.setCurrentJobId(jobId);
  mockCancelButton.click(); // キャンセル操作実行

  // When: キャンセル送信直後に完了メッセージを受信する競合状態を実行
  const completedMessage: ProgressUpdateMessage = {
    type: 'PROGRESS_UPDATE',
    currentIndex: 4,
    totalCount: 5,
    status: 'completed',
    timestamp: Date.now(),
  };
  progressManager.updateProgress(completedMessage);

  // Then: 競合状態でキャンセル状態が優先されることを確認
  expect(mockStatusText.textContent).toBe('キャンセル済み'); // 完了ではなくキャンセル済み
  expect(mockCancelButton.disabled).toBe(true); // キャンセルボタンが無効状態を維持
});
```

## 境界値テスト設計

### ETA時間フォーマット境界値

```typescript
test('推定残り時間の極値での表示確認', () => {
  // 【テスト目的】: 時間表示フォーマットの境界条件での適切性確認
  // 🟡 信頼性レベル: 一般的な時間表示パターンから妥当推測

  const etaTests = [
    { eta: 0, expected: 'まもなく完了' },     // 完了直前
    { eta: 1, expected: '約1秒' },           // 1秒
    { eta: 59, expected: '約59秒' },         // 59秒
    { eta: 60, expected: '約1分' },          // 1分
    { eta: 3600, expected: '約1時間' },      // 1時間
    { eta: 86400, expected: '約24時間' },    // 24時間
  ];

  etaTests.forEach((test) => {
    // 各ETA値での時間単位変換と表示フォーマット確認
    const message: ProgressUpdateMessage = {
      type: 'PROGRESS_UPDATE',
      currentIndex: 2,
      totalCount: 5,
      status: 'generating',
      eta: test.eta,
      timestamp: Date.now(),
    };

    progressManager.updateProgress(message);
    expect(mockEtaDisplay.textContent).toBe(test.expected);
  });
});
```

## Chrome Extension APIモック設計

```typescript
// Chrome Extension API モック
const mockSendMessage = vi.fn();
Object.defineProperty(global, 'chrome', {
  value: {
    runtime: {
      sendMessage: mockSendMessage,
    },
  },
  writable: true,
});
```

**モック設計の特徴**:
- **Chrome API互換性**: `chrome.runtime.sendMessage` のモック実装
- **テスト検証性**: `vi.fn()` によるコール履歴追跡
- **環境隔離**: グローバルオブジェクト操作による環境制御

## DOM モック設計

```typescript
beforeEach(() => {
  // DOM要素のモック作成
  mockProgressBar = document.createElement('div');
  mockProgressBar.id = 'progress-bar';
  mockProgressBar.style.width = '0%';

  mockStatusText = document.createElement('div');
  mockStatusText.id = 'status-text';

  mockRemainingCount = document.createElement('div');
  mockRemainingCount.id = 'remaining-count';

  mockEtaDisplay = document.createElement('div');
  mockEtaDisplay.id = 'eta-display';

  mockCancelButton = document.createElement('button');
  mockCancelButton.id = 'cancel-button';

  mockLogContainer = document.createElement('div');
  mockLogContainer.id = 'log-container';

  // DOM要素をdocument.bodyに追加
  document.body.appendChild(mockProgressBar);
  // ... 他の要素も追加
});
```

**DOM モック設計の特徴**:
- **リアルDOM環境**: Happy-DOMによるブラウザ環境シミュレーション
- **要素分離**: 各UI要素を個別にモック化して独立テスト
- **状態初期化**: beforeEach での完全なDOM状態リセット

## 期待される失敗とその理由

### 1. インポートエラー

```
Error: Failed to resolve import "./progress-display-manager" from "src/popup/progress-display.red.test.ts". Does the file exist?
```

**失敗理由**: `ProgressDisplayManager`クラスがまだ実装されていないため、ESModuleのimportに失敗。これはTDDのRedフェーズで期待される正常な失敗。

### 2. 想定される実装後の失敗パターン

```typescript
// クラス存在時の期待される失敗例
TypeError: progressManager.updateProgress is not a function
TypeError: Cannot read property 'style' of null
AssertionError: expected undefined to equal '40%'
```

**失敗理由**: メソッド未実装、DOM操作未実装、期待値不一致等、実装が進む段階で順次発生する予想される失敗。

## テストコード品質評価

### ✅ 高品質な要素

1. **包括的なカバレッジ**: 正常系・異常系・境界値の12テストケース
2. **明確な期待値**: 各テストで具体的な期待値を定義
3. **詳細な日本語コメント**: 各段階での処理内容を詳細解説
4. **信頼性レベル表示**: 🟢🟡🔴による根拠の明確化
5. **実装指針の明確化**: テストから実装すべき機能が明確

### 📋 実装要求事項の明確化

テストコードから導出される実装要求事項：

#### 必須クラス・メソッド
```typescript
export class ProgressDisplayManager {
  constructor()
  updateProgress(message: ProgressUpdateMessage): void
  setCurrentJobId(jobId: string): void
  setStartTime(startTime: number): void
  addLogEntries(entries: LogEntry[]): void
}
```

#### 必須DOM操作
- 進捗バー: `style.width` でパーセンテージ表示
- 残枚数: `textContent` で "残りX枚" 表示
- ETA: `textContent` で時間フォーマット表示
- ステータス: `textContent` で状態テキスト表示
- ログ: `children` でログエントリ要素管理

#### 必須エラーハンドリング
- 不正メッセージのバリデーション
- null/undefined値の安全な処理
- 5秒間の通信断絶検出
- キャンセル vs 完了の競合状態管理

## テスト実行コマンド

```bash
npm run test src/popup/progress-display.red.test.ts
```

**期待される出力**:
```
❌ FAIL src/popup/progress-display.red.test.ts
Error: Failed to resolve import "./progress-display-manager"
```

## 次のフェーズへの移行条件

### Greenフェーズへの準備完了条件

1. ✅ **失敗するテストの作成完了**: 12テストケースがすべて実装済み
2. ✅ **期待される失敗の確認**: インポートエラーが発生することを確認
3. ✅ **実装要求事項の明確化**: テストから必要な機能が明確に特定済み
4. ✅ **メモファイルの作成**: 開発記録が適切に文書化済み

### 🚀 次のステップ

**次のお勧めステップ**: `/tdd-green` でGreenフェーズ（最小実装）を開始します。

Greenフェーズでは、これらの失敗するテストを通すための最小限の実装を行い、TDDサイクルの「Red → Green」遷移を完了させます。