/**
 * パフォーマンステスト
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

test.describe('NovelAI Auto Generator E2E - パフォーマンステスト', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let extensionPage: ExtensionPage;
  let novelaiPage: NovelAIPage;
  let popupPage: PopupPage;
  let performanceMonitor: PerformanceMonitor;

  test.beforeEach(async () => {
    // 【テスト前準備】: パフォーマンステスト用に各テスト実行前にブラウザ環境を初期化
    // 【環境初期化】: 性能測定に影響しないよう、クリーンな環境でリソースを最適化
    browser = await chromium.launch(testConfig.browser);
    context = await browser.newContext();
    page = await context.newPage();

    extensionPage = new ExtensionPage(page, context);
    novelaiPage = new NovelAIPage(page);
    popupPage = new PopupPage(page);
    performanceMonitor = new PerformanceMonitor(page);
  });

  test.afterEach(async () => {
    // 【テスト後処理】: パフォーマンステスト後にメモリリークを防ぐため徹底的にクリーンアップ
    // 【状態復元】: 次のテストの性能測定に影響しないよう、全リソースを解放
    await TestHelpers.cleanupTestEnvironment();
    await context?.close();
    await browser?.close();
  });

  test('TC-081-201: should complete single image generation within 30 seconds', async () => {
    // 【テスト目的】: 単枚画像生成が30秒以内に完了することを確認する
    // 【テスト内容】: 標準的なプロンプト設定で1枚の画像生成を実行し、パフォーマンス要件を満たすかを検証
    // 【期待される動作】: 30秒以内に生成が完了し、パフォーマンスメトリクスが要件内に収まる
    // 🟢 青信号: パフォーマンス要件は明確に定義されている

    // 【テストデータ準備】: 標準的なテストプロンプトを使用して性能測定を実行
    // 【初期条件設定】: 正常なネットワーク環境で、最適化された状態でテストを開始
    await extensionPage.loadExtension(testConfig.extension.extensionPath);
    await novelaiPage.navigate();
    await novelaiPage.waitForPageLoad();
    await popupPage.openPopup();

    const testPrompt = testPrompts.testPrompts[0]; // simple-test プロンプト使用
    const performanceLimit = testConfig.performance.singleImageLimit; // 30秒 = 30000ms

    // 【実際の処理実行】: パフォーマンス監視を開始して画像生成フローを実行
    // 【処理内容】: 開始から完了まで全工程の時間とリソース使用量を測定
    await performanceMonitor.startMonitoring();

    const startTime = Date.now();

    await popupPage.selectPrompt(testPrompt.name);
    await popupPage.setImageCount(1);
    await popupPage.startGeneration();

    const generationComplete = await popupPage.waitForGenerationComplete(performanceLimit);
    const endTime = Date.now();
    const actualDuration = endTime - startTime;

    // 【結果検証】: パフォーマンス要件を満たしているかを確認
    // 【期待値確認】: 30秒以内に生成が完了し、メモリ使用量も制限内であることを確認
    expect(generationComplete).toBe(true); // 【確認内容】: 生成が正常に完了することを確認 🔴
    expect(actualDuration).toBeLessThanOrEqual(performanceLimit); // 【確認内容】: 実行時間が30秒以下であることを確認 🔴

    // 【パフォーマンスメトリクス確認】: 詳細なパフォーマンス情報を収集・検証
    const metrics = await performanceMonitor.stopMonitoring();
    expect(metrics.duration).toBeLessThanOrEqual(performanceLimit); // 【確認内容】: 測定された実行時間が制限以下であることを確認 🔴

    // 【メモリ使用量確認】: メモリ使用量が制限内であることを確認
    const memoryUsage = await performanceMonitor.monitorMemoryUsage();
    expect(memoryUsage).toBeLessThanOrEqual(testConfig.performance.memoryLimit); // 【確認内容】: メモリ使用量が2GB以下であることを確認 🔴

    // 【ネットワーク効率確認】: 必要以上のネットワークリクエストが発生していないことを確認
    const networkRequests = await performanceMonitor.countNetworkRequests();
    expect(networkRequests).toBeLessThan(50); // 【確認内容】: ネットワークリクエスト数が適切な範囲であることを確認 🟡

    // 【パフォーマンス要件確認】: 包括的なパフォーマンス要件チェック
    const requirementCheck = await performanceMonitor.checkPerformanceRequirements(
      performanceLimit,
      testConfig.performance.memoryLimit
    );
    expect(requirementCheck.passed).toBe(true); // 【確認内容】: 全パフォーマンス要件が満たされていることを確認 🔴
  });

  test('TC-081-202: should complete multiple image generation within 5 minutes', async () => {
    // 【テスト目的】: 10枚の画像生成が5分以内に完了することを確認する
    // 【テスト内容】: 複数画像生成における全体的なパフォーマンスと効率性を検証
    // 【期待される動作】: 5分以内に全生成が完了し、メモリ使用量が2GB以下に維持される
    // 🟢 青信号: パフォーマンス要件は明確に定義されている

    // 【テストデータ準備】: 複数画像生成用のテストプロンプトと性能制限を設定
    // 【初期条件設定】: 標準的なネットワーク環境で、10枚の画像生成を実行
    await extensionPage.loadExtension(testConfig.extension.extensionPath);
    await novelaiPage.navigate();
    await novelaiPage.waitForPageLoad();
    await popupPage.openPopup();

    const testPrompt = testPrompts.testPrompts[0]; // simple-test プロンプト使用
    const imageCount = 10;
    const performanceLimit = testConfig.performance.multipleImageLimit; // 5分 = 300000ms

    // 【実際の処理実行】: 複数画像生成の包括的なパフォーマンス監視を実行
    // 【処理内容】: 10枚の画像生成全体を通してのリソース使用状況と実行時間を測定
    await performanceMonitor.startMonitoring();

    const startTime = Date.now();

    await popupPage.selectPrompt(testPrompt.name);
    await popupPage.setImageCount(imageCount);
    await popupPage.startGeneration();

    const generationComplete = await popupPage.waitForGenerationComplete(performanceLimit);
    const endTime = Date.now();
    const actualDuration = endTime - startTime;

    // 【結果検証】: 複数画像生成のパフォーマンス要件を満たしているかを確認
    // 【期待値確認】: 5分以内に全ての生成が完了し、リソース使用量も適切であることを確認
    expect(generationComplete).toBe(true); // 【確認内容】: 10枚の画像生成が正常に完了することを確認 🔴
    expect(actualDuration).toBeLessThanOrEqual(performanceLimit); // 【確認内容】: 実行時間が5分以下であることを確認 🔴

    // 【パフォーマンスメトリクス確認】: 詳細なパフォーマンス分析を実行
    const metrics = await performanceMonitor.stopMonitoring();
    expect(metrics.duration).toBeLessThanOrEqual(performanceLimit); // 【確認内容】: 測定された実行時間が制限以下であることを確認 🔴

    // 【メモリ使用量監視】: 長時間実行でのメモリリークがないことを確認
    const memoryUsage = await performanceMonitor.monitorMemoryUsage();
    expect(memoryUsage).toBeLessThanOrEqual(testConfig.performance.memoryLimit); // 【確認内容】: メモリ使用量が2GB以下に維持されることを確認 🔴

    // 【効率性確認】: 平均的な1枚あたりの生成時間が適切であることを確認
    const averageTimePerImage = actualDuration / imageCount;
    const expectedAverageTime = 30000; // 30秒/枚を期待
    expect(averageTimePerImage).toBeLessThanOrEqual(expectedAverageTime); // 【確認内容】: 1枚あたりの平均生成時間が30秒以下であることを確認 🟡

    // 【ネットワーク効率確認】: 複数画像生成時の通信効率を確認
    const networkRequests = await performanceMonitor.countNetworkRequests();
    const expectedMaxRequests = imageCount * 10; // 1枚あたり最大10リクエストを想定
    expect(networkRequests).toBeLessThanOrEqual(expectedMaxRequests); // 【確認内容】: ネットワークリクエスト数が効率的であることを確認 🟡

    // 【総合パフォーマンス確認】: 複数画像生成の包括的な要件チェック
    const requirementCheck = await performanceMonitor.checkPerformanceRequirements(
      performanceLimit,
      testConfig.performance.memoryLimit
    );
    expect(requirementCheck.passed).toBe(true); // 【確認内容】: 全パフォーマンス要件が満たされていることを確認 🔴

    // 【パフォーマンスレポート生成】: 詳細なパフォーマンス分析レポートを生成
    const performanceReport = await performanceMonitor.generateReport();
    expect(performanceReport).toBeDefined(); // 【確認内容】: パフォーマンスレポートが正常に生成されることを確認 🔴
    expect(performanceReport.length).toBeGreaterThan(0); // 【確認内容】: レポート内容が空でないことを確認 🟡

    // 【ダウンロード確認】: 全ての画像が正常にダウンロードされていることを確認
    const downloadSuccess = await TestHelpers.verifyDownloadedFiles(
      testConfig.testConfig.downloadPath,
      imageCount
    );
    expect(downloadSuccess).toBe(true); // 【確認内容】: 10枚全ての画像がダウンロードされていることを確認 🔴
  });
});