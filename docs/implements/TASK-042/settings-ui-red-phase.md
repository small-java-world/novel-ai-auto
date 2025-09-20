# TDD Red フェーズ設計書 - TASK-042: Settings UI

**作成日時**: 2025-09-16 23:45
**フェーズ**: Red - 失敗するテスト作成

## Red フェーズ概要

TDDの最初のステップとして、実装前に失敗するテストを作成し、要求仕様を明確化する。

### 対象機能
**Settings UI** - Chrome拡張ポップアップの設定管理機能
- 画像生成数設定 (1-100)
- シード値設定 (random/fixed)
- ファイル名テンプレート設定
- リトライ設定 (試行回数・遅延・係数)

## テスト設計戦略

### 1. テストケース分類

#### TC-001: 正常系テスト (3ケース)
1. **TC-001-001**: デフォルト設定値の初期表示
2. **TC-001-002**: 設定値の保存成功パターン
3. **TC-001-003**: 保存済み設定の読み込み表示

#### TC-002: 異常系テスト (4ケース)
1. **TC-002-001**: 画像生成数の範囲外エラー
2. **TC-002-002**: シード値の型エラー処理
3. **TC-002-003**: ファイル名テンプレートの無効文字エラー
4. **TC-002-004**: Chrome Storage保存失敗エラー

#### TC-003: 境界値テスト (4ケース)
1. **TC-003-001**: 画像生成数の境界値テスト (1, 100)
2. **TC-003-002**: リトライ設定の境界値組み合わせテスト
3. **TC-003-003**: ファイル名テンプレートの最大長境界テスト (255文字)
4. **TC-003-004**: 空文字・null・undefined の境界テスト

### 2. テクニカル設計

#### 使用技術スタック
- **Language**: TypeScript
- **Testing Framework**: Vitest + Happy-DOM
- **Chrome API Mock**: Pre-configured in `test/setup.ts`
- **File Location**: `src/popup/settings-ui.red.test.ts`

#### モック戦略
```typescript
// Chrome Storage API Mock
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
  },
};
vi.mocked(global.chrome.storage).local = mockChromeStorage.local;
```

#### 期待する失敗インターフェース
```typescript
// まだ実装されていないクラス（意図的にテスト失敗）
import { SettingsUI } from './settings-ui';

class SettingsUI {
  async initialize(): Promise<void>
  async saveSettings(settings: SettingsInput): Promise<SettingsOutput>
  getImageCount(): number
  getSeedMode(): "random" | "fixed"
  getSeedValue(): number | undefined
  getFilenameTemplate(): string
  getRetrySettings(): RetrySettings
}
```

## 実装要求仕様

### 1. データ型定義

#### SettingsInput インターフェース
```typescript
interface SettingsInput {
  imageCount: number;        // 1-100の範囲
  seedMode: "random" | "fixed";
  seedValue?: number;        // seedMode="fixed"時の具体値
  filenameTemplate: string;  // 最大255文字
  retrySettings: {
    maxAttempts: number;     // 1-10の範囲
    baseDelayMs: number;     // 100-5000の範囲
    factor: number;          // 1.1-3.0の範囲
  };
}
```

#### SettingsOutput インターフェース
```typescript
interface SettingsOutput {
  validationResult: {
    isValid: boolean;
    errors: Record<string, string>;
  };
  savedSettings: SettingsInput;
  storageStatus: "success" | "error";
  errorMessage?: string;
}
```

### 2. バリデーション要求

#### 数値制約
- **imageCount**: 1 ≤ value ≤ 100 (整数)
- **seedValue**: 0 ≤ value ≤ 2^32-1 (整数, seedMode="fixed"時のみ)
- **maxAttempts**: 1 ≤ value ≤ 10 (整数)
- **baseDelayMs**: 100 ≤ value ≤ 5000 (整数)
- **factor**: 1.1 ≤ value ≤ 3.0 (小数)

#### 文字列制約
- **filenameTemplate**: 1 ≤ length ≤ 255, 禁止文字 `<>:|?` 含まず

#### エラーメッセージ仕様
```typescript
const ERROR_MESSAGES = {
  imageCount: "1以上100以下の値を入力してください",
  seedValue: "0以上の整数値を入力してください",
  filenameTemplate: "ファイル名に使用できない文字が含まれています",
  storageError: "設定の保存に失敗しました。しばらく時間をおいて再試行してください。"
};
```

### 3. Chrome Storage連携要求

#### 保存処理
```typescript
// 設定保存のストレージキー
const STORAGE_KEY = 'namespace_settings';

// 保存処理
await chrome.storage.local.set({
  [STORAGE_KEY]: validatedSettings
});
```

#### 読み込み処理
```typescript
// 設定読み込み
const result = await chrome.storage.local.get(STORAGE_KEY);
const settings = result[STORAGE_KEY] || getDefaultSettings();
```

## テスト実行結果

### 期待される失敗
```bash
Error: Failed to resolve import "./settings-ui" from "src/popup/settings-ui.red.test.ts". Does the file exist?
```

**失敗理由**: `SettingsUI` クラスが未実装のため、インポートでエラー発生

### テスト実行コマンド
```bash
npm test settings-ui.red.test.ts
```

## 品質評価

### ✅ Red フェーズ品質: 高品質

**評価基準**:
- ✅ **テスト実行**: 期待通りに失敗することを確認
- ✅ **期待値**: 11ケース全てで明確で具体的な期待値定義
- ✅ **アサーション**: 各テストケースで適切な検証項目設定
- ✅ **実装方針**: Greenフェーズの実装内容が明確

**特徴**:
- 包括的テストカバレッジ（正常系・異常系・境界値）
- Chrome拡張固有要件の考慮（ストレージ制限・API失敗）
- 詳細な日本語ドキュメンテーション
- 既存テスト基盤の完全活用

## 次ステップ: Green フェーズ

**実装優先順位**:
1. `SettingsUI` 基本クラス作成
2. Chrome Storage連携実装
3. バリデーション機能実装
4. エラーハンドリング実装
5. テスト成功確認

**推奨コマンド**: `/tdd-green TASK-042`

---

*Red フェーズ完了: 2025-09-16 23:45*
*信頼性レベル: 🟢73% 🟡18% 🔴9%*