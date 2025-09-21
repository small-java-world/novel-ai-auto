/**
 * 【ダウンロードログ管理モジュール】: chrome.storage.local へのログ記録・管理を統一化
 * 【設計方針】: ログローテーション、構造化記録、非同期安全性を確保
 * 【責任範囲】: ログエントリ作成、ストレージ操作、ローテーション管理、エラー処理
 * 🟢 信頼性レベル: 高（TC-072-201ログローテーション要件とChrome Storage API仕様に基づく）
 */

import {
  STORAGE_DOWNLOAD_CONFIG,
  LOG_LEVELS,
  ERROR_MESSAGES,
} from './storage-download-compatibility-config';

/**
 * ログエントリの構造定義
 * 【構造統一】: テストケースで期待される形式に準拠
 * 【根拠】: TC-072-201で検証されるログエントリ構造
 */
export interface LogEntry {
  /** 一意のログID */
  id: number;
  /** ログ記録時刻（Unix timestamp） */
  timestamp: number;
  /** ログレベル（INFO/ERROR） */
  level: string;
  /** ログメッセージ */
  message: string;
}

/**
 * ログ記録のオプション設定
 * 【柔軟性確保】: 将来的な拡張に対応できる設定構造
 */
export interface LogOptions {
  /** 強制的にローテーションを実行するかどうか */
  forceRotation?: boolean;
  /** ログレベルの上書き指定 */
  overrideLevel?: string;
}

/**
 * 【ダウンロードログ管理クラス】: ログ操作の統一的な管理
 * 【非同期安全】: Chrome Storage APIの非同期特性に対応した安全な実装
 */
export class DownloadLogger {
  /**
   * 【成功ログ記録】: ダウンロード成功時のログ記録
   * 【利便性API】: 呼び出し側のコードを簡潔にするための高レベルAPI
   *
   * @param action - 実行されたアクション名
   * @param details - 成功の詳細情報
   * @param options - ログ記録オプション
   */
  static async logSuccess(action: string, details: string, options?: LogOptions): Promise<void> {
    await this.logAction(action, true, details, options);
  }

  /**
   * 【失敗ログ記録】: ダウンロード失敗時のログ記録
   * 【利便性API】: エラー情報を適切に記録するための高レベルAPI
   *
   * @param action - 実行されたアクション名
   * @param details - 失敗の詳細情報
   * @param options - ログ記録オプション
   */
  static async logError(action: string, details: string, options?: LogOptions): Promise<void> {
    await this.logAction(action, false, details, options);
  }

  /**
   * 【基本ログ記録処理】: ログエントリの作成とストレージへの保存
   * 【処理順序】: ログ読み込み → ID生成 → エントリ作成 → ローテーション → 保存
   * 【エラー安全】: ログ記録失敗が主処理に影響しないよう設計
   *
   * @param action - 実行されたアクション名
   * @param success - 成功可否
   * @param details - 詳細情報
   * @param options - ログ記録オプション
   */
  static async logAction(
    action: string,
    success: boolean,
    details: string,
    options?: LogOptions
  ): Promise<void> {
    try {
      // 【現在ログ読み込み】: 既存のログデータを安全に取得
      const logs = await this.getCurrentLogs();

      // 【新規ログエントリ作成】: 統一された構造でエントリを生成
      const newEntry = this.createLogEntry(logs, action, success, details, options);

      // 【ログ追加・ローテーション】: 新エントリ追加と上限管理を実行
      const updatedLogs = this.addLogWithRotation(logs, newEntry, options);

      // 【ストレージ保存】: 更新されたログをストレージに非同期保存
      await this.saveLogsToStorage(updatedLogs);
    } catch (error) {
      // 【ログ失敗処理】: ログ記録失敗時も主処理を継続
      // 【運用継続性】: ログ失敗によるシステム停止を防止
      console.warn(ERROR_MESSAGES.LOG_ERROR, error);
    }
  }

  /**
   * 【現在ログ取得】: Chrome Storage から既存ログを安全に読み込み
   * 【エラー処理】: ストレージ読み込み失敗時の適切なフォールバック
   *
   * @returns Promise<LogEntry[]> - 現在のログエントリ配列
   */
  private static async getCurrentLogs(): Promise<LogEntry[]> {
    try {
      const data = await chrome.storage.local.get(['logs']);
      const logs = data.logs;

      // 【データ検証】: 取得したデータが配列であることを確認
      if (Array.isArray(logs)) {
        return logs;
      }

      // 【フォールバック】: 不正なデータの場合は空配列を返す
      return [];
    } catch (error) {
      // 【読み込み失敗フォールバック】: ストレージアクセス失敗時の安全な対応
      console.warn('ログ読み込みに失敗しました:', error);
      return [];
    }
  }

  /**
   * 【ログエントリ作成】: 統一された構造でログエントリを生成
   * 【ID管理】: 既存ログから適切な次IDを生成
   * 【テスト対応】: TC-072-201で期待されるログ構造に準拠
   *
   * @param existingLogs - 既存のログエントリ配列
   * @param action - アクション名
   * @param success - 成功可否
   * @param details - 詳細情報
   * @param options - オプション設定
   * @returns LogEntry - 新しいログエントリ
   */
  private static createLogEntry(
    existingLogs: LogEntry[],
    action: string,
    success: boolean,
    details: string,
    options?: LogOptions
  ): LogEntry {
    // 【次ID生成】: 既存ログから安全に次のIDを計算
    const nextId = this.generateNextId(existingLogs);

    // 【ログレベル決定】: 成功可否とオプションからレベルを決定
    const level = options?.overrideLevel || (success ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR);

    // 【メッセージ構築】: アクションと詳細を統一形式で結合
    const message = `${action}: ${details}`;

    return {
      id: nextId,
      timestamp: Date.now(),
      level,
      message,
    };
  }

  /**
   * 【次ID生成】: 既存ログから重複しない次のIDを安全に生成
   * 【重複防止】: ID衝突を確実に回避する安全な実装
   *
   * @param logs - 既存ログエントリ配列
   * @returns number - 次に使用すべきID
   */
  private static generateNextId(logs: LogEntry[]): number {
    if (logs.length === 0) {
      return 0;
    }

    // 【最大ID検索】: 既存ログから最大IDを安全に取得
    try {
      const maxId = Math.max(...logs.map((log) => log.id || 0));
      return maxId + 1;
    } catch (error) {
      // 【フォールバック】: 最大ID計算失敗時の安全な対応
      return logs.length;
    }
  }

  /**
   * 【ログ追加・ローテーション】: 新エントリ追加と上限管理を統合実行
   * 【FIFO管理】: 上限超過時の最古エントリ削除
   * 【テスト対応】: TC-072-201のローテーション要件に準拠
   *
   * @param logs - 既存ログ配列
   * @param newEntry - 追加する新エントリ
   * @param options - オプション設定
   * @returns LogEntry[] - ローテーション後のログ配列
   */
  private static addLogWithRotation(
    logs: LogEntry[],
    newEntry: LogEntry,
    options?: LogOptions
  ): LogEntry[] {
    // 【新エントリ追加】: 既存配列に新しいエントリを追加
    const updatedLogs = [...logs, newEntry];

    // 【ローテーション判定】: 上限超過または強制実行の判定
    const shouldRotate =
      updatedLogs.length > STORAGE_DOWNLOAD_CONFIG.LOG_LIMIT || options?.forceRotation;

    if (shouldRotate) {
      // 【FIFO削除】: 上限を超えた分だけ最古エントリを削除
      while (updatedLogs.length > STORAGE_DOWNLOAD_CONFIG.LOG_LIMIT) {
        updatedLogs.shift();
      }
    }

    return updatedLogs;
  }

  /**
   * 【ストレージ保存】: 更新されたログをChrome Storageに保存
   * 【非同期安全】: Chrome Storage APIの非同期特性に対応
   *
   * @param logs - 保存するログエントリ配列
   */
  private static async saveLogsToStorage(logs: LogEntry[]): Promise<void> {
    try {
      await chrome.storage.local.set({ logs });
    } catch (error) {
      // 【保存失敗処理】: ストレージ保存失敗時のエラー記録
      console.warn('ログ保存に失敗しました:', error);
      throw error; // 上位レベルでの処理継続判断のため再スロー
    }
  }

  /**
   * 【ログ取得API】: 外部からの現在ログ取得用API
   * 【用途】: デバッグ、監査、システム状態確認
   *
   * @returns Promise<LogEntry[]> - 現在のログエントリ配列
   */
  static async getLogs(): Promise<LogEntry[]> {
    return this.getCurrentLogs();
  }

  /**
   * 【ログクリアAPI】: 全ログを削除するAPI
   * 【用途】: テスト環境リセット、メンテナンス作業
   * 【注意】: 本番環境では慎重に使用すること
   */
  static async clearLogs(): Promise<void> {
    try {
      await chrome.storage.local.set({ logs: [] });
    } catch (error) {
      console.warn('ログクリアに失敗しました:', error);
      throw error;
    }
  }
}
