/**
 * 【テストファイル概要】: 生成監視・完了検知機能のテスト
 * 【対象機能】: TASK-022 生成開始・進捗監視・完了検知
 * 【テスト方針】: 最小限のテストケースでGreenフェーズの実装を検証
 * 🟢 信頼性レベル: タスク仕様書(novelai-auto-generator-tasks.md)に基づく
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GenerationMonitor } from './generation-monitor';

describe('GenerationMonitor', () => {
  let monitor: GenerationMonitor;
  let mockSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 【テストセットアップ】: Chrome runtime API のモック化
    // グローバルにセットアップ済みのchromeオブジェクトのsendMessageを再設定
    mockSendMessage = vi.fn();
    (globalThis as any).chrome.runtime.sendMessage = mockSendMessage;

    monitor = new GenerationMonitor();
  });

  afterEach(() => {
    // 【テスト後処理】: モックのクリーンアップ（グローバル設定は維持）
    vi.clearAllMocks();
  });

  describe('生成開始 (Generation Start)', () => {
    it('should start monitoring after generation begins', async () => {
      // 【テスト内容】: 生成開始後に監視が開始されること
      // 🟢 信頼性レベル: 基本的な監視開始機能のテスト

      // 【前提条件】: 生成ボタンが存在し、クリック可能
      const mockGenerateButton = document.createElement('button');
      mockGenerateButton.textContent = 'Generate';
      document.body.appendChild(mockGenerateButton);

      // 【実行】: 監視開始
      const result = await monitor.startMonitoring('test-job-id');

      // 【検証】: 監視が開始されたことを確認
      expect(result).toBe(true);
      expect(monitor.isMonitoring()).toBe(true);

      // 【後処理】: テスト用要素を削除
      document.body.removeChild(mockGenerateButton);
    });
  });

  describe('進捗監視 (Progress Monitoring)', () => {
    it('should send progress updates every 500ms', async () => {
      // 【テスト内容】: 500ms周期で進捗更新が送信されること
      // 🟢 信頼性レベル: 仕様書の500ms周期要件に基づく

      // 【時間制御セットアップ】: フェイクタイマーを事前に設定
      vi.useFakeTimers();

      // 【前提条件】: 監視開始済み
      await monitor.startMonitoring('test-job-id');

      // 【時間経過のシミュレーション】: 600ms経過をシミュレート
      vi.advanceTimersByTime(600);

      // 【検証】: 少なくとも1回は進捗更新メッセージが送信されること
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PROGRESS_UPDATE',
          payload: expect.objectContaining({
            jobId: 'test-job-id',
            status: expect.any(String),
            progress: expect.objectContaining({
              current: expect.any(Number),
              total: expect.any(Number),
            }),
          }),
        })
      );

      // 【後処理】: タイマーを実タイマーに戻す
      vi.useRealTimers();
    });
  });

  describe('完了検知 (Completion Detection)', () => {
    it('should detect completion and send completion signal', async () => {
      // 【テスト内容】: 完了を検知し、完了シグナルを送信すること
      // 🟢 信頼性レベル: 仕様書の完了検知要件に基づく

      // 【前提条件】: 監視開始済み
      await monitor.startMonitoring('test-job-id');

      // 【完了状態のシミュレーション】: 生成完了の要素を追加
      const mockCompletionElement = document.createElement('div');
      mockCompletionElement.className = 'generation-complete';
      document.body.appendChild(mockCompletionElement);

      // 【完了検知の実行】: 完了検知をトリガー
      monitor.checkForCompletion();

      // 【検証】: 完了メッセージが送信されること
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PROGRESS_UPDATE',
          payload: expect.objectContaining({
            jobId: 'test-job-id',
            status: 'completed',
          }),
        })
      );

      // 【後処理】: テスト用要素を削除
      document.body.removeChild(mockCompletionElement);
    });
  });
});
