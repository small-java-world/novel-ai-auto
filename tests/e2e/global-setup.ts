/**
 * Global setup for E2E tests
 * TDD Red フェーズ - 失敗する設定を作成
 */
import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

async function globalSetup(config: FullConfig) {
  console.log('🔴 Global E2E Test Setup - TDD Red Phase');

  try {
    // 【セットアップ目的】: E2Eテスト実行前の環境準備を行う
    // 【実装内容】: まだ実装されていない - TDD Redフェーズで失敗させる

    // Test downloads directory setup
    const downloadsDir = path.resolve('./test-downloads');

    // 🔴 赤信号: ディレクトリ作成機能が実装されていない
    await fs.mkdir(downloadsDir, { recursive: true });
    console.log(`✅ Created downloads directory: ${downloadsDir}`);

    // Extension validation
    const manifestPath = path.resolve('./manifest.json');

    // 🔴 赤信号: manifest.json検証が実装されていない
    try {
      await fs.access(manifestPath);
      console.log('✅ Extension manifest.json found');
    } catch (error) {
      console.error('🔴 Extension manifest.json not found - tests will fail');
      throw new Error('Extension manifest not found');
    }

    // Browser launch test
    // 🔴 赤信号: ブラウザ起動テストが実装されていない
    const browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-extensions-except=' + path.resolve('./'),
        '--load-extension=' + path.resolve('./'),
      ],
    });

    await browser.close();
    console.log('✅ Browser launch test successful');

    console.log('🔴 Global setup completed - Ready for TDD Red Phase tests');

  } catch (error) {
    console.error('🔴 Global setup failed:', error);
    // TDD Red フェーズでは失敗することを期待
    throw error;
  }
}

export default globalSetup;