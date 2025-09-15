// テストファイル: fileNameTemplate.custom-options.test.ts
import { describe, test, expect } from 'vitest';
import { sanitizeFileName, generateFileName } from './fileNameTemplate';
import type { FileNameSanitizeOptions } from '../types';

describe('サニタイズ: カスタム禁止集合/置換', () => {
  test('forbiddenChars/replacement カスタマイズが反映される', () => {
    // 【テスト目的】: オプションで禁止文字集合と置換文字をカスタマイズできることを確認
    // 【テスト内容】: forbiddenChars=[':', '/'], replacement='-' を適用し、'a:/b' が 'a-b' に正規化されることを検証
    // 【期待される動作】: 置換→連続記号の凝集で 'a-b' になる
    // 🟢 信頼性レベル: 実装の分岐ロジック（RegExp/配列対応, consolidate）に基づく

    // 【テストデータ準備】: カスタム対象文字 ':' '/' を含む短い入力
    // 【初期条件設定】: デフォルト以外の置換を検証するため replacement='-' を指定
    const input = 'a:/b';
    const options: FileNameSanitizeOptions = { forbiddenChars: [':', '/'], replacement: '-' };

    // 【実際の処理実行】: sanitizeFileName にカスタムオプションを渡す
    // 【処理内容】: 指定集合を '-' へ置換し、連続記号は1文字へ凝集
    const result = sanitizeFileName(input, options);

    // 【結果検証】: '-' への置換と凝集の確認
    // 【期待値確認】: 'a-b' が得られること
    expect(result).toBe('a-b'); // 【確認内容】: カスタム置換と凝集の正しさ 🟢
  });
});

describe('サニタイズ: 境界値（maxLength 等号境界）', () => {
  test('maxLength ちょうどの長さでは切り詰めない', () => {
    // 【テスト目的】: 入力長が maxLength に等しい場合、切り詰めが発生しないことを確認
    // 【テスト内容】: 長さ255の文字列に maxLength=255 を適用
    // 【期待される動作】: 変更なしで返る
    // 🟢 信頼性レベル: truncateWithExtensionPreservation の条件（<=）に基づく

    // 【テストデータ準備】: 255文字の 'a' 列
    // 【初期条件設定】: maxLength=255 を指定
    const input = 'a'.repeat(255);

    // 【実際の処理実行】: サニタイズ（切り詰め分岐を通らない）
    // 【処理内容】: 置換や凝集・末尾除去の影響がない純粋なケース
    const result = sanitizeFileName(input, { maxLength: 255 });

    // 【結果検証】: 長さが255のまま、かつ内容が変わらないこと
    // 【期待値確認】: 入力そのままが返る
    expect(result.length).toBe(255); // 【確認内容】: 等号境界で非切詰 🟢
    expect(result).toBe(input); // 【確認内容】: 内容が変化しないことの確認 🟢
  });
});

describe('サニタイズ: 境界値（長拡張子の非保持分岐）', () => {
  test('拡張子が長すぎる場合は拡張子を保持せず切り詰める', () => {
    // 【テスト目的】: 末尾10文字以内に '.' が無い（長い拡張子）場合は拡張子非保持で単純切り詰めになることを確認
    // 【テスト内容】: 本体が長く、拡張子が '.verylongext'（12文字）で条件を外す
    // 【期待される動作】: 結果は length=255 かつ 末尾が '.verylongext' ではない
    // 🟢 信頼性レベル: 実装の条件 `lastDotIndex > input.length - 10` に基づく

    // 【テストデータ準備】: 非現実的に長い拡張子を持つ入力
    const input = 'a'.repeat(260) + '.verylongext';

    // 【実際の処理実行】: サニタイズ（非保持パスを通す）
    const result = sanitizeFileName(input, { maxLength: 255 });

    // 【結果検証】: 長さと末尾の検証
    expect(result.length).toBe(255); // 【確認内容】: 最大長に収まること 🟢
    expect(result.endsWith('.verylongext')).toBe(false); // 【確認内容】: 拡張子非保持パスであること 🟢
  });
});

describe('テンプレート展開: 境界値（idx=0 フォールバック）', () => {
  test('idx=0 の場合は 1 にフォールバックする', () => {
    // 【テスト目的】: falsy である 0 が指定された場合の idx フォールバック挙動を明示
    // 【テスト内容】: テンプレート '{idx}' に対して idx=0 を指定したときの展開結果
    // 【期待される動作】: '1' が出力される（現行実装の既定値挙動）
    // 🟢 信頼性レベル: 現行実装（String(context.idx || 1)）に基づく

    // 【テストデータ準備】: idx=0 を明示指定
    // 【初期条件設定】: date/prompt は未使用のためダミー値
    const template = '{idx}';
    const ctx = { date: 'd', prompt: 'p', idx: 0 } as const;

    // 【実際の処理実行】: generateFileName によるテンプレート展開
    const result = generateFileName(template, ctx);

    // 【結果検証】: '1' へのフォールバックを確認
    expect(result).toBe('1'); // 【確認内容】: falsy(0)時の既定値適用 🟢
  });
});
