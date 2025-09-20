/**
 * 【権限管理モジュール】: Chrome拡張機能のダウンロード権限管理を統一化
 * 【設計方針】: 権限確認、要求、状態管理を安全かつ一貫性をもって実行
 * 【責任範囲】: 権限API操作、permissionPendingフラグ管理、ユーザー対話制御
 * 🟢 信頼性レベル: 高（Chrome Permissions APIとテストケース要件に基づく）
 */

import { DownloadLogger } from './download-logger';

/**
 * 権限確認結果の詳細情報
 * 【構造化レスポンス】: 権限状態の詳細と後続処理の指針を提供
 */
export interface PermissionCheckResult {
  /** 権限が付与されているかどうか */
  hasPermission: boolean;
  /** 権限要求が進行中かどうか */
  isPending: boolean;
  /** 次に実行すべきアクション */
  nextAction: 'proceed' | 'request' | 'wait' | 'abort';
  /** 結果に関する説明メッセージ */
  message: string;
}

/**
 * 権限要求結果の詳細情報
 * 【処理結果記録】: 権限要求の結果と状態変更を詳細に記録
 */
export interface PermissionRequestResult {
  /** 権限が承諾されたかどうか */
  granted: boolean;
  /** 権限要求前の状態 */
  previousState: boolean;
  /** ユーザーの応答（承諾/拒否/タイムアウト） */
  userResponse: 'granted' | 'denied' | 'timeout' | 'error';
  /** 処理に関する詳細メッセージ */
  message: string;
}

/**
 * 【権限管理クラス】: Chrome拡張機能のダウンロード権限を統一的に管理
 * 【スレッドセーフ】: 並行的な権限要求に対する安全な処理
 */
export class PermissionManager {
  /** 権限要求対象の権限名 */
  private static readonly PERMISSION_NAME = 'downloads';

  /** permissionPendingフラグのストレージキー */
  private static readonly PENDING_FLAG_KEY = 'permissionPending';

  /**
   * 【権限状態確認】: 現在の権限状態を包括的にチェック
   * 【確認項目】: Chrome権限API状態 + permissionPendingフラグ状態
   * 【判定ロジック】: 両方の状態から次のアクションを決定
   *
   * @returns Promise<PermissionCheckResult> - 権限状態の詳細情報
   */
  static async checkPermissionStatus(): Promise<PermissionCheckResult> {
    try {
      // 【Chrome API権限確認】: ブラウザレベルでの権限付与状態をチェック
      const hasPermission = await chrome.permissions.contains({
        permissions: [this.PERMISSION_NAME],
      });

      // 【Pendingフラグ確認】: アプリケーションレベルでの権限要求状態をチェック
      const isPending = await this.getPermissionPendingFlag();

      // 【状態判定・アクション決定】: 権限とフラグの組み合わせから次のアクションを決定
      return this.determineNextAction(hasPermission, isPending);
    } catch (error) {
      // 【権限確認エラー処理】: Chrome API例外時の安全なフォールバック
      await DownloadLogger.logError('permission_check', `権限確認中にエラー: ${error.message}`);

      return {
        hasPermission: false,
        isPending: false,
        nextAction: 'abort',
        message: '権限確認中にエラーが発生しました',
      };
    }
  }

  /**
   * 【権限要求実行】: ユーザーに対する権限要求ダイアログの表示と結果処理
   * 【処理フロー】: フラグ設定 → ダイアログ表示 → 結果処理 → フラグ更新
   * 【テスト対応】: TC-072-002(承諾), TC-072-101(拒否), TC-072-104(連続拒否)に対応
   * 【重複回避】: 呼び出し側で既に権限チェック済みのため、直接要求実行
   *
   * @param skipPermissionCheck - 権限チェックをスキップするかどうか（デフォルト: false）
   * @returns Promise<PermissionRequestResult> - 権限要求の結果情報
   */
  static async requestPermission(
    skipPermissionCheck: boolean = false
  ): Promise<PermissionRequestResult> {
    let previousState = false;

    try {
      // 【権限要求前状態記録】: 呼び出し側で既にチェック済みの場合はスキップ可能
      if (!skipPermissionCheck) {
        previousState = await chrome.permissions.contains({
          permissions: [this.PERMISSION_NAME],
        });
      }

      // 【Pendingフラグ設定】: 権限要求中であることを記録
      // 【テスト対応】: TC-072-003, TC-072-104のフラグ管理要件
      await this.setPermissionPendingFlag(true);
      await DownloadLogger.logSuccess('permission_request_start', 'ダウンロード権限要求を開始');

      // 【権限要求ダイアログ表示】: Chrome APIによるユーザー確認ダイアログ
      const granted = await chrome.permissions.request({
        permissions: [this.PERMISSION_NAME],
      });

      // 【要求結果処理】: ユーザーの選択に応じた後処理
      const result = await this.processPermissionResponse(granted, previousState);

      return result;
    } catch (error) {
      // 【権限要求エラー処理】: API例外時の適切なエラー処理とフラグ管理
      await DownloadLogger.logError(
        'permission_request_error',
        `権限要求中にエラー: ${error.message}`
      );

      // 【エラー時フラグ管理】: 例外発生時もフラグ状態を適切に管理
      await this.setPermissionPendingFlag(false);

      return {
        granted: false,
        previousState: previousState,
        userResponse: 'error',
        message: '権限要求中にエラーが発生しました',
      };
    }
  }

  /**
   * 【権限要求レスポンス処理】: ユーザーの権限要求への応答を適切に処理
   * 【処理内容】: 応答に応じたフラグ更新、ログ記録、結果構築
   *
   * @param granted - 権限が承諾されたかどうか
   * @param previousState - 要求前の権限状態
   * @returns Promise<PermissionRequestResult> - 処理結果
   */
  private static async processPermissionResponse(
    granted: boolean,
    previousState: boolean
  ): Promise<PermissionRequestResult> {
    if (granted) {
      // 【権限承諾処理】: 承諾時のフラグクリアとログ記録
      // 【テスト対応】: TC-072-003のpermissionPendingフラグ解除要件
      await this.setPermissionPendingFlag(false);
      await DownloadLogger.logSuccess('permission_granted', 'ダウンロード権限が承諾されました');

      return {
        granted: true,
        previousState: previousState,
        userResponse: 'granted',
        message: 'ダウンロード権限が承諾されました',
      };
    } else {
      // 【権限拒否処理】: 拒否時のフラグ維持とログ記録
      // 【テスト対応】: TC-072-101, TC-072-104の権限拒否要件
      // 注意: 拒否時はpermissionPendingフラグをtrueのまま維持（TC-072-104要件）
      await DownloadLogger.logError('permission_denied', 'ダウンロード権限が拒否されました');

      return {
        granted: false,
        previousState: previousState,
        userResponse: 'denied',
        message: 'ダウンロード権限が拒否されました',
      };
    }
  }

  /**
   * 【次アクション決定】: 権限状態とpendingフラグから次の処理を決定
   * 【決定ロジック】: 状態の組み合わせから最適なアクションを判定
   *
   * @param hasPermission - Chrome API レベルでの権限付与状態
   * @param isPending - アプリケーションレベルでの権限要求中状態
   * @returns PermissionCheckResult - 状態分析結果と推奨アクション
   */
  private static determineNextAction(
    hasPermission: boolean,
    isPending: boolean
  ): PermissionCheckResult {
    if (hasPermission) {
      // 【権限済み】: 既に権限があるため処理続行可能
      return {
        hasPermission: true,
        isPending: isPending,
        nextAction: 'proceed',
        message: 'ダウンロード権限は既に付与されています',
      };
    }

    if (isPending) {
      // 【要求中】: 以前の権限要求が拒否されている可能性
      return {
        hasPermission: false,
        isPending: true,
        nextAction: 'request',
        message: '前回の権限要求が拒否されたため、再要求が必要です',
      };
    }

    // 【未要求】: 初回の権限要求が必要
    return {
      hasPermission: false,
      isPending: false,
      nextAction: 'request',
      message: 'ダウンロード権限の要求が必要です',
    };
  }

  /**
   * 【permissionPendingフラグ取得】: ストレージから権限要求中フラグを取得
   * 【デフォルト値】: フラグが存在しない場合はfalseを返す
   *
   * @returns Promise<boolean> - 権限要求中かどうか
   */
  private static async getPermissionPendingFlag(): Promise<boolean> {
    try {
      const data = await chrome.storage.local.get([this.PENDING_FLAG_KEY]);
      return data[this.PENDING_FLAG_KEY] || false;
    } catch (error) {
      // 【読み込み失敗時のフォールバック】: ストレージアクセス失敗時は安全側の値を返す
      console.warn('permissionPendingフラグの読み込みに失敗:', error);
      return false;
    }
  }

  /**
   * 【permissionPendingフラグ設定】: ストレージに権限要求中フラグを保存
   * 【状態管理】: 権限要求の開始・完了に応じてフラグを適切に更新
   *
   * @param pending - 設定するフラグ値
   */
  private static async setPermissionPendingFlag(pending: boolean): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.PENDING_FLAG_KEY]: pending });
    } catch (error) {
      // 【設定失敗処理】: フラグ設定失敗時のエラーログ記録
      console.warn('permissionPendingフラグの設定に失敗:', error);
      // フラグ設定失敗は重要なため、上位に例外を通知
      throw error;
    }
  }

  /**
   * 【権限状態リセット】: 開発・テスト時の状態リセット用API
   * 【用途】: テスト環境のクリーンアップ、デバッグ支援
   * 【注意】: 本番環境では慎重に使用すること
   */
  static async resetPermissionState(): Promise<void> {
    try {
      await this.setPermissionPendingFlag(false);
      await DownloadLogger.logSuccess('permission_reset', '権限状態がリセットされました');
    } catch (error) {
      await DownloadLogger.logError(
        'permission_reset_error',
        `権限状態リセット中にエラー: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * 【権限状態取得API】: 外部からの現在権限状態取得用API
   * 【用途】: UI表示、状態確認、システム監視
   *
   * @returns Promise<object> - 現在の権限状態の詳細情報
   */
  static async getCurrentState(): Promise<{ hasPermission: boolean; isPending: boolean }> {
    try {
      const hasPermission = await chrome.permissions.contains({
        permissions: [this.PERMISSION_NAME],
      });
      const isPending = await this.getPermissionPendingFlag();

      return { hasPermission, isPending };
    } catch (error) {
      // 【状態取得失敗時のフォールバック】: エラー時は安全側の状態を返す
      return { hasPermission: false, isPending: false };
    }
  }
}
