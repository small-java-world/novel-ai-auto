/**
 * 基本フローテスト（正常系）
 * TDD Red フェーズ - 失敗するテストを作成
 */
import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { ExtensionPage } from './pages/extension-page';
import { NovelAIPage } from './pages/novelai-page';
import { PopupPage } from './pages/popup-page';
import { TestHelpers } from './utils/test-helpers';
import testConfig from './fixtures/test-config.json' with { type: 'json' };
import testPrompts from './fixtures/test-prompts.json' with { type: 'json' };

test.describe('NovelAI Auto Generator E2E - 基本フローテスト', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let extensionPage: ExtensionPage;
  let novelaiPage: NovelAIPage;
  let popupPage: PopupPage;

  test.beforeEach(async () => {
    // 【テスト前準備】: 各テスト実行前にブラウザ環境を初期化し、一貫したテスト条件を保証
    // 【環境初期化】: 前のテストの影響を受けないよう、ブラウザコンテキストをクリーンにリセット

    // 🔴 赤信号: ブラウザとコンテキストの初期化が実装されていない
    browser = await chromium.launch(testConfig.browser);
    context = await browser.newContext();
    page = await context.newPage();

    // Page Object Model インスタンス初期化
    extensionPage = new ExtensionPage(page, context);
    novelaiPage = new NovelAIPage(page);
    popupPage = new PopupPage(page);
  });

  test.afterEach(async () => {
    // 【テスト後処理】: テスト実行後にブラウザリソースを適切に解放
    // 【状態復元】: 次のテストに影響しないよう、ブラウザコンテキストを完全にクリーンアップ
    await TestHelpers.cleanupTestEnvironment();
    await context?.close();
    await browser?.close();
  });

  test('TC-081-001: should load extension successfully', async () => {
    // 【テスト目的】: Chrome拡張機能が正常に読み込まれることを確認する
    // 【テスト内容】: 拡張機能のmanifest.jsonを読み込み、権限エラーが発生せず、ツールバーにアイコンが表示される
    // 【期待される動作】: 拡張機能が成功的に読み込まれ、全ての権限が付与され、UI要素が正常に表示される
    // 🔴 赤信号: この機能はまだ実装されていない（TDD Red フェーズ）

    // 【テストデータ準備】: 拡張機能のパスを指定して読み込みテストを実行するため
    // 【初期条件設定】: manifest.jsonが有効で、必要な権限が定義された状態
    const extensionPath = testConfig.extension.extensionPath;

    // 【実際の処理実行】: 拡張機能を指定されたパスから読み込む
    // 【処理内容】: Chrome APIを使用して拡張機能をブラウザコンテキストに読み込む
    await extensionPage.loadExtension(extensionPath);

    // 【結果検証】: 拡張機能の読み込み状態を確認する
    // 【期待値確認】: 拡張機能が正常に読み込まれ、エラーが発生していないことを確認
    expect(await extensionPage.isExtensionLoaded()).toBe(true); // 【確認内容】: 拡張機能の読み込み状態が true であることを確認 🔴

    // 【ツールバーアイコン確認】: 拡張機能アイコンがツールバーに表示されることを確認
    const icon = await extensionPage.getExtensionIcon();
    expect(icon).toBeTruthy(); // 【確認内容】: アイコン要素が存在することを確認 🔴

    // 【エラーチェック】: 拡張機能読み込み時にエラーが発生していないことを確認
    const errors = await extensionPage.getLoadingErrors();
    expect(errors).toHaveLength(0); // 【確認内容】: 読み込みエラーが0件であることを確認 🔴
  });

  test('TC-081-002: should access NovelAI page successfully', async () => {
    // 【テスト目的】: NovelAI Web UIページに正常にアクセスできることを確認する
    // 【テスト内容】: NovelAIのURLにアクセスし、ページが正常に読み込まれ、主要UI要素が表示される
    // 【期待される動作】: ページが完全に読み込まれ、Content Scriptが注入され、エラーが発生しない
    // 🟡 黄信号: NovelAIの実際のページ構造について一部推測を含む

    // 【テストデータ準備】: NovelAIの正式URLを使用してページアクセステストを実行するため
    // 【初期条件設定】: 拡張機能が読み込まれ、ネットワーク接続が利用可能な状態
    await extensionPage.loadExtension(testConfig.extension.extensionPath);

    // 【実際の処理実行】: NovelAI Web UIページにナビゲートする
    // 【処理内容】: 指定されたURLにアクセスし、ページの完全な読み込みを待機する
    await novelaiPage.navigate();
    await novelaiPage.waitForPageLoad();

    // 【結果検証】: ページアクセスの成功を確認する
    // 【期待値確認】: ページが正常に読み込まれ、主要要素が表示されていることを確認
    expect(await novelaiPage.areMainElementsVisible()).toBe(true); // 【確認内容】: 主要UI要素が表示されていることを確認 🟡

    // 【Content Script注入確認】: 拡張機能のContent Scriptが正常に注入されることを確認
    expect(await novelaiPage.isContentScriptInjected()).toBe(true); // 【確認内容】: Content Scriptの注入が成功していることを確認 🔴

    // 【ページエラーチェック】: ページ読み込み時にエラーが発生していないことを確認
    const pageErrors = await novelaiPage.getPageErrors();
    expect(pageErrors).toHaveLength(0); // 【確認内容】: ページエラーが0件であることを確認 🟡
  });

  test('TC-081-003: should interact with popup UI successfully', async () => {
    // 【テスト目的】: 拡張機能のポップアップUIが正常に操作できることを確認する
    // 【テスト内容】: ポップアップを開き、UI要素が操作可能で、状態変更が正常に反映される
    // 【期待される動作】: ポップアップが表示され、全ての操作が正常に動作し、状態が適切に更新される
    // 🟡 黄信号: ポップアップUIの具体的な構造について推測を含む

    // 【テストデータ準備】: ポップアップUI操作テストを実行するため、事前に必要な環境を整備
    // 【初期条件設定】: 拡張機能とNovelAIページが読み込まれた状態
    await extensionPage.loadExtension(testConfig.extension.extensionPath);
    await novelaiPage.navigate();
    await novelaiPage.waitForPageLoad();

    // 【実際の処理実行】: 拡張機能のポップアップを開く
    // 【処理内容】: 拡張機能アイコンをクリックしてポップアップUIを表示する
    await popupPage.openPopup();

    // 【結果検証】: ポップアップの表示状態を確認する
    // 【期待値確認】: ポップアップが正常に表示され、操作可能な状態であることを確認
    expect(await popupPage.isPopupVisible()).toBe(true); // 【確認内容】: ポップアップが表示されていることを確認 🔴

    // 【UI要素操作確認】: UI要素が正常に操作できることを確認
    expect(await popupPage.areElementsInteractive()).toBe(true); // 【確認内容】: UI要素が操作可能な状態であることを確認 🔴

    // 【状態確認】: 初期状態が適切に設定されることを確認
    const initialState = await popupPage.getCurrentState();
    expect(initialState).toBe('ready'); // 【確認内容】: 初期状態が 'ready' であることを確認 🟡
  });

  test('TC-081-004: should execute image generation flow successfully', async () => {
    // 【テスト目的】: 画像生成プロセス全体が正常に実行されることを確認する
    // 【テスト内容】: プロンプト設定から生成開始、進捗監視まで全フローを実行する
    // 【期待される動作】: プロンプトが設定され、生成が開始され、進捗が正常に更新される
    // 🟢 青信号: テストプロンプト設定は事前定義されたものを使用

    // 【テストデータ準備】: 有効なテストプロンプトを使用して生成フローをテストするため
    // 【初期条件設定】: 拡張機能とポップアップが準備され、生成可能な状態
    await extensionPage.loadExtension(testConfig.extension.extensionPath);
    await novelaiPage.navigate();
    await novelaiPage.waitForPageLoad();
    await popupPage.openPopup();

    const testPrompt = testPrompts.testPrompts[0]; // simple-test プロンプトを使用

    // 【実際の処理実行】: 画像生成フローを実行する
    // 【処理内容】: プロンプト選択、画像枚数設定、生成開始の一連の操作を実行
    await popupPage.selectPrompt(testPrompt.name);
    await popupPage.setImageCount(1);
    await popupPage.startGeneration();

    // 【結果検証】: 生成フローの開始を確認する
    // 【期待値確認】: 生成が正常に開始され、適切な状態になることを確認
    const currentState = await popupPage.getCurrentState();
    expect(currentState).toBe('generating'); // 【確認内容】: 生成中状態に変更されていることを確認 🟡

    // 【進捗監視確認】: 進捗表示が正常に更新されることを確認
    const progressLogs = await popupPage.monitorProgress();
    expect(progressLogs.length).toBeGreaterThan(0); // 【確認内容】: 進捗ログが記録されていることを確認 🔴
  });

  test('TC-081-005: should download generated images successfully', async () => {
    // 【テスト目的】: 生成された画像が正常にダウンロードされることを確認する
    // 【テスト内容】: 画像生成完了後、ファイルが適切な名前で指定フォルダにダウンロードされる
    // 【期待される動作】: ダウンロードが完了し、ファイルが存在し、ファイル名が適切に設定される
    // 🟡 黄信号: ダウンロードファイルの具体的な命名規則について推測を含む

    // 【テストデータ準備】: ダウンロード検証テストを実行するため、事前に生成フローを完了させる
    // 【初期条件設定】: 画像生成が完了し、ダウンロード権限が付与された状態
    await TestHelpers.setupDownloadsDirectory(testConfig.testConfig.downloadPath);

    // 前の生成フローを実行（TC-081-004の処理を含む）
    await extensionPage.loadExtension(testConfig.extension.extensionPath);
    await novelaiPage.navigate();
    await novelaiPage.waitForPageLoad();
    await popupPage.openPopup();

    const testPrompt = testPrompts.testPrompts[0];
    await popupPage.selectPrompt(testPrompt.name);
    await popupPage.setImageCount(1);
    await popupPage.startGeneration();

    // 【実際の処理実行】: 画像生成の完了を待機し、ダウンロードを確認する
    // 【処理内容】: 生成完了まで待機し、ダウンロードされたファイルを検証する
    const generationComplete = await popupPage.waitForGenerationComplete(testConfig.timeouts.generation);
    expect(generationComplete).toBe(true); // 【確認内容】: 生成が正常に完了することを確認 🔴

    // 【結果検証】: ダウンロードファイルの存在と妥当性を確認する
    // 【期待値確認】: 指定された数のファイルが適切な場所にダウンロードされることを確認
    const downloadSuccess = await TestHelpers.verifyDownloadedFiles(
      testConfig.testConfig.downloadPath,
      1 // 1枚の画像を期待
    );
    expect(downloadSuccess).toBe(true); // 【確認内容】: 期待される数のファイルがダウンロードされていることを確認 🔴
  });
});