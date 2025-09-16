// テストファイル: src/messaging-router.red.test.ts
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createMessagingRouter } from './router/messagingRouter';
import { MESSAGE_TYPES } from './shared/messages';

// Chrome API モック
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

// グローバルへ注入
(globalThis as any).chrome = mockChrome as any;

describe('messaging-router', () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テスト間の副作用を排除するため、モック呼び出し履歴をクリア
    // 【環境初期化】: グローバル chrome モックの状態をクリーンに保つ
    vi.clearAllMocks();
  });

  test('START_GENERATION: タブ未存在時に OPEN_OR_FOCUS_TAB を発行してから適用へ進む', async () => {
    // 【テスト目的】: NovelAI タブが無い場合に、自動でタブを開く（またはフォーカス要求を行う）挙動を確認する
    // 【テスト内容】: START_GENERATION を受理した際、tabs.query が空の場合は runtime に OPEN_OR_FOCUS_TAB を送信することを検証
    // 【期待される動作】: `chrome.runtime.sendMessage({ type: 'OPEN_OR_FOCUS_TAB', payload: { url: 'https://novelai.net/*' } })` が送られる
    // 🟡 信頼性レベル: REQ-101（タブ存在しない場合の新規作成/アクティブ化）と既存 OPEN_OR_FOCUS_TAB の実装/テストに基づく妥当推測

    // 【テストデータ準備】: 最小限のジョブ情報（id/prompt/params）
    const job = {
      id: 'uuid-red-1',
      createdAt: new Date().toISOString(),
      prompt: 'red prompt',
      params: { steps: 20 },
      status: 'pending',
    } as const;

    // 【初期条件設定】: NovelAI タブが存在しない状態を再現（tabs.query が空配列を返す）
    mockChrome.tabs.query.mockResolvedValueOnce([]);

    const router = createMessagingRouter();

    // 【実際の処理実行】: START_GENERATION メッセージをルータへ投入
    // 【処理内容】: 受理→タブ探索→（未存在なら）タブ起動要求を runtime へ通知
    await router.handleRuntimeMessage({
      type: MESSAGE_TYPES.START_GENERATION,
      payload: { job },
    } as any);

    // 【結果検証】: OPEN_OR_FOCUS_TAB が runtime に送られることを確認
    // 【期待値確認】: 受理後に新規タブ起動/フォーカスを促すメッセージが1回以上含まれること
    const openMsg = mockChrome.runtime.sendMessage.mock.calls
      .map((c: any[]) => c[0])
      .find((m: any) => m?.type === MESSAGE_TYPES.OPEN_OR_FOCUS_TAB);
    expect(openMsg).toBeTruthy(); // 【確認内容】: OPEN_OR_FOCUS_TAB が送られていること（メッセージ種類の検証） 🟡

    // 【結果検証】: タブが無い時点では CS への APPLY_AND_GENERATE は未送信であること
    // 【期待値確認】: 適切な順序制御（先にタブ準備、次に適用）を担保
    expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled(); // 【確認内容】: タブ未存在の段階で CS 送信していないこと 🟡
  });
});

