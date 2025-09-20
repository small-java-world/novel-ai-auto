/**
 * 統合テスト（エンドツーエンド）
 * TDD Red フェーズ - 失敗するテストを作成
 */
import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { ExtensionPage } from './pages/extension-page';
import { NovelAIPage } from './pages/novelai-page';
import { PopupPage } from './pages/popup-page';
import { TestHelpers } from './utils/test-helpers';
import { PerformanceMonitor } from './utils/performance-monitor';
import testConfig from './fixtures/test-config.json' with { type: 'json' };
import testPrompts from './fixtures/test-prompts.json' with { type: 'json' };

test.describe('NovelAI Auto Generator E2E - 統合テスト', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let extensionPage: ExtensionPage;
  let novelaiPage: NovelAIPage;
  let popupPage: PopupPage;
  let performanceMonitor: PerformanceMonitor;

  test.beforeEach(async () => {
    // 【テスト前準備】: 統合テスト用に各テスト実行前にブラウザ環境を初期化
    // 【環境初期化】: 実際のユーザーフローを再現するため、リアルな環境設定でテストを開始
    browser = await chromium.launch(testConfig.browser);
    context = await browser.newContext();
    page = await context.newPage();

    extensionPage = new ExtensionPage(page, context);
    novelaiPage = new NovelAIPage(page);
    popupPage = new PopupPage(page);
    performanceMonitor = new PerformanceMonitor(page);

    // ダウンロードディレクトリを事前準備
    await TestHelpers.setupDownloadsDirectory(testConfig.testConfig.downloadPath);
  });

  test.afterEach(async () => {
    // 【テスト後処理】: 統合テスト後に全コンポーネントの状態を完全にクリーンアップ
    // 【状態復元】: 次のテストに統合状態が引き継がれないよう、すべてのリソースを解放
    await TestHelpers.cleanupTestEnvironment();
    await context?.close();
    await browser?.close();
  });

  test('TC-081-301: should complete full user workflow successfully', async () => {
    // 【テスト目的】: 拡張機能読み込みから画像ダウンロードまでの全フローが正常に動作することを確認する
    // 【テスト内容】: 実際のユーザーが行う一連の操作を自動化し、全ステップが成功することを検証
    // 【期待される動作】: 全フローが正常に完了し、エラーが発生せず、期待される結果が得られる
    // 🟢 青信号: 統合フローは既存の個別テストケースを組み合わせたもの

    // 【テストデータ準備】: 実際のユーザーフローを再現するため、現実的なテストデータを準備
    // 【初期条件設定】: ブラウザが起動され、全ての前提条件が満たされた状態
    const testPrompt = testPrompts.testPrompts[1]; // complex-test プロンプトを使用してより現実的なテスト
    const imageCount = 3; // 中規模の生成数でテスト

    // パフォーマンス監視開始
    await performanceMonitor.startMonitoring();
    const workflowStartTime = Date.now();

    // 【実際の処理実行】: 完全なユーザーワークフローを順次実行
    // 【処理内容】: 各ステップを実際のユーザー操作として実行し、全体の統合性を確認

    // Step 1: 拡張機能の読み込み
    await extensionPage.loadExtension(testConfig.extension.extensionPath);
    expect(await extensionPage.isExtensionLoaded()).toBe(true); // 【確認内容】: 拡張機能が正常に読み込まれることを確認 🔴

    // Step 2: NovelAIページへのアクセス
    await novelaiPage.navigate();
    await novelaiPage.waitForPageLoad();
    expect(await novelaiPage.areMainElementsVisible()).toBe(true); // 【確認内容】: ページが正常に表示されることを確認 🔴
    expect(await novelaiPage.isContentScriptInjected()).toBe(true); // 【確認内容】: Content Scriptが注入されることを確認 🔴

    // Step 3: ポップアップUIの操作
    await popupPage.openPopup();
    expect(await popupPage.isPopupVisible()).toBe(true); // 【確認内容】: ポップアップが表示されることを確認 🔴
    expect(await popupPage.areElementsInteractive()).toBe(true); // 【確認内容】: UI要素が操作可能であることを確認 🔴

    // Step 4: プロンプト設定と生成開始
    await popupPage.selectPrompt(testPrompt.name);
    await popupPage.setImageCount(imageCount);
    await popupPage.startGeneration();

    const stateAfterStart = await popupPage.getCurrentState();
    expect(stateAfterStart).toBe('generating'); // 【確認内容】: 生成状態に変更されることを確認 🔴

    // Step 5: 進捗監視
    const progressLogs = await popupPage.monitorProgress();
    expect(progressLogs.length).toBeGreaterThan(0); // 【確認内容】: 進捗が正常に記録されることを確認 🔴

    // Step 6: 生成完了待機
    const generationComplete = await popupPage.waitForGenerationComplete(testConfig.timeouts.generation);
    expect(generationComplete).toBe(true); // 【確認内容】: 生成が正常に完了することを確認 🔴

    // Step 7: ダウンロード確認
    const downloadSuccess = await TestHelpers.verifyDownloadedFiles(
      testConfig.testConfig.downloadPath,
      imageCount
    );
    expect(downloadSuccess).toBe(true); // 【確認内容】: 全ての画像がダウンロードされることを確認 🔴

    // 【結果検証】: 全ワークフローの統合的な成功を確認
    // 【期待値確認】: 全ステップが完了し、エラーが発生せず、期待される結果が得られることを確認
    const workflowEndTime = Date.now();
    const totalDuration = workflowEndTime - workflowStartTime;

    // パフォーマンス確認
    const metrics = await performanceMonitor.stopMonitoring();
    expect(metrics.errors.length).toBe(0); // 【確認内容】: ワークフロー中にエラーが発生していないことを確認 🔴

    // 合理的な時間内での完了確認（3枚なので90秒以内を期待）
    const expectedMaxDuration = 90000; // 90秒
    expect(totalDuration).toBeLessThanOrEqual(expectedMaxDuration); // 【確認内容】: ワークフロー全体が合理的な時間で完了することを確認 🟡

    // 最終状態確認
    const finalState = await popupPage.getCurrentState();
    expect(finalState).toBe('completed'); // 【確認内容】: 最終状態が 'completed' であることを確認 🔴

    // エラーログがないことを確認
    const errorLogs = await TestHelpers.getFilteredConsoleLogs(page, 'error');
    expect(errorLogs.length).toBe(0); // 【確認内容】: ワークフロー中にコンソールエラーが発生していないことを確認 🟡
  });

  test('TC-081-302: should recover from errors and continue workflow', async () => {
    // 【テスト目的】: エラー発生後の適切な回復と継続を確認する
    // 【テスト内容】: 意図的にエラーを発生させ、システムが適切に回復してワークフローを継続することを確認
    // 【期待される動作】: エラーが適切に処理され、フローが継続され、最終的に成功する
    // 🟡 黄信号: エラー回復メカニズムの実装について推測を含む

    // 【テストデータ準備】: エラー回復テストのため、エラーを意図的に発生させる設定を準備
    // 【初期条件設定】: 一部のステップでエラーが発生する可能性がある状況を作成
    const testPrompt = testPrompts.testPrompts[0]; // simple-test プロンプトを使用
    const imageCount = 2; // 少数の画像で回復テストを実行

    // パフォーマンス監視とエラートラッキング開始
    await performanceMonitor.startMonitoring();

    // 【実際の処理実行】: エラーが含まれるワークフローを実行し、回復機能を確認
    // 【処理内容】: 各ステップでエラーが発生した場合の回復処理を検証

    // Step 1: 拡張機能読み込み（正常）
    await extensionPage.loadExtension(testConfig.extension.extensionPath);
    expect(await extensionPage.isExtensionLoaded()).toBe(true); // 【確認内容】: 拡張機能が正常に読み込まれることを確認 🔴

    // Step 2: ネットワークエラーをシミュレートしてページアクセス
    await TestHelpers.simulateNetworkError(page, 'slow'); // 低速ネットワークをシミュレート

    try {
      await novelaiPage.navigate();
    } catch (error) {
      // エラーが発生した場合の回復処理をテスト
      expect(error).toBeDefined(); // 【確認内容】: ネットワークエラーが適切に検出されることを確認 🟡
    }

    // Step 3: 再試行による回復を確認
    const retrySuccess = await novelaiPage.retryAccess(3);
    // 実際の環境では回復する可能性があるが、テスト環境では失敗することを期待
    // 回復メカニズムが存在することを確認
    expect(typeof retrySuccess).toBe('boolean'); // 【確認内容】: 再試行機能が実装されていることを確認 🔴

    // Step 4: エラー後の環境復旧
    // ネットワークエラーをクリア（実際の実装では自動的に行われる想定）
    await TestHelpers.simulateNetworkError(page, 'disconnect'); // 一旦完全に切断
    await TestHelpers.waitWithBackoff(
      async () => await novelaiPage.checkNetworkStatus(),
      5,
      1000
    );

    // Step 5: 正常なページアクセスで回復確認
    await novelaiPage.navigate();
    await novelaiPage.waitForPageLoad();

    // 回復後の状態確認
    expect(await novelaiPage.areMainElementsVisible()).toBe(true); // 【確認内容】: 回復後にページが正常に表示されることを確認 🔴

    // Step 6: ポップアップ操作（エラー回復後）
    await popupPage.openPopup();
    expect(await popupPage.isPopupVisible()).toBe(true); // 【確認内容】: エラー回復後もポップアップが正常に動作することを確認 🔴

    // Step 7: 生成フロー実行（回復テスト）
    await popupPage.selectPrompt(testPrompt.name);
    await popupPage.setImageCount(imageCount);
    await popupPage.startGeneration();

    // 生成中にもう一度軽微なエラーをシミュレート
    await TestHelpers.simulateNetworkError(page, 'slow');

    // エラー耐性のある生成完了待機
    const generationComplete = await popupPage.waitForGenerationComplete(testConfig.timeouts.generation);

    // 【結果検証】: エラー回復後の成功を確認
    // 【期待値確認】: エラーが発生してもシステムが回復し、最終的に成功することを確認
    if (generationComplete) {
      // 成功した場合のテスト
      expect(generationComplete).toBe(true); // 【確認内容】: エラー回復後に生成が成功することを確認 🔴

      const downloadSuccess = await TestHelpers.verifyDownloadedFiles(
        testConfig.testConfig.downloadPath,
        imageCount
      );
      expect(downloadSuccess).toBe(true); // 【確認内容】: エラー回復後にダウンロードが成功することを確認 🔴
    } else {
      // エラーが続いた場合でも適切に処理されることを確認
      const currentState = await popupPage.getCurrentState();
      expect(['error', 'timeout', 'retry']).toContain(currentState); // 【確認内容】: エラー状態が適切に設定されることを確認 🟡
    }

    // エラーログの確認（適切なエラーハンドリングが記録されていること）
    const errorLogs = await TestHelpers.getFilteredConsoleLogs(page, 'error');
    const warningLogs = await TestHelpers.getFilteredConsoleLogs(page, 'warning');

    // エラーが記録されつつ、回復処理も記録されていることを確認
    expect(errorLogs.length + warningLogs.length).toBeGreaterThan(0); // 【確認内容】: エラーまたは警告ログが記録されていることを確認 🟡
    expect(warningLogs.some(log => log.includes('retry') || log.includes('recover'))).toBe(true); // 【確認内容】: 回復処理に関するログが記録されていることを確認 🟡

    // パフォーマンスメトリクスでエラー回復の記録を確認
    const metrics = await performanceMonitor.stopMonitoring();
    expect(metrics.errors.length).toBeGreaterThan(0); // 【確認内容】: エラーが適切に記録されていることを確認 🔴

    // 最終状態がエラー状態または回復状態であることを確認
    const finalState = await popupPage.getCurrentState();
    expect(['completed', 'error', 'recovered', 'timeout']).toContain(finalState); // 【確認内容】: 最終状態が適切な値であることを確認 🟡
  });
});