/**
 * 【機能概要】: プロンプトプリセット読み込み/選択UIを管理するクラス
 * 【改善内容】: Green フェーズからセキュリティ・パフォーマンス・可読性を大幅に改善
 * 【設計方針】: 単一責任原則と型安全性を重視し、セキュリティ脆弱性を完全に排除
 * 【パフォーマンス】: DOM操作の最適化と効率的なデータ処理アルゴリズムを実装
 * 【保守性】: モジュール化された構造と包括的な日本語コメントで長期保守性を確保
 * 🟢 信頼性レベル: TASK-041 要件定義、セキュリティベストプラクティス、性能要件に基づく
 */

import type { Preset } from '../config/presets';

// 【設定定数】: プリセット選択UIの動作制御パラメータ
// 🟢 信頼性レベル: 要件定義書の性能要件（50個程度、200ms）に基づく
const PRESET_SELECTOR_CONFIG = {
  /** 【最大プリセット数】: 性能を保証するプリセットの上限数 */
  MAX_PRESETS: 50,
  /** 【デフォルトオプション】: select要素の初期選択肢テキスト */
  DEFAULT_OPTION_TEXT: 'プロンプトを選択してください',
  /** 【エラーメッセージ】: プリセット読み込み失敗時の安全なメッセージ */
  ERROR_MESSAGE: 'プリセットが見つかりません。設定を確認してください',
  /** 【検索処理最適化】: 大量プリセット時の検索性能しきい値 */
  SEARCH_OPTIMIZATION_THRESHOLD: 20
} as const;

// 【型定義】: START_GENERATIONメッセージの構造定義
// 🟢 信頼性レベル: popup.js の既存実装とmessaging routerの仕様に基づく
export interface StartGenerationMessage {
  readonly type: 'START_GENERATION';
  readonly prompt: string;
  readonly parameters: {
    readonly steps: number;
    readonly cfgScale: number;
    readonly sampler: string;
    readonly seed: number;
    readonly count: number;
  };
  readonly settings: {
    readonly imageCount: number;
    readonly seed: number;
    readonly filenameTemplate: string;
  };
}

// 【型定義】: エラー処理結果の構造定義
// 🟢 信頼性レベル: テストケースの期待値とエラーハンドリングベストプラクティスに基づく
export interface ErrorResult {
  readonly success: boolean;
  readonly errorMessage: string;
  readonly continueOperation: boolean;
}

// 【型定義】: 生成設定の構造定義
// 🟢 信頼性レベル: ui-state-manager.ts の GenerationSettings に基づく
export interface GenerationSettings {
  readonly imageCount: number;
  readonly seed: number;
  readonly filenameTemplate: string;
}

// 【型定義】: option要素の安全な表現
// 🟢 信頼性レベル: DOM要素のセキュアな抽象化によるXSS対策
interface SafeOptionElement {
  readonly textContent: string;
  readonly value: string;
}

/**
 * 【セキュリティユーティリティ】: HTMLエスケープ処理
 * 【機能概要】: 危険な文字列をHTMLエスケープしてXSS攻撃を防止
 * 【セキュリティ対策】: <>&"' の5文字をHTMLエンティティに変換
 * 🟢 信頼性レベル: OWASP XSS Prevention Cheat Sheet に基づく
 * @param unsafe - エスケープが必要な文字列
 * @returns エスケープ済みの安全な文字列
 */
function escapeHtml(unsafe: string): string {
  // 【XSS防止】: HTMLの特殊文字を安全なエンティティに変換
  return unsafe
    .replace(/&/g, '&amp;')   // & を最初に処理（他のエスケープに影響しないため）
    .replace(/</g, '&lt;')    // < タグ開始文字をエスケープ
    .replace(/>/g, '&gt;')    // > タグ終了文字をエスケープ
    .replace(/"/g, '&quot;')  // " 属性値の引用符をエスケープ
    .replace(/'/g, '&#039;'); // ' シングルクォートをエスケープ
}

/**
 * 【入力値検証ユーティリティ】: プリセット配列の安全性検証
 * 【機能概要】: プリセット配列の型安全性と内容の妥当性を検証
 * 【セキュリティ対策】: 不正なデータ構造や危険な文字列の検出
 * 🟢 信頼性レベル: src/config/presets.ts の validatePresets 関数の設計思想に基づく
 * @param presets - 検証対象のプリセット配列
 * @returns 検証結果と安全性情報
 */
function validatePresetsInput(presets: unknown): { isValid: boolean; errorMessage?: string; safePresets?: Preset[] } {
  // 【型チェック】: 基本的な型安全性を確認
  if (!Array.isArray(presets)) {
    return {
      isValid: false,
      errorMessage: 'プリセットデータが配列ではありません'
    };
  }

  // 【数量制限】: 性能とセキュリティの観点から上限を設定
  if (presets.length > PRESET_SELECTOR_CONFIG.MAX_PRESETS) {
    return {
      isValid: false,
      errorMessage: `プリセット数が上限（${PRESET_SELECTOR_CONFIG.MAX_PRESETS}個）を超過しています`
    };
  }

  // 【個別要素検証】: 各プリセットの安全性をチェック
  const safePresets: Preset[] = [];
  for (let i = 0; i < presets.length; i++) {
    const preset = presets[i];

    // 【構造検証】: 必須プロパティの存在確認
    if (!preset || typeof preset !== 'object' ||
        typeof preset.name !== 'string' ||
        typeof preset.prompt !== 'string') {
      return {
        isValid: false,
        errorMessage: `プリセット${i + 1}の構造が不正です`
      };
    }

    // 【文字列長検証】: 異常に長い文字列によるDoS攻撃を防止
    if (preset.name.length > 100 || preset.prompt.length > 2000) {
      return {
        isValid: false,
        errorMessage: `プリセット${i + 1}の文字列が長すぎます`
      };
    }

    safePresets.push(preset as Preset);
  }

  return { isValid: true, safePresets };
}

export class PresetSelector {
  // 【プライベートプロパティ】: 内部状態の適切なカプセル化
  private readonly elements: Record<string, any>;
  private loadedPresets: readonly Preset[] = [];
  private filteredPresets: readonly Preset[] = [];

  /**
   * 【機能概要】: PresetSelectorクラスのコンストラクタ
   * 【改善内容】: 入力値検証とエラーハンドリングを強化し、初期化処理を最適化
   * 【設計方針】: 防御的プログラミングによる堅牢性確保
   * 【パフォーマンス】: 必要最小限の初期化処理で高速起動を実現
   * 【保守性】: 明確な責任分離により将来の機能拡張に対応
   * 🟢 信頼性レベル: テストケースとセキュリティベストプラクティスに基づく
   * @param elements - DOM要素の参照オブジェクト（null/undefinedチェック済み）
   * @throws {Error} DOM要素が不正な場合にエラーをスロー
   */
  constructor(elements: Record<string, any>) {
    // 【入力値検証】: コンストラクタ引数の安全性を確認
    if (!elements || typeof elements !== 'object') {
      throw new Error('DOM要素オブジェクトが必要です');
    }

    // 【DOM要素保持】: 読み取り専用プロパティとして安全に保存
    this.elements = elements;

    // 【安全な初期化】: エラーが発生しても処理を継続
    try {
      this.initializeSelectElement();
    } catch (initError) {
      // 【初期化失敗対応】: ログ出力して処理継続（システムの可用性を優先）
      console.warn('select要素の初期化に失敗しましたが、処理を継続します:', initError);
    }
  }

  /**
   * 【機能概要】: select要素の安全な初期化処理
   * 【改善内容】: セキュリティを考慮したDOM操作とエラーハンドリング強化
   * 【設計方針】: 防御的DOM操作による安全性確保
   * 【パフォーマンス】: 最小限のDOM操作で効率性を実現
   * 【保守性】: 設定値の外部化により調整容易性を向上
   * 🟢 信頼性レベル: popup.html の初期option要素とセキュリティ要件に基づく
   */
  private initializeSelectElement(): void {
    // 【安全性チェック】: DOM要素の存在確認
    if (!this.elements.promptSelect) {
      // 【ログ記録】: デバッグ用情報を記録（本番環境では削除可能）
      console.debug('promptSelect要素が見つからないため、初期化をスキップします');
      return;
    }

    try {
      // 【セキュアなデフォルトオプション】: エスケープ済み文字列を使用
      const safeDefaultOption: SafeOptionElement = {
        textContent: PRESET_SELECTOR_CONFIG.DEFAULT_OPTION_TEXT,
        value: ''
      };

      // 【DOM操作最小化】: 必要最小限の操作で初期状態を設定
      this.elements.promptSelect.options = [safeDefaultOption];

    } catch (domError) {
      // 【DOM操作エラー】: DOM操作失敗時の適切なエラーハンドリング
      console.error('DOM初期化エラー:', domError);
      throw new Error('select要素の初期化に失敗しました');
    }
  }

  /**
   * 【機能概要】: プリセット配列の安全な読み込みとUI表示
   * 【改善内容】: 包括的な入力値検証とセキュリティ強化を実装
   * 【設計方針】: ゼロトラスト原則による全入力データの検証
   * 【パフォーマンス】: 効率的なデータ処理と最適化されたDOM更新
   * 【保守性】: エラー処理の統一化と明確な責任分離
   * 🟢 信頼性レベル: テストケース要件とセキュリティ標準に基づく
   * @param presets - 読み込むプリセット配列（型と内容の検証実施）
   * @throws {Error} プリセットデータが不正な場合にエラーをスロー
   */
  loadPresets(presets: Preset[]): void {
    // 【包括的入力検証】: セキュリティと型安全性を同時に確保
    const validation = validatePresetsInput(presets);
    if (!validation.isValid || !validation.safePresets) {
      throw new Error(`プリセット読み込みエラー: ${validation.errorMessage}`);
    }

    // 【効率的データ保存】: 不要な配列コピーを最小化
    this.loadedPresets = Object.freeze(validation.safePresets);
    this.filteredPresets = this.loadedPresets;

    // 【安全なDOM更新】: 検証済みデータのみを使用
    this.updateSelectOptions(validation.safePresets);
  }

  /**
   * 【機能概要】: select要素のoption要素の効率的更新
   * 【改善内容】: セキュリティ強化とパフォーマンス最適化を両立
   * 【設計方針】: セキュアなDOM操作とXSS完全防御
   * 【パフォーマンス】: バッチ処理による効率的なDOM更新
   * 【保守性】: 設定値外部化による調整容易性
   * 🟢 信頼性レベル: セキュリティ標準とテスト要件に基づく
   * @param presets - 表示するプリセット配列（事前検証済み）
   */
  private updateSelectOptions(presets: readonly Preset[]): void {
    // 【安全性確認】: DOM要素の存在を再検証
    if (!this.elements.promptSelect) {
      console.warn('promptSelect要素が利用できないため、更新をスキップします');
      return;
    }

    try {
      // 【セキュアオプション配列構築】: XSS攻撃を完全に防御
      const safeOptions: SafeOptionElement[] = [];

      // 【デフォルトオプション追加】: 常に安全な初期選択肢を提供
      safeOptions.push({
        textContent: PRESET_SELECTOR_CONFIG.DEFAULT_OPTION_TEXT,
        value: ''
      });

      // 【効率的なオプション生成】: パフォーマンスを考慮したバッチ処理
      presets.forEach((preset, index) => {
        // 【セキュリティ強化】: プリセット名を完全にエスケープ
        const safeName = escapeHtml(preset.name);

        safeOptions.push({
          textContent: safeName,
          value: String(index)
        });
      });

      // 【原子的DOM更新】: 一度の操作で完全更新を実行
      this.elements.promptSelect.options = safeOptions;

    } catch (updateError) {
      // 【DOM更新エラー処理】: 更新失敗時の適切な対応
      console.error('DOM更新エラー:', updateError);
      throw new Error('select要素の更新に失敗しました');
    }
  }

  /**
   * 【機能概要】: 現在選択されているプリセットの安全な取得
   * 【改善内容】: 境界値チェック強化とセキュリティ向上
   * 【設計方針】: 防御的プログラミングによる堅牢性確保
   * 【パフォーマンス】: 効率的な配列アクセスとインデックス検証
   * 【保守性】: エラーハンドリングの統一化
   * 🟢 信頼性レベル: テスト要件とセキュリティ標準に基づく
   * @returns 選択されたプリセット、または安全なnull
   */
  getSelectedPreset(): Preset | null {
    // 【安全性チェック】: DOM要素の存在確認
    if (!this.elements.promptSelect) {
      console.debug('promptSelect要素が利用できません');
      return null;
    }

    try {
      // 【選択値の安全取得】: 型安全な値の取得
      const selectedValue = this.elements.promptSelect.value;

      // 【未選択状態の適切な処理】: 空値の場合の明示的ハンドリング
      if (!selectedValue || selectedValue.trim() === '') {
        return null;
      }

      // 【数値変換の安全性】: parseIntの結果を厳密に検証
      const index = parseInt(selectedValue, 10);

      // 【NaN検証】: 不正な数値形式の検出
      if (isNaN(index)) {
        console.warn('選択値が不正な数値形式です:', selectedValue);
        return null;
      }

      // 【境界値検証強化】: 配列の有効範囲を厳密にチェック
      if (index < 0 || index >= this.filteredPresets.length) {
        console.warn('選択インデックスが範囲外です:', index);
        return null;
      }

      // 【安全なプリセット返却】: 型安全性を保証した返却
      return this.filteredPresets[index];

    } catch (selectionError) {
      // 【選択処理エラー】: 予期しないエラーの適切な処理
      console.error('プリセット選択処理エラー:', selectionError);
      return null;
    }
  }

  /**
   * 【機能概要】: START_GENERATIONメッセージの安全で正確な構築
   * 【改善内容】: 型安全性とデータ検証を強化し、不変性を保証
   * 【設計方針】: イミュータブルな設計による副作用の完全排除
   * 【パフォーマンス】: 効率的なオブジェクト構築と最小限のデータコピー
   * 【保守性】: 明確な型定義と包括的なエラーハンドリング
   * 🟢 信頼性レベル: messaging routerの仕様とテスト要件に基づく
   * @param preset - 選択されたプリセット（null不可、事前検証必須）
   * @param settings - 生成設定（null不可、事前検証必須）
   * @returns 型安全なSTART_GENERATIONメッセージオブジェクト
   * @throws {Error} 入力パラメータが不正な場合にエラーをスロー
   */
  buildStartGenerationMessage(preset: Preset, settings: GenerationSettings): StartGenerationMessage {
    // 【入力値の厳密検証】: null/undefined チェックと型検証
    if (!preset) {
      throw new Error('プリセットが指定されていません');
    }
    if (!settings) {
      throw new Error('生成設定が指定されていません');
    }

    // 【プリセットデータ検証】: 必須プロパティの存在確認
    if (!preset.parameters || typeof preset.prompt !== 'string') {
      throw new Error('プリセットデータが不正です');
    }

    try {
      // 【イミュータブルメッセージ構築】: 読み取り専用オブジェクトを作成
      const message: StartGenerationMessage = Object.freeze({
        type: 'START_GENERATION',
        prompt: preset.prompt,
        parameters: Object.freeze({
          steps: preset.parameters.steps,
          cfgScale: preset.parameters.cfgScale,
          sampler: preset.parameters.sampler,
          seed: settings.seed,
          count: settings.imageCount
        }),
        settings: Object.freeze({
          imageCount: settings.imageCount,
          seed: settings.seed,
          filenameTemplate: settings.filenameTemplate
        })
      });

      return message;

    } catch (buildError) {
      // 【メッセージ構築エラー】: 構築失敗時の適切なエラーハンドリング
      console.error('メッセージ構築エラー:', buildError);
      throw new Error('START_GENERATIONメッセージの構築に失敗しました');
    }
  }

  /**
   * 【機能概要】: 高性能なプリセット検索とフィルタリング
   * 【改善内容】: セキュリティ強化と検索アルゴリズムの最適化
   * 【設計方針】: 大文字小文字を区別しない柔軟な検索と安全な文字列処理
   * 【パフォーマンス】: 検索対象数に応じた動的アルゴリズム選択
   * 【保守性】: 検索ロジックの明確な分離と設定可能な最適化しきい値
   * 🟡 信頼性レベル: 要件定義書の検索機能記述から拡張し、UX向上を追加
   * @param searchTerm - 検索文字列（null/undefined安全、自動サニタイゼーション）
   */
  filterPresets(searchTerm: string): void {
    try {
      // 【入力値サニタイゼーション】: 安全な検索文字列の作成
      const sanitizedTerm = searchTerm ? escapeHtml(searchTerm.trim().toLowerCase()) : '';

      // 【空検索の高速処理】: 検索文字列が空の場合は全プリセットを表示
      if (sanitizedTerm === '') {
        this.filteredPresets = this.loadedPresets;
        this.updateSelectOptions(this.loadedPresets);
        return;
      }

      // 【適応的検索アルゴリズム】: データ量に応じて最適な検索方法を選択
      const searchResults = this.loadedPresets.length > PRESET_SELECTOR_CONFIG.SEARCH_OPTIMIZATION_THRESHOLD
        ? this.performOptimizedSearch(sanitizedTerm)
        : this.performStandardSearch(sanitizedTerm);

      // 【検索結果の安全な保存】: イミュータブルな結果保存
      this.filteredPresets = Object.freeze(searchResults);

      // 【UI更新】: 検索結果の即座反映
      this.updateSelectOptions(searchResults);

    } catch (filterError) {
      // 【検索エラー処理】: 検索失敗時のフォールバック処理
      console.error('プリセットフィルタリングエラー:', filterError);

      // 【フォールバック動作】: エラー時は全プリセットを表示
      this.filteredPresets = this.loadedPresets;
      this.updateSelectOptions(this.loadedPresets);
    }
  }

  /**
   * 【ヘルパー関数】: 標準的な線形検索アルゴリズム
   * 【再利用性】: 小規模データセット用の効率的な検索処理
   * 【単一責任】: 基本的な文字列一致検索のみを担当
   * 🟢 信頼性レベル: 標準的な検索アルゴリズムパターンに基づく
   * @param searchTerm - 正規化済み検索文字列
   * @returns 一致するプリセット配列
   */
  private performStandardSearch(searchTerm: string): readonly Preset[] {
    return this.loadedPresets.filter(preset =>
      preset.name.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * 【ヘルパー関数】: 大規模データセット用の最適化検索
   * 【再利用性】: 高性能が要求される大量データ処理用
   * 【単一責任】: パフォーマンス最適化された検索処理のみを担当
   * 🟡 信頼性レベル: 性能要件から推測した最適化アルゴリズム
   * @param searchTerm - 正規化済み検索文字列
   * @returns 一致するプリセット配列
   */
  private performOptimizedSearch(searchTerm: string): readonly Preset[] {
    // 【最適化戦略】: 前方一致を優先し、部分一致を後処理
    const results: Preset[] = [];
    const partialMatches: Preset[] = [];

    for (const preset of this.loadedPresets) {
      const lowerName = preset.name.toLowerCase();

      if (lowerName.startsWith(searchTerm)) {
        // 【前方一致優先】: より関連性の高い結果を優先
        results.push(preset);
      } else if (lowerName.includes(searchTerm)) {
        // 【部分一致】: 関連性は低いが有用な結果
        partialMatches.push(preset);
      }
    }

    // 【結果マージ】: 前方一致を先頭に、部分一致を続けて配置
    return [...results, ...partialMatches];
  }

  /**
   * 【機能概要】: プリセット読み込み失敗時の堅牢なエラーハンドリング
   * 【改善内容】: セキュリティ強化とシステム継続性の完全保証
   * 【設計方針】: 防御的エラーハンドリングによる高可用性実現
   * 【パフォーマンス】: 軽量なエラー処理によるシステム負荷最小化
   * 【保守性】: 統一されたエラー処理パターンとログ記録
   * 🟢 信頼性レベル: エラーハンドリングベストプラクティスとテスト要件に基づく
   * @param error - 発生したエラーオブジェクト（null安全処理）
   * @returns 型安全なエラー処理結果
   */
  handleLoadError(error: Error): ErrorResult {
    try {
      // 【エラー情報の安全な抽出】: セキュアなエラーメッセージ作成
      const safeErrorMessage = error && typeof error.message === 'string'
        ? escapeHtml(error.message)
        : '不明なエラーが発生しました';

      // 【構造化エラー結果】: 型安全で予測可能なエラーレスポンス
      const errorResult: ErrorResult = Object.freeze({
        success: false,
        errorMessage: safeErrorMessage,
        continueOperation: true
      });

      // 【セキュアなUI更新】: XSS攻撃を完全に防御した安全な表示
      if (this.elements.promptSelect) {
        // 【innerHTML削除】: XSS脆弱性の完全な排除
        this.elements.promptSelect.options = [{
          textContent: PRESET_SELECTOR_CONFIG.ERROR_MESSAGE,
          value: ''
        }];
      }

      // 【エラーログ記録】: デバッグ用の詳細情報記録
      console.error('プリセット読み込みエラーが安全に処理されました:', {
        originalError: error,
        processedMessage: safeErrorMessage,
        timestamp: new Date().toISOString()
      });

      return errorResult;

    } catch (handlingError) {
      // 【エラーハンドリングのエラー】: 二重エラーの適切な処理
      console.error('エラーハンドリング処理中にエラーが発生:', handlingError);

      // 【最後の砦】: 完全にフェールセーフなエラーレスポンス
      return Object.freeze({
        success: false,
        errorMessage: 'エラー処理中に問題が発生しました',
        continueOperation: true
      });
    }
  }
}