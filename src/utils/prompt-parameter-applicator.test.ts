import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  applyPromptToDOM,
  applyParametersToDOM,
  applyPresetToDOM,
} from './prompt-parameter-applicator';

describe('プロンプト/パラメータ適用ロジック', () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にテスト環境を初期化し、一貫したテスト条件を保証
    // 【環境初期化】: 前のテストの影響を受けないよう、DOMを清潔な状態に設定
    document.body.innerHTML = '';
    // DOM要素のモック状態をリセット
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後に作成されたDOM要素や設定を削除
    // 【状態復元】: 次のテストに影響しないよう、システムを元の状態に戻す
    document.body.innerHTML = '';
  });

  test('プロンプト値をDOM要素に正常に適用できる', () => {
    // 【テスト目的】: プロンプト文字列がNovelAI UI のプロンプト入力欄に正確に設定されることを確認
    // 【テスト内容】: applyPromptToDOM関数にプロンプト文字列を渡し、対象DOM要素に値が設定されることをテスト
    // 【期待される動作】: プロンプト入力欄の値が指定されたプロンプト文字列と一致する
    // 🟡 信頼性レベル: 要件文書REQ-001に基づくが、実装の詳細は推測

    // 【テストデータ準備】: プロンプト適用のテストに必要なプロンプト文字列データを準備
    // 【初期条件設定】: テスト用のプロンプト文字列とDOM要素を設定
    const testPrompt = 'beautiful landscape, scenic view, natural lighting, high quality, detailed';

    // DOM要素を作成
    const promptInput = document.createElement('textarea');
    promptInput.id = 'prompt-input';
    document.body.appendChild(promptInput);

    // 【実際の処理実行】: applyPromptToDOM関数を呼び出してプロンプトを適用
    // 【処理内容】: プロンプト文字列をDOM要素に設定する処理を実行
    const result = applyPromptToDOM(testPrompt);

    // 【結果検証】: プロンプト適用が成功したかを確認
    // 【期待値確認】: 関数が成功を示すtrueを返すことを確認
    expect(result.success).toBe(true); // 【確認内容】: プロンプト適用処理が成功したことを確認 🟡
    expect(result.appliedPrompt).toBe(testPrompt); // 【確認内容】: 適用されたプロンプトが期待値と一致することを確認 🟡
  });

  test('生成パラメータ（steps/cfgScale/sampler）をDOM要素に正常に適用できる', () => {
    // 【テスト目的】: 生成パラメータ（steps、cfgScale、sampler）がNovelAI UI の各入力欄に正確に設定されることを確認
    // 【テスト内容】: applyParametersToDOM関数にパラメータオブジェクトを渡し、各DOM要素に値が設定されることをテスト
    // 【期待される動作】: 各パラメータ入力欄の値が指定されたパラメータ値と一致する
    // 🟡 信頼性レベル: 要件文書REQ-002に基づくが、実装の詳細は推測

    // 【テストデータ準備】: パラメータ適用のテストに必要なパラメータオブジェクトを準備
    // 【初期条件設定】: テスト用のパラメータオブジェクトとDOM要素を設定
    const testParameters = {
      steps: 28,
      cfgScale: 7.5,
      sampler: 'euler_a',
    };

    // 【実際の処理実行】: applyParametersToDOM関数を呼び出してパラメータを適用
    // 【処理内容】: パラメータオブジェクトの各値を対応するDOM要素に設定する処理を実行
    const result = applyParametersToDOM(testParameters);

    // 【結果検証】: パラメータ適用が成功したかを確認
    // 【期待値確認】: 関数が成功を示すtrueを返し、各パラメータが正確に適用されることを確認
    expect(result.success).toBe(true); // 【確認内容】: パラメータ適用処理が成功したことを確認 🟡
    expect(result.appliedParameters.steps).toBe(28); // 【確認内容】: steps値が正確に適用されたことを確認 🟡
    expect(result.appliedParameters.cfgScale).toBe(7.5); // 【確認内容】: cfgScale値が正確に適用されたことを確認 🟡
    expect(result.appliedParameters.sampler).toBe('euler_a'); // 【確認内容】: sampler値が正確に適用されたことを確認 🟡
  });

  test('完全なプリセット（プロンプト+パラメータ）を一括適用できる', () => {
    // 【テスト目的】: config/prompts.jsonから読み込んだプリセット全体（プロンプト+パラメータ）が一括でNovelAI UIに適用されることを確認
    // 【テスト内容】: applyPresetToDOM関数にプリセットオブジェクトを渡し、プロンプトとパラメータが同時に設定されることをテスト
    // 【期待される動作】: プロンプト入力欄と各パラメータ入力欄の値が指定されたプリセット値と一致する
    // 🟢 信頼性レベル: config/prompts.jsonの構造と要件REQ-001に基づく具体的なテスト

    // 【テストデータ準備】: プリセット一括適用のテストに必要なプリセットオブジェクトを準備
    // 【初期条件設定】: テスト用のプリセットオブジェクト（実際のconfig/prompts.jsonと同じ構造）を設定
    const testPreset = {
      name: '美しい風景',
      prompt: 'beautiful landscape, scenic view, natural lighting, high quality, detailed',
      negative: 'blurry, low quality, distorted',
      parameters: {
        steps: 28,
        cfgScale: 7,
        sampler: 'euler_a',
      },
    };

    // DOM要素を作成
    const promptInput = document.createElement('textarea');
    promptInput.id = 'prompt-input';
    document.body.appendChild(promptInput);

    // 【実際の処理実行】: applyPresetToDOM関数を呼び出してプリセットを一括適用
    // 【処理内容】: プリセットの全ての値（プロンプト、ネガティブプロンプト、パラメータ）を対応するDOM要素に設定する処理を実行
    const result = applyPresetToDOM(testPreset);

    // 【結果検証】: プリセット一括適用が成功したかを確認
    // 【期待値確認】: 関数が成功を示すtrueを返し、プリセットの全ての値が正確に適用されることを確認
    expect(result.success).toBe(true); // 【確認内容】: プリセット一括適用処理が成功したことを確認 🟢
    expect(result.appliedPreset.prompt).toBe(testPreset.prompt); // 【確認内容】: プロンプト値が正確に適用されたことを確認 🟢
    expect(result.appliedPreset.negative).toBe(testPreset.negative); // 【確認内容】: ネガティブプロンプト値が正確に適用されたことを確認 🟢
    expect(result.appliedPreset.parameters.steps).toBe(28); // 【確認内容】: steps値が正確に適用されたことを確認 🟢
    expect(result.appliedPreset.parameters.cfgScale).toBe(7); // 【確認内容】: cfgScale値が正確に適用されたことを確認 🟢
    expect(result.appliedPreset.parameters.sampler).toBe('euler_a'); // 【確認内容】: sampler値が正確に適用されたことを確認 🟢
  });

  test('プロンプト文字数上限超過時に警告を表示する（EDGE-101）', () => {
    // 【テスト目的】: プロンプト文字数が上限を超えた場合に適切な警告が表示されることを確認
    // 【テスト内容】: 長いプロンプト文字列をapplyPromptToDOM関数に渡し、警告メッセージが生成されることをテスト
    // 【期待される動作】: 文字数上限超過の警告が含まれた結果が返される
    // 🟡 信頼性レベル: 要件EDGE-101に基づくが、具体的な文字数上限は推測

    // 【テストデータ準備】: 文字数上限超過テストに必要な長いプロンプト文字列を準備
    // 【初期条件設定】: 文字数上限（2000文字と仮定）を超える長いプロンプト文字列を設定
    const longPrompt = 'a'.repeat(2500); // 2500文字の長いプロンプト

    // DOM要素を作成
    const promptInput = document.createElement('textarea');
    promptInput.id = 'prompt-input';
    document.body.appendChild(promptInput);

    // 【実際の処理実行】: applyPromptToDOM関数を呼び出して長いプロンプトを適用
    // 【処理内容】: 文字数上限を超えるプロンプト文字列の適用処理を実行
    const result = applyPromptToDOM(longPrompt);

    // 【結果検証】: 文字数上限超過時の警告処理が正しく動作するかを確認
    // 【期待値確認】: 警告メッセージが生成され、適切な切り詰め処理が行われることを確認
    expect(result.warnings).toContain('プロンプト文字数が上限を超えています'); // 【確認内容】: 文字数上限超過の警告メッセージが含まれることを確認 🟡
    expect(result.appliedPrompt.length).toBeLessThanOrEqual(2000); // 【確認内容】: 適用されたプロンプトが上限文字数以内に切り詰められていることを確認 🟡
  });

  test('DOM要素が見つからない場合にエラーを返す', () => {
    // 【テスト目的】: 対象DOM要素が存在しない場合に適切なエラー処理が行われることを確認
    // 【テスト内容】: DOM要素が存在しない状態でapplyPromptToDOM関数を呼び出し、エラーが返されることをテスト
    // 【期待される動作】: DOM要素未検出のエラーメッセージを含む失敗結果が返される
    // 🟡 信頼性レベル: 一般的なエラーハンドリング要件に基づく推測

    // 【テストデータ準備】: DOM要素未検出テストに必要なプロンプト文字列を準備
    // 【初期条件設定】: DOM要素が存在しない状態（空のbody）でプロンプト適用をテスト
    const testPrompt = 'test prompt';
    // DOM要素は意図的に作成しない（空のbody状態を維持）

    // 【実際の処理実行】: applyPromptToDOM関数を呼び出してDOM要素未検出時の処理を実行
    // 【処理内容】: 対象DOM要素が存在しない状態でのプロンプト適用処理を実行
    const result = applyPromptToDOM(testPrompt);

    // 【結果検証】: DOM要素未検出時のエラー処理が正しく動作するかを確認
    // 【期待値確認】: 処理が失敗を示すfalseを返し、適切なエラーメッセージが含まれることを確認
    expect(result.success).toBe(false); // 【確認内容】: DOM要素未検出により処理が失敗したことを確認 🟡
    expect(result.error).toContain('プロンプト入力欄が見つかりません'); // 【確認内容】: DOM要素未検出の具体的なエラーメッセージが含まれることを確認 🟡
  });

  test('入力欄が読み取り専用の場合にエラーを返す', () => {
    // 【テスト目的】: 対象DOM要素が読み取り専用（readonly）の場合に適切なエラー処理が行われることを確認
    // 【テスト内容】: readonly属性が設定されたDOM要素に対してapplyPromptToDOM関数を呼び出し、エラーが返されることをテスト
    // 【期待される動作】: 読み取り専用要素への書き込み試行エラーメッセージを含む失敗結果が返される
    // 🟡 信頼性レベル: 一般的なUIの状態管理とエラーハンドリング要件に基づく推測

    // 【テストデータ準備】: 読み取り専用要素テストに必要なプロンプト文字列とDOM要素を準備
    // 【初期条件設定】: readonly属性が設定されたプロンプト入力欄を作成
    const readonlyInput = document.createElement('textarea');
    readonlyInput.id = 'prompt-input';
    readonlyInput.readOnly = true;
    document.body.appendChild(readonlyInput);

    const testPrompt = 'test prompt';

    // 【実際の処理実行】: applyPromptToDOM関数を呼び出して読み取り専用要素への書き込み処理を実行
    // 【処理内容】: readonly属性が設定された要素に対するプロンプト適用処理を実行
    const result = applyPromptToDOM(testPrompt);

    // 【結果検証】: 読み取り専用要素への書き込み時のエラー処理が正しく動作するかを確認
    // 【期待値確認】: 処理が失敗を示すfalseを返し、適切なエラーメッセージが含まれることを確認
    expect(result.success).toBe(false); // 【確認内容】: 読み取り専用要素への書き込みにより処理が失敗したことを確認 🟡
    expect(result.error).toContain('入力欄が読み取り専用です'); // 【確認内容】: 読み取り専用要素への書き込み試行の具体的なエラーメッセージが含まれることを確認 🟡
  });

  test('無効なパラメータ値（範囲外）の場合に警告を表示する', () => {
    // 【テスト目的】: パラメータ値が有効範囲外の場合に適切な警告が表示されることを確認
    // 【テスト内容】: 範囲外のパラメータ値をapplyParametersToDOM関数に渡し、警告メッセージが生成されることをテスト
    // 【期待される動作】: 範囲外パラメータの警告が含まれた結果が返され、値が有効範囲内に修正される
    // 🟡 信頼性レベル: 一般的なバリデーション要件に基づく推測

    // 【テストデータ準備】: 範囲外パラメータテストに必要な無効なパラメータオブジェクトを準備
    // 【初期条件設定】: 有効範囲外の値を持つパラメータオブジェクトを設定
    const invalidParameters = {
      steps: 150, // 上限100を超過
      cfgScale: 50, // 上限30を超過
      sampler: 'invalid_sampler', // 無効なサンプラー
    };

    // 【実際の処理実行】: applyParametersToDOM関数を呼び出して無効なパラメータの適用処理を実行
    // 【処理内容】: 範囲外の値を持つパラメータオブジェクトの適用処理を実行
    const result = applyParametersToDOM(invalidParameters);

    // 【結果検証】: 無効パラメータ値に対する警告処理が正しく動作するかを確認
    // 【期待値確認】: 警告メッセージが生成され、パラメータ値が有効範囲内に修正されることを確認
    expect(result.warnings.length).toBeGreaterThan(0); // 【確認内容】: 無効パラメータに対する警告メッセージが生成されることを確認 🟡
    expect(result.warnings.some((w) => w.includes('steps'))).toBe(true); // 【確認内容】: steps値の範囲外に関する警告が含まれることを確認 🟡
    expect(result.warnings.some((w) => w.includes('cfgScale'))).toBe(true); // 【確認内容】: cfgScale値の範囲外に関する警告が含まれることを確認 🟡
    expect(result.warnings.some((w) => w.includes('sampler'))).toBe(true); // 【確認内容】: 無効なsampler値に関する警告が含まれることを確認 🟡
  });
});

// 実装済みの関数を上記でimportして使用
