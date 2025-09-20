import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    // 【TDD運用】: デフォルトではRedフェーズ用のテストを除外し、
    // Green/Refactor/Verifyのフェーズで安定して実行できるようにする
    // 🟢 信頼性レベル: 既存のTDD運用（*.red.test.ts命名規約）に基づく
    // E2E は Playwright 管轄のため、Vitest 実行から除外
    exclude: [
      '**/*.red.test.ts',
      'tests/e2e/**',
      'node_modules/**'
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
      all: true,
    },
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
