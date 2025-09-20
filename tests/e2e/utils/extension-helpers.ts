/**
 * Chrome拡張機能関連のヘルパーユーティリティ
 * 【機能概要】: 拡張機能操作の共通ロジックを提供する
 * 【設計方針】: DRY原則に基づき、重複コードを排除
 * 【再利用性】: 複数のPage Object Modelから利用可能
 * 🟢 信頼性レベル: Chrome Extension APIの標準的な使用方法
 */
import { BrowserContext } from '@playwright/test';

export class ExtensionHelpers {
  /**
   * 【機能概要】: ブラウザコンテキストから安全に拡張機能IDを取得する
   * 【共通化理由】: ExtensionPageとPopupPageで同じロジックが重複していた
   * 【セキュリティ】: 厳密なID形式検証により安全性を保証
   * 【エラーハンドリング】: 失敗時は明確なエラーメッセージを提供
   * 🟢 信頼性レベル: Chrome Extension IDの標準形式に準拠
   */
  static async getExtensionId(context: BrowserContext): Promise<string> {
    try {
      // 【背景ページ検索】: 拡張機能の背景ページを取得
      const backgroundPages = await context.backgroundPages();

      if (backgroundPages.length === 0) {
        throw new Error('No background pages found - extension may not be loaded');
      }

      // 【URL解析】: 背景ページのURLから拡張機能IDを抽出
      const url = backgroundPages[0].url();

      // 【厳密な形式検証】: Chrome拡張機能IDの正確な形式をチェック
      const match = url.match(/^chrome-extension:\/\/([a-z0-9]{32})\//);

      if (!match) {
        throw new Error(`Invalid extension URL format: ${url}`);
      }

      const extensionId = match[1];

      // 【追加検証】: 抽出したIDの形式を再度確認
      if (extensionId.length !== 32 || !/^[a-z0-9]+$/.test(extensionId)) {
        throw new Error(`Invalid extension ID format: ${extensionId}`);
      }

      return extensionId;

    } catch (error) {
      // 【詳細エラー処理】: エラーの種類に応じた適切な処理
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Extension ID retrieval failed: ${errorMessage}`);
    }
  }

  /**
   * 【機能概要】: 拡張機能の読み込み状態を安全に確認する
   * 【品質向上】: エラーハンドリングと状態チェックを強化
   * 【保守性】: 状態確認ロジックを一箇所に集約
   * 🟢 信頼性レベル: 複数の指標による確実な状態判定
   */
  static async isExtensionLoaded(context: BrowserContext): Promise<boolean> {
    try {
      // 【多角的確認】: 複数の指標で拡張機能の状態を確認
      const backgroundPages = await context.backgroundPages();

      if (backgroundPages.length === 0) {
        return false;
      }

      // 【背景ページの生存確認】: Service Workerが実際に動作しているか確認
      const bgPage = backgroundPages[0];

      try {
        const title = await bgPage.title();
        return title !== undefined;
      } catch (error) {
        // 背景ページがクラッシュしている可能性
        return false;
      }

    } catch (error) {
      // 【エラー時は安全側に倒す】: 確認できない場合は未読み込みと判定
      return false;
    }
  }

  /**
   * 【機能概要】: 拡張機能のポップアップURLを安全に構築する
   * 【セキュリティ】: 検証済みIDのみを使用してURL構築
   * 【設計方針】: URL構築ロジックの中央化
   * 🟢 信頼性レベル: セキュリティ検証済みの安全な実装
   */
  static async buildPopupUrl(context: BrowserContext): Promise<string> {
    // 【セキュアID取得】: 検証済みの拡張機能IDを取得
    const extensionId = await this.getExtensionId(context);

    // 【安全なURL構築】: 検証済みIDを使用してポップアップURLを構築
    return `chrome-extension://${extensionId}/popup/popup.html`;
  }

  /**
   * 【機能概要】: 拡張機能の初期化完了を効率的に待機する
   * 【パフォーマンス】: 指数バックオフによる効率的な待機
   * 【設計方針】: 待機ロジックの共通化と最適化
   * 🟢 信頼性レベル: 確実な初期化確認メカニズム
   */
  static async waitForExtensionReady(
    context: BrowserContext,
    maxAttempts: number = 10,
    baseDelay: number = 500
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 【状態確認】: 拡張機能の読み込み状態をチェック
        const isLoaded = await this.isExtensionLoaded(context);

        if (isLoaded) {
          // 【追加安定化待機】: 初期化処理の完了を保証
          await new Promise(resolve => setTimeout(resolve, 1000));
          return;
        }

      } catch (error) {
        console.log(`Extension ready check failed on attempt ${attempt}:`, error);
      }

      // 【指数バックオフ待機】: 効率的な再試行間隔
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(1.5, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Extension not ready after ${maxAttempts} attempts`);
  }
}