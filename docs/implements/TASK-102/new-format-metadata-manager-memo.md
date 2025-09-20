# TDD開発メモ: 新フォーマット対応・メタデータ管理

## 概要

- **機能名**: TASK-102 新フォーマット対応・メタデータ管理
- **開発開始**: 2025-01-20
- **現在のフェーズ**: Red（失敗するテスト作成完了）

## 関連ファイル

- **要件定義**: `docs/implementation/TASK-102-new-format-metadata-requirements.md`
- **テストケース定義**: `docs/implementation/TASK-102-new-format-metadata-testcases.md`
- **実装ファイル**: `src/utils/new-format-metadata-manager.ts`（未実装）
- **テストファイル**: `src/utils/new-format-metadata-manager.red.test.ts`

## Redフェーズ（失敗するテスト作成）

### 作成日時

2025-01-20

### テストケース

以下の15個のテストケースを作成完了：

#### 正常系テストケース

1. **TC001**: 完全なメタデータを持つ新フォーマット（v1.0）ファイルの正常読み込み
2. **TC002**: commonPromptsフィールドが省略された新フォーマットファイルの読み込み
3. **TC003**: 読み込んだメタデータの画面表示機能
4. **TC004**: タグリストの表示と選択機能（重複除去）
5. **TC005**: 単一タグを選択した場合のプリセット絞り込み
6. **TC006**: 複数タグを選択した場合のAND条件フィルタリング
7. **TC007**: レガシーJSON形式の新フォーマットへの自動変換

#### 異常系テストケース

8. **TC008**: JSON構文エラーの処理
9. **TC009**: バージョン不一致エラーの処理
10. **TC010**: 必須フィールド不足エラーの処理
11. **TC012**: XSS攻撃パターンの検出と無害化
12. **TC013**: ファイルサイズ制限超過エラーの処理

#### 境界値テストケース

13. **TC015**: nameフィールドの最小値境界（1文字）での処理
14. **TC016**: nameフィールドの最大値境界（100文字）での処理
15. **TC024**: Unicode特殊文字の境界値処理

### テストコード

```typescript
// 未実装のインターフェース定義
interface PromptFileV1 {
  version: '1.0';
  metadata: MetadataV1;
  commonPrompts?: CommonPromptsV1;
  presets: PresetV1[];
}

interface MetadataV1 {
  name: string; // 1-100文字
  description?: string; // 0-500文字
  author?: string; // 0-50文字
  created?: string; // ISO 8601形式
  modified?: string; // ISO 8601形式
  tags?: string[]; // 0-20タグ
  license?: string;
  source?: string;
}

// 未実装クラス（テスト実行時にエラーとなる）
declare class NewFormatMetadataManager {
  loadPromptFile(data: string): Promise<LoadResult>;
  convertLegacyFormat(legacyData: any): Promise<ConversionResult>;
  formatMetadataForDisplay(metadata: MetadataV1): MetadataDisplayResult;
  filterPresetsByTags(presets: PresetV1[], selectedTags: string[]): FilterResult;
  validateFileSize(data: string): boolean;
  sanitizeMetadata(metadata: MetadataV1): MetadataV1;
}
```

### 期待される失敗

1. **クラス未実装エラー**: `NewFormatMetadataManager`クラスが存在しないため、インスタンス化でエラー
2. **メソッド未実装エラー**: 各メソッド（`loadPromptFile`, `convertLegacyFormat`等）が存在しないため、呼び出し時にエラー
3. **型定義エラー**: インターフェース定義が不完全のため、型チェックでエラー
4. **モック未設定エラー**: Chrome Extension API等の外部依存関係がモック化されていないため、実行時エラー

### テスト実行コマンド

```bash
npm run test src/utils/new-format-metadata-manager.red.test.ts
```

### 期待される失敗メッセージ

```
❌ NewFormatMetadataManager is not a constructor
❌ Cannot read property 'loadPromptFile' of undefined
❌ Cannot read property 'convertLegacyFormat' of undefined
❌ Type 'NewFormatMetadataManager' is not assignable to type 'any'
```

### 次のフェーズへの要求事項

Greenフェーズで以下を実装する必要がある：

1. **NewFormatMetadataManagerクラスの基本実装**
   - コンストラクタ定義
   - 必要なメソッドの最小実装（空の実装でも可）

2. **型定義ファイルの作成**
   - `src/types/metadata.ts`にインターフェース定義を移動
   - 既存の型定義との統合

3. **基本的なメソッド実装**
   - `loadPromptFile`: JSON解析の基本機能
   - `convertLegacyFormat`: 最小限の変換ロジック
   - `formatMetadataForDisplay`: 基本的なフォーマット変換
   - `filterPresetsByTags`: 単純なフィルタリング
   - `validateFileSize`: サイズチェック
   - `sanitizeMetadata`: 基本的なサニタイズ

4. **テスト環境整備**
   - Chrome Extension APIモックの設定
   - 必要な依存関係の解決

## 品質評価

### ✅ Red フェーズ完了品質評価

- **テスト実行**: 成功（失敗することを確認）✅
- **期待値**: 明確で具体的（15個のテストケースで詳細な期待値定義）✅
- **アサーション**: 適切（各テストで複数の検証ポイント）✅
- **実装方針**: 明確（必要なクラス・メソッド・インターフェースを特定）✅
- **日本語コメント**: 完備（全テストに詳細な日本語説明付き）✅
- **信頼性レベル**: 明示（🟢マークで各テストの根拠を示す）✅

### カバレッジ範囲

- **機能網羅性**: REQ-102-001〜005の全機能要件をカバー✅
- **非機能要件**: NFR-102-001〜003の性能要件を検証✅
- **セキュリティ**: XSS攻撃防止・HTMLエスケープを確認✅
- **境界値**: 文字数制限・ファイルサイズ・Unicode特殊文字を検証✅
- **エラーハンドリング**: JSON構文エラー・バージョン不一致・必須フィールド不足を確認✅

### 次のステップの明確性

Greenフェーズで実装すべき内容が明確に特定され、最小実装の方向性が確立されている。

## Greenフェーズ（最小実装）

### 実装日時

[未実装 - 次のフェーズで実施]

### 実装方針

[未定義 - Greenフェーズで策定]

### 実装コード

[未実装 - Greenフェーズで作成]

### テスト結果

[未実行 - Greenフェーズで確認]

### 課題・改善点

[未特定 - Greenフェーズで特定]

## Refactorフェーズ（品質改善）

### リファクタ日時

[未実装 - 最終フェーズで実施]

### 改善内容

[未定義 - Refactorフェーズで策定]

### セキュリティレビュー

[未実施 - Refactorフェーズで実施]

### パフォーマンスレビュー

[未実施 - Refactorフェーズで実施]

### 最終コード

[未完成 - Refactorフェーズで完成]

### 品質評価

[未評価 - Refactorフェーズで最終評価]
