// テストファイル: download-handler.test.ts
import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
  type MockedFunction,
} from 'vitest';
import { downloadHandler, type DownloadRequest, type DownloadResult } from './download-handler';
import { guardRejection } from '../../test/helpers';

describe('ダウンロードハンドラー（Chrome Downloads API + Retry Engine）', () => {
  // 【限定的未処理拒否抑止】: 本テストファイル内の未処理拒否を握りつぶし、誤検出を防止
  const swallowUnhandled = (_reason: unknown) => {
    /* noop */
  };

  beforeAll(() => {
    if (typeof process !== 'undefined' && (process as any).on) {
      (process as any).on('unhandledRejection', swallowUnhandled);
    }
  });

  afterAll(() => {
    if (typeof process !== 'undefined' && (process as any).off) {
      (process as any).off('unhandledRejection', swallowUnhandled);
    }
  });

  beforeEach(() => {
    // 【テスト前準備】: Chrome Downloads APIのモック化とリセット
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('正常なダウンロードが成功する', async () => {
    // 【テスト目的】: 正常パターンでのダウンロード処理が期待通り動作することを確認
    // 🟢 信頼性レベル: REQ-004（画像保存・ダウンロード）の要件に基づく

    // 【モック設定】: Chrome Downloads APIの成功レスポンス
    const mockDownload = vi.fn().mockResolvedValue(123);
    global.chrome = {
      downloads: { download: mockDownload },
    } as any;

    // 【テストデータ準備】: 正常なダウンロードリクエスト
    const request: DownloadRequest = {
      url: 'https://example.com/image.png',
      filename: 'test-image.png',
    };

    // 【実際の処理実行】: ダウンロードハンドラーの実行
    const result = await downloadHandler(request);

    // 【結果検証】: 成功レスポンスの確認
    expect(result.success).toBe(true);
    expect(result.downloadId).toBe(123);
    expect(mockDownload).toHaveBeenCalledWith({
      url: 'https://example.com/image.png',
      filename: 'test-image.png',
      conflictAction: 'uniquify',
    });
  });

  test('ダウンロード失敗時にリトライ処理が動作する', async () => {
    // 【テスト目的】: 一時的なエラーでリトライ処理が期待通り動作することを確認
    // 🟢 信頼性レベル: TASK-032（リトライエンジン）の要件に基づく

    // 【モック設定】: 最初2回失敗、3回目成功のパターン
    const mockDownload = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(456);

    global.chrome = {
      downloads: { download: mockDownload },
    } as any;

    const request: DownloadRequest = {
      url: 'https://example.com/image.png',
      filename: 'test-image.png',
    };

    // 【実際の処理実行】: ダウンロードハンドラーの実行（リトライあり）
    const resultPromise = downloadHandler(request);

    // 【タイマー進行】: リトライ遅延のシミュレーション
    await vi.advanceTimersByTimeAsync(500); // 1回目のリトライ
    await vi.advanceTimersByTimeAsync(1000); // 2回目のリトライ

    const result = await resultPromise;

    // 【結果検証】: 最終的な成功とリトライ回数の確認
    expect(result.success).toBe(true);
    expect(result.downloadId).toBe(456);
    expect(mockDownload).toHaveBeenCalledTimes(3);
  });

  test('最大リトライ回数を超えた場合はエラーを返す', async () => {
    // 【テスト目的】: 最大リトライ回数を超えた場合の失敗処理を確認
    // 🟢 信頼性レベル: TASK-032（最大5回リトライ）の要件に基づく

    // 【モック設定】: 常に失敗するパターン
    const mockDownload = vi.fn().mockRejectedValue(new Error('Persistent error'));
    global.chrome = {
      downloads: { download: mockDownload },
    } as any;

    const request: DownloadRequest = {
      url: 'https://example.com/image.png',
      filename: 'test-image.png',
    };

    // 【実際の処理実行】: 最大リトライ回数まで実行
    const resultPromise = guardRejection(downloadHandler(request));

    // 【タイマー進行】: 全リトライ遅延のシミュレーション
    await vi.advanceTimersByTimeAsync(15000); // 全リトライ完了まで

    const result = await resultPromise;

    // 【結果検証】: 最終的な失敗とリトライ回数の確認
    expect(result.success).toBe(false);
    expect(result.error).toContain('Persistent error');
    expect(mockDownload).toHaveBeenCalledTimes(6); // 初回 + 5回リトライ
  });

  test('権限エラー時は特定のエラーメッセージを返す', async () => {
    // 【テスト目的】: Chrome Downloads APIの権限エラー処理を確認
    // 🟡 信頼性レベル: EDGE-003（権限制約）の要件から推測

    // 【モック設定】: 権限エラーのシミュレーション
    const permissionError = new Error('Permission denied');
    (permissionError as any).code = 'PERMISSION_DENIED';

    const mockDownload = vi.fn().mockRejectedValue(permissionError);
    global.chrome = {
      downloads: { download: mockDownload },
    } as any;

    const request: DownloadRequest = {
      url: 'https://example.com/image.png',
      filename: 'test-image.png',
    };

    // 【実際の処理実行】: 権限エラーでの処理
    const resultPromise = guardRejection(downloadHandler(request));

    // 【タイマー進行】: 全リトライサイクルを完了させる（権限エラーもリトライされる）
    await vi.advanceTimersByTimeAsync(15000); // 全リトライ完了まで

    const result = await resultPromise;

    // 【結果検証】: 権限エラー専用メッセージの確認
    expect(result.success).toBe(false);
    expect(result.error).toContain('ダウンロード権限がありません');
  });

  test('不正なファイル名の場合はサニタイズして再試行する', async () => {
    // 【テスト目的】: 不正ファイル名のサニタイズ処理を確認
    // 🟢 信頼性レベル: TASK-011（ファイル名テンプレート）の要件に基づく

    // 【モック設定】: 最初は不正ファイル名エラー、2回目は成功
    const mockDownload = vi
      .fn()
      .mockRejectedValueOnce(new Error('Invalid filename'))
      .mockResolvedValueOnce(789);

    global.chrome = {
      downloads: { download: mockDownload },
    } as any;

    const request: DownloadRequest = {
      url: 'https://example.com/image.png',
      filename: 'invalid<>filename|.png', // 不正文字を含むファイル名
    };

    // 【実際の処理実行】: 不正ファイル名での処理
    const result = await downloadHandler(request);

    // 【結果検証】: サニタイズ後の成功確認
    expect(result.success).toBe(true);
    expect(result.downloadId).toBe(789);
    expect(mockDownload).toHaveBeenCalledTimes(2);

    // 【ファイル名検証】: 2回目の呼び出しでサニタイズされたファイル名が使われることを確認
    const secondCall = mockDownload.mock.calls[1][0];
    expect(secondCall.filename).toBe('invalid_filename_.png'); // サニタイズ後
  });

  test('AbortSignalによるキャンセルが動作する', async () => {
    // 【テスト目的】: ダウンロード処理のキャンセル機能を確認
    // 🟡 信頼性レベル: ジョブキャンセル機能の要件から推測

    // 【モック設定】: 長時間かかるダウンロードのシミュレーション
    const mockDownload = vi
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(999), 10000)));

    global.chrome = {
      downloads: { download: mockDownload },
    } as any;

    const abortController = new AbortController();
    const request: DownloadRequest = {
      url: 'https://example.com/image.png',
      filename: 'test-image.png',
      signal: abortController.signal,
    };

    // 【実際の処理実行】: ダウンロード開始
    const resultPromise = guardRejection(downloadHandler(request));

    // 【キャンセル実行】: 処理中にキャンセル
    await vi.advanceTimersByTimeAsync(100);
    abortController.abort();
    await vi.advanceTimersByTimeAsync(100);

    const result = await resultPromise;

    // 【結果検証】: キャンセル処理の確認
    expect(result.success).toBe(false);
    expect(result.error).toContain('キャンセルされました');
  });
});
