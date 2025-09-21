/**
 * 【ファイル名サニタイズモジュール】: ダウンロード用ファイル名の安全な変換処理
 * 【設計方針】: セキュリティを重視した包括的なファイル名検証・変換
 * 【責任範囲】: 不正文字除去、拡張子保持、長さ制限、セキュリティ検証
 * 🟢 信頼性レベル: 高（TC-072-203テストケース要件とセキュリティベストプラクティスに基づく）
 */

import {
  STORAGE_DOWNLOAD_CONFIG,
  FILENAME_PATTERNS,
} from './storage-download-compatibility-config';

/**
 * ファイル名サニタイズ結果の詳細情報
 * 【構造化レスポンス】: サニタイズ処理の結果と詳細情報を提供
 */
export interface SanitizeResult {
  /** サニタイズ済みファイル名 */
  sanitizedName: string;
  /** 元のファイル名 */
  originalName: string;
  /** サニタイズで変更が発生したかどうか */
  wasModified: boolean;
  /** 検出された問題の一覧 */
  issues: string[];
}

/**
 * 【ファイル名サニタイザクラス】: ファイル名の安全な変換を統一的に管理
 * 【セキュリティ重視】: パストラバーサル、不正文字、過度な長さ等への対策
 */
export class FilenameSanitizer {
  /**
   * 【メインサニタイズ処理】: ファイル名を安全で有効な形式に変換
   * 【処理順序】: 入力検証 → 拡張子分離 → 不正文字除去 → 長さ制限 → 検証
   * 【テスト対応】: TC-072-203のファイル名サニタイズ境界値テストに準拠
   *
   * @param fileName - サニタイズ対象の元ファイル名
   * @returns string - サニタイズ済みファイル名（簡易版）
   */
  static sanitize(fileName: string): string {
    const result = this.sanitizeDetailed(fileName);
    return result.sanitizedName;
  }

  /**
   * 【詳細サニタイズ処理】: ファイル名変換の詳細情報付きバージョン
   * 【トレーサビリティ】: 変更内容と問題点を詳細に記録
   * 【デバッグ支援】: 開発・運用時の問題調査を支援
   *
   * @param fileName - サニタイズ対象の元ファイル名
   * @returns SanitizeResult - 詳細な処理結果
   */
  static sanitizeDetailed(fileName: string): SanitizeResult {
    const issues: string[] = [];
    const originalName = fileName;

    // 【入力値検証】: 空文字・null・undefined のチェック
    if (!fileName || typeof fileName !== 'string') {
      return {
        sanitizedName: 'download' + STORAGE_DOWNLOAD_CONFIG.DEFAULT_EXTENSION,
        originalName,
        wasModified: true,
        issues: ['無効な入力値のためデフォルト名を使用'],
      };
    }

    // 【拡張子分離処理】: ファイル名本体と拡張子を分離
    const { baseName, extension } = this.separateExtension(fileName);

    // 【ベース名サニタイズ】: ファイル名本体の不正文字除去
    const sanitizedBase = this.sanitizeBaseName(baseName, issues);

    // 【拡張子サニタイズ】: 拡張子の安全性確保
    const sanitizedExtension = this.sanitizeExtension(extension, issues);

    // 【ファイル名再構築】: サニタイズされた部品から完全なファイル名を構築
    let result = sanitizedBase + sanitizedExtension;

    // 【緊急フォールバック】: すべてが不正文字だった場合の処理
    if (!result || result === sanitizedExtension) {
      result = 'download' + (sanitizedExtension || STORAGE_DOWNLOAD_CONFIG.DEFAULT_EXTENSION);
      issues.push('ファイル名がすべて不正文字のためデフォルト名に変更');
    }

    // 【拡張子補完】: 拡張子が欠落している場合の自動補完
    if (!this.hasValidExtension(result)) {
      result = result + STORAGE_DOWNLOAD_CONFIG.DEFAULT_EXTENSION;
      issues.push('有効な拡張子がないためデフォルト拡張子を追加');
    }

    // 【長さ制限適用】: ファイルシステム制限への対応
    if (result.length > STORAGE_DOWNLOAD_CONFIG.MAX_FILENAME_LENGTH) {
      result = this.truncateWithExtension(result);
      issues.push('ファイル名が長すぎるため切り詰め');
    }

    // 【セキュリティ最終検証】: 危険なパターンの最終チェック
    if (this.containsSecurityRisks(result)) {
      result = 'secure_download' + STORAGE_DOWNLOAD_CONFIG.DEFAULT_EXTENSION;
      issues.push('セキュリティリスクのためセーフ名に変更');
    }

    return {
      sanitizedName: result,
      originalName,
      wasModified: result !== originalName,
      issues,
    };
  }

  /**
   * 【拡張子分離】: ファイル名から拡張子を安全に分離
   * 【処理方針】: 最後のドットを基準に分離し、拡張子の妥当性を確認
   *
   * @param fileName - 分離対象のファイル名
   * @returns 分離結果オブジェクト
   */
  private static separateExtension(fileName: string): { baseName: string; extension: string } {
    const lastDotIndex = fileName.lastIndexOf('.');

    // 【拡張子なし判定】: ドットが存在しない、または先頭にある場合
    if (lastDotIndex <= 0) {
      return { baseName: fileName, extension: '' };
    }

    return {
      baseName: fileName.substring(0, lastDotIndex),
      extension: fileName.substring(lastDotIndex),
    };
  }

  /**
   * 【ベース名サニタイズ】: ファイル名本体から不正文字を除去
   * 【処理内容】: 危険文字の置換、空白の正規化、制御文字の除去
   *
   * @param baseName - サニタイズ対象のベース名
   * @param issues - 問題記録用配列
   * @returns サニタイズ済みベース名
   */
  private static sanitizeBaseName(baseName: string, issues: string[]): string {
    let sanitized = baseName;

    // 【不正文字置換】: OS固有の問題文字をアンダースコアに変換
    const beforeInvalidChars = sanitized;
    sanitized = sanitized.replace(FILENAME_PATTERNS.INVALID_CHARS, '_');
    if (sanitized !== beforeInvalidChars) {
      issues.push('不正文字をアンダースコアに置換');
    }

    // 【空白正規化】: 連続空白をアンダースコアに変換
    const beforeWhitespace = sanitized;
    sanitized = sanitized.replace(FILENAME_PATTERNS.WHITESPACE, '_');
    if (sanitized !== beforeWhitespace) {
      issues.push('空白文字をアンダースコアに置換');
    }

    // 【制御文字除去】: ASCII制御文字の除去
    const beforeControlChars = sanitized;
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');
    if (sanitized !== beforeControlChars) {
      issues.push('制御文字を除去');
    }

    // 【予約名チェック】: Windows予約名の回避
    const windowsReserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (windowsReserved.test(sanitized)) {
      sanitized = 'file_' + sanitized;
      issues.push('Windows予約名のためプレフィックス追加');
    }

    return sanitized;
  }

  /**
   * 【拡張子サニタイズ】: 拡張子から危険な文字を除去
   * 【処理方針】: ドット以外の不正文字を除去し、有効性を確認
   *
   * @param extension - サニタイズ対象の拡張子
   * @param issues - 問題記録用配列
   * @returns サニタイズ済み拡張子
   */
  private static sanitizeExtension(extension: string, issues: string[]): string {
    if (!extension) {
      return '';
    }

    // 【拡張子内不正文字除去】: ドット以外の危険文字を除去
    const beforeSanitize = extension;
    const sanitized = extension.replace(/[<>:"/\\|?*\s]/g, '');

    if (sanitized !== beforeSanitize) {
      issues.push('拡張子内の不正文字を除去');
    }

    return sanitized;
  }

  /**
   * 【有効拡張子判定】: ファイル名が有効な拡張子を持つかチェック
   * 【判定基準】: 設定された有効拡張子パターンとの照合
   *
   * @param fileName - チェック対象のファイル名
   * @returns boolean - 有効な拡張子を持つかどうか
   */
  private static hasValidExtension(fileName: string): boolean {
    return FILENAME_PATTERNS.VALID_EXTENSIONS.test(fileName);
  }

  /**
   * 【拡張子保持切り詰め】: 拡張子を保持しながらファイル名を切り詰め
   * 【処理方針】: 拡張子分を確保してからベース名を切り詰め
   *
   * @param fileName - 切り詰め対象のファイル名
   * @returns 切り詰め済みファイル名
   */
  private static truncateWithExtension(fileName: string): string {
    const { baseName, extension } = this.separateExtension(fileName);
    const maxBaseLength = STORAGE_DOWNLOAD_CONFIG.MAX_FILENAME_LENGTH - extension.length;

    if (maxBaseLength <= 0) {
      // 【拡張子が長すぎる場合】: 最小限のベース名を確保
      return 'file' + extension.substring(0, STORAGE_DOWNLOAD_CONFIG.MAX_FILENAME_LENGTH - 4);
    }

    return baseName.substring(0, maxBaseLength) + extension;
  }

  /**
   * 【セキュリティリスク検証】: 残存する危険なパターンをチェック
   * 【検証項目】: パストラバーサル、隠しファイル、特殊パターン
   *
   * @param fileName - 検証対象のファイル名
   * @returns boolean - セキュリティリスクがあるかどうか
   */
  private static containsSecurityRisks(fileName: string): boolean {
    // 【パストラバーサル検出】: ディレクトリトラバーサル攻撃パターン
    if (fileName.includes('..') || fileName.includes('./') || fileName.includes('.\\')) {
      return true;
    }

    // 【隠しファイル検出】: Unix系の隠しファイルパターン
    if (fileName.startsWith('.') && fileName.length > 1) {
      return true;
    }

    // 【空文字・特殊文字検出】: 残存する危険な文字
    if (fileName.includes('\0') || fileName.includes('\r') || fileName.includes('\n')) {
      return true;
    }

    return false;
  }
}
