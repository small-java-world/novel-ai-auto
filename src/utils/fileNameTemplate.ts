/**
 * ファイル名テンプレート/サニタイズ機能実装 (TASK-011)
 * Refactorフェーズ: パフォーマンスと保守性を重視した改善版
 */

import type { FileNameTemplateContext, FileNameSanitizeOptions } from '../types';

// 【パフォーマンス最適化】: 正規表現を事前コンパイルしメモリ効率と実行速度を向上 🟢
const REGEX_PATTERNS = {
  FORBIDDEN_CHARS: /[<>:"/\\|?*]/g,
  TRAILING_DOTS_SPACES: /[.\s]+$/,
  TOKEN_PATTERN: /\{([^}]+)\}/g,
  UNCLOSED_BRACE: /\{[^}]*$/,
} as const;

// Internal: 正規化済みサニタイズ設定（型安全性向上のため）
interface NormalizedSanitizeConfig {
  maxLength: number;
  forbiddenChars: RegExp | string[];
  replacement: string;
  collisionResolver?: (_base: string, _i: number) => string;
}
// 【設定管理】: デフォルト値を一元管理し保守性を向上 🟢
const DEFAULT_CONFIG = {
  MAX_LENGTH: 255,
  REPLACEMENT_CHAR: '_',
  DEFAULT_INDEX: 1,
  FALLBACK_NAME: 'untitled',
} as const;

// 【セキュリティ強化】: DoS攻撃対策のための制限値 🟡
const SECURITY_LIMITS = {
  MAX_INPUT_LENGTH: 10000, // 極端に長い入力の拒否
  MAX_COLLISION_ATTEMPTS: 1000, // 無限ループ防止
} as const;

/**
 * 【機能概要】: テンプレート文字列内のトークンをコンテキスト値で展開し、完全なファイル名を生成
 * 【実装方針】: 正規表現による単純置換を使用し、テストケースを確実に通すための最小実装
 * 【テスト対応】: 13個のテストケースのうち基本展開、未知トークン、空結果、エラー処理に対応
 * 🟢 信頼性レベル: 要件定義書の基本仕様に直接対応
 * @param template - テンプレート文字列（例: "{date}_{prompt}_{seed}_{idx}"）
 * @param context - トークン展開用のコンテキストデータ
 * @returns 展開済みファイル名文字列
 */
export function generateFileName(template: string, context: FileNameTemplateContext): string {
  validateTemplateInputs(template, context);
  const expanded = expandTemplateTokens(template, context);
  return applyFallbackIfEmpty(expanded);
}

/**
 * 【機能概要】: テンプレート展開とサニタイズ処理を一括で行い、拡張子保持や最大長などの制約に適合する安全なファイル名を生成する
 * 【実装方針】: 既存の `generateFileName` と `sanitizeFileName` を最小限に合成し、Redフェーズで要求された総合関数のテストを通す
 * 【テスト対応】: file-name-template-sanitization（RED）で追加した2つのテストケースを満たす（拡張子保持・最大長・禁止文字除去・凝集・フォールバック）
 * 🟢 信頼性レベル: 仕様と実装（docs/design と本ファイルの既存関数）に基づく合成であり、推測をほぼ含まない
 * @param template テンプレート文字列（例: "{date}_{prompt}_{seed}_{idx}.png"）
 * @param context テンプレート展開に用いるコンテキスト
 * @param options サニタイズ時のオプション（最大長・禁止文字集合・置換文字・衝突解決）
 * @returns サニタイズ済みの安全なファイル名
 */
export function generateSanitizedFileName(
  template: string,
  context: FileNameTemplateContext,
  options?: FileNameSanitizeOptions
): string {
  // 【入力値検証】: 既存の `generateFileName` がテンプレートとコンテキストを検証するため重複検証は行わない（最小実装）🟢
  const name = generateFileName(template, context);

  // 【データ処理開始】: 生成済みのファイル名に対してサニタイズ処理を適用 🟢
  // 【処理方針】: 既存の `sanitizeFileName` をそのまま呼び出すことで禁止文字置換・凝集・末尾除去・最大長（拡張子保持）を満たす 🟢
  const safe = sanitizeFileName(name, options);

  // 【結果返却】: サニタイズ済みの安全なファイル名を返す 🟢
  return safe;
}

/**
 * 【バリデーション】: 入力値の妥当性確認とセキュリティ対策
 * 【改善内容】: DoS攻撃対策として極端に長い入力を拒否
 */
function validateTemplateInputs(template: string, context: FileNameTemplateContext): void {
  if (typeof template !== 'string') {
    throw new Error('テンプレートは文字列である必要があります');
  }
  if (!context || typeof context !== 'object') {
    throw new Error('コンテキストは必須です');
  }

  // 【セキュリティ強化】: 極端に長い入力の拒否 🟡
  if (template.length > SECURITY_LIMITS.MAX_INPUT_LENGTH) {
    throw new Error(`テンプレートが長すぎます（最大${SECURITY_LIMITS.MAX_INPUT_LENGTH}文字）`);
  }

  // 【構文検証】: 未閉括弧の検出 🟢
  if (REGEX_PATTERNS.UNCLOSED_BRACE.test(template)) {
    throw new Error('テンプレート構文が無効です');
  }
}

/**
 * 【トークン展開】: 効率的な一括置換処理
 * 【パフォーマンス】: 複数回の replace を単一パスで処理
 */
function expandTemplateTokens(template: string, context: FileNameTemplateContext): string {
  const tokenMap = createTokenMap(context);
  return template.replace(REGEX_PATTERNS.TOKEN_PATTERN, (match, token) => {
    return tokenMap[token] ?? '';
  });
}

/**
 * 【トークンマッピング】: コンテキストからトークンマップを生成
 * 【保守性】: トークンの追加・変更が容易な構造
 */
function createTokenMap(context: FileNameTemplateContext): Record<string, string> {
  return {
    date: context.date || '',
    prompt: context.prompt || '',
    seed: context.seed || '',
    idx: String(context.idx || DEFAULT_CONFIG.DEFAULT_INDEX),
  };
}

/**
 * 【フォールバック処理】: 空結果に対するデフォルト名の適用
 * 【可読性】: 条件を明確化し意図を明示
 */
function applyFallbackIfEmpty(result: string): string {
  const cleaned = result.replace(/_/g, '').trim();
  return !result.trim() || cleaned === '' ? DEFAULT_CONFIG.FALLBACK_NAME : result;
}

/**
 * 【機能概要】: ファイル名文字列の禁止文字除去、長さ制御、末尾処理を行うサニタイズ処理
 * 【実装方針】: Windows禁止文字の置換と基本的な文字列処理による最小実装
 * 【テスト対応】: サニタイズ、長さ制御、エラーケース、衝突回避の各テストに対応
 * 🟢 信頼性レベル: EDGE-103要件の禁止文字・長さ制限に直接対応
 * @param input - サニタイズ対象の文字列
 * @param options - サニタイズオプション（最大長、禁止文字、置換文字など）
 * @returns サニタイズ済みファイル名文字列
 */
export function sanitizeFileName(input: string, options?: FileNameSanitizeOptions): string {
  const config = validateAndNormalizeOptions(input, options);

  const processed = applySanitizePipeline(input, config);

  return resolveCollisions(processed, config);
}

/**
 * 【オプション正規化】: 入力値検証とデフォルト設定の適用
 * 【改善内容】: セキュリティ強化とバリデーションの分離
 */
function validateAndNormalizeOptions(
  input: string,
  options?: FileNameSanitizeOptions
): NormalizedSanitizeConfig {
  if (typeof input !== 'string') {
    throw new Error('入力値は文字列である必要があります');
  }

  // 【セキュリティ強化】: 極端に長い入力の拒否 🟡
  if (input.length > SECURITY_LIMITS.MAX_INPUT_LENGTH) {
    throw new Error(`入力が長すぎます（最大${SECURITY_LIMITS.MAX_INPUT_LENGTH}文字）`);
  }

  const config: NormalizedSanitizeConfig = {
    maxLength: options?.maxLength || DEFAULT_CONFIG.MAX_LENGTH,
    forbiddenChars: options?.forbiddenChars || REGEX_PATTERNS.FORBIDDEN_CHARS,
    replacement: options?.replacement || DEFAULT_CONFIG.REPLACEMENT_CHAR,
    collisionResolver: options?.collisionResolver,
  };

  if (options && options.maxLength !== undefined && options.maxLength <= 0) {
    throw new Error('最大長は1以上である必要があります');
  }

  return config;
}

/**
 * 【サニタイズパイプライン】: 禁止文字除去から長さ制御まで段階的処理
 * 【パフォーマンス】: 事前コンパイル済み正規表現を使用
 */
function applySanitizePipeline(input: string, config: NormalizedSanitizeConfig): string {
  let result = input;

  // 【禁止文字置換】: 効率的な置換処理 🟢
  result = replaceForbiddenChars(result, config);

  // 【連続文字集約】: 連続する置換文字の統合 🟡
  result = consolidateReplacements(result, config.replacement);

  // 【末尾処理】: 不正な末尾文字の除去 🟢
  result = result.replace(REGEX_PATTERNS.TRAILING_DOTS_SPACES, '');

  // 【長さ制御】: 拡張子保持機能付き切り詰め 🟢
  result = truncateWithExtensionPreservation(result, config.maxLength);

  return result;
}

/**
 * 【禁止文字置換】: Windows禁止文字の効率的な置換
 * 【パフォーマンス】: 事前コンパイル済み正規表現を活用
 */
function replaceForbiddenChars(input: string, config: NormalizedSanitizeConfig): string {
  if (config.forbiddenChars instanceof RegExp) {
    const globalRegex = new RegExp(config.forbiddenChars.source, 'g');
    return input.replace(globalRegex, config.replacement);
  } else if (Array.isArray(config.forbiddenChars)) {
    let result = input;
    config.forbiddenChars.forEach((char: string) => {
      result = result.replace(new RegExp(escapeRegExp(char), 'g'), config.replacement);
    });
    return result;
  }
  return input;
}

/**
 * 【連続文字統合】: 重複する置換文字を単一文字に統合
 * 【可読性】: 処理の意図を明確化
 */
function consolidateReplacements(input: string, replacement: string): string {
  const replacementEscaped = escapeRegExp(replacement);
  const consecutivePattern = new RegExp(`${replacementEscaped}+`, 'g');
  return input.replace(consecutivePattern, replacement);
}

/**
 * 【長さ制御】: 拡張子保持機能付きの安全な切り詰め
 * 【機能強化】: 拡張子検出ロジックの改善
 */
function truncateWithExtensionPreservation(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }

  const lastDotIndex = input.lastIndexOf('.');
  if (lastDotIndex > 0 && lastDotIndex > input.length - 10) {
    // 【拡張子保持切り詰め】: 拡張子を保持して基本名を調整 🟢
    const extension = input.substring(lastDotIndex);
    const baseName = input.substring(0, lastDotIndex);
    const maxBaseLength = maxLength - extension.length;
    return baseName.substring(0, maxBaseLength) + extension;
  } else {
    // 【通常切り詰め】: 単純な長さ制限適用 🟢
    return input.substring(0, maxLength);
  }
}

/**
 * 【衝突回避】: ファイル名重複時の解決処理
 * 【セキュリティ】: 無限ループ防止機能を追加
 */
function resolveCollisions(input: string, config: NormalizedSanitizeConfig): string {
  if (!config.collisionResolver) {
    return input;
  }

  // 【セキュリティ強化】: 無限ループ防止 🟡
  for (let attempt = 1; attempt <= SECURITY_LIMITS.MAX_COLLISION_ATTEMPTS; attempt++) {
    const result = config.collisionResolver(input, attempt);
    if (result !== input) {
      return result;
    }
  }

  throw new Error(`衝突解決が${SECURITY_LIMITS.MAX_COLLISION_ATTEMPTS}回試行後も失敗しました`);
}

/**
 * 【機能概要】: 正規表現で使用される特殊文字をエスケープする補助関数
 * 【実装方針】: 文字列内の正規表現特殊文字を安全にエスケープ
 * 【テスト対応】: 配列型禁止文字処理の補助機能
 * 🟡 信頼性レベル: 標準的なエスケープ処理だが要件に明示なし
 * @param string - エスケープ対象の文字列
 * @returns エスケープ済み文字列
 */
function escapeRegExp(string: string): string {
  // 【正規表現エスケープ】: 特殊文字をリテラル文字として扱うための処理 🟡
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
