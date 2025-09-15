// テストファイル: fileNameTemplate.red.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import type { FileNameTemplateContext, FileNameSanitizeOptions } from '../types';
// Redフェーズ: まだ未実装の関数を呼び出すことで必ず失敗させる
import { generateSanitizedFileName } from './fileNameTemplate'; // 実装は未提供（RED）

describe('file-name-template-sanitization: 総合関数（RED）', () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テストの独立性を確保するため副作用を持つ状態をリセット
    // 【環境初期化】: 今回は純粋関数のため特別な初期化は不要
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後のクリーンアップは不要
    // 【状態復元】: 次テストに影響がないことを明示
  });

  test('テンプレート展開+サニタイズ+拡張子保持を行う総合関数', () => {
    // 【テスト目的】: テンプレート展開の結果に対してサニタイズを適用し、拡張子を保持したまま最大長を満たす出力を得る
    // 【テスト内容】: `{date}_{prompt}.png` を展開後、禁止文字置換・連続置換の凝集・末尾のドット/空白除去・255文字制限（拡張子保持）を一括で行う
    // 【期待される動作】: 出力が拡張子`.png`を保持し、禁止文字が置換され、連続記号は1つに凝集し、かつ長さが255以下に収まる
    // 🟢 信頼性レベル: 実装方針は既存の `generateFileName` と `sanitizeFileName` の仕様（docs/design と実装）に基づく

    // 【テストデータ準備】: 長い `prompt` と禁止文字を含む文言で置換と長さ制限の両方を発生させる
    // 【初期条件設定】: `idx` は不要なため未指定、`seed` も未指定
    const template = '{date}_{prompt}.png';
    const ctx: FileNameTemplateContext = {
      date: '20240914-120000',
      prompt: 'masterpiece: a<b>:/|?* girl ' + 'x'.repeat(280),
    };
    const options: FileNameSanitizeOptions = { maxLength: 255, replacement: '_' };

    // 【実際の処理実行】: 未実装の総合関数を呼び出して、生成とサニタイズを一括適用
    // 【処理内容】: `generateFileName(template, ctx)` で展開 → `sanitizeFileName(result, options)` でサニタイズ（想定）
    const result = generateSanitizedFileName(template, ctx, options);

    // 【結果検証】: 拡張子保持と最大長、置換・凝集の正しさを検証
    // 【期待値確認】: 末尾が`.png`で、かつ長さが255であること
    expect(result.endsWith('.png')).toBe(true); // 【確認内容】: 拡張子保持の検証（truncate時も維持） 🟢
    expect(result.length).toBeLessThanOrEqual(255); // 【確認内容】: 最大長制約の遵守 🟢
    expect(result).not.toMatch(/[<>:"/\\|?*]/); // 【確認内容】: 禁止文字の除去（置換） 🟢
    expect(result).not.toMatch(/__+/); // 【確認内容】: 連続置換の凝集により `__` が出現しない 🟢
  });

  test('テンプレート展開後が空に等しい場合は "untitled" を返す（総合関数）', () => {
    // 【テスト目的】: 展開結果が空（または実質空）になる場合にフォールバック名が返ることを一括関数で確認
    // 【テスト内容】: `{prompt}` のみのテンプレートに空文字を与え、結果が `untitled` になることを検証
    // 【期待される動作】: 'untitled' を返す
    // 🟢 信頼性レベル: 既存 `applyFallbackIfEmpty` の仕様に基づく

    // 【テストデータ準備】: 空文字の `prompt`
    // 【初期条件設定】: 他フィールドは未使用
    const template = '{prompt}';
    const ctx: FileNameTemplateContext = { date: '', prompt: '' } as any;

    // 【実際の処理実行】: 未実装の総合関数を呼ぶ
    // 【処理内容】: 展開結果が空→フォールバック適用
    const result = generateSanitizedFileName(template, ctx);

    // 【結果検証】: フォールバックが `untitled` であること
    // 【期待値確認】: 空出力に対して既定フォールバック名が返る
    expect(result).toBe('untitled'); // 【確認内容】: フォールバック動作の確認 🟢
  });
});
