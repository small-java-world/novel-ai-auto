/**
 * TASK-101: プロンプト合成機能 実装（Refactorフェーズ完了）
 * 
 * 【機能概要】: 共通プロンプトとキャラクター固有プロンプトを自動合成する機能
 * 【改善内容】: TDD Refactorフェーズでコード品質向上とリファクタリングを完了
 * 【設計方針】: 単一責任原則と型安全性を重視し、パフォーマンス要件を満たす
 * 【パフォーマンス】: 合成処理100ms以内、プレビュー更新50ms以内を実現
 * 【保守性】: モジュール化された構造と包括的な日本語コメントで長期保守性を確保
 * 【リファクタリング】: 定数外部化、エラーハンドリング改善、パフォーマンス最適化、保守性向上
 * 🟢 信頼性レベル: TASK-101要件定義書とテストケース仕様に基づく
 * 
 * @version 1.0.0
 * @author NovelAI Auto Generator Team
 * @since 2025-09-20
 */

// 【型定義】: プロンプト合成機能で使用する型定義
// 🟢 信頼性レベル: TASK-101要件定義書の技術仕様に基づく

/**
 * 共通プロンプトの型定義
 * @interface CommonPrompts
 */
export interface CommonPrompts {
  /** 基本プロンプト（正方向） */
  base: string;
  /** ネガティブプロンプト（負方向） */
  negative: string;
}

/**
 * プリセットデータの型定義
 * @interface PresetData
 */
export interface PresetData {
  /** プリセット固有の正方向プロンプト */
  positive: string;
  /** プリセット固有の負方向プロンプト */
  negative: string;
  /** 生成パラメータ */
  parameters: {
    /** 生成ステップ数 */
    steps: number;
    /** CFGスケール */
    cfgScale: number;
    /** サンプラー名 */
    sampler: string;
    /** シード値 */
    seed: number;
    /** 生成枚数 */
    count: number;
  };
}

/**
 * 合成ルールの型定義
 * @interface SynthesisRule
 */
export interface SynthesisRule {
  /** ルールID */
  id: string;
  /** ルール名 */
  name: string;
  /** ルール説明 */
  description: string;
  /** テンプレート文字列 */
  template: string;
  /** ルールパラメータ */
  parameters: {
    /** 区切り文字 */
    separator: string;
    /** 合成順序 */
    order: 'common-first' | 'preset-first' | 'custom';
    /** カスタムテンプレート（オプション） */
    customTemplate?: string;
  };
}

/**
 * 合成結果の型定義
 * @interface SynthesisResult
 */
export interface SynthesisResult {
  /** 合成された正方向プロンプト */
  positive: string;
  /** 合成された負方向プロンプト */
  negative: string;
  /** 文字数情報 */
  characterCount: {
    /** 正方向プロンプトの文字数 */
    positive: number;
    /** 負方向プロンプトの文字数 */
    negative: number;
    /** 合計文字数 */
    total: number;
  };
  /** 警告メッセージの配列 */
  warnings: string[];
  /** 適用されたルール */
  appliedRule: SynthesisRule;
}

/**
 * バリデーション結果の型定義
 * @interface ValidationResult
 */
export interface ValidationResult {
  /** バリデーション成功フラグ */
  valid: boolean;
  /** バリデーション失敗理由（オプション） */
  reason?: string;
}

/**
 * 適用結果の型定義
 * @interface ApplicationResult
 */
export interface ApplicationResult {
  /** 適用成功フラグ */
  success: boolean;
  /** エラーメッセージ（オプション） */
  error?: string;
}

// 【設定定数】: プロンプト合成の動作制御パラメータ
// 🟢 信頼性レベル: TASK-101要件定義書の制約要件に基づく
const SYNTHESIS_CONFIG = {
  /** 【文字数制限】: NovelAIのプロンプト上限 */
  MAX_CHARACTERS: 2000,
  /** 【デフォルト区切り文字】: プロンプト間の区切り */
  DEFAULT_SEPARATOR: ', ',
  /** 【パフォーマンス制限】: 合成処理の最大実行時間（ms） */
  MAX_SYNTHESIS_TIME: 100,
  /** 【プレビュー制限】: プレビュー処理の最大実行時間（ms） */
  MAX_PREVIEW_TIME: 50,
  /** 【警告メッセージ】: ユーザー向けの警告メッセージ */
  WARNING_MESSAGES: {
    CHARACTER_LIMIT_EXCEEDED: (current: number, limit: number) => 
      `文字数が制限を超過しています: ${current}/${limit}`,
    COMMON_PROMPT_MISSING: '共通プロンプトが設定されていません',
    PRESET_PROMPT_MISSING: 'プリセットプロンプトが設定されていません',
    BOTH_PROMPTS_EMPTY: '共通プロンプトとプリセットプロンプトが両方とも空です',
    SPECIAL_CHARACTERS_DETECTED: '特殊文字が含まれています。適切にエスケープされていることを確認してください',
    SYNTHESIS_TIME_EXCEEDED: (time: number) => 
      `合成処理時間が制限を超過しました: ${time.toFixed(2)}ms`,
    PREVIEW_TIME_EXCEEDED: (time: number) => 
      `プレビュー処理時間が制限を超過しました: ${time.toFixed(2)}ms`
  },
  /** 【エラーメッセージ】: システムエラー用のメッセージ */
  ERROR_MESSAGES: {
    INVALID_RULE_ID: (ruleId: string) => `無効なルールID: ${ruleId}。デフォルトルールを使用します。`,
    SYNTHESIS_ERROR: 'プロンプト合成エラー:',
    VALIDATION_ERROR: 'バリデーションエラー:',
    TEMPLATE_ERROR: 'カスタムテンプレート適用エラー:',
    UNKNOWN_ERROR: '不明なエラー'
  }
} as const;

/**
 * 【プロンプト合成クラス】: 共通プロンプトとプリセット固有プロンプトの合成処理
 * 【機能概要】: 複数の合成ルールに対応し、文字数制限とパフォーマンス要件を満たす
 * 【設計方針】: 単一責任原則に基づく合成処理の専門クラス
 * 【パフォーマンス】: 100ms以内での合成処理と50ms以内でのプレビュー更新
 * 【保守性】: 設定可能な合成ルールと包括的なエラーハンドリング
 * 🟢 信頼性レベル: TASK-101要件定義書とテストケース仕様に基づく
 */
export class PromptSynthesizer {
  private rules: Map<string, SynthesisRule>;

  /**
   * 【コンストラクタ】: PromptSynthesizerクラスの初期化
   * 【機能概要】: デフォルト合成ルールの読み込みと初期設定
   * 【設計方針】: 初期化時の設定読み込みによる柔軟性確保
   * 【パフォーマンス】: 軽量な初期化処理で高速起動を実現
   * 【保守性】: 設定の外部化により将来の拡張に対応
   * 🟢 信頼性レベル: テストケースの初期化要件に基づく
   */
  constructor() {
    this.rules = new Map();
    this.loadDefaultRules();
  }

  /**
   * 【デフォルトルール読み込み】: 標準的な合成ルールの初期化
   * 【機能概要】: デフォルト、プリセット優先、カスタムの3つの基本ルールを設定
   * 【設計方針】: 設定の一元管理による保守性向上
   * 【パフォーマンス】: 軽量なルール設定で高速初期化
   * 【保守性】: ルール追加時の拡張性を考慮した設計
   * 🟢 信頼性レベル: テストケースの期待されるルール仕様に基づく
   */
  private loadDefaultRules(): void {
    // 【デフォルトルール】: 共通→プリセットの順序で合成
    this.rules.set('default', {
      id: 'default',
      name: 'Default Rule',
      description: 'Default synthesis rule: common first, then preset',
      template: '{common}, {preset}',
      parameters: {
        separator: SYNTHESIS_CONFIG.DEFAULT_SEPARATOR,
        order: 'common-first'
      }
    });

    // 【プリセット優先ルール】: プリセット→共通の順序で合成
    this.rules.set('preset-first', {
      id: 'preset-first',
      name: 'Preset First Rule',
      description: 'Preset first synthesis rule: preset first, then common',
      template: '{preset}, {common}',
      parameters: {
        separator: SYNTHESIS_CONFIG.DEFAULT_SEPARATOR,
        order: 'preset-first'
      }
    });

    // 【カスタムルール】: カスタムテンプレートでの合成
    this.rules.set('custom', {
      id: 'custom',
      name: 'Custom Rule',
      description: 'Custom template synthesis rule',
      template: '{preset} :: {common}',
      parameters: {
        separator: ' | ',
        order: 'custom',
        customTemplate: '{preset} :: {common}'
      }
    });
  }

  /**
   * 【プロンプト合成処理】: 共通プロンプトとプリセット固有プロンプトの合成
   * 【機能概要】: 指定されたルールに従ってプロンプトを合成し、文字数制限をチェック
   * 【設計方針】: ルールベースの合成処理による柔軟性と一貫性の確保
   * 【パフォーマンス】: 100ms以内での合成処理を保証
   * 【保守性】: 明確な責任分離と包括的なエラーハンドリング
   * 🟢 信頼性レベル: TC-101-001〜015のテストケース要件に基づく
   * @param common - 共通プロンプト（base, negative）
   * @param preset - プリセット固有プロンプト（positive, negative, parameters）
   * @param ruleId - 使用する合成ルールのID（デフォルト: 'default'）
   * @returns 合成結果（positive, negative, 文字数, 警告, 適用ルール）
   */
  synthesize(
    common: CommonPrompts,
    preset: PresetData,
    ruleId: string = 'default'
  ): SynthesisResult {
    // 【パフォーマンス測定開始】: 合成処理時間の監視
    const startTime = performance.now();

    try {
      // 【ルール取得】: 指定されたルールIDから合成ルールを取得
      const rule = this.getRule(ruleId);
      
      // 【プロンプト合成】: 正方向と負方向のプロンプトを合成
      const positive = this.synthesizePrompt(common.base, preset.positive, rule);
      const negative = this.synthesizePrompt(common.negative, preset.negative, rule);
      
      // 【文字数計算】: 合成結果の文字数を効率的に計算
      const positiveLength = positive.length;
      const negativeLength = negative.length;
      const characterCount = {
        positive: positiveLength,
        negative: negativeLength,
        total: positiveLength + negativeLength
      };
      
      // 【警告生成】: 文字数制限やその他の問題をチェック
      const warnings = this.generateWarnings(characterCount, common, preset);
      
      // 【パフォーマンス確認】: 処理時間が制限内であることを確認
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
    if (processingTime > SYNTHESIS_CONFIG.MAX_SYNTHESIS_TIME) {
      warnings.push(SYNTHESIS_CONFIG.WARNING_MESSAGES.SYNTHESIS_TIME_EXCEEDED(processingTime));
    }
      
      // 【合成結果返却】: 型安全な合成結果オブジェクトを返却
      return {
        positive,
        negative,
        characterCount,
        warnings,
        appliedRule: rule
      };

    } catch (error) {
      // 【エラーハンドリング】: 合成処理中のエラーを適切に処理
      const errorMessage = error instanceof Error ? error.message : SYNTHESIS_CONFIG.ERROR_MESSAGES.UNKNOWN_ERROR;
      console.error(SYNTHESIS_CONFIG.ERROR_MESSAGES.SYNTHESIS_ERROR, error);
      
      // 【フォールバック結果】: エラー時でも安全な結果を返却
      return this.createFallbackResult(common, preset, errorMessage);
    }
  }

  /**
   * 【プレビュー機能】: 合成結果のリアルタイムプレビュー
   * 【機能概要】: 実際の合成処理を行わずに結果をプレビュー表示
   * 【設計方針】: synthesizeメソッドと同じロジックを使用して一貫性を確保
   * 【パフォーマンス】: 50ms以内でのプレビュー更新を保証
   * 【保守性】: 合成ロジックの再利用による保守性向上
   * 🟢 信頼性レベル: TC-101-004のテストケース要件に基づく
   * @param common - 共通プロンプト
   * @param preset - プリセット固有プロンプト
   * @param ruleId - 使用する合成ルールのID
   * @returns プレビュー用の合成結果
   */
  preview(
    common: CommonPrompts,
    preset: PresetData,
    ruleId: string = 'default'
  ): SynthesisResult {
    // 【パフォーマンス測定開始】: プレビュー処理時間の監視
    const startTime = performance.now();

    // 【プレビュー処理】: synthesizeメソッドと同じロジックを使用
    const result = this.synthesize(common, preset, ruleId);
    
    // 【パフォーマンス確認】: プレビュー処理時間が制限内であることを確認
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    if (processingTime > SYNTHESIS_CONFIG.MAX_PREVIEW_TIME) {
      result.warnings.push(SYNTHESIS_CONFIG.WARNING_MESSAGES.PREVIEW_TIME_EXCEEDED(processingTime));
    }
    
    return result;
  }

  /**
   * 【合成結果バリデーション】: 合成結果の妥当性検証
   * 【機能概要】: 文字数制限やその他の制約をチェックして妥当性を判定
   * 【設計方針】: 明確なバリデーションルールによる一貫した検証
   * 【パフォーマンス】: 軽量なバリデーション処理で高速検証
   * 【保守性】: バリデーションルールの外部化による調整容易性
   * 🟢 信頼性レベル: TC-101-013のテストケース要件に基づく
   * @param result - 検証対象の合成結果
   * @returns バリデーション結果（valid, reason）
   */
  validateResult(result: SynthesisResult): ValidationResult {
    try {
      // 【文字数制限チェック】: NovelAIの文字数制限を確認
      if (result.characterCount.total > SYNTHESIS_CONFIG.MAX_CHARACTERS) {
        return {
          valid: false,
          reason: 'CHAR_LIMIT_EXCEEDED'
        };
      }
      
      // 【警告チェック】: 重大な警告がないことを確認
      const criticalWarnings = result.warnings.filter(warning => 
        warning.includes('制限を超過') || warning.includes('エラー')
      );
      
      if (criticalWarnings.length > 0) {
        return {
          valid: false,
          reason: 'CRITICAL_WARNINGS'
        };
      }
      
      // 【バリデーション成功】: すべてのチェックを通過
      return {
        valid: true
      };

    } catch (error) {
      // 【バリデーションエラー】: バリデーション処理中のエラー
      console.error(SYNTHESIS_CONFIG.ERROR_MESSAGES.VALIDATION_ERROR, error);
      return {
        valid: false,
        reason: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * 【NovelAI UI適用】: 合成結果をNovelAI UIに適用
   * 【機能概要】: 合成されたプロンプトをNovelAIのWeb UIに送信
   * 【設計方針】: メッセージングAPIを使用した安全なUI操作
   * 【パフォーマンス】: 非同期処理による応答性の確保
   * 【保守性】: エラーハンドリングとログ記録による問題追跡
   * 🟢 信頼性レベル: TC-101-005のテストケース要件に基づく
   * @param result - 適用する合成結果
   * @returns 適用結果（success, error）
   */
  async applyToNovelAI(result: SynthesisResult): Promise<ApplicationResult> {
    try {
      // 【メッセージ送信】: Content Scriptにプロンプト適用を依頼
      const response = await chrome.runtime.sendMessage({
        type: 'APPLY_PROMPT',
        prompt: result.positive,
        parameters: {
          steps: 28,
          cfgScale: 7,
          sampler: 'k_euler',
          seed: Date.now(),
          count: 1
        }
      });

      // 【レスポンス確認】: 適用結果を確認
      if (response && response.success) {
        return {
          success: true
        };
      } else {
        return {
          success: false,
          error: response?.error || 'Unknown error occurred'
        };
      }

    } catch (error) {
      // 【エラーハンドリング】: 適用処理中のエラーを適切に処理
      console.error('NovelAI UI適用エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : SYNTHESIS_CONFIG.ERROR_MESSAGES.UNKNOWN_ERROR
      };
    }
  }

  /**
   * 【ルール取得】: 指定されたIDの合成ルールを取得
   * 【機能概要】: ルールIDから対応する合成ルールを安全に取得
   * 【設計方針】: フォールバック機能による堅牢性確保
   * 【パフォーマンス】: 効率的なMap検索による高速取得
   * 【保守性】: 明確なエラーハンドリングとログ記録
   * 🟢 信頼性レベル: TC-101-008のテストケース要件に基づく
   * @param ruleId - 取得するルールのID
   * @returns 合成ルール（存在しない場合はデフォルトルール）
   */
  private getRule(ruleId: string): SynthesisRule {
    const rule = this.rules.get(ruleId);
    
    if (!rule) {
      // 【フォールバック処理】: 無効なルールIDの場合はデフォルトルールを使用
      console.warn(SYNTHESIS_CONFIG.ERROR_MESSAGES.INVALID_RULE_ID(ruleId));
      return this.rules.get('default')!;
    }
    
    return rule;
  }

  /**
   * 【プロンプト合成】: 個別のプロンプト文字列を合成
   * 【機能概要】: 共通プロンプトとプリセットプロンプトを指定されたルールで合成
   * 【設計方針】: ルールベースの合成処理による柔軟性確保
   * 【パフォーマンス】: 効率的な文字列操作による高速合成
   * 【保守性】: 明確な合成ロジックとエラーハンドリング
   * 🟢 信頼性レベル: TC-101-001〜003のテストケース要件に基づく
   * @param common - 共通プロンプト文字列
   * @param preset - プリセットプロンプト文字列
   * @param rule - 使用する合成ルール
   * @returns 合成されたプロンプト文字列
   */
  private synthesizePrompt(common: string, preset: string, rule: SynthesisRule): string {
    // 【入力値正規化】: 空文字列やnull/undefinedを安全に処理（パフォーマンス最適化）
    const normalizedCommon = common ?? '';
    const normalizedPreset = preset ?? '';
    
    // 【ルール別合成処理】: ルールの種類に応じて合成方法を選択
    switch (rule.parameters.order) {
      case 'common-first':
        return this.combinePrompts(normalizedCommon, normalizedPreset, rule.parameters.separator);
      
      case 'preset-first':
        return this.combinePrompts(normalizedPreset, normalizedCommon, rule.parameters.separator);
      
      case 'custom':
        return this.applyCustomTemplate(normalizedCommon, normalizedPreset, rule.parameters.customTemplate || rule.template);
      
      default:
        // 【デフォルト処理】: 不明なルールの場合はcommon-firstで処理
        return this.combinePrompts(normalizedCommon, normalizedPreset, rule.parameters.separator);
    }
  }

  /**
   * 【プロンプト結合】: 2つのプロンプト文字列を結合
   * 【機能概要】: 区切り文字を使用してプロンプトを安全に結合
   * 【設計方針】: 空文字列の適切な処理による一貫した結果
   * 【パフォーマンス】: 効率的な文字列操作による高速結合
   * 【保守性】: 明確な結合ロジックとエラーハンドリング
   * 🟢 信頼性レベル: TC-101-001, 002のテストケース要件に基づく
   * @param first - 最初のプロンプト文字列
   * @param second - 2番目のプロンプト文字列
   * @param separator - 区切り文字
   * @returns 結合されたプロンプト文字列
   */
  private combinePrompts(first: string, second: string, separator: string): string {
    // 【空文字列処理】: 空のプロンプトを適切に処理（パフォーマンス最適化）
    if (!first) return second;
    if (!second) return first;
    
    // 【結合処理】: 区切り文字を使用して結合
    return `${first}${separator}${second}`;
  }

  /**
   * 【カスタムテンプレート適用】: カスタムテンプレートを使用したプロンプト合成
   * 【機能概要】: プレースホルダーを含むテンプレートでプロンプトを合成
   * 【設計方針】: テンプレートエンジンの簡易実装による柔軟性確保
   * 【パフォーマンス】: 効率的な文字列置換による高速処理
   * 【保守性】: 明確なテンプレート処理ロジック
   * 🟢 信頼性レベル: TC-101-003のテストケース要件に基づく
   * @param common - 共通プロンプト文字列
   * @param preset - プリセットプロンプト文字列
   * @param template - カスタムテンプレート
   * @returns テンプレート適用後のプロンプト文字列
   */
  private applyCustomTemplate(common: string, preset: string, template: string): string {
    try {
      // 【テンプレート置換】: プレースホルダーを実際の値に置換（パフォーマンス最適化）
      return template
        .replace(/{common}/g, common ?? '')
        .replace(/{preset}/g, preset ?? '');
    } catch (error) {
      // 【エラーハンドリング】: テンプレート処理エラーの場合
      console.error(SYNTHESIS_CONFIG.ERROR_MESSAGES.TEMPLATE_ERROR, error);
      return this.combinePrompts(common, preset, SYNTHESIS_CONFIG.DEFAULT_SEPARATOR);
    }
  }

  /**
   * 【警告生成】: 合成結果に関する警告を生成
   * 【機能概要】: 文字数制限やその他の問題をチェックして警告を生成
   * 【設計方針】: 包括的なチェックによる問題の早期発見
   * 【パフォーマンス】: 軽量なチェック処理による高速警告生成
   * 【保守性】: 警告ルールの外部化による調整容易性
   * 🟢 信頼性レベル: TC-101-006, 009のテストケース要件に基づく
   * @param characterCount - 文字数情報
   * @param common - 共通プロンプト
   * @param preset - プリセット固有プロンプト
   * @returns 警告メッセージの配列
   */
  private generateWarnings(
    characterCount: { positive: number; negative: number; total: number },
    common: CommonPrompts,
    preset: PresetData
  ): string[] {
    const warnings: string[] = [];

    // 【文字数制限チェック】: NovelAIの文字数制限を確認
    if (characterCount.total > SYNTHESIS_CONFIG.MAX_CHARACTERS) {
      warnings.push(SYNTHESIS_CONFIG.WARNING_MESSAGES.CHARACTER_LIMIT_EXCEEDED(
        characterCount.total, 
        SYNTHESIS_CONFIG.MAX_CHARACTERS
      ));
    }

    // 【空プロンプトチェック】: 空のプロンプトに関する警告
    if (!common.base && !preset.positive) {
      warnings.push(SYNTHESIS_CONFIG.WARNING_MESSAGES.BOTH_PROMPTS_EMPTY);
    } else if (!common.base) {
      warnings.push(SYNTHESIS_CONFIG.WARNING_MESSAGES.COMMON_PROMPT_MISSING);
    } else if (!preset.positive) {
      warnings.push(SYNTHESIS_CONFIG.WARNING_MESSAGES.PRESET_PROMPT_MISSING);
    }

    // 【特殊文字チェック】: 特殊文字の使用に関する警告
    const specialChars = /[<>&"']/;
    if (specialChars.test(common.base) || specialChars.test(preset.positive)) {
      warnings.push(SYNTHESIS_CONFIG.WARNING_MESSAGES.SPECIAL_CHARACTERS_DETECTED);
    }

    return warnings;
  }

  /**
   * 【フォールバック結果作成】: エラー時の安全な結果を生成
   * 【機能概要】: エラー発生時に安全なデフォルト結果を返却
   * 【設計方針】: エラー時でもシステムが継続動作できるよう保証
   * 【パフォーマンス】: 軽量なフォールバック処理
   * 【保守性】: エラーハンドリングの統一化
   * 🟢 信頼性レベル: エラーハンドリングベストプラクティスに基づく
   * @param common - 共通プロンプト
   * @param preset - プリセット固有プロンプト
   * @param errorMessage - エラーメッセージ
   * @returns 安全なフォールバック結果
   */
  private createFallbackResult(
    common: CommonPrompts, 
    preset: PresetData, 
    errorMessage: string
  ): SynthesisResult {
    const positive = preset.positive || '';
    const negative = preset.negative || '';
    
    return {
      positive,
      negative,
      characterCount: {
        positive: positive.length,
        negative: negative.length,
        total: positive.length + negative.length
      },
      warnings: [`合成処理エラー: ${errorMessage}`],
      appliedRule: this.rules.get('default')!
    };
  }
}
