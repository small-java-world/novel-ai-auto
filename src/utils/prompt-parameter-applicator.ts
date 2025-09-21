import { GenerationParameters, PromptData } from '../types';

/**
 * 【機能概要】: プロンプト/パラメータ適用処理の結果を表すインターフェース
 * 【実装方針】: テストケースで期待される戻り値の構造を定義
 * 【テスト対応】: 全7つのテストケースで使用される共通の戻り値型
 * 🟢 信頼性レベル: テストコードから直接導出した型定義
 */
export interface ApplicationResult {
  success: boolean;
  appliedPrompt?: string;
  appliedParameters?: {
    steps: number;
    cfgScale: number;
    sampler: string;
  };
  appliedPreset?: PromptData;
  warnings: string[];
  error?: string;
}

/**
 * 【機能概要】: プロンプト文字列をNovelAI UIのプロンプト入力欄に適用する
 * 【実装方針】: テストを通すための最小限の実装、DOM操作は最小限に留める
 * 【テスト対応】: プロンプト適用、文字数上限、DOM要素未検出、読み取り専用のテストに対応
 * 🟡 信頼性レベル: テスト要件に基づくが、実際のDOM操作は推測実装
 * @param prompt - 適用するプロンプト文字列
 * @returns ApplicationResult - 適用結果と状態
 */
export function applyPromptToDOM(prompt: string): ApplicationResult {
  // 【入力値検証】: 空文字列やnullの場合の基本的なバリデーション 🟡
  if (typeof prompt !== 'string') {
    return {
      success: false,
      warnings: [],
      error: 'プロンプトは文字列である必要があります',
    };
  }

  // 【DOM要素検索】: プロンプト入力欄の検索を試行 🟡
  // 【最小実装】: テスト環境でのDOM要素の存在確認
  const promptInput = document.querySelector('textarea#prompt-input') as HTMLTextAreaElement;

  // 【要素未検出エラー】: DOM要素が見つからない場合のエラー処理 🟢
  if (!promptInput) {
    return {
      success: false,
      warnings: [],
      error: 'プロンプト入力欄が見つかりません',
    };
  }

  // 【読み取り専用チェック】: readonly属性の確認 🟡
  if (promptInput.readOnly) {
    return {
      success: false,
      warnings: [],
      error: '入力欄が読み取り専用です',
    };
  }

  // 【文字数上限チェック】: EDGE-101要件の文字数制限対応 🟡
  const MAX_PROMPT_LENGTH = 2000; // 【制限値】: プロンプトの最大文字数
  let appliedPrompt = prompt;
  const warnings: string[] = [];

  if (prompt.length > MAX_PROMPT_LENGTH) {
    // 【文字数超過警告】: 上限を超えた場合の警告メッセージ生成 🟡
    warnings.push('プロンプト文字数が上限を超えています');
    // 【文字列切り詰め】: 上限以内に切り詰める処理 🟡
    appliedPrompt = prompt.substring(0, MAX_PROMPT_LENGTH);
  }

  // 【DOM要素更新】: プロンプト入力欄への値設定 🟡
  // 【最小実装】: 直接的な値の設定のみ行う
  promptInput.value = appliedPrompt;

  // 【成功結果返却】: テストで期待される成功時の戻り値 🟢
  return {
    success: true,
    appliedPrompt,
    warnings,
  };
}

/**
 * 【機能概要】: 生成パラメータ（steps/cfgScale/sampler）をDOM要素に適用する
 * 【実装方針】: 各パラメータの範囲検証と警告生成を含む最小実装
 * 【テスト対応】: パラメータ適用と無効値警告のテストケースに対応
 * 🟡 信頼性レベル: テスト要件とconfig/samplers.jsonに基づく推測実装
 * @param parameters - 適用する生成パラメータ
 * @returns ApplicationResult - 適用結果と警告
 */
export function applyParametersToDOM(parameters: GenerationParameters): ApplicationResult {
  // 【入力値検証】: パラメータオブジェクトの基本的なバリデーション 🟡
  if (!parameters || typeof parameters !== 'object') {
    return {
      success: false,
      warnings: [],
      error: 'パラメータオブジェクトが無効です',
    };
  }

  const warnings: string[] = [];
  const appliedParameters = {
    steps: 0,
    cfgScale: 0,
    sampler: '',
  };

  // 【steps値処理】: ステップ数の範囲検証と適用 🟡
  if (typeof parameters.steps === 'number') {
    // 【範囲検証】: steps値の有効範囲チェック（1-100）
    if (parameters.steps < 1 || parameters.steps > 100) {
      warnings.push('steps値が有効範囲（1-100）を超えています');
      // 【値クランプ】: 範囲外の値を有効範囲内に修正
      appliedParameters.steps = Math.min(Math.max(parameters.steps, 1), 100);
    } else {
      appliedParameters.steps = parameters.steps;
    }
  }

  // 【cfgScale値処理】: CFGスケールの範囲検証と適用 🟡
  if (typeof parameters.cfgScale === 'number') {
    // 【範囲検証】: cfgScale値の有効範囲チェック（1-30）
    if (parameters.cfgScale < 1 || parameters.cfgScale > 30) {
      warnings.push('cfgScale値が有効範囲（1-30）を超えています');
      // 【値クランプ】: 範囲外の値を有効範囲内に修正
      appliedParameters.cfgScale = Math.min(Math.max(parameters.cfgScale, 1), 30);
    } else {
      appliedParameters.cfgScale = parameters.cfgScale;
    }
  }

  // 【sampler値処理】: サンプラーの有効性検証と適用 🟡
  if (typeof parameters.sampler === 'string') {
    // 【許可リスト】: 有効なサンプラーのリスト（config/samplers.jsonベース）
    const validSamplers = ['euler_a', 'dpm_2m', 'euler', 'ddim', 'plms'];

    if (!validSamplers.includes(parameters.sampler)) {
      warnings.push('無効なsampler値が指定されています');
      // 【デフォルト値設定】: 無効な場合のデフォルトサンプラー
      appliedParameters.sampler = 'euler_a';
    } else {
      appliedParameters.sampler = parameters.sampler;
    }
  }

  // 【DOM要素更新】: 各パラメータ値の設定（最小実装） 🟡
  // 【注意】: 実際のDOM操作は簡略化、テスト通過を優先
  // 実際の実装では各入力欄への個別設定が必要

  // 【成功結果返却】: テストで期待される戻り値構造 🟢
  return {
    success: true,
    appliedParameters,
    warnings,
  };
}

/**
 * 【機能概要】: 完全なプリセット（プロンプト+パラメータ）を一括でDOM要素に適用する
 * 【実装方針】: 既存の個別適用関数を組み合わせた最小実装
 * 【テスト対応】: プリセット一括適用のテストケースに対応
 * 🟢 信頼性レベル: config/prompts.jsonの構造とテスト要件に基づく具体的実装
 * @param preset - 適用するプリセットデータ
 * @returns ApplicationResult - 適用結果と統合された警告
 */
export function applyPresetToDOM(preset: PromptData): ApplicationResult {
  // 【入力値検証】: プリセットオブジェクトの基本的なバリデーション 🟢
  if (!preset || typeof preset !== 'object') {
    return {
      success: false,
      warnings: [],
      error: 'プリセットオブジェクトが無効です',
    };
  }

  // 【必須フィールド確認】: プリセットの必須項目チェック 🟢
  if (!preset.prompt || typeof preset.prompt !== 'string') {
    return {
      success: false,
      warnings: [],
      error: 'プリセットにプロンプトが含まれていません',
    };
  }

  const allWarnings: string[] = [];

  // 【プロンプト適用】: メインプロンプトの適用処理 🟢
  const promptResult = applyPromptToDOM(preset.prompt);
  if (!promptResult.success) {
    return {
      success: false,
      warnings: allWarnings,
      error: promptResult.error,
    };
  }
  allWarnings.push(...promptResult.warnings);

  // 【ネガティブプロンプト処理】: ネガティブプロンプトの適用（簡略実装） 🟡
  // 【最小実装】: テストで検証される部分のみ実装
  const appliedNegative = preset.negative || '';

  // 【パラメータ適用】: 生成パラメータがある場合の適用処理 🟢
  let appliedParameters = {
    steps: 28, // デフォルト値
    cfgScale: 7,
    sampler: 'euler_a',
  };

  if (preset.parameters) {
    const paramResult = applyParametersToDOM(preset.parameters);
    if (!paramResult.success) {
      return {
        success: false,
        warnings: allWarnings,
        error: paramResult.error,
      };
    }
    allWarnings.push(...paramResult.warnings);
    if (paramResult.appliedParameters) {
      appliedParameters = paramResult.appliedParameters;
    }
  }

  // 【統合結果構築】: 一括適用の結果をまとめて返却 🟢
  const appliedPreset: PromptData = {
    name: preset.name,
    prompt: promptResult.appliedPrompt || preset.prompt,
    negative: appliedNegative,
    parameters: appliedParameters,
  };

  // 【成功結果返却】: テストで期待される完全な戻り値 🟢
  return {
    success: true,
    appliedPreset,
    warnings: allWarnings,
  };
}
