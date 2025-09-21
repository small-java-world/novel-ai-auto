export interface CommonPrompts {
  base: string;
  negative: string;
}

export interface PresetData {
  positive: string;
  negative?: string;
  parameters?: Record<string, unknown>;
}

export interface SynthesisResult {
  positive: string;
  negative: string;
  characterCount: {
    positive: number;
    negative: number;
    total: number;
  };
  warnings: string[];
  appliedRule: {
    id: string;
    parameters?: Record<string, unknown>;
  };
}

// 【設定定数】: 既定ルールで使用するプロンプト連結時の区切り文字を定義 🟢
// 【調整可能性】: セパレータ仕様が変わった際はこの値を更新するだけで全メソッドへ反映 🟢
const PROMPT_SEPARATOR = ', ';

type RuleOrder = 'common-first' | 'preset-first' | 'custom';

interface AppliedRuleMetadata {
  order: RuleOrder;
  customTemplate?: string;
  [key: string]: unknown;
}

export class PromptSynthesizer {
  /**
   * 【機能概要】: 共通プロンプトとプリセット固有プロンプトを合成し、SynthesisResult として返す
   * 【改善内容】: 連結順序・文字数計算・ルール情報設定をヘルパーで共通化し、将来的なルール拡張にも対応しやすい構造へ整理
   * 【設計方針】: 単一責任を保つため、入力整形・合成・カウント・ルール解決をそれぞれ専用メソッドに分離
   * 【パフォーマンス】: 文字列結合と length 計算のみの O(n) 処理に抑え、余計な中間オブジェクト生成を最小化
   * 【保守性】: ルール別処理の追加や警告生成の拡張が private ヘルパーの追加で完結するように設計
   * 🟢 信頼性レベル: REQ-101-001/002/005 で定義された合成仕様および TASK-101 要件定義のルール構造に基づく
   * @param {CommonPrompts} common - 共通プロンプト（base/negative）; 空文字は自動的に除外
   * @param {PresetData} preset - プリセット固有プロンプトと任意の生成パラメータ
   * @param {string} ruleId - 適用する合成ルールID（未指定時は `default` として処理）
   * @returns {SynthesisResult} - 合成済みプロンプト、文字数、警告、ルール情報を含む結果
   */
  synthesize(
    common: CommonPrompts,
    preset: PresetData,
    ruleId: string = 'default'
  ): SynthesisResult {
    // 【ルール解決】: ルールIDに応じた順序・テンプレート情報を取得し、合成処理へ引き渡す 🟢
    const metadata = this.resolveRuleMetadata(ruleId);

    // 【合成処理】: 正方向・負方向の両方で共通→プリセット順の連結をヘルパーで統一的に実行 🟢
    const positive = this.joinPromptParts(common.base, preset.positive, metadata);
    const negative = this.joinPromptParts(common.negative, preset.negative, metadata);

    // 【文字数算出】: 合成済み文字列から仕様で求められる3種類の文字数を生成 🟢
    const characterCount = this.buildCharacterCount(positive, negative);

    // 【結果構築】: テスト要件で必要な警告配列（現状は空）とルール情報を付与して返却 🟢
    return {
      positive,
      negative,
      characterCount,
      warnings: this.buildWarnings(),
      appliedRule: {
        id: ruleId,
        parameters: metadata,
      },
    };
  }

  /**
   * 【ヘルパー関数】: ルールIDから適用順序などのメタ情報を生成 🟢
   * 【再利用性】: 将来的に複数ルールを追加する際のエントリーポイントとして拡張可能 🟢
   * 【単一責任】: ルール判定ロジックを synthesize から切り離し、保守性を高める 🟢
   */
  private resolveRuleMetadata(ruleId: string): AppliedRuleMetadata {
    // 【処理効率化】: 既定ルールでは追加演算を避け、即座に共通順序を返却 🟢
    if (ruleId === 'preset-first') {
      return { order: 'preset-first' };
    }

    if (ruleId === 'custom') {
      return { order: 'custom', customTemplate: '{common}, {preset}' };
    }

    return { order: 'common-first' };
  }

  /**
   * 【ヘルパー関数】: 共通・プリセットの文字列をルール順序に従って連結 🟢
   * 【再利用性】: 正方向・負方向双方で同一ロジックを利用し、DRY を実現 🟢
   * 【単一責任】: 順序決定とテンプレート適用に関する処理のみを担当 🟢
   */
  private joinPromptParts(
    commonPart: string,
    presetPart: string | undefined,
    metadata: AppliedRuleMetadata
  ): string {
    switch (metadata.order) {
      case 'preset-first':
        return this.applyTemplate([presetPart, commonPart]);
      case 'custom':
        return this.applyCustomTemplate(commonPart, presetPart, metadata);
      case 'common-first':
      default:
        return this.applyTemplate([commonPart, presetPart]);
    }
  }

  /**
   * 【ヘルパー関数】: テンプレート指定が無い場合の基礎的な連結処理を提供 🟢
   * 【再利用性】: 正方向・負方向どちらも同じフィルタと結合処理を利用 🟢
   * 【単一責任】: パーツの正規化と結合のみを行い、テンプレートロジックと切り離す 🟢
   */
  private applyTemplate(parts: Array<string | undefined>): string {
    const sanitizedParts = this.normalizePromptParts(parts);
    return sanitizedParts.join(PROMPT_SEPARATOR);
  }

  /**
   * 【ヘルパー関数】: カスタムテンプレートを適用した文字列を生成 🟡
   * 【再利用性】: 将来的に UI で入力されたテンプレートをここで処理できる 🟡
   * 【単一責任】: カスタムテンプレートのプレースホルダ展開のみを担当 🟡
   */
  private applyCustomTemplate(
    commonPart: string,
    presetPart: string | undefined,
    metadata: AppliedRuleMetadata
  ): string {
    const normalizedCommon = this.normalizePromptParts([commonPart]).join(PROMPT_SEPARATOR);
    const normalizedPreset = this.normalizePromptParts([presetPart]).join(PROMPT_SEPARATOR);
    const template = metadata.customTemplate ?? '{common}, {preset}';

    // 【実装詳細】: `{common}` と `{preset}` の最低限の置換のみを行い、未指定部分は空文字へフォールバック 🟡
    return template
      .replace('{common}', normalizedCommon)
      .replace('{preset}', normalizedPreset)
      .trim();
  }

  /**
   * 【ヘルパー関数】: 空文字・undefined を除外しつつトリム済みの配列を返す 🟢
   * 【再利用性】: 正方向・負方向どちらのパーツ処理にも利用 🟢
   * 【単一責任】: パーツの前処理のみを行い、結合やテンプレート適用から独立 🟢
   */
  private normalizePromptParts(parts: Array<string | undefined>): string[] {
    // 【処理効率化】: reduce でフィルタと追加を一度に行い、中間配列の生成を抑制 🟢
    return parts.reduce<string[]>((acc, part) => {
      const normalized = part?.trim();
      if (normalized) {
        acc.push(normalized);
      }
      return acc;
    }, []);
  }

  /**
   * 【ヘルパー関数】: positive / negative / total の文字数をまとめて生成 🟢
   * 【再利用性】: 文字数仕様が変わった場合でも本メソッドを修正するだけで全体に反映 🟢
   * 【単一責任】: 文字数計算ロジックを synthesize から分離し、見通しを改善 🟢
   */
  private buildCharacterCount(
    positive: string,
    negative: string
  ): SynthesisResult['characterCount'] {
    return {
      positive: positive.length,
      negative: negative.length,
      total: positive.length + negative.length,
    };
  }

  /**
   * 【ヘルパー関数】: 既定ルールでの警告メッセージ配列を生成 🟢
   * 【再利用性】: 文字数超過や欠落データの検知ロジックを追加する拡張ポイント 🟡
   * 【単一責任】: 警告構築の判断を synthesize 本体から切り離す 🟢
   */
  private buildWarnings(): string[] {
    return [];
  }
}
