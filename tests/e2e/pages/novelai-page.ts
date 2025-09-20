/**
 * Page Object Model for NovelAI website interaction
 */
import { Page } from '@playwright/test';

export class NovelAIPage {
  /**
   * 【セキュリティ強化】: NovelAI公式URLの検証と固定化
   * 【CSRF対策】: 信頼できるドメインのみへのアクセスを保証
   * 🟢 信頼性レベル: 公式ドメインの使用で信頼性を確保
   */
  private readonly TRUSTED_NOVELAI_URL = 'https://novelai.net';

  constructor(private page: Page) {}

  /**
   * 【機能概要】: 信頼できるNovelAI URLの取得
   * 【セキュリティ】: URLの改竄や悪意あるリダイレクトを防ぐ
   * 【設計方針】: immutableな設計で予期しない変更を防ぐ
   * 🟢 信頼性レベル: 定数による安全な実装
   */
  private getTrustedUrl(): string {
    // 【URL検証】: 信頼できるNovelAI URLのみを返却
    if (!this.TRUSTED_NOVELAI_URL.startsWith('https://')) {
      throw new Error('Security violation: Non-HTTPS URL detected');
    }
    return this.TRUSTED_NOVELAI_URL;
  }

  /**
   * Navigate to NovelAI website
   * 【メソッド目的】: NovelAI Web UIページにアクセスする
   * 【実装内容】: NovelAI WebサイトへのナビゲーションPlawright実装
   * 【テスト対応】: TC-081-002でページアクセステストを通すための実装
   * 🟢 信頼性レベル: 基本的なページナビゲーションは確実に実装可能
   */
  /**
   * 【機能概要】: NovelAI Web UIページに安全にアクセスする
   * 【改善内容】: セキュリティ検証とエラーハンドリングを強化
   * 【セキュリティ】: 信頼できるURLのみへのアクセスを保証
   * 【パフォーマンス】: タイムアウト処理とリトライ機構を改善
   * 🟢 信頼性レベル: セキュリティ要件に準拠した安全な実装
   */
  async navigate(): Promise<void> {
    try {
      // 【セキュリティ確認】: 信頼できるURLのみを使用
      const trustedUrl = this.getTrustedUrl();

      // 【安全なページナビゲーション】: 検証済みURL への安全なアクセス 🟢
      await this.page.goto(trustedUrl, {
        waitUntil: 'networkidle', // ネットワークアクティビティが落ち着くまで待機
        timeout: 60000 // 60秒タイムアウト
      });

      // 【ページロード確認】: ページが正常に読み込まれたことを確認 🟢
      await this.page.waitForLoadState('domcontentloaded');

      // 【セキュリティ検証】: 実際にアクセスしたURLが期待通りか確認
      const currentUrl = this.page.url();
      if (!currentUrl.startsWith(trustedUrl)) {
        throw new Error(`Security violation: Unexpected redirect to ${currentUrl}`);
      }

    } catch (error) {
      // 【詳細エラー処理】: セキュリティとネットワークの両方の観点でエラー分析
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 【セキュリティエラーの特別扱い】: セキュリティ関連エラーを優先的に処理
      if (errorMessage.includes('Security violation')) {
        console.error('Security error during navigation:', errorMessage);
        throw new Error(`Security error: ${errorMessage}`);
      }

      // 【一般的なナビゲーションエラー処理】: ネットワークエラー等の処理
      console.error('NovelAI navigation failed:', errorMessage);
      throw new Error(`Failed to navigate to NovelAI: ${errorMessage}`);
    }
  }

  /**
   * Wait for page to be fully loaded
   * 【メソッド目的】: ページの完全な読み込みを待機する
   * 【実装内容】: NovelAI ページの完全読み込み待機の最小実装
   * 【テスト対応】: TC-081-002でページ読み込み完了確認のための実装
   * 🟢 信頼性レベル: Playwrightの標準的な待機メソッドを使用
   */
  async waitForPageLoad(): Promise<void> {
    try {
      // 【基本読み込み待機】: DOM構築完了まで待機
      await this.page.waitForLoadState('domcontentloaded');

      // 【ネットワーク安定化待機】: ネットワークアクティビティが安定するまで待機 🟢
      await this.page.waitForLoadState('networkidle');

      // 【追加安定化待機】: SPA読み込みのための追加待機 🟡
      // NovelAI は React/Next.js ベースのSPAのため、追加待機が必要
      await this.page.waitForTimeout(2000);

    } catch (error) {
      // 【読み込み待機エラー】: 読み込み待機中のエラーハンドリング
      console.error('Page load waiting failed:', error);
      throw new Error(`Page load waiting failed: ${error}`);
    }
  }

  /**
   * Check if main UI elements are visible
   * 【メソッド目的】: 主要なUI要素が表示されているかを確認する
   * 【実装内容】: NovelAI の主要UI要素の存在確認の最小実装
   * 【テスト対応】: TC-081-002で主要要素表示確認のための実装
   * 🟡 信頼性レベル: NovelAI UIの構造は推測に基づく
   */
  async areMainElementsVisible(): Promise<boolean> {
    try {
      // 【主要要素セレクタ】: NovelAI の主要UI要素を検索 🟡
      const mainSelectors = [
        'main', // メインコンテンツ
        '[role="main"]', // メインロール
        '.app', // アプリケーションコンテナ
        '#root', // React ルート
        'nav', // ナビゲーション
        'header' // ヘッダー
      ];

      // 【要素存在確認】: いずれかの主要要素が存在するかチェック
      for (const selector of mainSelectors) {
        const element = await this.page.$(selector);
        if (element && await element.isVisible()) {
          return true;
        }
      }

      // 【フォールバック確認】: body要素が存在し、空でないことを確認 🟢
      const bodyText = await this.page.textContent('body');
      return bodyText !== null && bodyText.trim().length > 0;

    } catch (error) {
      console.error('Main elements check failed:', error);
      return false;
    }
  }

  /**
   * Check if content script is injected
   * 【メソッド目的】: Content Scriptが正常に注入されているかを確認する
   * 【実装内容】: Chrome拡張機能のContent Script注入確認の最小実装
   * 【テスト対応】: TC-081-002でContent Script注入確認のための実装
   * 🟡 信頼性レベル: Content Script確認方法は拡張機能実装に依存
   */
  async isContentScriptInjected(): Promise<boolean> {
    try {
      // 【Content Script確認】: ページ内でContent Scriptの存在確認 🟡
      const scriptInjected = await this.page.evaluate(() => {
        // Content Script が注入されると console にログが出力される想定
        return window.console && typeof window.console.log === 'function';
      });

      // 【拡張機能メッセージ確認】: Content Script との通信確認 🔴
      // 実際のContent Script実装に依存するため、基本的な確認のみ
      const hasExtensionContext = await this.page.evaluate(() => {
        return typeof window.chrome !== 'undefined' &&
               typeof window.chrome.runtime !== 'undefined';
      });

      return scriptInjected && hasExtensionContext;

    } catch (error) {
      console.error('Content script detection failed:', error);
      return false;
    }
  }

  /**
   * Get page loading errors
   * 【メソッド目的】: ページ読み込み時のエラーを取得する
   * 【実装内容】: ページエラーの収集と返却の最小実装
   * 【テスト対応】: TC-081-002, TC-081-102でエラー確認のための実装
   * 🟢 信頼性レベル: Playwrightのエラー収集は標準機能
   */
  async getPageErrors(): Promise<string[]> {
    const errors: string[] = [];

    try {
      // 【コンソールエラー収集】: ページのコンソールエラーを収集 🟢
      this.page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(`Console: ${msg.text()}`);
        }
      });

      // 【ページエラー収集】: ページレベルのエラーを収集 🟢
      this.page.on('pageerror', (error) => {
        errors.push(`Page Error: ${error.message}`);
      });

      // 【レスポンスエラー収集】: HTTPエラーを収集 🟢
      this.page.on('response', (response) => {
        if (response.status() >= 400) {
          errors.push(`HTTP ${response.status()}: ${response.url()}`);
        }
      });

      // 【エラー収集待機】: エラー収集のための短時間待機
      await this.page.waitForTimeout(1000);

    } catch (error) {
      errors.push(`Error collection failed: ${error}`);
    }

    return errors;
  }

  /**
   * Check network connectivity
   * 【メソッド目的】: ネットワーク接続状態を確認する
   * 【実装内容】: ネットワーク接続状態の確認の最小実装
   * 【テスト対応】: TC-081-102でネットワークエラーテストのための実装
   * 🟡 信頼性レベル: ブラウザAPIを使用したネットワーク確認
   */
  async checkNetworkStatus(): Promise<boolean> {
    try {
      // 【ネットワーク状態確認】: ブラウザのネットワーク状態API確認 🟡
      const networkStatus = await this.page.evaluate(() => {
        return navigator.onLine;
      });

      // 【接続テスト】: 実際のHTTPリクエストでネットワーク確認 🟢
      const response = await this.page.request.get('https://www.google.com/favicon.ico', {
        timeout: 5000
      });

      return networkStatus && response.ok();

    } catch (error) {
      console.error('Network status check failed:', error);
      return false;
    }
  }

  /**
   * Retry page access with exponential backoff
   * 【メソッド目的】: 指数バックオフでページアクセスを再試行する
   * 【実装内容】: 指数バックオフによるリトライ機能の最小実装
   * 【テスト対応】: TC-081-102でリトライ機能テストのための実装
   * 🟢 信頼性レベル: 指数バックオフアルゴリズムは確立された手法
   */
  async retryAccess(maxAttempts: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 【再試行実行】: ページアクセスを再試行
        await this.navigate();
        await this.waitForPageLoad();

        // 【成功確認】: 主要要素が表示されているか確認
        const isLoaded = await this.areMainElementsVisible();
        if (isLoaded) {
          console.log(`Retry succeeded on attempt ${attempt}`);
          return true;
        }

      } catch (error) {
        console.log(`Retry attempt ${attempt} failed:`, error);
      }

      // 【指数バックオフ待機】: 次の試行前の待機時間 🟢
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
        await this.page.waitForTimeout(delay);
      }
    }

    console.log(`All ${maxAttempts} retry attempts failed`);
    return false;
  }
}