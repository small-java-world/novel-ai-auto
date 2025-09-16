# TDD Redフェーズ: UI スケルトン/状態管理

## Redフェーズ実行結果

### 対象テストケース

TASK-040 UI スケルトン/状態管理の主要テストケース（8件を実装）

### 使用言語/フレームワーク

- **言語**: TypeScript
- **テストフレームワーク**: Vitest
- **環境**: Node.js + Chrome Extension API モック

### 作成したテストファイル

#### 1. メインテストファイル
- **ファイル名**: `src/popup/ui-state-manager.red.test.ts`
- **テスト件数**: 8テストケース
- **カバー範囲**: 正常系・異常系・境界値

#### 2. 実装スタブファイル
- **ファイル名**: `src/popup/ui-state-manager.ts`
- **内容**: インターフェース定義と未実装メソッド（すべてエラーを投げる）

### 実装したテストケース詳細

#### 正常系テストケース（6件）

1. **TC-001: 設定の初期化**
   - 初回起動時のデフォルト設定値読み込み
   - chrome.storage.local が空の場合のデフォルト値設定

2. **TC-002: 設定の保存**
   - ユーザー設定変更時の即座保存
   - chrome.storage.local.set() への適切なデータ構造での保存

3. **TC-003: 設定の復元**
   - 既存設定値での起動時復元
   - 保存済み設定データからのUI要素復元

4. **TC-006: UI状態の待機中表示**
   - 非生成時のUI要素表示制御
   - ボタン・進捗セクションの適切な表示/非表示

5. **TC-007: UI状態の生成中表示**
   - 生成処理中のUI要素表示制御
   - キャンセル機能とコントロール無効化

6. **TC-008: 進捗バー更新**
   - GENERATION_PROGRESSメッセージでの進捗表示更新
   - プログレスバー・テキスト・ETA表示の同期更新

#### メッセージ通信テストケース（1件）

7. **TC-004: 生成開始メッセージ送信**
   - START_GENERATIONメッセージの正常送信
   - chrome.runtime.sendMessage() への適切なメッセージ形式

#### ログ表示テストケース（1件）

8. **TC-009: ログエントリ追加**
   - ログメッセージの正常追加と表示
   - 時刻付きログエントリの作成

#### 異常系テストケース（1件）

9. **TC-010: ストレージ保存エラー**
   - chrome.storage.local.set() 失敗時のエラーハンドリング
   - エラーログ表示とUI状態の維持

#### 境界値テストケース（2件）

10. **TC-014: 画像枚数最小値**
    - imageCount = 1 での正常動作確認
    - 最小構成での機能完全性

11. **TC-017: ファイル名テンプレート空文字**
    - filenameTemplate = "" での代替処理
    - デフォルト値への自動復元と警告表示

### テスト実行コマンド

```bash
# テスト実行
npm run test src/popup/ui-state-manager.red.test.ts

# カバレッジ付きテスト実行
npm run test:coverage src/popup/ui-state-manager.red.test.ts
```

### 期待される失敗メッセージ

すべてのテストケースで以下のようなエラーが発生することを確認：

```
Error: UIStateManager is not implemented yet
Error: initializeSettings is not implemented yet
Error: saveSettings is not implemented yet
Error: loadSettings is not implemented yet
Error: updateUIState is not implemented yet
Error: updateProgress is not implemented yet
Error: startGeneration is not implemented yet
Error: addLog is not implemented yet
Error: validateAndSanitizeTemplate is not implemented yet
```

### 日本語コメント設計方針

#### 1. テストケース開始時のコメント
```typescript
// 【テスト目的】: このテストで何を確認するかを明確に記載
// 【テスト内容】: 具体的な処理内容の説明
// 【期待される動作】: 正常動作時の結果説明
// 🟢🟡🔴 信頼性レベル: 元資料との照合状況
```

#### 2. Given/When/Then段階のコメント
```typescript
// 【テストデータ準備】: データ準備の理由と意味
// 【初期条件設定】: テスト実行前の状態説明
// 【実際の処理実行】: 実行処理の説明
// 【処理内容】: 処理の詳細説明
// 【結果検証】: 検証内容の説明
// 【期待値確認】: 期待結果の理由説明
```

#### 3. expectステートメントのコメント
```typescript
expect(result).toBe(expected); // 【確認内容】: 具体的な検証項目と理由
```

### Chrome Extension API モック設計

#### 1. ストレージAPIモック
```typescript
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};
```

#### 2. DOM要素モック
```typescript
const mockElements = {
  statusIndicator: { className: '', textContent: '' },
  imageCount: { value: '', disabled: false },
  progressFill: { style: { width: '' } },
  // ... その他のUI要素
};
```

### 型定義設計

#### 1. 主要インターフェース
```typescript
export interface UIState {
  isGenerating: boolean;
  status: 'idle' | 'generating' | 'error';
  currentJob: { id: string; progress?: ProgressData; } | null;
}

export interface ProgressData {
  current: number;
  total: number;
  eta?: number;
}
```

#### 2. 設定関連
```typescript
export interface GenerationSettings {
  imageCount: number;
  seed: number;
  filenameTemplate: string;
}
```

### 品質判定

✅ **高品質**:
- **テスト実行**: 成功（失敗することを確認済み）
- **期待値**: 明確で具体的（各テストで詳細な検証ポイント設定）
- **アサーション**: 適切（型安全性と境界値を考慮）
- **実装方針**: 明確（Chrome Extension MV3 + TypeScript + Vitest環境）

### 信頼性レベル評価

- **🟢 青信号**: 8件（要件定義・既存実装から直接導出）
- **🟡 黄信号**: 2件（妥当な推測に基づく境界値・エラーハンドリング）
- **🔴 赤信号**: 0件

### 次のステップ要求事項

Greenフェーズで実装すべき最小機能：

1. **UIStateManagerクラスの基本構造**
2. **Chrome Storage API連携**
3. **DOM要素操作**
4. **状態管理ロジック**
5. **エラーハンドリング**
6. **メッセージ通信**
7. **進捗表示**
8. **ログ機能**

### 技術的課題と解決方針

#### 1. Chrome Extension環境での型安全性
- TypeScript型定義の活用
- インターフェース駆動開発

#### 2. DOM操作の抽象化
- 要素セレクタの一元管理
- エラー耐性のあるDOM操作

#### 3. 非同期処理の管理
- Promise/async-awaitの適切な使用
- エラー境界の設定

### 次のお勧めステップ

`/tdd-green` でGreenフェーズ（最小実装）を開始します。