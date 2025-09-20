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
npx vitest run src/utils/new-format-metadata-manager.red.test.ts --config vitest.red.config.ts
```

### 実際の失敗メッセージ ✅

**実行結果**: 2025-01-20 13:34:47

```
❌ NewFormatMetadataManager is not defined (全15テストケース)
```

**確認事項**:
- ✅ 全15テストケースが期待通り失敗
- ✅ エラーメッセージが明確（`NewFormatMetadataManager is not defined`）
- ✅ テスト実行時間: 739ms（許容範囲内）
- ✅ TypeScriptコンパイルエラーなし

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

**実装開始**: 2025-01-20 13:35:00
**実装完了**: 2025-01-20 13:45:49

### 実装方針

**【TDD Green フェーズ戦略】**: 失敗するテストを通すための最小限実装を最優先

1. **段階的実装**: 1つずつテストを通すことで確実な進歩を確保
2. **最小限主義**: 複雑なロジックは避け、テストが求める動作のみを実装
3. **ハードコーディング許可**: 品質向上は後のRefactorフェーズで対応
4. **詳細な日本語コメント**: 実装意図と対応テストケースを明記

### 実装コード

**メインクラス**: `src/utils/new-format-metadata-manager.ts`
**型定義拡張**: `src/types/metadata.ts` (LoadResult, MetadataDisplayResult追加)

**主要実装メソッド**:
- `loadPromptFile()`: 新フォーマットファイル読み込み・解析
- `convertLegacyFormat()`: 既存形式から新フォーマットへの変換
- `formatMetadataForDisplay()`: 表示用メタデータフォーマット
- `filterPresetsByTags()`: タグベースフィルタリング
- `validateFileSize()`: ファイルサイズ制限検証
- `sanitizeMetadata()`: XSS防止とタグ重複除去

### テスト結果

**最終結果**: ✅ **15/15 テスト成功** (100%)

```
Test Files  1 passed (1)
Tests      15 passed (15)
Duration   683ms (性能要件クリア)
```

**テスト成功の推移**:
1. 初回実装: 8/15 成功 (53%)
2. 修正1回目: 11/15 成功 (73%)
3. 修正2回目: 14/15 成功 (93%)
4. 最終修正: 15/15 成功 (100%)

**主要な修正内容**:
- TC003: 日本語日付フォーマット対応
- TC004: タグ重複除去ロジック追加
- TC007: デフォルトメタデータ名称修正
- TC008: JSON エラーメッセージ形式統一
- TC009: バージョンエラーの警告/エラー分離
- TC010: nameフィールド自動生成と警告追加
- TC012: HTMLエスケープ処理調整

### 課題・改善点

**Refactorフェーズで改善すべき点**:

1. **コード品質**:
   - ハードコーディングされたエラーメッセージの動的生成
   - 長いメソッドの分割（loadPromptFile は100行超）
   - 日本語コメントの英語化（国際化対応）

2. **パフォーマンス**:
   - タグ重複除去処理の最適化
   - 大容量ファイルのチャンク処理
   - メモリ使用量の最適化

3. **セキュリティ**:
   - より厳密なHTMLエスケープ処理
   - 入力値バリデーションの強化
   - ファイルサイズチェックの精度向上

4. **エラーハンドリング**:
   - より詳細なJSON構文エラー解析
   - ユーザー向けエラーメッセージの改善
   - 復旧可能なエラーの自動修復機能拡張

5. **型安全性**:
   - より厳密な型定義
   - ランタイム型チェックの追加
   - null/undefined チェックの強化

### 品質評価

**✅ Green フェーズ品質基準達成**:
- [x] 全テスト成功 (15/15)
- [x] 性能要件クリア (683ms < 2分)
- [x] 型エラーなし
- [x] 実装方針明確
- [x] 日本語コメント完備
- [x] 改善点特定済み

**次のステップ**: Refactorフェーズでコード品質とパフォーマンスの向上

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
