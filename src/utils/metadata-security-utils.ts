/**
 * TASK-102: メタデータ管理 - セキュリティユーティリティ
 *
 * 【機能概要】: メタデータ処理におけるセキュリティ対策機能を提供
 * 【改善内容】: XSS攻撃防止、プロトタイプ汚染防止、安全な入力値検証を実装
 * 【設計方針】: セキュリティ機能を分離してテスト可能性と保守性を向上
 * 【セキュリティ】: OWASP Top 10 の脆弱性に対する包括的な防御機能
 * 🟢 信頼性レベル: セキュリティベストプラクティスと要件REQ-102-401に基づく
 *
 * @version 1.0.0
 * @author NovelAI Auto Generator Team
 * @since 2025-01-20 (Refactor phase)
 */

import { SECURITY_CONFIG, METADATA_FIELD_LIMITS } from './metadata-manager-config';

/**
 * 【セキュリティ機能】: 包括的なHTMLエスケープ処理
 * 【改善内容】: 単一引用符を含む全ての危険文字をエスケープしてXSS攻撃を防止
 * 【パフォーマンス】: 正規表現を使用して高速な文字列置換を実現
 * 【テスト対応】: TC012の期待値に合わせつつ、セキュリティを強化
 * 🟢 信頼性レベル: OWASP XSS Prevention Cheat Sheetに基づく
 *
 * @param unsafe - エスケープ対象の文字列
 * @returns エスケープ済みの安全な文字列
 */
export function escapeHtmlComprehensive(unsafe: string): string {
  // 【入力値検証】: null/undefinedの安全な処理
  if (typeof unsafe !== 'string') {
    return '';
  }

  // 【高速エスケープ処理】: 全ての危険文字を一括置換
  // 🔴 改善: 単一引用符のエスケープを追加してセキュリティ強化
  return unsafe.replace(/[&<>"']/g, (match) => {
    return SECURITY_CONFIG.HTML_ESCAPE_MAP[match as keyof typeof SECURITY_CONFIG.HTML_ESCAPE_MAP] || match;
  });
}

/**
 * 【セキュリティ機能】: プロトタイプ汚染攻撃の検出と防止
 * 【改善内容】: JSONオブジェクトに危険なプロパティが含まれていないかチェック
 * 【保守性】: 危険なパターンを設定ファイルで管理して更新を容易化
 * 🔴 改善: Greenフェーズでは未実装だったプロトタイプ汚染対策を追加
 *
 * @param obj - 検証対象のオブジェクト
 * @returns 危険なプロパティが見つからない場合true
 */
export function validateObjectSafety(obj: any): boolean {
  // 【型安全性】: オブジェクト以外の値を安全に処理
  if (typeof obj !== 'object' || obj === null) {
    return true;
  }

  // 【再帰的検証】: ネストしたオブジェクトも含めて危険性をチェック
  // 【パフォーマンス】: 深い再帰を制限してDoS攻撃を防止
  return validateObjectSafetyRecursive(obj, 0);
}

/**
 * 【内部ヘルパー関数】: オブジェクトの再帰的安全性検証
 * 【設計方針】: 再帰の深さを制限してスタックオーバーフロー攻撃を防止
 * 【効率性】: 危険なパターンが見つかった時点で即座に false を返却
 */
function validateObjectSafetyRecursive(obj: any, depth: number): boolean {
  // 【DoS攻撃防止】: 過度な再帰を制限
  if (depth > SECURITY_CONFIG.MAX_JSON_DEPTH) {
    return false;
  }

  // 【危険パターン検出】: プロトタイプ汚染に使われる危険なキーをチェック
  for (const key of Object.keys(obj)) {
    // 【プロトタイプ汚染防止】: 危険なプロパティ名の検出
    if (SECURITY_CONFIG.DANGEROUS_PATTERNS.includes(key)) {
      return false;
    }

    // 【再帰検証】: ネストしたオブジェクトの安全性確認
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (!validateObjectSafetyRecursive(obj[key], depth + 1)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 【セキュリティ機能】: 安全なJSON解析処理
 * 【改善内容】: プロトタイプ汚染攻撃とJSONボム攻撃を防止する安全なパーサー
 * 【エラーハンドリング】: 詳細すぎる情報を避けて情報漏洩を防止
 * 🔴 改善: Greenフェーズの単純なJSON.parseを安全性強化版に置換
 *
 * @param jsonString - 解析対象のJSON文字列
 * @returns 解析結果または null（失敗時）
 */
export function parseJsonSafely<T = any>(jsonString: string): T | null {
  try {
    // 【基本的なJSON解析】: 標準的なパースを実行
    const parsed = JSON.parse(jsonString);

    // 【セキュリティ検証】: 解析されたオブジェクトの安全性をチェック
    if (!validateObjectSafety(parsed)) {
      // 【攻撃検出】: 危険なパターンが検出された場合は安全にnullを返却
      return null;
    }

    return parsed as T;
  } catch (error) {
    // 【情報漏洩防止】: 詳細なエラー情報を隠蔽して内部情報の漏洩を防止
    return null;
  }
}

/**
 * 【セキュリティ機能】: メタデータフィールドの長さ制限検証
 * 【改善内容】: リソース枯渇攻撃を防止するための文字数制限チェック
 * 【設計方針】: 各フィールドごとに適切な制限値を適用
 * 🔴 改善: Greenフェーズでは未実装だった文字数制限検証を追加
 *
 * @param metadata - 検証対象のメタデータオブジェクト
 * @returns 検証結果と違反詳細
 */
export function validateMetadataFieldLengths(metadata: any): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // 【必須フィールド検証】: name フィールドの長さチェック
  if (typeof metadata.name === 'string') {
    if (metadata.name.length < METADATA_FIELD_LIMITS.NAME_MIN_LENGTH) {
      violations.push(`Name field is too short (minimum: ${METADATA_FIELD_LIMITS.NAME_MIN_LENGTH} characters)`);
    }
    if (metadata.name.length > METADATA_FIELD_LIMITS.NAME_MAX_LENGTH) {
      violations.push(`Name field is too long (maximum: ${METADATA_FIELD_LIMITS.NAME_MAX_LENGTH} characters)`);
    }
  }

  // 【オプションフィールド検証】: description フィールドの長さチェック
  if (typeof metadata.description === 'string' &&
      metadata.description.length > METADATA_FIELD_LIMITS.DESCRIPTION_MAX_LENGTH) {
    violations.push(`Description field is too long (maximum: ${METADATA_FIELD_LIMITS.DESCRIPTION_MAX_LENGTH} characters)`);
  }

  // 【オプションフィールド検証】: author フィールドの長さチェック
  if (typeof metadata.author === 'string' &&
      metadata.author.length > METADATA_FIELD_LIMITS.AUTHOR_MAX_LENGTH) {
    violations.push(`Author field is too long (maximum: ${METADATA_FIELD_LIMITS.AUTHOR_MAX_LENGTH} characters)`);
  }

  // 【配列フィールド検証】: tags フィールドの個数と各タグの長さチェック
  if (Array.isArray(metadata.tags)) {
    if (metadata.tags.length > METADATA_FIELD_LIMITS.TAGS_MAX_COUNT) {
      violations.push(`Too many tags (maximum: ${METADATA_FIELD_LIMITS.TAGS_MAX_COUNT})`);
    }

    metadata.tags.forEach((tag: any, index: number) => {
      if (typeof tag === 'string' && tag.length > METADATA_FIELD_LIMITS.TAG_MAX_LENGTH) {
        violations.push(`Tag ${index + 1} is too long (maximum: ${METADATA_FIELD_LIMITS.TAG_MAX_LENGTH} characters)`);
      }
    });
  }

  return {
    isValid: violations.length === 0,
    violations
  };
}

/**
 * 【セキュリティ機能】: Unicode文字列の正規化処理
 * 【改善内容】: Unicode正規化攻撃を防止するためのNFC正規化
 * 【国際化対応】: 異なる文字エンコーディングでの同一性を確保
 * 🟡 改善: REQ-102-402のUnicode要件に対応した正規化処理
 *
 * @param text - 正規化対象の文字列
 * @returns NFC正規化された安全な文字列
 */
export function normalizeUnicodeString(text: string): string {
  // 【型安全性】: 文字列以外の値を安全に処理
  if (typeof text !== 'string') {
    return '';
  }

  // 【Unicode正規化】: NFC (Canonical Decomposition followed by Canonical Composition) 形式に正規化
  // 【セキュリティ】: 見た目は同じだが内部表現が異なる文字列による攻撃を防止
  return text.normalize('NFC');
}

/**
 * 【セキュリティ機能】: Content-Type検証（将来のファイルアップロード対応）
 * 【改善内容】: ファイルタイプ偽装攻撃を防止するための検証機能
 * 【将来拡張性】: Web APIでのファイルアップロード機能を見込んだ設計
 * 🟡 改善: 将来のセキュリティ要件を見込んだ拡張機能
 *
 * @param contentType - 検証対象のContent-Type
 * @returns JSON形式として有効な場合true
 */
export function validateContentType(contentType?: string): boolean {
  // 【Content-Type検証】: JSON形式のみを許可
  const allowedTypes = [
    'application/json',
    'text/json',
    'text/plain', // テキストファイルとしてのJSON
  ];

  if (!contentType) {
    return false;
  }

  // 【MIME Type正規化】: 大文字小文字を統一してチェック
  const normalizedType = contentType.toLowerCase().split(';')[0].trim();
  return allowedTypes.includes(normalizedType);
}

/**
 * 【セキュリティ機能】: レート制限のための時間ベース制御（将来対応）
 * 【改善内容】: DoS攻撃防止のためのリクエスト頻度制限機能
 * 【設計方針】: メモリベースの簡易実装（本格運用時はRedis等を推奨）
 * 🟡 改善: 将来のセキュリティ要件を見込んだ拡張機能
 */
export class SimpleRateLimiter {
  private requests = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  /**
   * @param maxRequests - 時間窓内の最大リクエスト数
   * @param windowMs - 時間窓の長さ（ミリ秒）
   */
  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * 【レート制限チェック】: 指定されたキーのリクエスト頻度を確認
   * @param key - クライアント識別キー（IPアドレス等）
   * @returns リクエストが許可される場合true
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // 【時間窓外のリクエスト削除】: 古いタイムスタンプを削除
    const validTimestamps = timestamps.filter(timestamp =>
      now - timestamp < this.windowMs
    );

    // 【制限値チェック】: 現在の時間窓内でのリクエスト数を確認
    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    // 【新規リクエスト記録】: 現在のタイムスタンプを追加
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);

    return true;
  }

  /**
   * 【メモリクリーンアップ】: 古いエントリを削除してメモリリークを防止
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(timestamp =>
        now - timestamp < this.windowMs
      );

      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}