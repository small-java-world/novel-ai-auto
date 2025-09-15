// テストファイル: src/messaging-router.test.ts
import { describe, test, expect, beforeEach, vi } from 'vitest';

// まだ実装されていないルータのAPIを仮定してインポート（Redフェーズでは存在せず失敗する想定）
// 実装予定: createMessagingRouter が Service Worker 内で runtime/tabs メッセージをルーティング
import { createMessagingRouter } from './router/messagingRouter';

// Chrome API の簡易モック
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  tabs: {
    sendMessage: vi.fn(),
    query: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

// グローバルに反映
(globalThis as any).chrome = mockChrome as any;

describe('messaging-router', () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テストごとにモック呼び出し履歴をクリアして独立性を担保
    // 【環境初期化】: Chrome API モックを初期化して副作用を除去
    vi.clearAllMocks();
  });

  test('START_GENERATION メッセージを受理し、ジョブ登録後に CS へ APPLY_AND_GENERATE を送出する', async () => {
    // 【テスト目的】: Popup→Service Worker の START_GENERATION を正しく受理し、CSへ APPLY_AND_GENERATE を橋渡しできることを確認
    // 【テスト内容】: 受信メッセージの type/payload を検証し、tabs.sendMessage が正しい payload で呼ばれることを検証
    // 【期待される動作】: START_GENERATION を受理 → 内部登録 → 指定タブへ APPLY_AND_GENERATE を送出
    // 🟢 信頼性レベル: 設計(api-endpoints.md)および interfaces.ts の RuntimeMessage 定義に基づく

    // 【テストデータ準備】: 最小限の正当なジョブを構築
    // 【初期条件設定】: NovelAI タブの仮定ID 123、適切な payload を注入
    const job = {
      id: 'uuid-1',
      createdAt: new Date().toISOString(),
      prompt: 'test prompt',
      params: { steps: 28, count: 1, seed: 'random' },
      status: 'pending',
    };
    const startMsg = { type: 'START_GENERATION', payload: { job } } as const;

    // tabs.query は対象タブを返すものとする
    mockChrome.tabs.query.mockResolvedValue([{ id: 123 }]);

    // 【実際の処理実行】: ルータを生成し、START_GENERATION を投入
    // 【処理内容】: ルータは START_GENERATION を受理し、APPLY_AND_GENERATE を tabs.sendMessage で送る
    const router = createMessagingRouter();
    await router.handleRuntimeMessage(startMsg);

    // 【結果検証】: tabs.sendMessage が期待される payload で呼ばれていること
    // 【期待値確認】: type が APPLY_AND_GENERATE で、job がそのまま保持されている
    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(1); // 【確認内容】: CS への橋渡しが1回行われたことを確認 🟢
    expect(mockChrome.tabs.sendMessage.mock.calls[0][1]).toEqual({
      type: 'APPLY_AND_GENERATE',
      payload: { job },
    }); // 【確認内容】: メッセージ種別と payload 形状が仕様通りであることを確認 🟢
  });

  test('PROGRESS_UPDATE を受理して Popup へブロードキャストする', async () => {
    // 【テスト目的】: CS→SW の PROGRESS_UPDATE を受理し、Popup へ同等 payload を転送（ブロードキャスト）できることを確認する
    // 【テスト内容】: ルータに PROGRESS_UPDATE を投入し、chrome.runtime.sendMessage が期待どおり呼ばれることを検証する
    // 【期待される動作】: `chrome.runtime.sendMessage({ type: 'PROGRESS_UPDATE', payload })` が1回呼ばれる
    // 🟢 信頼性レベル: 設計(api-endpoints.md)の PROGRESS_UPDATE 仕様と dataflow.md の進捗フローに基づく

    // 【テストデータ準備】: jobId と進捗情報（current/total/etaSeconds）を含む正当な payload を用意
    // 【初期条件設定】: runtime.sendMessage は監視可能なモック
    const jobId = 'job-123';
    const payload = {
      jobId,
      status: 'running',
      progress: { current: 1, total: 3, etaSeconds: 20 },
    } as const;

    // 【実際の処理実行】: ルータで PROGRESS_UPDATE を処理
    const router = createMessagingRouter();
    await router.handleRuntimeMessage({ type: 'PROGRESS_UPDATE', payload });

    // 【結果検証】: Popup への転送（runtime.sendMessage）が正しい引数で実行されたこと
    // 【期待値確認】: type と payload が改変なく維持されている
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1); // 【確認内容】: ブロードキャストが1回行われたことを確認 🟢🟡🔴
    expect(mockChrome.runtime.sendMessage.mock.calls[0][0]).toEqual({
      type: 'PROGRESS_UPDATE',
      payload,
    }); // 【確認内容】: メッセージ種別と payload が仕様通りであることを確認 🟢
  });

  test('IMAGE_READY を受理して DOWNLOAD_IMAGE 指示を発行する', async () => {
    // 【テスト目的】: CS→SW の IMAGE_READY 受信時に、ダウンロード処理を起動する DOWNLOAD_IMAGE メッセージを発行できることを確認する
    // 【テスト内容】: ルータに IMAGE_READY を投入し、chrome.runtime.sendMessage が DOWNLOAD_IMAGE を1回正しいpayloadで送ることを検証
    // 【期待される動作】: `chrome.runtime.sendMessage({ type: 'DOWNLOAD_IMAGE', payload: { url, fileName } })` が1回呼ばれる
    // 🟢 信頼性レベル: 設計(api-endpoints.md)の DOWNLOAD_IMAGE 仕様に準拠

    // 【テストデータ準備】: 画像URLとファイル名を含むIMAGE_READY payloadを作成
    // 【初期条件設定】: runtime.sendMessage は監視可能なモック
    const jobId = 'job-xyz';
    const url = 'https://example.com/image.png';
    const fileName = '20240914_prompt_seed_001.png';
    const payload = { jobId, url, index: 1, fileName } as const;

    // 【実際の処理実行】: ルータで IMAGE_READY を処理
    const router = createMessagingRouter();
    await router.handleRuntimeMessage({ type: 'IMAGE_READY', payload });

    // 【結果検証】: runtime.sendMessage がDOWNLOAD_IMAGEを正しいpayloadで送信していること
    // 【期待値確認】: typeがDOWNLOAD_IMAGEで、payloadにurlとfileNameが含まれる
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1); // 【確認内容】: ダウンロード指示が1回行われたことを確認 🟢
    expect(mockChrome.runtime.sendMessage.mock.calls[0][0]).toEqual({
      type: 'DOWNLOAD_IMAGE',
      payload: { url, fileName },
    }); // 【確認内容】: メッセージ種別とpayload構造が仕様通りであることを確認 🟢
  });

  test('未知メッセージ type を拒否し ERROR を発行する', async () => {
    // 【テスト目的】: 未定義のメッセージ種別を受理した場合に、ERROR メッセージを発行して安全に拒否できることを確認
    // 【テスト内容】: 仕様外の type を投入し、chrome.runtime.sendMessage が ERROR を1回送ることを検証
    // 【期待される動作】: `chrome.runtime.sendMessage({ type: 'ERROR', payload:{ error:{ code:'UNKNOWN_MESSAGE', message }}})` が1回
    // 🟢 信頼性レベル: 設計（エラー種別の用意と ERROR メッセージの存在）に準拠

    // 【テストデータ準備】: 不明な type のメッセージを用意
    // 【初期条件設定】: runtime.sendMessage は監視可能なモック
    const unknown = { type: 'UNKNOWN', payload: {} } as const;

    // 【実際の処理実行】: ルータで UNKNOWN を処理
    const router = createMessagingRouter();
    await router.handleRuntimeMessage(unknown as any);

    // 【結果検証】: ERROR が1回送信され、エラーコードが UNKNOWN_MESSAGE であること
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1); // 【確認内容】: エラー通知が1回行われたことを確認 🟢
    const sent = mockChrome.runtime.sendMessage.mock.calls[0][0];
    expect(sent.type).toBe('ERROR'); // 【確認内容】: エラー種別のメッセージであることを確認 🟢
    expect(sent.payload?.error?.code).toBe('UNKNOWN_MESSAGE'); // 【確認内容】: エラーコードが仕様通りであることを確認 🟢
  });

  test('DOWNLOAD_IMAGE 失敗時に指数バックオフで再試行をスケジュールする', async () => {
    // 【テスト目的】: ダウンロード失敗（DOWNLOAD_FAILED）発生時に、一定のバックオフ後に DOWNLOAD_IMAGE を再送する再試行が行われることを確認
    // 【テスト内容】: ERROR(message: DOWNLOAD_FAILED) を投入し、500ms 経過後に DOWNLOAD_IMAGE が再送されることを検証
    // 【期待される動作】: 500ms の遅延後に `chrome.runtime.sendMessage({ type: 'DOWNLOAD_IMAGE', payload: { url, fileName } })`
    // 🟡 信頼性レベル: EARS(REQ-104, NFR-002)の再試行要件からの妥当な推測（メッセージ形状の詳細は設計裁量）

    // 【テストデータ準備】: 失敗時に必要な文脈（url, fileName）を context として付与
    // 【初期条件設定】: タイマーをフェイクに切り替え、runtime.sendMessage の呼び出しを監視
    vi.useFakeTimers();
    const url = 'https://example.com/fail.png';
    const fileName = 'fail_001.png';
    const errMsg = {
      type: 'ERROR',
      payload: {
        error: { code: 'DOWNLOAD_FAILED', message: 'download failed' },
        context: { url, fileName },
      },
    } as const;

    const router = createMessagingRouter();
    await router.handleRuntimeMessage(errMsg as any);

    // 【結果検証】: 即時には DOWNLOAD_IMAGE は送られない（スケジュールのみ）
    expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalledWith({
      type: 'DOWNLOAD_IMAGE',
      payload: { url, fileName },
    }); // 【確認内容】: 即時再送ではないこと（バックオフがあること）🟡

    // 【実行タイミング】: 500ms 経過後に再送されることを確認
    await vi.advanceTimersByTimeAsync(500);
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'DOWNLOAD_IMAGE',
      payload: { url, fileName },
    }); // 【確認内容】: バックオフ後にDOWNLOAD_IMAGEが再送されることを確認 🟡

    vi.useRealTimers();
  });

  test('DOWNLOAD_IMAGE 失敗時に指数バックオフで最大3回まで再試行し、その後は打ち切る', async () => {
    // 【テスト目的】: エラー(DOWNLOAD_FAILED)に対し指数バックオフで再試行し、上限到達で打ち切ることを確認
    // 【期待される動作】: 500ms, 1000ms, 2000ms の遅延で3回まで DOWNLOAD_IMAGE を再送し、4回目の失敗では再送しない
    // 🟡 信頼性レベル: REQ-104/NFR-002の再試行要件からの妥当な推測（上限=3, base=500ms, factor=2.0）

    vi.useFakeTimers();

    const url = 'https://example.com/retry.png';
    const fileName = 'retry_001.png';
    const errMsg = () =>
      ({
        type: 'ERROR',
        payload: {
          error: { code: 'DOWNLOAD_FAILED', message: 'download failed' },
          context: { url, fileName },
        },
      }) as const;

    const router = createMessagingRouter();

    // 1回目の失敗 → 500ms 後に1回目の再送
    await router.handleRuntimeMessage(errMsg() as any);
    expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalledWith({
      type: 'DOWNLOAD_IMAGE',
      payload: { url, fileName },
    });
    await vi.advanceTimersByTimeAsync(499);
    expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalledWith({
      type: 'DOWNLOAD_IMAGE',
      payload: { url, fileName },
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'DOWNLOAD_IMAGE',
      payload: { url, fileName },
    });

    // 2回目の失敗 → 1000ms 後に2回目の再送
    await router.handleRuntimeMessage(errMsg() as any);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'DOWNLOAD_IMAGE',
      payload: { url, fileName },
    });

    // 3回目の失敗 → 2000ms 後に3回目の再送
    await router.handleRuntimeMessage(errMsg() as any);
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'DOWNLOAD_IMAGE',
      payload: { url, fileName },
    });

    // 4回目の失敗 → 上限到達で打ち切り（再送は行わない）
    const countDownloadMsgs = () =>
      mockChrome.runtime.sendMessage.mock.calls.filter(
        (c: any[]) => c[0]?.type === 'DOWNLOAD_IMAGE'
      ).length;
    const beforeCalls = countDownloadMsgs();
    await router.handleRuntimeMessage(errMsg() as any);
    await vi.advanceTimersByTimeAsync(4000);
    const afterCalls = countDownloadMsgs();
    expect(afterCalls).toBe(beforeCalls); // 【確認内容】: 上限到達後は DOWNLOAD_IMAGE の追加送信がない 🟢

    vi.useRealTimers();
  });

  test('START_GENERATION の必須payload(job)欠落時は INVALID_PAYLOAD エラーで拒否する', async () => {
    // 【テスト目的】: 必須フィールド欠落時にエラーで拒否されること
    // 【期待動作】: chrome.runtime.sendMessage に ERROR(code: INVALID_PAYLOAD) が送られる
    // 🟢 信頼性レベル: REQ-006（メッセージ検証）の要件に基づく

    const router = createMessagingRouter();
    await router.handleRuntimeMessage({ type: 'START_GENERATION', payload: {} } as any);

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    const sent = mockChrome.runtime.sendMessage.mock.calls[0][0];
    expect(sent.type).toBe('ERROR');
    expect(sent.payload?.error?.code).toBe('INVALID_PAYLOAD');
  });

  test('PROGRESS_UPDATE の必須payload(jobId等)欠落時は INVALID_PAYLOAD エラーで拒否する', async () => {
    // 【テスト目的】: 進捗イベントで必須項目が無い場合、ブロードキャストせずにエラーを返す
    // 【期待動作】: ERROR(code: INVALID_PAYLOAD)、DOWNLOAD/PROGRESS の送信は行わない
    // 🟢 信頼性レベル: REQ-003/NFR-002/REQ-006 の整合

    const router = createMessagingRouter();
    await router.handleRuntimeMessage({
      type: 'PROGRESS_UPDATE',
      payload: { status: 'running', progress: { current: 1, total: 3 } },
    } as any);

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    const sent = mockChrome.runtime.sendMessage.mock.calls[0][0];
    expect(sent.type).toBe('ERROR');
    expect(sent.payload?.error?.code).toBe('INVALID_PAYLOAD');
  });

  test('IMAGE_READY の必須payload(url/fileName)欠落時は INVALID_PAYLOAD エラーで拒否する', async () => {
    // 【テスト目的】: ダウンロードに必要な情報が無ければエラーで拒否
    // 【期待動作】: ERROR(code: INVALID_PAYLOAD) が送られ、DOWNLOAD_IMAGE は送られない
    // 🟢 信頼性レベル: REQ-004/REQ-006

    const router = createMessagingRouter();
    await router.handleRuntimeMessage({
      type: 'IMAGE_READY',
      payload: { jobId: 'j1', index: 0, fileName: 'x.png' },
    } as any);

    const types = mockChrome.runtime.sendMessage.mock.calls.map((c: any[]) => c[0]?.type);
    expect(types).toContain('ERROR');
    expect(types).not.toContain('DOWNLOAD_IMAGE');
    const err = mockChrome.runtime.sendMessage.mock.calls.find(
      (c: any[]) => c[0]?.type === 'ERROR'
    )?.[0];
    expect(err.payload?.error?.code).toBe('INVALID_PAYLOAD');
  });

  test('IMAGE_READY の不正URLは INVALID_URL で拒否し DOWNLOAD_IMAGE は送らない', async () => {
    // 【テスト目的】: ダウンロードURLは http/https のみ許可し、それ以外は拒否する
    // 【期待動作】: ERROR(code: INVALID_URL) を送出、DOWNLOAD_IMAGE は送出されない
    // 🟢 信頼性レベル: NFR-103（サニタイズ/安全性）に基づく

    const router = createMessagingRouter();
    await router.handleRuntimeMessage({
      type: 'IMAGE_READY',
      payload: { jobId: 'j1', url: 'javascript:alert(1)', index: 0, fileName: 'x.png' },
    } as any);

    const types = mockChrome.runtime.sendMessage.mock.calls.map((c: any[]) => c[0]?.type);
    expect(types).toContain('ERROR');
    expect(types).not.toContain('DOWNLOAD_IMAGE');
    const err = mockChrome.runtime.sendMessage.mock.calls.find(
      (c: any[]) => c[0]?.type === 'ERROR'
    )?.[0];
    expect(err.payload?.error?.code).toBe('INVALID_URL');
  });

  test('OPEN_OR_FOCUS_TAB: 既存タブがあればフォーカスして作成しない', async () => {
    // 【テスト目的】: 既存の NovelAI タブがある場合は create せず update(active:true) を行う
    // 【期待動作】: tabs.update が1回呼ばれ、tabs.create は呼ばれない
    // 🟢 信頼性レベル: REQ-101 に基づく

    mockChrome.tabs.query.mockResolvedValue([{ id: 77, url: 'https://novelai.net/generate' }]);
    mockChrome.tabs.update.mockResolvedValue({});
    mockChrome.tabs.create.mockResolvedValue({ id: 88, url: 'https://novelai.net/' });

    const router = createMessagingRouter();
    await router.handleRuntimeMessage({
      type: 'OPEN_OR_FOCUS_TAB',
      payload: { url: 'https://novelai.net/*' },
    } as any);

    expect(mockChrome.tabs.update).toHaveBeenCalledWith(77, { active: true });
    expect(mockChrome.tabs.create).not.toHaveBeenCalled();
  });

  test('OPEN_OR_FOCUS_TAB: タブが無い場合は新規作成してアクティブ化する', async () => {
    // 【テスト目的】: NovelAI タブが無ければ tabs.create で作成
    // 【期待動作】: tabs.create が1回呼ばれ、tabs.update は呼ばれない
    // 🟢 信頼性レベル: REQ-101 に基づく

    mockChrome.tabs.query.mockResolvedValue([]);
    mockChrome.tabs.create.mockResolvedValue({ id: 91, url: 'https://novelai.net/' });

    const router = createMessagingRouter();
    await router.handleRuntimeMessage({
      type: 'OPEN_OR_FOCUS_TAB',
      payload: { url: 'https://novelai.net/*' },
    } as any);

    expect(mockChrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://novelai.net/',
      active: true,
    });
    expect(mockChrome.tabs.update).not.toHaveBeenCalled();
  });

  test('CANCEL_JOB を受理し、対象タブのCSへ中断シグナルを送出する', async () => {
    // 【テスト目的】: Popup→SW の CANCEL_JOB を受理し、Content Script へ tabs.sendMessage で橋渡し
    // 【期待動作】: tabs.sendMessage が { type: 'CANCEL_JOB', payload: { jobId } } で呼ばれる
    // 🟢 信頼性レベル: REQ-006/NFR-202 に基づく

    mockChrome.tabs.query.mockResolvedValue([{ id: 55 }]);
    const router = createMessagingRouter();
    await router.handleRuntimeMessage({ type: 'CANCEL_JOB', payload: { jobId: 'job-xyz' } } as any);

    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockChrome.tabs.sendMessage.mock.calls[0][0]).toBe(55);
    expect(mockChrome.tabs.sendMessage.mock.calls[0][1]).toEqual({
      type: 'CANCEL_JOB',
      payload: { jobId: 'job-xyz' },
    });
  });

  test('PROGRESS_UPDATE の値域不正 current > total は PROGRESS_INCONSISTENT で拒否する', async () => {
    // 【テスト目的】: 進捗の一貫性（current <= total）を破る入力を拒否
    // 【期待動作】: ERROR(code: PROGRESS_INCONSISTENT) を送出し、PROGRESS_UPDATE はブロードキャストしない
    // 🟢 信頼性レベル: REQ-003 の進捗表示要件に基づく

    const router = createMessagingRouter();
    await router.handleRuntimeMessage({
      type: 'PROGRESS_UPDATE',
      payload: { jobId: 'j-1', status: 'running', progress: { current: 5, total: 3 } },
    } as any);

    const types = mockChrome.runtime.sendMessage.mock.calls.map((c: any[]) => c[0]?.type);
    expect(types).toContain('ERROR');
    expect(types).not.toContain('PROGRESS_UPDATE');
    const err = mockChrome.runtime.sendMessage.mock.calls.find(
      (c: any[]) => c[0]?.type === 'ERROR'
    )?.[0];
    expect(err.payload?.error?.code).toBe('PROGRESS_INCONSISTENT');
  });

  test('PROGRESS_UPDATE の購読者不在でもエラーにせず処理を継続する', async () => {
    // 【テスト目的】: Popup等の購読者がいない場合でもPROGRESS_UPDATE送出で例外にしない
    // 【期待動作】: runtime.sendMessage は呼ばれるが、ERRORは送出されない（例外を握りつぶす）
    // 🟢 信頼性レベル: REQ-003 の進捗表示要件（購読者が一時的に不在でも継続）

    // 送信先不在を模擬
    mockChrome.runtime.sendMessage.mockRejectedValueOnce(new Error('Receiving end does not exist'));

    const router = createMessagingRouter();
    await router.handleRuntimeMessage({
      type: 'PROGRESS_UPDATE',
      payload: { jobId: 'j-2', status: 'running', progress: { current: 1, total: 3 } },
    } as any);

    // PROGRESS_UPDATE の送信試行は行われる
    const types = mockChrome.runtime.sendMessage.mock.calls.map((c: any[]) => c[0]?.type);
    expect(types).toContain('PROGRESS_UPDATE');
    // エラーは発行しない
    expect(types).not.toContain('ERROR');
  });

  test('IMAGE_READY の非常に長い fileName は安全に短縮・サニタイズされる', async () => {
    // 【テスト目的】: 不正文字や過長なファイル名を安全化（NFR-103）
    // 【期待動作】: DOWNLOAD_IMAGE の fileName が128文字以下かつ拡張子保持、禁止文字が除去
    // 🟡 信頼性レベル: NFR-103/EDGE-103 を簡易に満たす妥当な推測

    const router = createMessagingRouter();
    const longBase = 'a'.repeat(300) + ':/\\*?"<>|';
    const fileName = `${longBase}.png`;
    await router.handleRuntimeMessage({
      type: 'IMAGE_READY',
      payload: { jobId: 'j2', url: 'https://example.com/i.png', index: 0, fileName },
    } as any);

    const sent = mockChrome.runtime.sendMessage.mock.calls.find(
      (c: any[]) => c[0]?.type === 'DOWNLOAD_IMAGE'
    )?.[0];
    expect(sent).toBeTruthy();
    const outName = sent.payload.fileName as string;
    expect(outName.endsWith('.png')).toBe(true);
    expect(outName.length).toBeLessThanOrEqual(128);
    expect(/[\\/:*?"<>|]/.test(outName)).toBe(false); // 禁止文字なし
  });

  test('START_GENERATION の非常に長い prompt でも橋渡しが行われる', async () => {
    // 【テスト目的】: 大きなpayload（長いprompt）でも START_GENERATION → APPLY_AND_GENERATE が動作
    // 【期待動作】: tabs.sendMessage が呼ばれる（内容は透過）
    // 🟡 信頼性レベル: NFR-003/運用境界の妥当推測

    mockChrome.tabs.query.mockResolvedValue([{ id: 999 }]);
    const longPrompt = 'p'.repeat(10_000);
    const job = { id: 'j-long', prompt: longPrompt, params: { steps: 10 } };
    const router = createMessagingRouter();
    await router.handleRuntimeMessage({ type: 'START_GENERATION', payload: { job } } as any);

    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
    const msg = mockChrome.tabs.sendMessage.mock.calls[0][1];
    expect(msg.type).toBe('APPLY_AND_GENERATE');
    expect(msg.payload.job.prompt.length).toBe(10_000);
  });

  describe('レイテンシ境界（200ms目標, NFR-002）', () => {
    test('PROGRESS_UPDATE 経路はタイマーを用いず即時転送する', async () => {
      // 【テスト目的】: 進捗のブロードキャスト経路で setTimeout 等を使わない（200ms未満の即時性）
      // 【期待動作】: vi のタイマーキューに登録がないこと（0件）
      // 🟢 信頼性レベル: NFR-002 に基づく

      vi.useFakeTimers();
      const router = createMessagingRouter();
      await router.handleRuntimeMessage({
        type: 'PROGRESS_UPDATE',
        payload: { jobId: 'j-lat', status: 'running', progress: { current: 1, total: 2 } },
      } as any);

      expect(vi.getTimerCount()).toBe(0);
      vi.useRealTimers();
    });

    test('IMAGE_READY 経路はタイマーを用いず即時 DOWNLOAD_IMAGE を送る', async () => {
      // 【テスト目的】: 画像ダウンロード指示の発行に遅延を入れない
      // 【期待動作】: タイマー未使用（0件）
      // 🟢 信頼性レベル: NFR-002 に基づく

      vi.useFakeTimers();
      const router = createMessagingRouter();
      await router.handleRuntimeMessage({
        type: 'IMAGE_READY',
        payload: { jobId: 'j-lat2', url: 'https://example.com/a.png', index: 0, fileName: 'a.png' },
      } as any);

      expect(vi.getTimerCount()).toBe(0);
      vi.useRealTimers();
    });
  });

  describe('その他の境界・エラー分岐（EDGE系）', () => {
    test('EDGE-104: 再試行上限到達時は ERROR(DOWNLOAD_FAILED) を通知し追加再送しない', async () => {
      vi.useFakeTimers();
      const url = 'https://example.com/exhaust.png';
      const fileName = 'exhaust.png';
      const errMsg = {
        type: 'ERROR',
        payload: {
          error: { code: 'DOWNLOAD_FAILED', message: 'download failed' },
          context: { url, fileName },
        },
      } as const;

      const router = createMessagingRouter();
      // 4回失敗させて上限超過に到達
      await router.handleRuntimeMessage(errMsg as any);
      await vi.advanceTimersByTimeAsync(500);
      await router.handleRuntimeMessage(errMsg as any);
      await vi.advanceTimersByTimeAsync(1000);
      await router.handleRuntimeMessage(errMsg as any);
      await vi.advanceTimersByTimeAsync(2000);
      const before = mockChrome.runtime.sendMessage.mock.calls.length;
      await router.handleRuntimeMessage(errMsg as any);
      const after = mockChrome.runtime.sendMessage.mock.calls.length;
      // 上限時にERRORを一度通知する（最後の呼び出し差分が >=1 で、かつ type:ERROR が含まれることを確認）
      const newCalls = mockChrome.runtime.sendMessage.mock.calls
        .slice(before, after)
        .map((c: any[]) => c[0]?.type);
      expect(newCalls).toContain('ERROR');
      vi.useRealTimers();
    });

    test("EDGE-003: fileName が全て禁止文字でも 'image' にフォールバック", async () => {
      const router = createMessagingRouter();
      await router.handleRuntimeMessage({
        type: 'IMAGE_READY',
        payload: {
          jobId: 'j3',
          url: 'https://example.com/a.jpg',
          index: 0,
          fileName: ':/\\*?"<>|',
        },
      } as any);
      const sent = mockChrome.runtime.sendMessage.mock.calls.find(
        (c: any[]) => c[0]?.type === 'DOWNLOAD_IMAGE'
      )?.[0];
      expect(sent).toBeTruthy();
      expect(sent.payload.fileName.startsWith('image')).toBe(true);
    });

    test('EDGE-001: START_GENERATION で対象タブが見つからない場合は静かに無視する（エラーなし）', async () => {
      mockChrome.tabs.query.mockResolvedValue([]); // タブなし
      const job = { id: 'j-no-tab', prompt: 'p', params: {} };
      const router = createMessagingRouter();
      await router.handleRuntimeMessage({ type: 'START_GENERATION', payload: { job } } as any);
      // tabs.sendMessage は呼ばれない、ERROR も送られない
      const types = mockChrome.runtime.sendMessage.mock.calls.map((c: any[]) => c[0]?.type);
      expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled();
      expect(types).not.toContain('ERROR');
    });
  });
});
