# TDD Redフェーズ設計文書: 新フォーマット対応・メタデータ管理

## 概要

**機能名**: TASK-102 新フォーマット対応・メタデータ管理
**フェーズ**: Red（失敗するテスト作成）
**作成日**: 2025-01-20
**完了日**: 2025-01-20 13:34:47
**ステータス**: 完了 ✅

## テスト設計戦略

### テストケース分類

| 分類 | 件数 | 主要な観点 |
|------|------|-----------|
| 正常系 | 7件 | 基本機能動作・フォーマット読み込み・UI表示・フィルタリング・互換性 |
| 異常系 | 5件 | エラーハンドリング・セキュリティ・データ検証・リソース制限 |
| 境界値 | 3件 | 文字数制限・ファイルサイズ・Unicode特殊文字 |
| **合計** | **15件** | **EARS要件REQ-102-001〜403の主要機能を網羅** |

### テスト優先順位

1. **高優先度**: TC001, TC002（新フォーマット読み込み基本機能）
2. **中優先度**: TC003-TC007（メタデータ管理・フィルタリング・互換性）
3. **低優先度**: TC008-TC024（エラーハンドリング・境界値処理）

## 技術設計

### アーキテクチャ設計

```typescript
// メインクラス設計
class NewFormatMetadataManager {
  // 基本的なファイル読み込み機能
  async loadPromptFile(data: string): Promise<LoadResult>

  // レガシー形式変換機能
  async convertLegacyFormat(legacyData: any): Promise<ConversionResult>

  // メタデータ表示フォーマット機能
  formatMetadataForDisplay(metadata: MetadataV1): MetadataDisplayResult

  // タグベースフィルタリング機能
  filterPresetsByTags(presets: PresetV1[], selectedTags: string[]): FilterResult

  // ファイルサイズ検証機能
  validateFileSize(data: string): boolean

  // メタデータサニタイズ機能
  sanitizeMetadata(metadata: MetadataV1): MetadataV1
}
```

### インターフェース設計

```typescript
// 新フォーマット定義
interface PromptFileV1 {
  version: '1.0';
  metadata: MetadataV1;
  commonPrompts?: CommonPromptsV1;
  presets: PresetV1[];
}

// メタデータ構造
interface MetadataV1 {
  name: string;           // 1-100文字（必須）
  description?: string;   // 0-500文字（任意）
  author?: string;        // 0-50文字（任意）
  created?: string;       // ISO 8601形式（任意）
  modified?: string;      // ISO 8601形式（任意）
  tags?: string[];        // 0-20タグ（任意）
  license?: string;       // 任意
  source?: string;        // 任意
}

// 処理結果インターフェース
interface LoadResult {
  success: boolean;
  metadata?: MetadataDisplayResult;
  presets?: PresetV1[];
  errors: string[];
  warnings: string[];
}

interface ConversionResult {
  success: boolean;
  convertedData?: PromptFileV1;
  warnings: string[];
  errors: string[];
}
```

## テスト実装詳細

### テストファイル構造

```
src/utils/new-format-metadata-manager.red.test.ts
├── 新フォーマット読み込み機能
│   ├── TC001: 完全なメタデータファイル読み込み
│   └── TC002: commonPrompts省略ファイル読み込み
├── メタデータ表示・管理機能
│   ├── TC003: メタデータ画面表示
│   └── TC004: タグ表示と重複除去
├── タグベースフィルタリング機能
│   ├── TC005: 単一タグフィルタリング
│   └── TC006: 複数タグAND条件フィルタリング
├── 既存形式互換性機能
│   └── TC007: レガシーJSON自動変換
├── エラーハンドリング機能
│   ├── TC008: JSON構文エラー処理
│   ├── TC009: バージョン不一致エラー処理
│   ├── TC010: 必須フィールド不足処理
│   ├── TC012: XSS攻撃防止処理
│   └── TC013: ファイルサイズ制限処理
└── 境界値処理機能
    ├── TC015: name最小値境界（1文字）
    ├── TC016: name最大値境界（100文字）
    └── TC024: Unicode特殊文字処理
```

### 性能要件テスト設計

各テストケースに性能要件を組み込み：

1. **メタデータ読み込み**: ≤200ms（NFR-102-001）
2. **タグフィルタリング**: ≤100ms（NFR-102-002）
3. **フォーマット変換**: ≤500ms（NFR-102-003）

```typescript
// 性能測定の実装例
const startTime = performance.now();
const result = await metadataManager.loadPromptFile(data);
const endTime = performance.now();
expect(endTime - startTime).toBeLessThan(200); // 200ms以内
```

### セキュリティテスト設計

XSS攻撃防止のテストパターン：

```typescript
const maliciousMetadata = {
  name: "<script>alert('XSS')</script>悪意のあるプリセット",
  description: "<img src=x onerror=alert('XSS')>説明文",
  author: "<iframe src='javascript:alert(1)'></iframe>"
};

// 期待される無害化結果
expect(result.name).toBe("&lt;script&gt;alert('XSS')&lt;/script&gt;悪意のあるプリセット");
```

## 失敗パターン分析

### 想定される失敗原因

1. **クラス未定義エラー**
   ```
   ReferenceError: NewFormatMetadataManager is not defined
   ```

2. **メソッド未実装エラー**
   ```
   TypeError: metadataManager.loadPromptFile is not a function
   ```

3. **型定義不整合エラー**
   ```
   TypeScript Error: Property 'loadPromptFile' does not exist on type 'NewFormatMetadataManager'
   ```

4. **外部依存関係エラー**
   ```
   ReferenceError: chrome is not defined (Chrome Extension API)
   ```

### 失敗メッセージ検証

各テストケースで期待される失敗パターン：

- **TC001-TC002**: `NewFormatMetadataManager`コンストラクタエラー
- **TC003-TC004**: `formatMetadataForDisplay`/`sanitizeMetadata`メソッド未定義
- **TC005-TC006**: `filterPresetsByTags`メソッド未定義
- **TC007**: `convertLegacyFormat`メソッド未定義
- **TC008-TC013**: エラーハンドリングメソッド未定義
- **TC015-TC024**: 境界値処理メソッド未定義

## 品質保証

### コメント品質

すべてのテストケースに以下の日本語コメントを完備：

1. **テスト目的**: 何を確認するかを明記
2. **テスト内容**: 具体的な処理内容を説明
3. **期待される動作**: 正常動作時の結果を説明
4. **信頼性レベル**: 🟢🟡🔴でEARS要件との対応度を明示
5. **確認内容**: 各expectステートメントの意図を説明

### 信頼性レベル分布

- 🟢 **青信号**: 13件（87%）- EARS要件・型定義に基づく確実なケース
- 🟡 **黄信号**: 0件（0%）- 妥当な推測ケース
- 🔴 **赤信号**: 0件（0%）- 推測ケース

高い信頼性でテストケースが設計されている。

### テスト網羅性確認

| EARS要件 | 対応テストケース | カバレッジ |
|----------|-----------------|------------|
| REQ-102-001 | TC001, TC002 | ✅ 完全 |
| REQ-102-002 | TC003, TC004 | ✅ 完全 |
| REQ-102-003 | TC007 | ✅ 完全 |
| REQ-102-004 | TC009 | ✅ 完全 |
| REQ-102-005 | TC005, TC006 | ✅ 完全 |
| REQ-102-101 | TC010 | ✅ 完全 |
| REQ-102-104 | TC004 | ✅ 完全 |
| REQ-102-401 | TC012 | ✅ 完全 |
| REQ-102-402 | TC024 | ✅ 完全 |
| NFR-102-001 | TC001, TC015, TC016 | ✅ 完全 |
| NFR-102-002 | TC005, TC006 | ✅ 完全 |
| NFR-102-003 | TC007 | ✅ 完全 |

## Greenフェーズへの移行準備

### 必須実装項目

1. **クラス定義**: `NewFormatMetadataManager`の基本構造
2. **メソッドスタブ**: 全メソッドの最小実装（空でも可）
3. **型定義**: インターフェースの正式定義
4. **基本機能**: JSON解析の最小限機能

### 実装優先順位

1. **Phase 1**: クラス定義 + `loadPromptFile`基本実装
2. **Phase 2**: `formatMetadataForDisplay` + `sanitizeMetadata`実装
3. **Phase 3**: `filterPresetsByTags`実装
4. **Phase 4**: `convertLegacyFormat` + エラーハンドリング実装
5. **Phase 5**: 境界値処理 + 性能最適化

### 成功基準

Greenフェーズでは以下のテストが通ることを目標：

- **必須**: TC001, TC002（新フォーマット基本読み込み）
- **重要**: TC003, TC005（メタデータ表示・基本フィルタリング）
- **任意**: TC007, TC010（互換性・エラーハンドリング）

全15テストケースが通ることで、Greenフェーズ完了とする。