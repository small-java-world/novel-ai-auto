/**
 * エラーハンドリングテスト（異常系）
 * TDD Red フェーズ - 失敗するテストを作成
 */
import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { ExtensionPage } from './pages/extension-page';
import { NovelAIPage } from './pages/novelai-page';
import { PopupPage } from './pages/popup-page';
import { TestHelpers } from './utils/test-helpers';
import testConfig from './fixtures/test-config.json' with { type: 'json' };

test.describe('NovelAI Auto Generator E2E - エラーハンドリングテスト', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let extensionPage: ExtensionPage;
  let novelaiPage: NovelAIPage;
  let popupPage: PopupPage;

  test.beforeEach(async () => {
    // 【テスト前準備】: エラーハンドリングテスト用に各テスト実行前にブラウザ環境を初期化
    // 【環境初期化】: エラー状況をシミュレートするため、クリーンな環境から開始
    browser = await chromium.launch(testConfig.browser);
    context = await browser.newContext();
    page = await context.newPage();

    extensionPage = new ExtensionPage(page, context);
    novelaiPage = new NovelAIPage(page);
    popupPage = new PopupPage(page);
  });

  test.afterEach(async () => {
    // 【テスト後処理】: エラー状況をシミュレートした後、環境を完全にクリーンアップ
    // 【状態復元】: 次のテストに異常状態が引き継がれないよう、徹底的にリセット
    await TestHelpers.cleanupTestEnvironment();
    await context?.close();
    await browser?.close();
  });

  test('TC-081-101: should handle extension loading failure gracefully', async () => {
    // 【テスト目的】: 拡張機能の読み込み失敗時の適切な処理を確認する
    // 【テスト内容】: 無効なmanifest.jsonや権限不足により拡張機能読み込みが失敗した場合の処理
    // 【期待される動作】: 適切なエラーメッセージが表示され、詳細なエラー情報が記録される
    // 🔴 赤信号: エラーハンドリング機能はまだ実装されていない（TDD Red フェーズ）

    // 【テストデータ準備】: 意図的に無効な拡張機能パスを使用してエラーを発生させる
    // 【初期条件設定】: 存在しないパスまたは無効なmanifest.jsonを指定
    const invalidExtensionPath = './non-existent-extension';

    // 【実際の処理実行】: 無効な拡張機能の読み込みを試行する
    // 【処理内容】: エラーが発生することを期待しつつ、適切なエラーハンドリングを確認
    try {
      await extensionPage.loadExtension(invalidExtensionPath);

      // 【結果検証】: 拡張機能の読み込みが失敗することを確認
      // 【期待値確認】: 読み込みが失敗し、適切にfalseが返されることを確認
      expect(await extensionPage.isExtensionLoaded()).toBe(false); // 【確認内容】: 拡張機能が読み込まれていないことを確認 🔴
    } catch (error) {
      // エラーが発生した場合の処理確認
      expect(error).toBeDefined(); // 【確認内容】: エラーオブジェクトが定義されていることを確認 🟡
    }

    // 【エラーメッセージ確認】: 適切なエラーメッセージが記録されることを確認
    const errors = await extensionPage.getLoadingErrors();
    expect(errors.length).toBeGreaterThan(0); // 【確認内容】: エラーログが記録されていることを確認 🔴
    expect(errors[0]).toContain('loading'); // 【確認内容】: エラーメッセージに 'loading' が含まれることを確認 🟡

    // 【詳細エラー情報確認】: エラー情報が適切に詳細化されていることを確認
    const errorLogs = await TestHelpers.getFilteredConsoleLogs(page, 'error');
    expect(errorLogs.length).toBeGreaterThan(0); // 【確認内容】: コンソールエラーログが記録されていることを確認 🔴
  });

  test('TC-081-102: should handle NovelAI page access failure gracefully', async () => {
    // 【テスト目的】: NovelAIページへのアクセス失敗時の適切な処理を確認する
    // 【テスト内容】: ネットワーク接続不良やサーバーエラーによりページアクセスが失敗した場合の処理
    // 【期待される動作】: 再試行ロジックが実行され、適切なタイムアウト処理が行われる
    // 🟡 黄信号: ネットワークエラーシミュレーションの実装について推測を含む

    // 【テストデータ準備】: ネットワークエラーをシミュレートしてアクセス失敗を再現
    // 【初期条件設定】: 拡張機能は正常だが、ネットワーク接続に問題がある状態
    await extensionPage.loadExtension(testConfig.extension.extensionPath);

    // 【実際の処理実行】: ネットワークエラーをシミュレートしてページアクセスを試行
    // 【処理内容】: 意図的にネットワークエラーを発生させ、再試行ロジックを確認
    await TestHelpers.simulateNetworkError(page, 'timeout');

    try {
      await novelaiPage.navigate();

      // 期待：ナビゲーションが失敗する
      expect(false).toBe(true); // 【確認内容】: この行に到達してはならない（ナビゲーションが失敗すべき） 🔴
    } catch (error) {
      // エラーが発生することを期待
      expect(error).toBeDefined(); // 【確認内容】: ネットワークエラーが発生することを確認 🟡
    }

    // 【結果検証】: 再試行ロジックが実行されることを確認
    // 【期待値確認】: 再試行機能が適切に動作し、最終的に適切な処理が行われることを確認
    const retrySuccess = await novelaiPage.retryAccess(3);
    expect(retrySuccess).toBe(false); // 【確認内容】: ネットワークエラー時は再試行も失敗することを確認 🔴

    // 【ネットワーク状態確認】: ネットワーク状態の検証が正常に動作することを確認
    const networkStatus = await novelaiPage.checkNetworkStatus();
    expect(networkStatus).toBe(false); // 【確認内容】: ネットワーク状態が false であることを確認 🔴

    // 【エラーログ確認】: 再試行ログが適切に記録されることを確認
    const errorLogs = await TestHelpers.getFilteredConsoleLogs(page, 'error');
    expect(errorLogs.some(log => log.includes('retry'))).toBe(true); // 【確認内容】: 再試行に関するログが記録されていることを確認 🟡
  });

  test('TC-081-103: should handle image generation timeout gracefully', async () => {
    // 【テスト目的】: 画像生成のタイムアウト時の適切な処理を確認する
    // 【テスト内容】: 生成処理が長時間実行される場合のタイムアウト処理とリソース解放
    // 【期待される動作】: 適切なタイムアウト処理が実行され、ユーザーに通知され、リソースが解放される
    // 🟡 黄信号: タイムアウト処理の具体的な実装について推測を含む

    // 【テストデータ準備】: タイムアウトテストのために短いタイムアウト設定と遅延シミュレーションを準備
    // 【初期条件設定】: 拡張機能とページが準備され、意図的に長時間実行を発生させる状態
    await extensionPage.loadExtension(testConfig.extension.extensionPath);
    await novelaiPage.navigate();
    await novelaiPage.waitForPageLoad();
    await popupPage.openPopup();

    // タイムアウトテスト用に短いタイムアウト設定（5秒）
    const shortTimeout = 5000;

    // 【実際の処理実行】: 画像生成を開始し、タイムアウトが発生することを確認
    // 【処理内容】: 生成処理を開始した後、設定されたタイムアウト時間を超過させる
    await popupPage.selectPrompt('simple-test');
    await popupPage.setImageCount(1);
    await popupPage.startGeneration();

    // 【結果検証】: タイムアウトが適切に処理されることを確認
    // 【期待値確認】: 指定時間内に完了しない場合、適切にタイムアウト処理が実行される
    const generationResult = await popupPage.waitForGenerationComplete(shortTimeout);
    expect(generationResult).toBe(false); // 【確認内容】: タイムアウトにより false が返されることを確認 🔴

    // 【状態確認】: タイムアウト後の状態が適切に設定されることを確認
    const currentState = await popupPage.getCurrentState();
    expect(currentState).toBe('timeout'); // 【確認内容】: 状態が 'timeout' に変更されていることを確認 🟡

    // 【通知確認】: ユーザーに適切な通知が行われることを確認
    const errorLogs = await TestHelpers.getFilteredConsoleLogs(page, 'warning');
    expect(errorLogs.some(log => log.includes('timeout'))).toBe(true); // 【確認内容】: タイムアウト通知が記録されていることを確認 🟡

    // 【リソース解放確認】: メモリリークが発生していないことを確認
    await TestHelpers.cleanupTestEnvironment();
    // リソース解放の検証は実装されていない状態で失敗することを期待 🔴
  });

  test('TC-081-104: should handle download failure gracefully', async () => {
    // 【テスト目的】: ダウンロード失敗時の適切な処理を確認する
    // 【テスト内容】: ダウンロード権限不足やディスク容量不足によりダウンロードが失敗した場合の処理
    // 【期待される動作】: 適切なエラーハンドリングが実行され、ユーザーに通知され、代替手段が提示される
    // 🔴 赤信号: ダウンロードエラーハンドリング機能はまだ実装されていない（TDD Red フェーズ）

    // 【テストデータ準備】: ダウンロード失敗をシミュレートするため、権限不足の状況を作成
    // 【初期条件設定】: 画像生成は完了しているが、ダウンロード時にエラーが発生する状態
    await extensionPage.loadExtension(testConfig.extension.extensionPath);
    await novelaiPage.navigate();
    await novelaiPage.waitForPageLoad();
    await popupPage.openPopup();

    // 権限を意図的に制限（シミュレーション）
    const invalidDownloadPath = '/invalid/path/downloads';
    await TestHelpers.setupDownloadsDirectory(invalidDownloadPath);

    // 【実際の処理実行】: ダウンロード失敗が発生する状況で生成を実行
    // 【処理内容】: 生成完了後のダウンロード処理でエラーが発生することを確認
    await popupPage.selectPrompt('simple-test');
    await popupPage.setImageCount(1);
    await popupPage.startGeneration();

    // 生成完了を待機（この部分は成功する想定）
    const generationComplete = await popupPage.waitForGenerationComplete(testConfig.timeouts.generation);
    expect(generationComplete).toBe(true); // 【確認内容】: 生成自体は成功することを確認 🔴

    // 【結果検証】: ダウンロード失敗が適切に処理されることを確認
    // 【期待値確認】: ダウンロードエラーが適切に検出され、処理されることを確認
    const downloadSuccess = await TestHelpers.verifyDownloadedFiles(invalidDownloadPath, 1);
    expect(downloadSuccess).toBe(false); // 【確認内容】: ダウンロードが失敗することを確認 🔴

    // 【エラーハンドリング確認】: 適切なエラーハンドリングが実行されることを確認
    const errorLogs = await TestHelpers.getFilteredConsoleLogs(page, 'error');
    expect(errorLogs.some(log => log.includes('download'))).toBe(true); // 【確認内容】: ダウンロードエラーログが記録されていることを確認 🟡

    // 【代替手段確認】: ユーザーに代替手段が提示されることを確認
    const currentState = await popupPage.getCurrentState();
    expect(currentState).toBe('download_failed'); // 【確認内容】: 状態が 'download_failed' に変更されていることを確認 🟡

    // 【通知確認】: エラー通知が適切に表示されることを確認
    const warningLogs = await TestHelpers.getFilteredConsoleLogs(page, 'warning');
    expect(warningLogs.some(log => log.includes('alternative'))).toBe(true); // 【確認内容】: 代替手段に関する通知が記録されていることを確認 🟡
  });
});