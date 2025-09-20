/**
 * Global teardown for E2E tests
 * TDD Red フェーズ - 失敗する後処理を作成
 */
import { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

async function globalTeardown(config: FullConfig) {
  console.log('🔴 Global E2E Test Teardown - TDD Red Phase');

  try {
    // 【テアダウン目的】: E2Eテスト実行後のクリーンアップを行う
    // 【実装内容】: まだ実装されていない - TDD Redフェーズで失敗させる

    // Test downloads cleanup
    const downloadsDir = path.resolve('./test-downloads');

    // 🔴 赤信号: ディレクトリクリーンアップ機能が実装されていない
    try {
      const files = await fs.readdir(downloadsDir);
      console.log(`🔍 Found ${files.length} test download files`);

      // Clean up test files
      for (const file of files) {
        await fs.unlink(path.join(downloadsDir, file));
      }

      console.log('✅ Test downloads cleaned up');
    } catch (error) {
      console.log('⚠️ No test downloads to clean up');
    }

    // Test artifacts management
    const artifactsDir = path.resolve('./test-results');

    // 🔴 赤信号: テスト結果管理機能が実装されていない
    try {
      await fs.access(artifactsDir);
      console.log('✅ Test artifacts preserved in test-results/');
    } catch (error) {
      console.log('⚠️ No test artifacts found');
    }

    // Performance reports
    // 🔴 赤信号: パフォーマンスレポート生成が実装されていない
    console.log('🔴 Performance report generation not implemented yet');

    console.log('🔴 Global teardown completed - TDD Red Phase cleanup done');

  } catch (error) {
    console.error('🔴 Global teardown failed:', error);
    // TDD Red フェーズでは一部失敗することを期待
    // ただし、致命的でない場合は続行
  }
}

export default globalTeardown;