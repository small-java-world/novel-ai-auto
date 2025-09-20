import { describe, test, expect } from 'vitest';
import { PromptSynthesizer } from './promptSynthesizer';

describe('プロンプト合成ロジック', () => {
  test('デフォルトルールで共通とプリセットを合成', () => {
    // 【テスト目的】: デフォルト合成ルールが共通プロンプトとプリセット固有プロンプトを要件通りに連結することを確認する
    // 【テスト内容】: PromptSynthesizer.synthesize を呼び出し、正方向・負方向の文字列および文字数集計が正しく計算されるか検証する
    // 【期待される動作】: 正方向は共通→固有、負方向も共通→固有で合成され、警告なしで SynthesisResult を返す
    // 🟢 信頼性レベル: REQ-101-001/002/005 と TASK-101 要件定義の仕様に基づき検証

    // 【テストデータ準備】: 共通プロンプトとプリセットの代表的な組み合わせを作成し、要件で指定された並び順を確認するために使用
    // 【初期条件設定】: 新しい PromptSynthesizer インスタンスを生成し、カスタムルールを使用しない状態を準備
    const synthesizer = new PromptSynthesizer();
    const input = {
      common: {
        base: 'masterpiece, best quality',
        negative: 'low quality, blurry',
      },
      preset: {
        positive: '1girl, blue hair',
        negative: 'bad hands',
        parameters: {
          steps: 28,
          cfgScale: 7,
        },
      },
      ruleId: 'default',
    } as const;

    // 【実際の処理実行】: PromptSynthesizer.synthesize をデフォルトルールで呼び出す
    // 【処理内容】: 共通プロンプトとプリセットプロンプトを順序通りに合成する処理を実行
    const result = synthesizer.synthesize(input.common, input.preset, input.ruleId);

    const expectedPositive = 'masterpiece, best quality, 1girl, blue hair';
    const expectedNegative = 'low quality, blurry, bad hands';
    const expectedCharacterTotals = {
      positive: expectedPositive.length,
      negative: expectedNegative.length,
      total: expectedPositive.length + expectedNegative.length,
    };

    // 【結果検証】: 正方向・負方向の合成結果、文字数集計、警告配列、適用ルール ID を順に確認
    // 【期待値確認】: 要件定義記載の合成仕様と SynthesisResult の構造に従い値が一致することを確認
    expect(result.positive).toBe(expectedPositive); // 【確認内容】: 正方向プロンプトが共通→プリセットの順で連結されていることを確認 🟢
    expect(result.negative).toBe(expectedNegative); // 【確認内容】: 負方向プロンプトが共通→プリセットの順で連結されていることを確認 🟢
    expect(result.characterCount.positive).toBe(expectedCharacterTotals.positive); // 【確認内容】: 正方向の文字数集計が期待どおりであることを確認 🟢
    expect(result.characterCount.negative).toBe(expectedCharacterTotals.negative); // 【確認内容】: 負方向の文字数集計が期待どおりであることを確認 🟢
    expect(result.characterCount.total).toBe(expectedCharacterTotals.total); // 【確認内容】: 合計文字数が正方向と負方向の合計に一致することを確認 🟢
    expect(result.warnings).toHaveLength(0); // 【確認内容】: デフォルト条件で警告が発生しないことを確認 🟢
    expect(result.appliedRule.id).toBe('default'); // 【確認内容】: 適用されたルール ID がデフォルトであることを確認 🟢
  });
});
