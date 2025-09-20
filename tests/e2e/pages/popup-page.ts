/**
 * Page Object Model for Extension Popup UI interaction
 * 【リファクタ改善】: 共通ヘルパーを活用してコード品質を向上
 */
import { Page } from '@playwright/test';
import { ExtensionHelpers } from '../utils/extension-helpers';

export class PopupPage {
  constructor(private page: Page) {}

  /**
   * Open extension popup
   * 【メソッド目的】: 拡張機能のポップアップを開く
   * 【実装内容】: Chrome拡張機能のポップアップを開く最小実装
   * 【テスト対応】: TC-081-003でポップアップUI操作テストのための実装
   * 🟡 信頼性レベル: Playwrightの拡張機能ポップアップ操作は推測含む
   */
  /**
   * 【機能概要】: 拡張機能のポップアップを安全に開く
   * 【改善内容】: 動的な拡張機能ID取得に変更し、セキュリティを強化
   * 【設計方針】: 実際の拡張機能IDを使用して、テストの信頼性を向上
   * 【セキュリティ】: ハードコードされたダミーIDの使用を排除
   * 🟢 信頼性レベル: Chrome Extension APIと連携した安全な実装
   */
  /**
   * 【機能概要】: 拡張機能のポップアップを安全に開く
   * 【リファクタ改善】: 共通ヘルパーを使用してコードの重複を削除
   * 【保守性向上】: URL構築ロジックを一箇所に集約
   * 🟢 信頼性レベル: 共通ヘルパーによる統一された実装
   */
  async openPopup(): Promise<void> {
    try {
      // 【共通ロジック活用】: ExtensionHelpersで安全なポップアップURL構築 🟢
      const context = this.page.context();
      const popupUrl = await ExtensionHelpers.buildPopupUrl(context);

      // 【安全なポップアップアクセス】: 検証済みのURLを使用してアクセス
      await this.page.goto(popupUrl);

      // 【ポップアップ読み込み待機】: ポップアップのコンテンツが読み込まれるまで待機
      await this.page.waitForLoadState('domcontentloaded');

      // 【UI要素の読み込み待機】: 主要なUI要素が表示されるまで待機 🟢
      await this.page.waitForSelector('#promptSelect', { timeout: 10000 });

    } catch (error) {
      console.error('Popup opening failed:', error);
      throw new Error(`Failed to open popup: ${error}`);
    }
  }

  /**
   * Check if popup is visible
   * 【メソッド目的】: ポップアップが表示されているかを確認する
   * 【実装内容】: ポップアップの表示状態確認の最小実装
   * 【テスト対応】: TC-081-003でポップアップ表示確認のための実装
   * 🟢 信頼性レベル: DOM要素の存在確認は確実な方法
   */
  async isPopupVisible(): Promise<boolean> {
    try {
      // 【メインコンテナ確認】: ポップアップのメインコンテナが存在するか確認 🟢
      const containerVisible = await this.page.isVisible('.container');

      // 【重要要素確認】: ポップアップの重要要素が表示されているか確認 🟢
      const titleVisible = await this.page.isVisible('.title');
      const promptSelectVisible = await this.page.isVisible('#promptSelect');
      const generateButtonVisible = await this.page.isVisible('#generateButton');

      return containerVisible && titleVisible && promptSelectVisible && generateButtonVisible;

    } catch (error) {
      console.error('Popup visibility check failed:', error);
      return false;
    }
  }

  /**
   * Select prompt from dropdown
   * 【メソッド目的】: ドロップダウンからプロンプトを選択する
   * 【実装内容】: プロンプト選択ドロップダウンの操作最小実装
   * 【テスト対応】: TC-081-003, TC-081-004でプロンプト選択テストのための実装
   * 🟢 信頼性レベル: HTML select要素の操作は標準的な実装
   */
  async selectPrompt(promptName: string): Promise<void> {
    try {
      // 【入力値検証】: プロンプト名の有効性確認
      if (!promptName) {
        throw new Error('Prompt name is required');
      }

      // 【プロンプトセレクタ取得】: プロンプト選択ドロップダウンを取得 🟢
      const selectElement = await this.page.$('#promptSelect');
      if (!selectElement) {
        throw new Error('Prompt select element not found');
      }

      // 【プロンプト選択実行】: 指定されたプロンプトを選択 🟢
      await selectElement.selectOption(promptName);

      // 【選択確認】: 選択が正常に行われたか確認 🟢
      const selectedValue = await selectElement.inputValue();
      if (selectedValue !== promptName) {
        throw new Error(`Failed to select prompt: expected ${promptName}, got ${selectedValue}`);
      }

    } catch (error) {
      console.error('Prompt selection failed:', error);
      throw new Error(`Failed to select prompt '${promptName}': ${error}`);
    }
  }

  /**
   * Set image count
   * 【メソッド目的】: 生成する画像枚数を設定する
   * 【実装内容】: 画像生成枚数入力フィールドの設定最小実装
   * 【テスト対応】: TC-081-004で画像枚数設定テストのための実装
   * 🟢 信頼性レベル: HTML number inputの操作は標準的な実装
   */
  async setImageCount(count: number): Promise<void> {
    try {
      // 【入力値検証】: 画像枚数の有効性確認
      if (count < 1 || count > 10) {
        throw new Error('Image count must be between 1 and 10');
      }

      // 【枚数入力フィールド取得】: 画像枚数入力フィールドを取得 🟢
      const countInput = await this.page.$('#imageCount');
      if (!countInput) {
        throw new Error('Image count input element not found');
      }

      // 【枚数設定実行】: 入力フィールドに枚数を設定 🟢
      await countInput.clear();
      await countInput.fill(count.toString());

      // 【設定確認】: 値が正常に設定されたか確認 🟢
      const currentValue = await countInput.inputValue();
      if (parseInt(currentValue) !== count) {
        throw new Error(`Failed to set image count: expected ${count}, got ${currentValue}`);
      }

    } catch (error) {
      console.error('Image count setting failed:', error);
      throw new Error(`Failed to set image count to ${count}: ${error}`);
    }
  }

  /**
   * Click start generation button
   * 【メソッド目的】: 画像生成開始ボタンをクリックする
   * 【実装内容】: 生成開始ボタンのクリック操作最小実装
   * 【テスト対応】: TC-081-004で生成フローテストのための実装
   * 🟢 信頼性レベル: HTMLボタンクリックは標準的な実装
   */
  async startGeneration(): Promise<void> {
    try {
      // 【生成ボタン取得】: 生成開始ボタンを取得 🟢
      const generateButton = await this.page.$('#generateButton');
      if (!generateButton) {
        throw new Error('Generate button not found');
      }

      // 【ボタン有効性確認】: ボタンがクリック可能か確認 🟢
      const isEnabled = await generateButton.isEnabled();
      if (!isEnabled) {
        throw new Error('Generate button is disabled');
      }

      // 【ボタンクリック実行】: 生成開始ボタンをクリック 🟢
      await generateButton.click();

      // 【クリック後待機】: クリック処理が完了するまで待機
      await this.page.waitForTimeout(500);

    } catch (error) {
      console.error('Generation start failed:', error);
      throw new Error(`Failed to start generation: ${error}`);
    }
  }

  /**
   * Check if UI elements are interactive
   * 【メソッド目的】: UI要素が操作可能かどうかを確認する
   * 【実装内容】: ポップアップUI要素の操作可能性確認の最小実装
   * 【テスト対応】: TC-081-003でUI要素操作テストのための実装
   * 🟢 信頼性レベル: DOM要素の操作可能性確認は標準的
   */
  async areElementsInteractive(): Promise<boolean> {
    try {
      // 【主要UI要素の操作可能性確認】: 重要なUI要素が操作可能かチェック 🟢
      const interactiveElements = [
        '#promptSelect',
        '#imageCount',
        '#generateButton'
      ];

      for (const selector of interactiveElements) {
        const element = await this.page.$(selector);
        if (!element) {
          console.log(`Element ${selector} not found`);
          return false;
        }

        // 【要素状態確認】: 要素が表示されており、有効か確認
        const isVisible = await element.isVisible();
        const isEnabled = await element.isEnabled();

        if (!isVisible || !isEnabled) {
          console.log(`Element ${selector} is not interactive: visible=${isVisible}, enabled=${isEnabled}`);
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('Element interaction check failed:', error);
      return false;
    }
  }

  /**
   * Get current UI state
   * 【メソッド目的】: 現在のUI状態を取得する
   * 【実装内容】: ポップアップの現在の状態取得の最小実装
   * 【テスト対応】: TC-081-003, TC-081-004で状態確認テストのための実装
   * 🟡 信頼性レベル: ポップアップの状態管理方法は実装依存
   */
  async getCurrentState(): Promise<string> {
    try {
      // 【JavaScript経由で状態取得】: ポップアップのJavaScriptから状態取得 🟡
      const state = await this.page.evaluate(() => {
        // popup.js で定義された getCurrentState 関数を呼び出し
        if (typeof window.getCurrentState === 'function') {
          return window.getCurrentState();
        }
        // フォールバック: DOMから状態推定
        return 'unknown';
      });

      if (state && state !== 'unknown') {
        return state;
      }

      // 【DOMから状態推定】: JavaScriptから取得できない場合、DOMから推定 🟡
      const statusText = await this.page.textContent('#statusText');

      if (statusText) {
        const statusMap = {
          '待機中': 'ready',
          '生成中': 'generating',
          '完了': 'completed',
          'エラー': 'error'
        };
        return statusMap[statusText] || 'ready';
      }

      return 'ready'; // デフォルト状態

    } catch (error) {
      console.error('State retrieval failed:', error);
      return 'error';
    }
  }

  /**
   * Monitor progress display
   * 【メソッド目的】: 進捗表示を監視する
   * 【実装内容】: 進捗ログの収集と監視の最小実装
   * 【テスト対応】: TC-081-004で進捗監視テストのための実装
   * 🟡 信頼性レベル: 進捗ログの収集方法は実装依存
   */
  async monitorProgress(): Promise<string[]> {
    try {
      // 【JavaScript経由でログ取得】: ポップアップのJavaScriptから進捗ログ取得 🟡
      const logs = await this.page.evaluate(() => {
        // popup.js で定義された getProgressLogs 関数を呼び出し
        if (typeof window.getProgressLogs === 'function') {
          return window.getProgressLogs();
        }
        return [];
      });

      if (logs && logs.length > 0) {
        return logs;
      }

      // 【DOMからログ収集】: JavaScriptから取得できない場合、DOMからログ収集 🟡
      const logEntries = await this.page.$$('.log-entry .log-message');
      const domLogs: string[] = [];

      for (const entry of logEntries) {
        const text = await entry.textContent();
        if (text) {
          domLogs.push(text);
        }
      }

      return domLogs;

    } catch (error) {
      console.error('Progress monitoring failed:', error);
      return [];
    }
  }

  /**
   * Wait for generation completion
   * 【メソッド目的】: 画像生成の完了を待機する
   * 【実装内容】: 生成完了までの待機処理の最小実装
   * 【テスト対応】: TC-081-005で生成完了確認テストのための実装
   * 🟡 信頼性レベル: 状態変化の監視方法は実装依存
   */
  async waitForGenerationComplete(timeout: number = 300000): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 1000; // 1秒ごとにチェック

    try {
      while (Date.now() - startTime < timeout) {
        // 【状態確認】: 現在の状態を確認し、完了を待機 🟡
        const currentState = await this.getCurrentState();

        if (currentState === 'completed') {
          return true;
        }

        if (currentState === 'error' || currentState === 'timeout') {
          console.log(`Generation failed with state: ${currentState}`);
          return false;
        }

        // 【待機】: 次のチェックまで待機
        await this.page.waitForTimeout(pollInterval);
      }

      // 【タイムアウト】: 指定時間内に完了しなかった場合
      console.log(`Generation timed out after ${timeout}ms`);
      return false;

    } catch (error) {
      console.error('Generation completion waiting failed:', error);
      return false;
    }
  }
}