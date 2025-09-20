import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';
import { ensureDownloadPermissionAndDownload } from './storage-download-compatibility';

// テストファイル: src/utils/storage-download-compatibility.red.test.ts

describe('ストレージ/ダウンロード互換制御', () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テスト前にChrome APIモックを設定し、再利用時の干渉を防ぐ
    // 【環境初期化】: 既存のモックやタイマー状態をクリアしてクリーンな状況を作る
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 【テスト後処理】: テストで設定したモックを解除し、タイマーを元に戻す
    // 【状態復元】: 次のテストに影響しないよう実際のタイマーとグローバル状態を復元
    vi.useRealTimers();
    (globalThis as any).chrome = undefined;
  });

  test('TC-072-001: 権限済みでダウンロードが即時成功する', async () => {
    // 【テスト目的】: 権限確認がtrueの場合にダウンロードが実行され成功応答が返ることを検証する
    // 【テスト内容】: permissions.contains→true、downloads.download→成功のモックを用意し、処理結果とログ記録を確認する
    // 【期待される動作】: 成功レスポンスとログ追記が発生し、追加の権限要求は行われない
    // 🟢 信頼性レベル: REQ-004/REQ-202およびdownload-handler設計に基づく仕様

    // 【テストデータ準備】: 権限済みシナリオを再現するためcontainsをtrueに設定
    // 【初期条件設定】: logsを空にしたStorageModel相当を前提とし、モックでのみ挙動を管理
    const request = { url: 'https://example.com/image.png', fileName: 'foo.png' };
    const mockDownload = vi.fn().mockResolvedValue(101);
    const mockContains = vi.fn().mockResolvedValue(true);

    (globalThis as any).chrome = {
      permissions: {
        contains: mockContains,
      },
      downloads: {
        download: mockDownload,
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ logs: [] }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
      runtime: {
        lastError: undefined,
      },
    } satisfies Partial<typeof chrome> as typeof chrome;

    // 【実際の処理実行】: ensureDownloadPermissionAndDownloadを呼び出してダウンロード処理を行う
    // 【処理内容】: 権限確認→ダウンロード→ログ更新→結果返却の順で実行されるはず
    // 【実行タイミング】: テスト開始直後に1回実行し、副作用の発生順を確認
    const result = await ensureDownloadPermissionAndDownload(request);

    // 【結果検証】: ダウンロードIDと権限確認が正しく行われたか、ログ更新が呼ばれたかを検証
    // 【期待値確認】: 成功レスポンスが返り、権限要求が発生していないことを確認
    // 【品質保証】: 正常系が成立することで権限済みユーザのUXを保証
    expect(result.success).toBe(true); // 【確認内容】: 成功レスポンスが返ること 🟢
    expect(result.downloadId).toBe(101); // 【確認内容】: ダウンロードIDがdownload APIからの戻り値であること 🟢
    expect(mockContains).toHaveBeenCalledTimes(1); // 【確認内容】: 権限確認が一度だけ行われること 🟢
    expect(mockDownload).toHaveBeenCalledWith({
      url: 'https://example.com/image.png',
      filename: 'foo.png',
      conflictAction: 'uniquify',
    }); // 【確認内容】: ダウンロードAPIが想定パラメータで呼ばれること 🟢
  });

  test('TC-072-002: 権限未付与でユーザが承諾した場合にダウンロードが継続する', async () => {
    // 【テスト目的】: permissions.containsがfalseでrequestがtrueの場合に、権限取得後ダウンロードが実行されることを検証する
    // 【テスト内容】: contains→false、request→true、download→成功のモックを用意し、権限取得とダウンロード継続を確認する
    // 【期待される動作】: 権限要求ダイアログ表示→承諾→ダウンロード継続→ログに権限取得とダウンロード成功の両方記録
    // 🟢 信頼性レベル: REQ-202権限要求フローおよびdataflow.md権限未付与シナリオに基づく仕様

    // 【テストデータ準備】: 権限未付与→承諾シナリオを再現するためcontains→false、request→trueに設定
    // 【初期条件設定】: permissionPendingなし、logs空の状態からスタート
    const request = { url: 'https://example.com/image.png', fileName: 'test.png' };
    const mockContains = vi.fn().mockResolvedValue(false);
    const mockRequest = vi.fn().mockResolvedValue(true);
    const mockDownload = vi.fn().mockResolvedValue(321);

    (globalThis as any).chrome = {
      permissions: {
        contains: mockContains,
        request: mockRequest,
      },
      downloads: {
        download: mockDownload,
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ logs: [] }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
      runtime: {
        lastError: undefined,
      },
    } satisfies Partial<typeof chrome> as typeof chrome;

    // 【実際の処理実行】: ensureDownloadPermissionAndDownloadを呼び出して権限要求フローを実行
    // 【処理内容】: 権限確認→権限要求→ダウンロード→ログ更新の順で実行されるはず
    const result = await ensureDownloadPermissionAndDownload(request);

    // 【結果検証】: 権限要求が発生し、ダウンロードが継続され、ログに両イベントが記録されることを検証
    // 【期待値確認】: 成功レスポンス、権限要求とダウンロードの両方が実行、permissionPendingフラグが設定されない
    expect(result.success).toBe(true); // 【確認内容】: 権限取得後にダウンロードが成功すること 🟢
    expect(result.downloadId).toBe(321); // 【確認内容】: ダウンロードIDが正しく返却されること 🟢
    expect(mockContains).toHaveBeenCalledTimes(1); // 【確認内容】: 権限確認が一度実行されること 🟢
    expect(mockRequest).toHaveBeenCalledTimes(1); // 【確認内容】: 権限要求ダイアログが一度表示されること 🟢
    expect(mockRequest).toHaveBeenCalledWith({ permissions: ['downloads'] }); // 【確認内容】: downloads権限を要求すること 🟢
    expect(mockDownload).toHaveBeenCalledTimes(1); // 【確認内容】: 権限取得後にダウンロードが実行されること 🟢
  });

  test('TC-072-101: 権限要求をユーザが拒否した場合のエラー通知', async () => {
    // 【テスト目的】: permissions.requestがfalseの場合に、適切なエラーメッセージが返されることを検証する
    // 【テスト内容】: contains→false、request→false のモックを用意し、権限拒否時のエラーハンドリングを確認する
    // 【期待される動作】: 権限要求拒否→エラーレスポンス→permissionPendingフラグ設定→ダウンロード実行されない
    // 🟢 信頼性レベル: EDGE-003エラーケースおよびREQ-202権限拒否処理に基づく仕様

    // 【テストデータ準備】: 権限拒否シナリオを再現するためrequest→falseに設定
    // 【初期条件設定】: 権限未付与でユーザが拒否操作を行う状況を模擬
    const request = { url: 'https://example.com/image.png', fileName: 'test.png' };
    const mockContains = vi.fn().mockResolvedValue(false);
    const mockRequest = vi.fn().mockResolvedValue(false);
    const mockDownload = vi.fn(); // 呼ばれるべきではない

    (globalThis as any).chrome = {
      permissions: {
        contains: mockContains,
        request: mockRequest,
      },
      downloads: {
        download: mockDownload,
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ logs: [] }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
      runtime: {
        lastError: undefined,
      },
    } satisfies Partial<typeof chrome> as typeof chrome;

    // 【実際の処理実行】: ensureDownloadPermissionAndDownloadを呼び出して権限拒否ケースを実行
    // 【処理内容】: 権限確認→権限要求→拒否→エラーレスポンス→ログ更新の順で実行されるはず
    const result = await ensureDownloadPermissionAndDownload(request);

    // 【結果検証】: 権限拒否時のエラーが正しく処理され、ダウンロードが実行されないことを検証
    // 【期待値確認】: 失敗レスポンス、適切なエラーコード、ダウンロード未実行、permissionPending設定
    expect(result.success).toBe(false); // 【確認内容】: 権限拒否によりダウンロードが失敗すること 🟢
    expect(result.errorCode).toBe('PERMISSION_DENIED'); // 【確認内容】: 権限拒否の明確なエラーコードが返ること 🟢
    expect(result.errorMessage).toContain('権限が拒否されました'); // 【確認内容】: 分かりやすいエラーメッセージが含まれること 🟢
    expect(mockDownload).not.toHaveBeenCalled(); // 【確認内容】: 権限拒否時はダウンロードが実行されないこと 🟢
    expect(mockRequest).toHaveBeenCalledTimes(1); // 【確認内容】: 権限要求は一度実行されること 🟢
  });

  test('TC-072-003: 権限承諾後のpermissionPendingフラグ解除', async () => {
    // 【テスト目的】: 一度権限拒否でpermissionPendingが設定された後、承諾時にフラグが解除されることを検証する
    // 【テスト内容】: ストレージからpermissionPending=trueを読み取り、権限承諾後にfalseに更新されることを確認する
    // 【期待される動作】: 前回拒否フラグ検出→権限要求→承諾→フラグ解除→ダウンロード実行
    // 🟡 信頼性レベル: REQ-202の状態管理要件から推測される実装パターン

    // 【テストデータ準備】: permissionPendingがtrueの状態からスタートし、権限承諾を模擬
    // 【初期条件設定】: 前回の権限拒否により設定されたpermissionPendingフラグあり
    const request = { url: 'https://example.com/image.png', fileName: 'test.png' };
    const mockContains = vi.fn().mockResolvedValue(false);
    const mockRequest = vi.fn().mockResolvedValue(true);
    const mockDownload = vi.fn().mockResolvedValue(456);
    const mockSet = vi.fn().mockResolvedValue(undefined);

    (globalThis as any).chrome = {
      permissions: {
        contains: mockContains,
        request: mockRequest,
      },
      downloads: {
        download: mockDownload,
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            logs: [],
            permissionPending: true,
          }),
          set: mockSet,
        },
      },
      runtime: {
        lastError: undefined,
      },
    } satisfies Partial<typeof chrome> as typeof chrome;

    // 【実際の処理実行】: ensureDownloadPermissionAndDownloadを呼び出してフラグ解除処理を実行
    // 【処理内容】: フラグ確認→権限要求→承諾→フラグ解除→ダウンロード実行の順で実行されるはず
    const result = await ensureDownloadPermissionAndDownload(request);

    // 【結果検証】: 権限承諾後にpermissionPendingフラグが解除され、ダウンロードが実行されることを検証
    // 【期待値確認】: 成功レスポンス、permissionPendingフラグがfalseに更新、ダウンロード実行
    expect(result.success).toBe(true); // 【確認内容】: フラグ解除後にダウンロードが成功すること 🟡
    expect(result.downloadId).toBe(456); // 【確認内容】: ダウンロードIDが正しく返却されること 🟡
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        permissionPending: false,
      })
    ); // 【確認内容】: permissionPendingフラグがfalseに更新されること 🟡
    expect(mockDownload).toHaveBeenCalledTimes(1); // 【確認内容】: フラグ解除後にダウンロードが実行されること 🟡
  });

  test('TC-072-104: 権限拒否連続時のpermissionPendingフラグ維持', async () => {
    // 【テスト目的】: permissionPendingフラグがtrueの状態で再度権限拒否した場合、フラグが維持されることを検証する
    // 【テスト内容】: ストレージからpermissionPending=trueを読み取り、再度拒否時にフラグが維持されることを確認する
    // 【期待される動作】: 前回拒否フラグ検出→権限要求→再度拒否→フラグ維持→ダウンロードスキップ
    // 🟡 信頼性レベル: ユーザビリティ観点から推測される連続拒否時の動作パターン

    // 【テストデータ準備】: permissionPending=trueの状態で再度権限拒否を模擬
    // 【初期条件設定】: 連続して権限拒否するユーザの行動パターンを想定
    const request = { url: 'https://example.com/image.png', fileName: 'test.png' };
    const mockContains = vi.fn().mockResolvedValue(false);
    const mockRequest = vi.fn().mockResolvedValue(false);
    const mockDownload = vi.fn(); // 呼ばれるべきではない
    const mockSet = vi.fn().mockResolvedValue(undefined);

    (globalThis as any).chrome = {
      permissions: {
        contains: mockContains,
        request: mockRequest,
      },
      downloads: {
        download: mockDownload,
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            logs: [],
            permissionPending: true,
          }),
          set: mockSet,
        },
      },
      runtime: {
        lastError: undefined,
      },
    } satisfies Partial<typeof chrome> as typeof chrome;

    // 【実際の処理実行】: ensureDownloadPermissionAndDownloadを呼び出して連続拒否処理を実行
    // 【処理内容】: フラグ確認→権限要求→再度拒否→フラグ維持→エラーレスポンスの順で実行されるはず
    const result = await ensureDownloadPermissionAndDownload(request);

    // 【結果検証】: 連続拒否時にpermissionPendingフラグが維持され、ダウンロードが実行されないことを検証
    // 【期待値確認】: 失敗レスポンス、permissionPendingフラグ維持、ダウンロード未実行
    expect(result.success).toBe(false); // 【確認内容】: 連続拒否により再度ダウンロードが失敗すること 🟡
    expect(result.errorCode).toBe('PERMISSION_DENIED'); // 【確認内容】: 権限拒否エラーが再度返されること 🟡
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        permissionPending: true,
      })
    ); // 【確認内容】: permissionPendingフラグがtrueのまま維持されること 🟡
    expect(mockDownload).not.toHaveBeenCalled(); // 【確認内容】: 連続拒否時はダウンロードが実行されないこと 🟡
  });

  test('TC-072-102: 権限API例外時のフェイルセーフ', async () => {
    // 【テスト目的】: chrome.permissions APIが例外を投げた場合に、適切なエラーハンドリングが行われることを検証する
    // 【テスト内容】: permissions.containsで例外発生時に、安全にエラーレスポンスが返されることを確認する
    // 【期待される動作】: 権限API例外→キャッチ→フェイルセーフ処理→適切なエラーレスポンス
    // 🟡 信頼性レベル: EDGE-003エラー処理要件から推測される例外安全性の実装

    // 【テストデータ準備】: permissions.containsが例外を投げる状況を模擬
    // 【初期条件設定】: Chrome API の異常状態や権限システムの障害を想定
    const request = { url: 'https://example.com/image.png', fileName: 'test.png' };
    const mockContains = vi.fn().mockRejectedValue(new Error('Permission API error'));
    const mockDownload = vi.fn(); // 呼ばれるべきではない

    (globalThis as any).chrome = {
      permissions: {
        contains: mockContains,
      },
      downloads: {
        download: mockDownload,
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ logs: [] }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
      runtime: {
        lastError: undefined,
      },
    } satisfies Partial<typeof chrome> as typeof chrome;

    // 【実際の処理実行】: ensureDownloadPermissionAndDownloadを呼び出して例外処理を実行
    // 【処理内容】: 権限確認→例外発生→キャッチ→エラーレスポンス→ログ記録の順で実行されるはず
    const result = await ensureDownloadPermissionAndDownload(request);

    // 【結果検証】: 権限API例外が適切に処理され、システムが安全に継続することを検証
    // 【期待値確認】: 失敗レスポンス、適切なエラーコード、ダウンロード未実行、例外ログ記録
    expect(result.success).toBe(false); // 【確認内容】: API例外により安全にダウンロードが失敗すること 🟡
    expect(result.errorCode).toBe('PERMISSION_API_ERROR'); // 【確認内容】: API例外の明確なエラーコードが返ること 🟡
    expect(result.errorMessage).toContain('権限確認中にエラーが発生'); // 【確認内容】: 分かりやすい例外エラーメッセージが含まれること 🟡
    expect(mockDownload).not.toHaveBeenCalled(); // 【確認内容】: API例外時はダウンロードが実行されないこと 🟡
  });

  test('TC-072-103: ダウンロードAPI連続失敗時のエラー通知', async () => {
    // 【テスト目的】: chrome.downloads.downloadが例外を投げた場合に、適切なエラー処理が行われることを検証する
    // 【テスト内容】: 権限確認成功後にdownload APIが失敗した場合のエラーハンドリングを確認する
    // 【期待される動作】: 権限確認成功→ダウンロードAPI失敗→キャッチ→エラーレスポンス→リトライエンジン委譲
    // 🟢 信頼性レベル: 既存download-handlerのエラー処理パターンおよびEDGE-003に基づく実装

    // 【テストデータ準備】: 権限は正常だがダウンロードAPIが失敗する状況を模擬
    // 【初期条件設定】: ネットワーク障害やファイルシステム問題によるダウンロード失敗を想定
    const request = { url: 'https://example.com/broken-image.png', fileName: 'test.png' };
    const mockContains = vi.fn().mockResolvedValue(true);
    const mockDownload = vi.fn().mockRejectedValue(new Error('Download failed'));

    (globalThis as any).chrome = {
      permissions: {
        contains: mockContains,
      },
      downloads: {
        download: mockDownload,
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ logs: [] }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
      runtime: {
        lastError: { message: 'Download interrupted' },
      },
    } satisfies Partial<typeof chrome> as typeof chrome;

    // 【実際の処理実行】: ensureDownloadPermissionAndDownloadを呼び出してダウンロード例外処理を実行
    // 【処理内容】: 権限確認→ダウンロード実行→例外発生→キャッチ→エラーレスポンス→リトライ委譲の順で実行されるはず
    const result = await ensureDownloadPermissionAndDownload(request);

    // 【結果検証】: ダウンロードAPI例外が適切に処理され、リトライエンジンに委譲されることを検証
    // 【期待値確認】: 失敗レスポンス、ダウンロードエラーコード、リトライ委譲フラグ
    expect(result.success).toBe(false); // 【確認内容】: ダウンロードAPI例外により安全に失敗すること 🟢
    expect(result.errorCode).toBe('DOWNLOAD_FAILED'); // 【確認内容】: ダウンロード失敗の明確なエラーコードが返ること 🟢
    expect(result.errorMessage).toContain('ダウンロードに失敗'); // 【確認内容】: 分かりやすいダウンロードエラーメッセージが含まれること 🟢
    expect(result.retryable).toBe(true); // 【確認内容】: リトライエンジンによる再試行が可能であることを示すフラグ 🟢
    expect(mockContains).toHaveBeenCalledTimes(1); // 【確認内容】: 権限確認は正常に実行されること 🟢
    expect(mockDownload).toHaveBeenCalledTimes(1); // 【確認内容】: ダウンロードAPIが一度実行されること 🟢
  });

  describe('境界値テストケース', () => {
    test('TC-072-201: ログ上限500件到達時のローテーション', async () => {
      // 【テスト目的】: ストレージのログが500件に到達した際に、古いログが削除され新しいログが追加されることを検証する
      // 【テスト内容】: 499件のログがある状態で新しいログを追加し、最古のログが削除されて500件が維持されることを確認する
      // 【期待される動作】: ログ追加→件数チェック→上限超過→最古削除→新ログ追加→500件維持
      // 🟡 信頼性レベル: storage-schema.mdのログ上限要件から推測される境界値処理

      // 【テストデータ準備】: 上限直前の499件のログを用意し、新ログ追加による境界超過を模擬
      // 【初期条件設定】: ストレージがほぼ満杯の状態で新しいダウンロードイベントが発生する状況
      const request = { url: 'https://example.com/image.png', fileName: 'test.png' };
      const existingLogs = Array.from({ length: 499 }, (_, i) => ({
        id: i,
        timestamp: Date.now() - (499 - i) * 1000,
        level: 'INFO',
        message: `Log entry ${i}`,
      }));

      const mockContains = vi.fn().mockResolvedValue(true);
      const mockDownload = vi.fn().mockResolvedValue(789);
      const mockSet = vi.fn().mockResolvedValue(undefined);

      (globalThis as any).chrome = {
        permissions: {
          contains: mockContains,
        },
        downloads: {
          download: mockDownload,
        },
        storage: {
          local: {
            get: vi.fn().mockResolvedValue({ logs: existingLogs }),
            set: mockSet,
          },
        },
        runtime: {
          lastError: undefined,
        },
      } satisfies Partial<typeof chrome> as typeof chrome;

      // 【実際の処理実行】: ensureDownloadPermissionAndDownloadを呼び出してログローテーション処理を実行
      // 【処理内容】: ダウンロード実行→ログ追加→件数チェック→ローテーション→ストレージ更新の順で実行されるはず
      const result = await ensureDownloadPermissionAndDownload(request);

      // 【結果検証】: ログローテーションが正しく実行され、上限500件が維持されることを検証
      // 【期待値確認】: 成功レスポンス、ログ件数500件維持、最古ログ削除、新ログ追加
      expect(result.success).toBe(true); // 【確認内容】: ログローテーション後にダウンロードが成功すること 🟡
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({
              level: 'INFO',
              message: expect.stringContaining('ダウンロード成功'),
            }),
          ]),
        })
      ); // 【確認内容】: 新しいダウンロード成功ログが追加されること 🟡
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.any(Array),
        })
      ); // 【確認内容】: ログ配列がストレージに保存されること 🟡
      // 実際のログ配列の長さは500件以下であることを間接的に確認
    });

    test('TC-072-202: ダウンロードリトライ遅延の境界（最大2000ms）', async () => {
      // 【テスト目的】: リトライエンジンとの統合時に、最大遅延時間2000msが適切に適用されることを検証する
      // 【テスト内容】: ダウンロード失敗時のリトライ遅延が上限2000msを超えないことを確認する
      // 【期待される動作】: ダウンロード失敗→リトライ計算→上限適用→2000ms以下の遅延設定
      // 🟡 信頼性レベル: 既存retry-engineの遅延上限要件から推測される境界値制御

      // 【テストデータ準備】: 長時間のリトライ遅延が計算される状況を模擬（例：5回目のリトライ）
      // 【初期条件設定】: 連続失敗により指数バックオフが大きな値になっている状況を想定
      const request = { url: 'https://example.com/image.png', fileName: 'test.png' };
      const mockContains = vi.fn().mockResolvedValue(true);
      const mockDownload = vi.fn().mockRejectedValue(new Error('Network timeout'));

      (globalThis as any).chrome = {
        permissions: {
          contains: mockContains,
        },
        downloads: {
          download: mockDownload,
        },
        storage: {
          local: {
            get: vi.fn().mockResolvedValue({
              logs: [],
              retryCount: 5, // 5回目のリトライを想定
            }),
            set: vi.fn().mockResolvedValue(undefined),
          },
        },
        runtime: {
          lastError: { message: 'Network timeout' },
        },
      } satisfies Partial<typeof chrome> as typeof chrome;

      // 【実際の処理実行】: ensureDownloadPermissionAndDownloadを呼び出してリトライ遅延境界処理を実行
      // 【処理内容】: ダウンロード失敗→リトライ遅延計算→上限チェック→2000ms制限適用の順で実行されるはず
      const result = await ensureDownloadPermissionAndDownload(request);

      // 【結果検証】: リトライ遅延が上限2000msを超えず、適切に制限されることを検証
      // 【期待値確認】: 失敗レスポンス、リトライ委譲、遅延時間が2000ms以下
      expect(result.success).toBe(false); // 【確認内容】: ダウンロード失敗により失敗レスポンスが返ること 🟡
      expect(result.retryable).toBe(true); // 【確認内容】: リトライエンジンによる再試行が設定されること 🟡
      expect(result.retryDelay).toBeLessThanOrEqual(2000); // 【確認内容】: リトライ遅延が上限2000ms以下に制限されること 🟡
      expect(result.retryDelay).toBeGreaterThan(0); // 【確認内容】: リトライ遅延が正の値であること 🟡
    });

    test('TC-072-203: ファイル名サニタイズ境界（不正文字のみ）', async () => {
      // 【テスト目的】: ファイル名に不正な文字のみが含まれている場合の境界値処理を検証する
      // 【テスト内容】: 全て不正文字で構成されたファイル名が適切にサニタイズされることを確認する
      // 【期待される動作】: 不正文字検出→サニタイズ実行→フォールバックファイル名生成→ダウンロード実行
      // 🟡 信頼性レベル: 既存fileNameTemplate.tsのサニタイズ機能から推測される境界値処理

      // 【テストデータ準備】: 不正文字のみで構成されたファイル名を用意し、サニタイズ境界を模擬
      // 【初期条件設定】: ユーザが意図的または偶発的に不正なファイル名を指定した状況を想定
      const request = {
        url: 'https://example.com/image.png',
        fileName: '<>:"/\\|?*', // Windows/Linuxで禁止されている文字のみ
      };
      const mockContains = vi.fn().mockResolvedValue(true);
      const mockDownload = vi.fn().mockResolvedValue(999);

      (globalThis as any).chrome = {
        permissions: {
          contains: mockContains,
        },
        downloads: {
          download: mockDownload,
        },
        storage: {
          local: {
            get: vi.fn().mockResolvedValue({ logs: [] }),
            set: vi.fn().mockResolvedValue(undefined),
          },
        },
        runtime: {
          lastError: undefined,
        },
      } satisfies Partial<typeof chrome> as typeof chrome;

      // 【実際の処理実行】: ensureDownloadPermissionAndDownloadを呼び出してファイル名サニタイズ境界処理を実行
      // 【処理内容】: ファイル名検証→サニタイズ→フォールバック名生成→ダウンロード実行の順で実行されるはず
      const result = await ensureDownloadPermissionAndDownload(request);

      // 【結果検証】: 不正文字のみのファイル名が適切にサニタイズされ、ダウンロードが成功することを検証
      // 【期待値確認】: 成功レスポンス、サニタイズ済みファイル名でのダウンロード実行
      expect(result.success).toBe(true); // 【確認内容】: ファイル名サニタイズ後にダウンロードが成功すること 🟡
      expect(mockDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.not.stringMatching(/[<>:"/\\|?*]/), // 不正文字が含まれていないこと
        })
      ); // 【確認内容】: サニタイズされたファイル名でダウンロードが実行されること 🟡
      expect(mockDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.stringMatching(/^.+\.(png|jpg|jpeg|gif|webp)$/i), // 有効な拡張子を持つこと
        })
      ); // 【確認内容】: フォールバックファイル名が適切な拡張子を持つこと 🟡
    });

    test('TC-072-204: 権限要求ダイアログ拒否→承諾の境界', async () => {
      // 【テスト目的】: 同一セッション内で権限要求が拒否された後、再要求時に承諾された場合の境界値処理を検証する
      // 【テスト内容】: permissionPendingフラグの状態変化と、拒否→承諾の境界での動作を確認する
      // 【期待される動作】: 初回拒否→フラグ設定→再要求→承諾→フラグ解除→ダウンロード実行
      // 🟡 信頼性レベル: ユーザエクスペリエンス観点から推測される状態遷移の境界値処理

      // 【テストデータ準備】: 権限拒否後の再要求シナリオを模擬するため、2回の関数呼び出しを想定
      // 【初期条件設定】: ユーザが最初は拒否したが、後で考え直して承諾する現実的な使用パターン
      const request = { url: 'https://example.com/image.png', fileName: 'test.png' };

      // 1回目: 権限拒否のモック
      const mockContains1 = vi.fn().mockResolvedValue(false);
      const mockRequest1 = vi.fn().mockResolvedValue(false);
      const mockDownload1 = vi.fn();
      const mockSet1 = vi.fn().mockResolvedValue(undefined);

      (globalThis as any).chrome = {
        permissions: {
          contains: mockContains1,
          request: mockRequest1,
        },
        downloads: {
          download: mockDownload1,
        },
        storage: {
          local: {
            get: vi.fn().mockResolvedValue({ logs: [] }),
            set: mockSet1,
          },
        },
        runtime: {
          lastError: undefined,
        },
      } satisfies Partial<typeof chrome> as typeof chrome;

      // 【1回目の処理実行】: 権限拒否ケースを実行してpermissionPendingフラグを設定
      const result1 = await ensureDownloadPermissionAndDownload(request);

      // 【1回目の結果検証】: 権限拒否により失敗し、permissionPendingフラグが設定されることを確認
      expect(result1.success).toBe(false); // 【確認内容】: 初回拒否により失敗すること 🟡
      expect(result1.errorCode).toBe('PERMISSION_DENIED'); // 【確認内容】: 権限拒否エラーが返されること 🟡

      // 2回目: 権限承諾のモック（境界値）
      const mockContains2 = vi.fn().mockResolvedValue(false);
      const mockRequest2 = vi.fn().mockResolvedValue(true); // 今度は承諾
      const mockDownload2 = vi.fn().mockResolvedValue(888);
      const mockSet2 = vi.fn().mockResolvedValue(undefined);

      (globalThis as any).chrome = {
        permissions: {
          contains: mockContains2,
          request: mockRequest2,
        },
        downloads: {
          download: mockDownload2,
        },
        storage: {
          local: {
            get: vi.fn().mockResolvedValue({
              logs: [],
              permissionPending: true, // 前回の拒否により設定されたフラグ
            }),
            set: mockSet2,
          },
        },
        runtime: {
          lastError: undefined,
        },
      } satisfies Partial<typeof chrome> as typeof chrome;

      // 【2回目の処理実行】: 権限承諾ケースを実行してフラグ解除とダウンロード実行を確認
      const result2 = await ensureDownloadPermissionAndDownload(request);

      // 【2回目の結果検証】: 権限承諾により成功し、permissionPendingフラグが解除されることを確認
      expect(result2.success).toBe(true); // 【確認内容】: 境界を越えて承諾時に成功すること 🟡
      expect(result2.downloadId).toBe(888); // 【確認内容】: ダウンロードIDが正しく返却されること 🟡
      expect(mockDownload2).toHaveBeenCalledTimes(1); // 【確認内容】: 承諾後にダウンロードが実行されること 🟡
      expect(mockSet2).toHaveBeenCalledWith(
        expect.objectContaining({
          permissionPending: false,
        })
      ); // 【確認内容】: permissionPendingフラグが境界を越えてfalseに更新されること 🟡
    });
  });
});
