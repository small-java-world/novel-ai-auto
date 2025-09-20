# TASK-102: 新フォーマット対応・メタデータ管理 要件定義書

## 概要

NovelAI Auto Generatorに新しいプロンプトファイルフォーマット（v1.0）への対応とメタデータ管理機能を実装し、高度なプロンプトセット管理を実現する。

## ユーザーストーリー

### ストーリー1: 高度なプロンプトセット管理
- **である** プロンプト作成者 **として**
- **私は** プロンプトセットに詳細なメタデータを付与 **をしたい**
- **そうすることで** 作成者情報、説明、タグでプロンプトセットを整理・検索できる

### ストーリー2: プロンプトセットの共有
- **である** プロンプト共有者 **として**
- **私は** 作成したプロンプトセットを他のユーザーと共有 **をしたい**
- **そうすることで** メタデータにより適切な使用方法と制限事項を伝達できる

## 機能要件（EARS記法）

### 通常要件

- **REQ-102-001**: システムは新フォーマット（v1.0）のプロンプトファイルを読み込み **しなければならない**
- **REQ-102-002**: システムはメタデータ（作成者、説明、タグ等）を表示・管理 **しなければならない**
- **REQ-102-003**: システムは既存のJSON形式との互換性を保持 **しなければならない**
- **REQ-102-004**: システムはプロンプトセットのバージョン管理 **をしなければならない**
- **REQ-102-005**: システムはタグベースのフィルタリング機能 **を提供しなければならない**

### 条件付き要件

- **REQ-102-101**: メタデータが不完全な場合、システムはデフォルト値を設定 **しなければならない**
- **REQ-102-102**: 既存形式のファイルを読み込む場合、システムは自動的に新形式に変換 **しなければならない**
- **REQ-102-103**: バージョンが異なる場合、システムは適切な変換処理 **を実行しなければならない**
- **REQ-102-104**: タグが重複している場合、システムは重複を除去 **しなければならない**

### 制約要件

- **REQ-102-401**: システムはJSON Schema v7に準拠 **しなければならない**
- **REQ-102-402**: システムはUnicode正規化（NFC）を使用 **しなければならない**
- **REQ-102-403**: システムはメタデータの文字数制限を遵守 **しなければならない**

## 非機能要件

### パフォーマンス
- **NFR-102-001**: メタデータの読み込み処理は200ms以内に完了 **しなければならない**
- **NFR-102-002**: タグフィルタリングは100ms以内に完了 **しなければならない**
- **NFR-102-003**: 形式変換処理は500ms以内に完了 **しなければならない**

### 信頼性
- **NFR-102-101**: メタデータの検証成功率は99%以上 **でなければならない**
- **NFR-102-102**: 形式変換の成功率は95%以上 **でなければならない**
- **NFR-102-103**: データ損失の発生率は0% **でなければならない**

### 保守性
- **NFR-102-201**: メタデータスキーマは拡張可能な設計 **でなければならない**
- **NFR-102-202**: バージョン管理は後方互換性を保持 **しなければならない**
- **NFR-102-203**: テストカバレッジは90%以上 **でなければならない**

## Edgeケース

### エラー処理
- **EDGE-102-001**: 無効なメタデータの処理
- **EDGE-102-002**: 破損したバージョン情報の処理
- **EDGE-102-003**: 文字エンコーディングの問題
- **EDGE-102-004**: メタデータサイズの制限超過

### 異常系
- **EDGE-102-101**: 極端に長いメタデータの処理
- **EDGE-102-102**: 特殊文字を含むタグの処理
- **EDGE-102-103**: 循環参照を含むメタデータの処理
- **EDGE-102-104**: 同時に複数の形式変換が実行された場合

## 受け入れ基準

### 機能テスト
- [ ] 新フォーマット（v1.0）の正常読み込み
- [ ] メタデータの表示・管理機能
- [ ] 既存形式との互換性確認
- [ ] バージョン管理機能
- [ ] タグベースフィルタリング
- [ ] 自動形式変換機能
- [ ] メタデータ検証機能

### 非機能テスト
- [ ] パフォーマンス要件の達成（200ms以内）
- [ ] フィルタリング性能（100ms以内）
- [ ] 形式変換性能（500ms以内）
- [ ] メタデータ検証の高信頼性（99%以上）

### 統合テスト
- [ ] ファイル選択機能との正常な連携
- [ ] プロンプト合成機能との正常な統合
- [ ] エラー発生時の適切な回復

## 技術仕様

### 新フォーマットスキーマ
```typescript
interface PromptFileV1 {
  version: "1.0";
  metadata: {
    name: string;                    // 1-100文字
    description?: string;            // 0-500文字
    author?: string;                 // 0-50文字
    created?: string;                // ISO 8601形式
    modified?: string;               // ISO 8601形式
    tags?: string[];                 // 0-20個のタグ
    license?: string;                // ライセンス情報
    source?: string;                 // 出典情報
  };
  commonPrompts?: {
    base?: string;                   // 0-2000文字
    negative?: string;               // 0-2000文字
  };
  presets: PresetV1[];
}

interface PresetV1 {
  id: string;                        // 1-50文字、英数字とアンダースコアのみ
  name: string;                      // 1-100文字
  description?: string;              // 0-300文字
  positive: string;                  // 1-2000文字
  negative?: string;                 // 0-2000文字
  parameters?: {
    steps?: number;                  // 1-100
    cfgScale?: number;               // 1-20
    sampler?: string;
    resolution?: string;
    [key: string]: any;
  };
  tags?: string[];                   // 0-10個のタグ
  created?: string;                  // ISO 8601形式
  modified?: string;                 // ISO 8601形式
}
```

### メタデータ管理クラス
```typescript
class MetadataManager {
  validateMetadata(metadata: any): ValidationResult;
  normalizeMetadata(metadata: any): NormalizedMetadata;
  convertFromLegacy(legacyData: any): PromptFileV1;
  extractTags(presets: PresetV1[]): string[];
  filterByTags(presets: PresetV1[], tags: string[]): PresetV1[];
  searchByMetadata(query: string, presets: PresetV1[]): PresetV1[];
}
```

### UI要素
```html
<div class="metadata-panel">
  <div class="metadata-display">
    <h4>プロンプトセット情報</h4>
    <div class="metadata-item">
      <label>名前:</label>
      <span id="metadataName">-</span>
    </div>
    <div class="metadata-item">
      <label>作成者:</label>
      <span id="metadataAuthor">-</span>
    </div>
    <div class="metadata-item">
      <label>説明:</label>
      <p id="metadataDescription">-</p>
    </div>
    <div class="metadata-item">
      <label>タグ:</label>
      <div id="metadataTags" class="tag-list"></div>
    </div>
    <div class="metadata-item">
      <label>作成日:</label>
      <span id="metadataCreated">-</span>
    </div>
  </div>
  
  <div class="filter-panel">
    <h4>フィルタリング</h4>
    <div class="tag-filter">
      <label for="tagFilter">タグで絞り込み:</label>
      <select id="tagFilter" multiple>
        <option value="">すべて</option>
      </select>
    </div>
    <div class="search-filter">
      <label for="searchQuery">検索:</label>
      <input type="text" id="searchQuery" placeholder="名前、説明、タグで検索">
    </div>
  </div>
</div>
```

## 実装計画

### Phase 1: 新フォーマット対応
1. 新フォーマットスキーマの実装
2. バリデーション機能の実装
3. 基本的な読み込み機能

### Phase 2: メタデータ管理
1. メタデータ表示機能の実装
2. タグ管理機能の実装
3. 検索・フィルタリング機能

### Phase 3: 互換性と変換
1. 既存形式との互換性確保
2. 自動変換機能の実装
3. バージョン管理機能

## 品質判定

### ✅ 高品質要件
- **要件の曖昧さ**: なし - 具体的なスキーマ定義と実装仕様を定義
- **入出力定義**: 完全 - 入力ファイル、メタデータ、出力結果の明確化
- **制約条件**: 明確 - パフォーマンス、信頼性、互換性の具体的数値を設定
- **実装可能性**: 確実 - 既存のファイル処理機能を拡張する形で実装

### 実装優先度
1. **最優先**: 新フォーマット対応（REQ-102-001〜003）
2. **高優先度**: メタデータ管理（REQ-102-002, REQ-102-005）
3. **中優先度**: バージョン管理（REQ-102-004）
4. **低優先度**: 高度な検索・フィルタリング機能

## 次のステップ

**次のお勧めステップ**: `/tdd-testcases TASK-102` でテストケースの洗い出しを行います。

TASK-102の要件定義が完了し、TDD開発サイクルの次のフェーズ（テストケース洗い出し）に進む準備が整いました！
