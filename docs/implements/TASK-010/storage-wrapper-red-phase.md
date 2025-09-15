# Red フェーズ設計書: ストレージラッパー実装

## 概要

TASK-010 ストレージラッパー実装のRed フェーズ（失敗するテスト作成）の詳細設計書

**実行日時**: 2025-09-14  
**フェーズ**: TDD Red（失敗テスト作成）  
**対象ファイル**: `src/utils/storage.test.ts`

## テストケース設計

### 1. 基本的なget/set操作テスト

#### 1.1 settings名前空間への保存と取得の整合性

**信頼性**: 🟢 (タスク定義の単体テスト要件に基づく)

**テスト目的**: settings名前空間に保存したデータが正確に取得できることを確認  
**期待インターフェース**:

```typescript
storage.set('settings', testSettings) -> Promise<StorageResult>
storage.get('settings') -> Promise<GenerationSettings>
```

**テストデータ構造**:

```typescript
{
  imageCount: 5,
  seed: 12345,
  filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
  retrySettings: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    factor: 2.0
  }
}
```

#### 1.2 presets名前空間への配列データの保存と取得

**信頼性**: 🟢 (名前空間「presets」要件に基づく)

**テスト目的**: 配列形式のプロンプトデータが順序と内容を保持して取得できることを確認  
**期待データ**: PromptPreset配列（id, name, prompt, negative, parameters）

### 2. 初期値とデフォルト値の処理テスト

#### 2.1 未初期化settings名前空間からデフォルト値を取得

**信頼性**: 🟢 (エラーハンドリング要件「未初期化時に既定値へフォールバック」)

**期待デフォルト値**:

```typescript
{
  imageCount: 1,
  seed: -1,
  filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
  retrySettings: {
    maxAttempts: 5,
    baseDelayMs: 500,
    factor: 2.0
  }
}
```

#### 2.2 未初期化jobs名前空間から空配列を取得

**信頼性**: 🟢 (名前空間「jobs」要件とデフォルト値フォールバック)

**期待値**: `[]` (空配列)

### 3. 変更監視機能テスト

#### 3.1 settings名前空間の変更監視コールバック実行

**信頼性**: 🟢 (単体テスト要件「変更監視（モック）」)

**テスト設計**:

```typescript
storage.observe('settings', callback);
// Chrome storage onChanged イベント発火
// callback が適切な changeData で呼ばれることを確認
```

#### 3.2 複数名前空間同時監視の分離処理

**信頼性**: 🟡 (タスク要件から推測した高度機能)

**テスト設計**: settings変更時にsettingsコールバックのみ実行、jobsコールバックは未実行

### 4. エラーハンドリングテスト

#### 4.1 Chrome storage APIエラー時のフォールバック処理

**信頼性**: 🟢 (エラーハンドリング要件「取得失敗時に既定値へフォールバック」)

**エラーシナリオ**: `Storage quota exceeded` エラー発生時  
**期待動作**: エラー時でもデフォルト値を返却

#### 4.2 JSON シリアライズエラー処理

**信頼性**: 🟢 (エラーハンドリング要件「JSONシリアライズ時にエラー返却とログ記録」)

**テストデータ**: 循環参照オブジェクト  
**期待エラーレスポンス**:

```typescript
{
  success: false,
  error: 'Failed to serialize data: Converting circular structure to JSON',
  context: { namespace: 'settings' }
}
```

#### 4.3 ストレージ容量制限超過エラー

**信頼性**: 🟡 (タスク要件から推測した容量制限処理)

**エラー**: `QuotaExceededError`  
**期待エラーレスポンス**:

```typescript
{
  success: false,
  error: 'Storage quota exceeded. Please reduce data size or clear old data.',
  context: { namespace: 'settings', errorType: 'QuotaExceededError' }
}
```

### 5. 統合テスト（モック環境）

#### 5.1 Popup ↔ Service Worker間settingsデータ同期

**信頼性**: 🟢 (統合テスト要件「Popup と SW 間の同期」)

**テストシナリオ**:

1. Popup側でsettings保存
2. Service Worker側で同じデータを取得
3. Popup側でsettings更新
4. Service Worker側で更新後データを取得
5. 両段階でデータ一致を確認

## 期待される実装インターフェース

### 主要インターフェース定義

```typescript
interface StorageAPI {
  get<T>(namespace: 'settings' | 'presets' | 'jobs' | 'logs', key?: string): Promise<T>;
  set(namespace: 'settings' | 'presets' | 'jobs' | 'logs', data: any): Promise<StorageResult>;
  observe(
    namespace: 'settings' | 'presets' | 'jobs' | 'logs',
    callback: (changes: any) => void
  ): void;
}

interface StorageResult {
  success: boolean;
  error?: string;
  context?: any;
}

function createStorage(): StorageAPI;
```

### 名前空間とキー設計

**Chrome Storage キー形式**: `namespace_{namespace}`

- `namespace_settings` - GenerationSettings オブジェクト
- `namespace_presets` - PromptData 配列
- `namespace_jobs` - GenerationJob 配列
- `namespace_logs` - LogEntry 配列

### Chrome API モック設定

```typescript
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};

(globalThis as any).chrome = {
  storage: mockChromeStorage,
  runtime: {
    lastError: undefined,
  },
};
```

## 期待される失敗内容

### テスト実行時の期待エラー

1. **モジュール未発見エラー**: `Cannot find module './storage'`
2. **関数未定義エラー**: `createStorage is not a function`
3. **メソッド未実装エラー**:
   - `storage.get is not a function`
   - `storage.set is not a function`
   - `storage.observe is not a function`

### 品質チェックポイント

✅ **実行可能性**: テストコードが構文エラーなく実行できる  
✅ **明確な期待値**: 各assertionで具体的な期待値を設定  
✅ **適切なモック**: Chrome API の適切なモック設定  
✅ **エラーシナリオ**: 正常系と異常系の両方をカバー  
✅ **統合観点**: コンポーネント間連携の検証

## 次フェーズへの要求

### Greenフェーズで実装すべき最小要件

1. **基本ファイル**: `src/utils/storage.ts` 作成
2. **基本構造**: `StorageAPI` インターフェース、`createStorage` ファクトリ関数
3. **必須メソッド**: `get`, `set`, `observe` の最小実装
4. **エラーハンドリング**: try-catch による基本的なエラー処理
5. **名前空間管理**: 4つの名前空間に対応するキー変換
6. **デフォルト値**: 未初期化状態での適切なフォールバック

この設計に基づき、Greenフェーズでは各テストケースを順次通過させる最小限の実装を行う。
