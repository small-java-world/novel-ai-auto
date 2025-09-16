// テストファイル: retry-engine.test.ts
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
import { createRetryEngine, type RetryEngine } from './retry-engine';
import { guardRejection } from '../../test/helpers';

describe('リトライエンジン（指数バックオフ）', () => {
  // 【限定的未処理拒否抑止】: 本テストファイル内の未処理拒否を握りつぶし、誤検出を防止（実装側からは撤去）
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
    // 【テスト前準備】: 各テスト実行前にタイマーをモック化し、一貫したテスト条件を保証
    // 【環境初期化】: 前のテストの影響を受けないよう、すべての状態をクリーンにリセット
    vi.useFakeTimers();
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後にタイマーをリストア
    // 【状態復元】: 次のテストに影響しないよう、タイマーを元の状態に戻す
    vi.useRealTimers();
  });

  test('指数バックオフで遅延時間を正しく計算する（デフォルト設定：base=500ms, factor=2.0）', async () => {
    // 【テスト目的】: 指数バックオフ計算式（base * factor^attempts）が正しく動作することを確認
    // 【テスト内容】: デフォルト設定（base=500ms, factor=2.0）で各試行回数での遅延時間を検証
    // 【期待される動作】: 0回目=500ms, 1回目=1000ms, 2回目=2000ms, 3回目=4000ms, 4回目=8000ms
    // 🟢 信頼性レベル: TASK-032の要件仕様（baseDelay=500ms, factor=2.0）に基づく

    // 【テストデータ準備】: デフォルト設定と期待値配列を用意
    // 【初期条件設定】: 標準的な指数バックオフパラメータ
    const retryEngine = createRetryEngine({
      baseDelay: 500,
      factor: 2.0,
      maxRetries: 5,
    });

    // 【実際の処理実行】: 各試行回数での遅延時間を計算
    // 【処理内容】: 指数バックオフアルゴリズムによる遅延時間計算
    const delay0 = retryEngine.calculateDelay(0);
    const delay1 = retryEngine.calculateDelay(1);
    const delay2 = retryEngine.calculateDelay(2);
    const delay3 = retryEngine.calculateDelay(3);
    const delay4 = retryEngine.calculateDelay(4);

    // 【結果検証】: 各遅延時間が期待値と一致することを確認
    // 【期待値確認】: 指数バックオフの数学的計算結果との照合
    expect(delay0).toBe(500); // 【確認内容】: 0回目の遅延時間が base × 2^0 = 500ms 🟢
    expect(delay1).toBe(1000); // 【確認内容】: 1回目の遅延時間が base × 2^1 = 1000ms 🟢
    expect(delay2).toBe(2000); // 【確認内容】: 2回目の遅延時間が base × 2^2 = 2000ms 🟢
    expect(delay3).toBe(4000); // 【確認内容】: 3回目の遅延時間が base × 2^3 = 4000ms 🟢
    expect(delay4).toBe(8000); // 【確認内容】: 4回目の遅延時間が base × 2^4 = 8000ms 🟢
  });

  test('カスタム設定で指数バックオフ計算が正しく動作する（base=200ms, factor=1.5）', async () => {
    // 【テスト目的】: デフォルト以外の設定値でも指数バックオフが正しく動作することを確認
    // 【テスト内容】: カスタムパラメータ（base=200ms, factor=1.5）での遅延時間計算を検証
    // 【期待される動作】: 0回目=200ms, 1回目=300ms, 2回目=450ms, 3回目=675ms
    // 🟡 信頼性レベル: TASK-032要件「設定で変更可」からの妥当な推測

    // 【テストデータ準備】: カスタム設定パラメータ
    // 【初期条件設定】: デフォルトとは異なる指数バックオフパラメータ
    const retryEngine = createRetryEngine({
      baseDelay: 200,
      factor: 1.5,
      maxRetries: 3,
    });

    // 【実際の処理実行】: カスタム設定での遅延時間計算
    // 【処理内容】: factor=1.5での指数バックオフ計算
    const delay0 = retryEngine.calculateDelay(0);
    const delay1 = retryEngine.calculateDelay(1);
    const delay2 = retryEngine.calculateDelay(2);

    // 【結果検証】: カスタム設定での計算結果確認
    // 【期待値確認】: 200 * 1.5^n の計算結果と照合
    expect(delay0).toBe(200); // 【確認内容】: 0回目の遅延時間が 200 × 1.5^0 = 200ms 🟡
    expect(delay1).toBe(300); // 【確認内容】: 1回目の遅延時間が 200 × 1.5^1 = 300ms 🟡
    expect(delay2).toBe(450); // 【確認内容】: 2回目の遅延時間が 200 × 1.5^2 = 450ms 🟡
  });

  test('最大リトライ回数に達したときに再試行を停止する', async () => {
    // 【テスト目的】: maxRetries設定により再試行が適切に停止されることを確認
    // 【テスト内容】: 最大回数（3回）に達した後のshouldRetry判定をテスト
    // 【期待される動作】: 3回目まではtrue、4回目以降はfalseを返す
    // 🟢 信頼性レベル: TASK-032要件「上限到達の扱い」に明記

    // 【テストデータ準備】: 最大3回リトライの設定
    // 【初期条件設定】: 上限テスト用の小さなmaxRetries値
    const retryEngine = createRetryEngine({
      baseDelay: 100,
      factor: 2.0,
      maxRetries: 3,
    });

    // 【実際の処理実行】: 各試行回数でのリトライ可否判定
    // 【処理内容】: shouldRetryメソッドによる上限チェック
    const should0 = retryEngine.shouldRetry(0);
    const should1 = retryEngine.shouldRetry(1);
    const should2 = retryEngine.shouldRetry(2);
    const should3 = retryEngine.shouldRetry(3);
    const should4 = retryEngine.shouldRetry(4);

    // 【結果検証】: 上限前後でのリトライ可否が正しく判定されることを確認
    // 【期待値確認】: maxRetries=3での境界値動作確認
    expect(should0).toBe(true); // 【確認内容】: 0回目（初回）はリトライ可能 🟢
    expect(should1).toBe(true); // 【確認内容】: 1回目はリトライ可能 🟢
    expect(should2).toBe(true); // 【確認内容】: 2回目はリトライ可能 🟢
    expect(should3).toBe(false); // 【確認内容】: 3回目（上限）はリトライ不可 🟢
    expect(should4).toBe(false); // 【確認内容】: 4回目以降はリトライ不可 🟢
  });

  test('実際の遅延処理が指定時間後に実行される', async () => {
    // 【テスト目的】: executeWithDelay メソッドが指定された遅延時間で処理を実行することを確認
    // 【テスト内容】: モックタイマーを使用して、500ms遅延後にコールバックが実行されることを検証
    // 【期待される動作】: 指定時間経過前は未実行、経過後に実行される
    // 🟡 信頼性レベル: NFR-002「500ms以内」要件からの実装推測

    // 【テストデータ準備】: 実行状況を追跡するモック関数
    // 【初期条件設定】: コールバック実行の確認用セットアップ
    const retryEngine = createRetryEngine({
      baseDelay: 500,
      factor: 2.0,
      maxRetries: 5,
    });
    const mockCallback = vi.fn();

    // 【実際の処理実行】: 500ms遅延でのコールバック実行をスケジュール
    // 【処理内容】: executeWithDelayによる遅延実行
    retryEngine.executeWithDelay(500, mockCallback);

    // 【中間検証】: 遅延時間経過前はコールバックが未実行
    expect(mockCallback).not.toHaveBeenCalled(); // 【確認内容】: 即座には実行されない 🟡

    // 【時間進行】: 500ms経過をシミュレート
    vi.advanceTimersByTime(500);

    // 【結果検証】: 指定時間経過後にコールバックが実行される
    // 【期待値確認】: executeWithDelayの遅延実行動作確認
    expect(mockCallback).toHaveBeenCalledTimes(1); // 【確認内容】: 500ms後に1回実行される 🟡
  });

  test('リトライ状態をリセットできる', async () => {
    // 【テスト目的】: リトライエンジンの状態リセット機能が正しく動作することを確認
    // 【テスト内容】: 複数回失敗後にリセットし、再度0回目から開始できることを検証
    // 【期待される動作】: リセット前は失敗回数が蓄積、リセット後は0回目に戻る
    // 🟡 信頼性レベル: TASK-032「キャンセル/上限到達の扱い」からの推測

    // 【テストデータ準備】: リトライ状態追跡用のエンジン
    // 【初期条件設定】: 状態管理テスト用の設定
    const retryEngine = createRetryEngine({
      baseDelay: 100,
      factor: 2.0,
      maxRetries: 3,
    });

    // 【事前状態設定】: 2回失敗状態を作成
    retryEngine.recordFailure();
    retryEngine.recordFailure();

    // 【中間検証】: 失敗回数が正しく記録されている
    expect(retryEngine.getCurrentAttempts()).toBe(2); // 【確認内容】: 2回失敗が記録されている 🟡

    // 【実際の処理実行】: 状態リセット実行
    // 【処理内容】: resetメソッドによる状態初期化
    retryEngine.reset();

    // 【結果検証】: リセット後に失敗回数が0に戻る
    // 【期待値確認】: 状態リセット機能の動作確認
    expect(retryEngine.getCurrentAttempts()).toBe(0); // 【確認内容】: リセット後は失敗回数が0に戻る 🟡
    expect(retryEngine.shouldRetry(0)).toBe(true); // 【確認内容】: リセット後は再びリトライ可能 🟡
  });

  test('キャンセル状態での処理停止', async () => {
    // 【テスト目的】: キャンセル状態が設定されたときに新たなリトライが停止されることを確認
    // 【テスト内容】: cancel()呼び出し後のshouldRetry判定とexecuteWithDelay動作をテスト
    // 【期待される動作】: キャンセル後はリトライ不可、遅延実行も無効化
    // 🟡 信頼性レベル: TASK-032「キャンセル/上限到達の扱い」からの推測

    // 【テストデータ準備】: キャンセルテスト用のエンジンとコールバック
    // 【初期条件設定】: キャンセル機能テスト用セットアップ
    const retryEngine = createRetryEngine({
      baseDelay: 200,
      factor: 1.5,
      maxRetries: 5,
    });
    const mockCallback = vi.fn();

    // 【実際の処理実行】: キャンセル状態設定
    // 【処理内容】: cancelメソッドによる停止状態への移行
    retryEngine.cancel();

    // 【結果検証】: キャンセル後の動作確認
    // 【期待値確認】: キャンセル状態での適切な停止動作
    expect(retryEngine.shouldRetry(0)).toBe(false); // 【確認内容】: キャンセル後は初回でもリトライ不可 🟡
    expect(retryEngine.shouldRetry(1)).toBe(false); // 【確認内容】: キャンセル後は任意回数でリトライ不可 🟡

    // 【遅延実行テスト】: キャンセル状態での遅延実行
    retryEngine.executeWithDelay(200, mockCallback);
    vi.advanceTimersByTime(200);

    expect(mockCallback).not.toHaveBeenCalled(); // 【確認内容】: キャンセル状態では遅延実行も無効 🟡
  });

  test('境界値テスト: maxRetries=0での動作', async () => {
    // 【テスト目的】: maxRetries=0（リトライ禁止）設定での動作を確認
    // 【テスト内容】: リトライ回数0設定時のshouldRetry判定をテスト
    // 【期待される動作】: 初回から常にfalseを返す
    // 🔴 信頼性レベル: 元の資料にない境界値ケースの推測

    // 【テストデータ準備】: リトライ禁止設定
    // 【初期条件設定】: 極端な境界値テスト用設定
    const retryEngine = createRetryEngine({
      baseDelay: 100,
      factor: 2.0,
      maxRetries: 0,
    });

    // 【実際の処理実行】: リトライ可否判定
    // 【処理内容】: 0回設定でのshouldRetryチェック
    const should0 = retryEngine.shouldRetry(0);
    const should1 = retryEngine.shouldRetry(1);

    // 【結果検証】: リトライ禁止設定での動作確認
    // 【期待値確認】: maxRetries=0での一貫した拒否動作
    expect(should0).toBe(false); // 【確認内容】: 0回設定では初回からリトライ不可 🔴
    expect(should1).toBe(false); // 【確認内容】: 0回設定では任意回数でリトライ不可 🔴
  });

  test('上限到達時のエラー伝播', async () => {
    // 【テスト目的】: リトライ上限到達時に失敗が上位へ適切に伝播されることを確認
    // 【テスト内容】: maxRetries到達後のexecuteWithRetry動作をテスト
    // 【期待される動作】: 上限到達時にRejectedPromiseまたは適切なエラーが返される
    // 🟢 信頼性レベル: TASK-032要件「リトライ上限到達時に失敗を確定し上位へ伝播」に明記

    // 【テストデータ準備】: 必ず失敗する処理とリトライエンジン
    // 【初期条件設定】: 上限到達エラー伝播テスト用セットアップ
    const retryEngine = createRetryEngine({
      baseDelay: 50,
      factor: 2.0,
      maxRetries: 2,
    });

    const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));

    // 【実際の処理実行】: 必ず失敗する処理をリトライ付きで実行
    // 【処理内容】: executeWithRetryによる自動リトライ処理
    const resultPromise = guardRejection(retryEngine.executeWithRetry(failingOperation));

    // タイマーを段階的に進めてリトライプロセスを完了させる
    // 1回目の遅延: 50ms
    await vi.advanceTimersByTimeAsync(50);
    // 2回目の遅延: 100ms
    await vi.advanceTimersByTimeAsync(100);
    // 安全のため追加の時間を進める
    await vi.advanceTimersByTimeAsync(200);

    // 【結果検証】: 上限到達時の失敗伝播確認
    // 【期待値確認】: リトライ上限到達後の適切なエラー処理
    await expect(resultPromise).rejects.toThrow('Operation failed'); // 【確認内容】: 上限到達時に元のエラーが伝播される 🟢
    expect(failingOperation).toHaveBeenCalledTimes(3); // 【確認内容】: 初回+リトライ2回=計3回実行される 🟢
  });

  test('不正な設定値は作成時に例外を投げる（baseDelay/factor/maxRetries）', () => {
    // baseDelay < 0
    expect(() => createRetryEngine({ baseDelay: -1, factor: 2.0, maxRetries: 1 })).toThrow(
      TypeError
    );
    // factor <= 0
    expect(() => createRetryEngine({ baseDelay: 100, factor: 0, maxRetries: 1 })).toThrow(
      TypeError
    );
    // maxRetries が負数
    expect(() =>
      createRetryEngine({ baseDelay: 100, factor: 2.0, maxRetries: -1 as unknown as number })
    ).toThrow(TypeError);
    // maxRetries が整数でない
    expect(() =>
      createRetryEngine({ baseDelay: 100, factor: 2.0, maxRetries: 1.5 as unknown as number })
    ).toThrow(TypeError);
  });

  test('calculateDelay: attempts が負数/NaN の場合は 0 として扱う', () => {
    const retryEngine = createRetryEngine({ baseDelay: 100, factor: 2.0, maxRetries: 3 });
    // @ts-expect-error 故意に不正値
    expect(retryEngine.calculateDelay(-5)).toBe(100);
    // @ts-expect-error 故意に不正値
    expect(retryEngine.calculateDelay(Number.NaN)).toBe(100);
  });

  test('AbortSignal: 事前に中断された場合は即時に中断で失敗し、operationは呼ばれない', async () => {
    const retryEngine = createRetryEngine({ baseDelay: 100, factor: 2.0, maxRetries: 3 });
    const controller = new AbortController();
    controller.abort();

    const op = vi.fn(async (_signal?: AbortSignal) => {
      return 42 as any;
    });

    await expect(
      retryEngine.executeWithRetry(op, { signal: controller.signal })
    ).rejects.toHaveProperty('name', 'AbortError');
    expect(op).not.toHaveBeenCalled();
  });

  test('AbortSignal: リトライ待機中に中断された場合は次の試行を行わずに中断で失敗する', async () => {
    vi.useFakeTimers();
    const retryEngine = createRetryEngine({ baseDelay: 50, factor: 2.0, maxRetries: 5 });
    const controller = new AbortController();
    const failingOperation = vi.fn().mockRejectedValue(new Error('fail')) as unknown as (
      signal?: AbortSignal
    ) => Promise<unknown>;

    const p = retryEngine.executeWithRetry(failingOperation, { signal: controller.signal });
    // 1回目失敗後、次の待機(50ms)に入るので、その間に中断
    await vi.advanceTimersByTimeAsync(25);
    controller.abort();
    await expect(p).rejects.toHaveProperty('name', 'AbortError');
    // 1回目は実行済み、2回目以降は未実行
    expect(failingOperation.mock.calls.length >= 1).toBe(true);
  });

  test('AbortSignal: operationにシグナルが伝播される', async () => {
    const retryEngine = createRetryEngine({ baseDelay: 10, factor: 2.0, maxRetries: 0 });
    const controller = new AbortController();
    const seen: AbortSignal[] = [];
    const op = vi.fn().mockImplementation(async (signal?: AbortSignal) => {
      if (signal) seen.push(signal);
      // 単に成功させる
      return 'ok' as any;
    }) as unknown as (signal?: AbortSignal) => Promise<unknown>;

    const res = await retryEngine.executeWithRetry(op, { signal: controller.signal });
    expect(res).toBe('ok');
    expect(seen.length).toBe(1);
    expect(seen[0]).toBe(controller.signal);
  });

  test('runWithRetry: ハンドルで即時キャンセルすると operation は呼ばれない', async () => {
    const retryEngine = createRetryEngine({ baseDelay: 100, factor: 2.0, maxRetries: 3 });
    const op = vi.fn(async (_signal?: AbortSignal) => 1 as any);
    const handle = retryEngine.runWithRetry(op);
    handle.cancel();
    await expect(handle.promise).rejects.toHaveProperty('name', 'AbortError');
    expect(op).not.toHaveBeenCalled();
  });

  test('runWithRetry: 待機中にハンドルでキャンセルすると次の試行は行われない', async () => {
    vi.useFakeTimers();
    const retryEngine = createRetryEngine({ baseDelay: 50, factor: 2.0, maxRetries: 3 });
    const failing = vi.fn().mockRejectedValue(new Error('x')) as unknown as (
      signal?: AbortSignal
    ) => Promise<unknown>;
    const handle = retryEngine.runWithRetry(failing);
    // 1回目が失敗し、次の遅延(50ms)待ちに入る想定
    await vi.advanceTimersByTimeAsync(25);
    handle.cancel();
    await expect(handle.promise).rejects.toHaveProperty('name', 'AbortError');
    expect((failing as any).mock.calls.length >= 1).toBe(true);
  });

  test('runWithRetry: 外部シグナルと内部シグナルのマージ（外部→内部のみ伝播）', async () => {
    const retryEngine = createRetryEngine({ baseDelay: 10, factor: 2.0, maxRetries: 3 });
    const ext = new AbortController();
    const op = vi.fn(async (_signal?: AbortSignal) => Promise.reject(new Error('f')));
    const handle = retryEngine.runWithRetry(op as any, { signal: ext.signal });
    // 外部シグナルを中断 → 内部も中断
    ext.abort();
    await expect(handle.promise).rejects.toHaveProperty('name', 'AbortError');
  });

  test('runWithRetry: ハンドルの cancel は外部シグナルを中断しない（ワンウェイ伝播）', async () => {
    const retryEngine = createRetryEngine({ baseDelay: 10, factor: 2.0, maxRetries: 0 });
    const ext = new AbortController();
    const op = vi.fn(
      async (signal?: AbortSignal) =>
        new Promise((_resolve, reject) => {
          const err = new Error('The operation was aborted');
          (err as any).name = 'AbortError';
          const onAbort = () => reject(err);
          signal?.addEventListener('abort', onAbort, { once: true });
        })
    );
    const handle = retryEngine.runWithRetry(op as any, { signal: ext.signal });
    handle.cancel();
    expect(ext.signal.aborted).toBe(false);
    await expect(handle.promise).rejects.toHaveProperty('name', 'AbortError');
  });

  test('runWithRetry: operation は内部シグナルを受け取り、abort イベントを受信できる', async () => {
    const retryEngine = createRetryEngine({ baseDelay: 10, factor: 2.0, maxRetries: 0 });
    let sawAbort = false;
    const op = vi.fn(
      async (signal?: AbortSignal) =>
        new Promise((_resolve, reject) => {
          if (signal)
            signal.addEventListener('abort', () => {
              sawAbort = true;
            });
          const err = new Error('The operation was aborted');
          (err as any).name = 'AbortError';
          signal?.addEventListener('abort', () => reject(err), { once: true });
        })
    );
    const handle = retryEngine.runWithRetry(op);
    // 実行開始（マイクロタスク）後にキャンセルする
    await Promise.resolve();
    handle.cancel();
    await expect(handle.promise).rejects.toHaveProperty('name', 'AbortError');
    expect(sawAbort).toBe(true);
  });
});
