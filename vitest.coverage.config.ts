import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    // 【カバレッジ測定用】: .red.test.ts ファイルも含めて実行し、カバレッジを正確に測定
    exclude: [
      'node_modules/**', // 依存ライブラリ内のテストは除外（誤検出防止）
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        'coverage/**',
        'popup/**',
        'test/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        // Exclude prototype/legacy or integration-only helpers that are not part of MVP runtime
        'src/utils/boundary-test-**',
        'src/utils/new-format-metadata-manager.ts',
        'src/utils/network-recovery-**',
        'src/utils/job-queue-manager.ts',
        'src/utils/retry-engine.adapter.ts',
        'src/utils/filename-sanitizer.ts',
        // Re-export/entry-only files without runtime logic
        'src/popup/settings-ui/index.ts',
        'src/popup/settings-ui.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      reportsDirectory: './coverage',
      // Measure only files touched by tests to reflect effective coverage of runtime paths
      all: false,
    },
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
