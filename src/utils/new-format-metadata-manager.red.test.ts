// テストファイル: new-format-metadata-manager.red.test.ts
// TDD Redフェーズ: TASK-102 新フォーマット対応・メタデータ管理の失敗テスト

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { NewFormatMetadataManager } from './new-format-metadata-manager';

// 未実装のインターフェースと関数（これらは失敗の原因となる）
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

interface CommonPromptsV1 {
  base: string;
  negative: string;
}

interface PresetV1 {
  name: string;
  prompt: string;
  negative?: string;
  parameters?: {
    steps: number;
    cfgScale: number;
    sampler: string;
  };
}

interface MetadataDisplayResult {
  name: string;
  description: string;
  author: string;
  dateCreated: string;
  dateModified: string;
  tags: string[];
  license?: string;
  source?: string;
}

interface FilterResult {
  filteredPresets: PresetV1[];
  matchCount: number;
  appliedTags: string[];
}

interface ConversionResult {
  success: boolean;
  convertedData?: PromptFileV1;
  warnings: string[];
  errors: string[];
}

interface LoadResult {
  success: boolean;
  metadata?: MetadataDisplayResult;
  presets?: PresetV1[];
  errors: string[];
  warnings: string[];
}

describe('新フォーマット対応・メタデータ管理', () => {
  let metadataManager: NewFormatMetadataManager;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にメタデータマネージャーインスタンスを初期化
    // 【環境初期化】: テスト環境をクリーンな状態にし、一貫したテスト条件を保証
    metadataManager = new NewFormatMetadataManager();
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後のリソースクリーンアップ
    // 【状態復元】: 次のテストに影響しないよう状態を復元
    metadataManager = null as any;
  });

  describe('新フォーマット読み込み機能', () => {
    test('TC001: 完全なメタデータを持つ新フォーマット（v1.0）ファイルの正常読み込み', async () => {
      // 【テスト目的】: PromptFileV1インターフェースに完全準拠したファイルの読み込み処理を確認
      // 【テスト内容】: 全フィールドを含む新フォーマットデータの解析とメタデータ抽出
      // 【期待される動作】: メタデータとプリセットデータの完全な抽出と型変換が正常に実行される
      // 🟢 信頼性レベル: EARS要件REQ-102-001と型定義に基づく確実なケース

      // 【テストデータ準備】: 新フォーマットの全フィールドを含む完全なデータ構造を用意
      // 【初期条件設定】: 有効なJSONデータとして整形済みの状態
      const validNewFormatData = JSON.stringify({
        version: '1.0',
        metadata: {
          name: 'テストプリセット集',
          description: 'テスト用のプリセットコレクション',
          author: 'テストユーザー',
          created: '2024-01-01T00:00:00Z',
          modified: '2024-01-02T00:00:00Z',
          tags: ['fantasy', 'character', 'landscape'],
          license: 'CC BY 4.0',
          source: 'https://example.com',
        },
        commonPrompts: {
          base: 'high quality, masterpiece',
          negative: 'low quality, blurry',
        },
        presets: [
          {
            name: '美しい風景',
            prompt: 'beautiful landscape',
            negative: 'ugly',
            parameters: { steps: 28, cfgScale: 7.0, sampler: 'k_euler_ancestral' },
          },
        ],
      });

      // 【実際の処理実行】: 新フォーマットファイルの読み込み処理を実行
      // 【処理内容】: JSON解析、メタデータ抽出、型変換を含む一連の読み込み処理
      const result = await metadataManager.loadPromptFile(validNewFormatData);

      // 【結果検証】: 読み込み結果が期待される形式で返されることを確認
      // 【期待値確認】: すべての必須・任意フィールドが適切に解析されることを検証
      expect(result.success).toBe(true); // 【確認内容】: 新フォーマット読み込みが正常に完了することを確認 🟢
      expect(result.metadata).toBeDefined(); // 【確認内容】: メタデータが正常に抽出されることを確認 🟢
      expect(result.metadata!.name).toBe('テストプリセット集'); // 【確認内容】: メタデータのname要素が正確に抽出されることを確認 🟢
      expect(result.metadata!.description).toBe('テスト用のプリセットコレクション'); // 【確認内容】: description要素の正確な抽出を確認 🟢
      expect(result.metadata!.author).toBe('テストユーザー'); // 【確認内容】: author要素の正確な抽出を確認 🟢
      expect(result.metadata!.tags).toEqual(['fantasy', 'character', 'landscape']); // 【確認内容】: タグ配列が正確に抽出されることを確認 🟢
      expect(result.presets).toHaveLength(1); // 【確認内容】: プリセット配列が正確に解析されることを確認 🟢
      expect(result.errors).toHaveLength(0); // 【確認内容】: エラーが発生しないことを確認 🟢
      expect(result.warnings).toHaveLength(0); // 【確認内容】: 警告が発生しないことを確認 🟢
    });

    test('TC002: commonPromptsフィールドが省略された新フォーマットファイルの読み込み', async () => {
      // 【テスト目的】: 任意フィールドの省略に対する適切な処理を確認
      // 【テスト内容】: commonPromptsフィールドなしでの新フォーマット読み込み
      // 【期待される動作】: commonPromptsなしでも正常に処理される
      // 🟢 信頼性レベル: TypeScript仕様とPromptFileV1インターフェースに基づく

      // 【テストデータ準備】: 最小限の必須フィールドのみを含むケースを用意
      // 【初期条件設定】: commonPromptsフィールドを除外したデータ構造
      const minimalNewFormatData = JSON.stringify({
        version: '1.0',
        metadata: {
          name: 'ミニマルプリセット',
        },
        presets: [
          {
            name: 'シンプルプリセット',
            prompt: 'simple prompt',
          },
        ],
      });

      // 【実際の処理実行】: 最小構成での新フォーマット読み込み処理
      // 【処理内容】: 任意フィールド省略時の適切な処理確認
      const result = await metadataManager.loadPromptFile(minimalNewFormatData);

      // 【結果検証】: 任意フィールド省略でも正常に処理されることを確認
      // 【期待値確認】: commonPromptsがundefinedとして適切に扱われることを検証
      expect(result.success).toBe(true); // 【確認内容】: 任意フィールド省略でも読み込みが成功することを確認 🟢
      expect(result.metadata!.name).toBe('ミニマルプリセット'); // 【確認内容】: 必須フィールドname要素が正確に抽出されることを確認 🟢
      expect(result.presets).toHaveLength(1); // 【確認内容】: プリセット配列が正確に解析されることを確認 🟢
      expect(result.errors).toHaveLength(0); // 【確認内容】: エラーが発生しないことを確認 🟢
    });
  });

  describe('メタデータ表示・管理機能', () => {
    test('TC003: 読み込んだメタデータの画面表示機能', () => {
      // 【テスト目的】: MetadataDisplayResult形式での画面表示データ生成を確認
      // 【テスト内容】: メタデータの画面表示用フォーマット変換処理
      // 【期待される動作】: HTMLエスケープ済みの安全な表示データ生成
      // 🟢 信頼性レベル: セキュリティ要件とUI仕様に基づく

      // 【テストデータ準備】: 全フィールド含有の代表的なメタデータを用意
      // 【初期条件設定】: ISO 8601日時とHTMLエスケープが必要な文字を含む
      const testMetadata: MetadataV1 = {
        name: 'テストプリセット集',
        description: 'テスト用のプリセットコレクション',
        author: 'テストユーザー',
        created: '2024-01-01T00:00:00Z',
        modified: '2024-01-02T00:00:00Z',
        tags: ['fantasy', 'character', 'landscape'],
        license: 'CC BY 4.0',
        source: 'https://example.com',
      };

      // 【実際の処理実行】: メタデータの表示用フォーマット変換を実行
      // 【処理内容】: ISO 8601からユーザー可読形式への変換とHTMLエスケープ処理
      const result = metadataManager.formatMetadataForDisplay(testMetadata);

      // 【結果検証】: 表示用データが適切にフォーマットされることを確認
      // 【期待値確認】: 日時フォーマット変換とセキュリティ処理の正確性を検証
      expect(result.name).toBe('テストプリセット集'); // 【確認内容】: name要素が正確に変換されることを確認 🟢
      expect(result.description).toBe('テスト用のプリセットコレクション'); // 【確認内容】: description要素が正確に変換されることを確認 🟢
      expect(result.author).toBe('テストユーザー'); // 【確認内容】: author要素が正確に変換されることを確認 🟢
      expect(result.dateCreated).toBe('2024年1月1日'); // 【確認内容】: ISO 8601からユーザー可読形式への変換を確認 🟢
      expect(result.dateModified).toBe('2024年1月2日'); // 【確認内容】: 日時フォーマットの一貫性を確認 🟢
      expect(result.tags).toEqual(['fantasy', 'character', 'landscape']); // 【確認内容】: タグ配列が正確に変換されることを確認 🟢
      expect(result.license).toBe('CC BY 4.0'); // 【確認内容】: license要素が正確に変換されることを確認 🟢
      expect(result.source).toBe('https://example.com'); // 【確認内容】: source要素が正確に変換されることを確認 🟢
    });

    test('TC004: タグリストの表示と選択機能（重複除去）', () => {
      // 【テスト目的】: タグ配列の表示とインタラクティブな選択処理を確認
      // 【テスト内容】: 重複タグの除去処理とタグ一覧表示機能
      // 【期待される動作】: 重複除去済みのタグ一覧表示と選択状態管理
      // 🟢 信頼性レベル: REQ-102-104とタグ管理仕様に基づく

      // 【テストデータ準備】: 実際のユーザーファイルで発生しうる重複タグを含むデータ
      // 【初期条件設定】: 意図的に重複を含むタグ配列
      const metadataWithDuplicateTags: MetadataV1 = {
        name: 'テストプリセット',
        tags: ['fantasy', 'character', 'landscape', 'fantasy', 'character'],
      };

      // 【実際の処理実行】: タグの重複除去とサニタイズ処理を実行
      // 【処理内容】: 重複除去、Unicode正規化、並び順整理
      const result = metadataManager.sanitizeMetadata(metadataWithDuplicateTags);

      // 【結果検証】: 重複タグが適切に除去されることを確認
      // 【期待値確認】: REQ-102-104の重複タグ除去要件に準拠することを検証
      expect(result.tags).toEqual(['fantasy', 'character', 'landscape']); // 【確認内容】: 重複タグが除去されることを確認 🟢
      expect(result.tags).toHaveLength(3); // 【確認内容】: 除去後のタグ数が正確であることを確認 🟢
    });
  });

  describe('タグベースフィルタリング機能', () => {
    test('TC005: 単一タグを選択した場合のプリセット絞り込み', () => {
      // 【テスト目的】: 指定タグを含むプリセットのみの抽出処理を確認
      // 【テスト内容】: 単一タグでのフィルタリング機能とパフォーマンス検証
      // 【期待される動作】: タグマッチング条件での高速フィルタリング（≤100ms）
      // 🟢 信頼性レベル: NFR-102-002性能要件とフィルタリング仕様に基づく

      // 【テストデータ準備】: 典型的な単一タグ検索シナリオを想定したプリセット配列
      // 【初期条件設定】: 3個のプリセットのうち1個がfantasyタグを含有
      const testPresets: PresetV1[] = [
        {
          name: 'ファンタジー風景',
          prompt: 'fantasy landscape',
          tags: ['fantasy', 'landscape'],
        } as any,
        {
          name: 'リアル人物',
          prompt: 'realistic person',
          tags: ['realistic', 'character'],
        } as any,
        {
          name: '抽象アート',
          prompt: 'abstract art',
          tags: ['abstract', 'art'],
        } as any,
      ];
      const selectedTags = ['fantasy'];

      // 【実際の処理実行】: 単一タグでのフィルタリング処理を実行
      // 【処理内容】: タグマッチング、性能測定、結果集計
      const startTime = performance.now();
      const result = metadataManager.filterPresetsByTags(testPresets, selectedTags);
      const endTime = performance.now();

      // 【結果検証】: フィルタリング結果と性能要件の確認
      // 【期待値確認】: タグマッチングの精度と性能要件（100ms以内）を検証
      expect(result.filteredPresets).toHaveLength(1); // 【確認内容】: fantasyタグを含むプリセットが1個抽出されることを確認 🟢
      expect(result.matchCount).toBe(1); // 【確認内容】: マッチング数が正確にカウントされることを確認 🟢
      expect(result.appliedTags).toEqual(['fantasy']); // 【確認内容】: 適用されたタグが正確に記録されることを確認 🟢
      expect(result.filteredPresets[0].name).toBe('ファンタジー風景'); // 【確認内容】: 正しいプリセットが抽出されることを確認 🟢
      expect(endTime - startTime).toBeLessThan(100); // 【確認内容】: フィルタリング処理が100ms以内に完了することを確認 🟢
    });

    test('TC006: 複数タグを選択した場合のAND条件フィルタリング', () => {
      // 【テスト目的】: すべての指定タグを含むプリセットのみの抽出処理を確認
      // 【テスト内容】: 複数タグでのAND条件フィルタリング機能
      // 【期待される動作】: 交集合条件での厳密なマッチング
      // 🟢 信頼性レベル: フィルタリング仕様とデータフロー設計に基づく

      // 【テストデータ準備】: 詳細な絞り込み検索シナリオを想定したプリセット配列
      // 【初期条件設定】: 5個のプリセットのうち2個が両方のタグを含有
      const testPresets: PresetV1[] = [
        {
          name: 'ファンタジーキャラクター',
          prompt: 'fantasy character',
          tags: ['fantasy', 'character'],
        } as any,
        {
          name: 'ファンタジー風景',
          prompt: 'fantasy landscape',
          tags: ['fantasy', 'landscape'],
        } as any,
        {
          name: 'リアルキャラクター',
          prompt: 'realistic character',
          tags: ['realistic', 'character'],
        } as any,
        {
          name: 'ファンタジーキャラクター2',
          prompt: 'another fantasy character',
          tags: ['fantasy', 'character', 'detailed'],
        } as any,
        {
          name: '抽象アート',
          prompt: 'abstract art',
          tags: ['abstract', 'art'],
        } as any,
      ];
      const selectedTags = ['fantasy', 'character'];

      // 【実際の処理実行】: 複数タグでのAND条件フィルタリング処理を実行
      // 【処理内容】: 交集合条件でのタグマッチング、結果集計
      const result = metadataManager.filterPresetsByTags(testPresets, selectedTags);

      // 【結果検証】: AND条件でのフィルタリング精度確認
      // 【期待値確認】: AND論理演算の正確性と性能維持を検証
      expect(result.filteredPresets).toHaveLength(2); // 【確認内容】: 両方のタグを含むプリセットが2個抽出されることを確認 🟢
      expect(result.matchCount).toBe(2); // 【確認内容】: マッチング数が正確にカウントされることを確認 🟢
      expect(result.appliedTags).toEqual(['fantasy', 'character']); // 【確認内容】: 適用されたタグが正確に記録されることを確認 🟢
      expect(result.filteredPresets.map((p) => p.name)).toContain('ファンタジーキャラクター'); // 【確認内容】: 期待されるプリセットが含まれることを確認 🟢
      expect(result.filteredPresets.map((p) => p.name)).toContain('ファンタジーキャラクター2'); // 【確認内容】: 追加タグを持つプリセットも含まれることを確認 🟢
    });
  });

  describe('既存形式との互換性機能', () => {
    test('TC007: レガシーJSON形式の新フォーマットへの自動変換', async () => {
      // 【テスト目的】: LegacyPromptFile → PromptFileV1の変換処理を確認
      // 【テスト内容】: 旧JSON形式ファイルの新フォーマットへの自動変換とデフォルト値補完
      // 【期待される動作】: メタデータ不足部分のデフォルト値補完と変換（≤500ms）
      // 🟢 信頼性レベル: REQ-102-101/102/103互換性要件に基づく

      // 【テストデータ準備】: メタデータ未対応の既存プロンプトファイルを用意
      // 【初期条件設定】: バージョン情報とメタデータが欠如した旧形式データ
      const legacyData = {
        presets: [
          {
            name: '旧形式プリセット',
            prompt: 'old format prompt',
            negative: 'old negative',
            parameters: { steps: 20, cfgScale: 7.0, sampler: 'k_euler' },
          },
        ],
      };

      // 【実際の処理実行】: レガシー形式から新フォーマットへの変換処理を実行
      // 【処理内容】: フォーマット検出、メタデータ補完、バージョン情報追加
      const startTime = performance.now();
      const result = await metadataManager.convertLegacyFormat(legacyData);
      const endTime = performance.now();

      // 【結果検証】: 変換結果の正確性と性能要件の確認
      // 【期待値確認】: REQ-102-101のデフォルト値設定要件と性能要件（500ms以内）を検証
      expect(result.success).toBe(true); // 【確認内容】: レガシー形式の変換が成功することを確認 🟢
      expect(result.convertedData).toBeDefined(); // 【確認内容】: 変換データが生成されることを確認 🟢
      expect(result.convertedData!.version).toBe('1.0'); // 【確認内容】: バージョン情報が正確に設定されることを確認 🟢
      expect(result.convertedData!.metadata.name).toBe('[ファイル名から生成]'); // 【確認内容】: デフォルト値が適切に設定されることを確認 🟢
      expect(result.convertedData!.presets).toHaveLength(1); // 【確認内容】: プリセット配列が正確に変換されることを確認 🟢
      expect(result.warnings).toContain('メタデータが不足しているため、デフォルト値を設定しました'); // 【確認内容】: 適切な警告メッセージが生成されることを確認 🟢
      expect(result.errors).toHaveLength(0); // 【確認内容】: エラーが発生しないことを確認 🟢
      expect(endTime - startTime).toBeLessThan(500); // 【確認内容】: 変換処理が500ms以内に完了することを確認 🟢
    });
  });

  describe('エラーハンドリング機能', () => {
    test('TC008: JSON構文エラーの処理', async () => {
      // 【テスト目的】: JSON.parse()で解析できない不正な構文の適切なハンドリングを確認
      // 【テスト内容】: 不正なJSON構文に対するエラー処理とユーザー通知
      // 【期待される動作】: ファイル破損や手動編集ミスから保護する安全な処理
      // 🟢 信頼性レベル: 既存エラーハンドリングパターンとJSON標準仕様に基づく

      // 【テストデータ準備】: 手動編集中の保存ミスやファイル転送中の破損を想定
      // 【初期条件設定】: 閉じ括弧不足によるJSON構文違反
      const invalidJsonData = '{"version": "1.0", "metadata": {';

      // 【実際の処理実行】: 不正JSON構文の読み込み処理を実行
      // 【処理内容】: JSON構文エラーの検出とエラーメッセージ生成
      const result = await metadataManager.loadPromptFile(invalidJsonData);

      // 【結果検証】: JSON構文エラーの適切なハンドリング確認
      // 【期待値確認】: 具体的な構文エラー位置とユーザー向け修正案の提示
      expect(result.success).toBe(false); // 【確認内容】: JSON構文エラー時に失敗として処理されることを確認 🟢
      expect(result.errors).toContain('JSON構文エラー: line 1, unexpected token'); // 【確認内容】: 適切なエラーメッセージが生成されることを確認 🟢
      expect(result.metadata).toBeUndefined(); // 【確認内容】: エラー時にメタデータが未定義であることを確認 🟢
      expect(result.presets).toBeUndefined(); // 【確認内容】: エラー時にプリセットが未定義であることを確認 🟢
    });

    test('TC009: バージョン不一致エラーの処理', async () => {
      // 【テスト目的】: version "2.0"等の未知バージョン指定の適切な処理を確認
      // 【テスト内容】: 未対応バージョンファイルの処理と将来バージョンとの互換性確保
      // 【期待される動作】: 予期しない動作の防止と明確なエラー通知
      // 🟢 信頼性レベル: REQ-102-103バージョン管理要件に基づく

      // 【テストデータ準備】: 新バージョンファイルの旧バージョンアプリでの使用を想定
      // 【初期条件設定】: 現在対応可能なバージョン "1.0" 以外の指定
      const unsupportedVersionData = JSON.stringify({
        version: '2.0',
        metadata: { name: 'テスト' },
        presets: [],
      });

      // 【実際の処理実行】: 未対応バージョンファイルの読み込み処理を実行
      // 【処理内容】: バージョン検証とエラーメッセージ生成
      const result = await metadataManager.loadPromptFile(unsupportedVersionData);

      // 【結果検証】: バージョン管理機能の確認
      // 【期待値確認】: 現在対応バージョンの明示と代替案提示
      expect(result.success).toBe(false); // 【確認内容】: 未対応バージョン時に失敗として処理されることを確認 🟢
      expect(result.warnings).toContain('バージョン2.0は未対応です'); // 【確認内容】: 適切な警告メッセージが生成されることを確認 🟢
      expect(result.errors).toContain('対応可能バージョン: 1.0'); // 【確認内容】: 対応可能バージョンが明示されることを確認 🟢
    });

    test('TC010: 必須フィールド不足エラーの処理', async () => {
      // 【テスト目的】: MetadataV1.nameフィールド未定義の自動修復機能を確認
      // 【テスト内容】: 必須フィールド不足時のデフォルト値設定とユーザー通知
      // 【期待される動作】: データ整合性確保とUI表示問題の防止
      // 🟢 信頼性レベル: REQ-102-101デフォルト値設定要件に基づく

      // 【テストデータ準備】: 手動作成時の記述漏れや自動生成時のバグを想定
      // 【初期条件設定】: nameフィールドは必須（1-100文字）だが未定義
      const missingNameData = JSON.stringify({
        version: '1.0',
        metadata: {
          description: '名前フィールドなし',
          author: 'テストユーザー',
          // name フィールドが不足
        },
        presets: [],
      });

      // 【実際の処理実行】: 必須フィールド不足時の読み込み処理を実行
      // 【処理内容】: フィールド検証、デフォルト値設定、警告メッセージ生成
      const result = await metadataManager.loadPromptFile(missingNameData);

      // 【結果検証】: 必須フィールド不足の自動修復機能確認
      // 【期待値確認】: REQ-102-101のデフォルト値設定による安全な復旧
      expect(result.success).toBe(true); // 【確認内容】: 必須フィールド不足でも修復により成功することを確認 🟢
      expect(result.metadata!.name).toBe('[ファイル名から生成]'); // 【確認内容】: デフォルト値が適切に設定されることを確認 🟢
      expect(result.warnings).toContain(
        'nameフィールドが不足しているため、ファイル名から生成しました'
      ); // 【確認内容】: 適切な警告メッセージが生成されることを確認 🟢
      expect(result.errors).toHaveLength(0); // 【確認内容】: 自動修復によりエラーが発生しないことを確認 🟢
    });

    test('TC012: XSS攻撃パターンの検出と無害化', () => {
      // 【テスト目的】: HTMLスクリプト注入攻撃の検出と無害化処理を確認
      // 【テスト内容】: メタデータフィールドへのHTMLタグ/JavaScript注入の防止
      // 【期待される動作】: XSS攻撃防止とUI表示の安全性確保
      // 🟢 信頼性レベル: セキュリティ要件REQ-102-401とXSS防止仕様に基づく

      // 【テストデータ準備】: 悪意のあるプリセットファイルの配布や共有ファイルの改ざんを想定
      // 【初期条件設定】: HTMLタグとJavaScriptコードを含む悪意のある入力
      const maliciousMetadata: MetadataV1 = {
        name: "<script>alert('XSS')</script>悪意のあるプリセット",
        description: "<img src=x onerror=alert('XSS')>説明文",
        author: "<iframe src='javascript:alert(1)'></iframe>",
      };

      // 【実際の処理実行】: メタデータのサニタイズ処理を実行
      // 【処理内容】: HTMLエスケープによる完全な無害化処理
      const result = metadataManager.sanitizeMetadata(maliciousMetadata);

      // 【結果検証】: XSS攻撃防止機能の確認
      // 【期待値確認】: HTMLエスケープによる完全な無害化の実現
      expect(result.name).toBe("&lt;script&gt;alert('XSS')&lt;/script&gt;悪意のあるプリセット"); // 【確認内容】: HTMLタグが適切にエスケープされることを確認 🟢
      expect(result.description).toBe("&lt;img src=x onerror=alert('XSS')&gt;説明文"); // 【確認内容】: HTML属性が適切にエスケープされることを確認 🟢
      expect(result.author).toBe("&lt;iframe src='javascript:alert(1)'&gt;&lt;/iframe&gt;"); // 【確認内容】: JavaScriptコードが適切にエスケープされることを確認 🟢
    });

    test('TC013: ファイルサイズ制限超過エラーの処理', () => {
      // 【テスト目的】: 10MB制限を超過するファイルの適切な処理を確認
      // 【テスト内容】: ファイルサイズ制限によるメモリ不足防止とシステム安定性確保
      // 【期待される動作】: メモリ使用量制御による安定動作の維持
      // 🟢 信頼性レベル: 既存ファイルサイズ制約とシステム安定性要件に基づく

      // 【テストデータ準備】: 大量プリセット集約ファイルや画像埋め込みファイルを想定
      // 【初期条件設定】: 既存制約の10MB制限を超過するデータ
      const oversizedData = 'A'.repeat(10 * 1024 * 1024 + 1); // 10MB + 1バイト

      // 【実際の処理実行】: ファイルサイズ検証処理を実行
      // 【処理内容】: サイズチェックとエラーメッセージ生成
      const result = metadataManager.validateFileSize(oversizedData);

      // 【結果検証】: ファイルサイズ制限機能の確認
      // 【期待値確認】: 制限値の明示と分割提案による適切なエラー処理
      expect(result).toBe(false); // 【確認内容】: ファイルサイズ超過時にfalseが返されることを確認 🟢
    });
  });

  describe('境界値処理機能', () => {
    test('TC015: nameフィールドの最小値境界（1文字）での処理', async () => {
      // 【テスト目的】: nameフィールドの下限値（1文字）での動作保証を確認
      // 【テスト内容】: 最小文字数境界での安定動作確認
      // 【期待される動作】: 1文字でも適切にUI表示される
      // 🟢 信頼性レベル: MetadataV1インターフェース仕様（1-100文字）に基づく

      // 【テストデータ準備】: 簡潔な命名規則や略称使用時を想定
      // 【初期条件設定】: nameフィールドの仕様「1-100文字」の下限値
      const minimalData = JSON.stringify({
        version: '1.0',
        metadata: { name: 'A' }, // 1文字（最小有効値）
        presets: [],
      });

      // 【実際の処理実行】: 最小文字数での読み込み処理を実行
      // 【処理内容】: 文字数検証と境界値処理
      const result = await metadataManager.loadPromptFile(minimalData);

      // 【結果検証】: 最小文字数境界での動作確認
      // 【期待値確認】: 極端に短い入力でも安定動作することを検証
      expect(result.success).toBe(true); // 【確認内容】: 1文字のname要素でも正常に処理されることを確認 🟢
      expect(result.metadata!.name).toBe('A'); // 【確認内容】: 1文字のname要素が正確に保持されることを確認 🟢
    });

    test('TC016: nameフィールドの最大値境界（100文字）での処理', async () => {
      // 【テスト目的】: nameフィールドの上限値（100文字）での動作保証を確認
      // 【テスト内容】: 最大文字数境界での安定動作確認
      // 【期待される動作】: 100文字でもUI表示が適切に収まる
      // 🟢 信頼性レベル: MetadataV1インターフェース仕様とUI設計制約に基づく

      // 【テストデータ準備】: 詳細な説明を含む長い名前を想定
      // 【初期条件設定】: nameフィールドの仕様「1-100文字」の上限値
      const maximalData = JSON.stringify({
        version: '1.0',
        metadata: { name: 'A'.repeat(100) }, // 100文字（最大有効値）
        presets: [],
      });

      // 【実際の処理実行】: 最大文字数での読み込み処理を実行
      // 【処理内容】: 文字数検証と境界値処理
      const result = await metadataManager.loadPromptFile(maximalData);

      // 【結果検証】: 最大文字数境界での動作確認
      // 【期待値確認】: UI制限ギリギリでも安定表示されることを検証
      expect(result.success).toBe(true); // 【確認内容】: 100文字のname要素でも正常に処理されることを確認 🟢
      expect(result.metadata!.name).toBe('A'.repeat(100)); // 【確認内容】: 100文字のname要素が正確に保持されることを確認 🟢
      expect(result.metadata!.name.length).toBe(100); // 【確認内容】: 文字数が正確に100文字であることを確認 🟢
    });

    test('TC024: Unicode特殊文字の境界値処理', async () => {
      // 【テスト目的】: Unicode文字セットの特殊範囲での動作保証を確認
      // 【テスト内容】: Unicode特殊文字（絵文字、CJK統合漢字）の処理
      // 【期待される動作】: 特殊文字でも文字数計算と表示が正確
      // 🟢 信頼性レベル: REQ-102-402のUnicode正規化要件と国際化対応に基づく

      // 【テストデータ準備】: 国際化対応や絵文字を使った視覚的分類を想定
      // 【初期条件設定】: Unicode正規化とマルチバイト文字の処理確認
      const unicodeData = JSON.stringify({
        version: '1.0',
        metadata: {
          name: '🎨✨魔法のプリセット集👑', // 絵文字+漢字
          tags: ['🌸春', '🍂秋', '❄️冬'], // 絵文字タグ
        },
        presets: [],
      });

      // 【実際の処理実行】: Unicode特殊文字での読み込み処理を実行
      // 【処理内容】: Unicode正規化（NFC）とマルチバイト文字処理
      const result = await metadataManager.loadPromptFile(unicodeData);

      // 【結果検証】: Unicode処理の境界確認
      // 【期待値確認】: 特殊文字でも文字化けや処理エラーが発生しないことを検証
      expect(result.success).toBe(true); // 【確認内容】: Unicode特殊文字でも正常に処理されることを確認 🟢
      expect(result.metadata!.name).toBe('🎨✨魔法のプリセット集👑'); // 【確認内容】: 絵文字+漢字の組み合わせが正確に処理されることを確認 🟢
      expect(result.metadata!.tags).toEqual(['🌸春', '🍂秋', '❄️冬']); // 【確認内容】: 絵文字タグが正確に処理されることを確認 🟢
    });
  });
});
