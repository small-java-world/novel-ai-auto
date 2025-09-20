/**
 * 【責務】: 進捗状態の管理と通信監視を専門に担当するクラス
 * 【リファクタリング対象】: ProgressDisplayManager から状態管理部分を分離
 * 【パフォーマンス改善】: 効率的な状態管理とタイムアウト処理
 * 🟢 信頼性レベル: 元実装のテスト通過実績に基づく
 */

import type { ProgressUpdateMessage } from '../types';

export class ProgressStateManager {
  private currentJobId: string = '';
  private startTime: number = 0;
  private lastMessageTime: number = 0;
  private isCancelled: boolean = false;
  private communicationTimeoutId?: number;
  private onTimeout?: () => void;

  private readonly communicationTimeoutMs: number = 5000;

  constructor() {
    this.lastMessageTime = Date.now();
    this.startCommunicationMonitoring();
  }

  /**
   * 【機能】: 現在のジョブIDを設定
   * 【改善点】: 状態管理の一元化
   */
  setCurrentJobId(jobId: string): void {
    this.currentJobId = jobId;
  }

  /**
   * 【機能】: 処理開始時刻を設定
   * 【改善点】: 状態管理の一元化
   */
  setStartTime(startTime: number): void {
    this.startTime = startTime;
  }

  /**
   * 【機能】: キャンセル状態を設定
   * 【改善点】: 状態変更の一元管理
   */
  setCancelledState(): void {
    this.isCancelled = true;
  }

  /**
   * 【機能】: メッセージ受信時刻を更新
   * 【改善点】: 通信監視の効率化
   */
  updateLastMessageTime(): void {
    this.lastMessageTime = Date.now();
    this.resetCommunicationTimeout();
  }

  /**
   * 【機能】: 各種状態の取得
   * 【改善点】: 読み取り専用アクセスの提供
   */
  getCurrentJobId(): string {
    return this.currentJobId;
  }

  getStartTime(): number {
    return this.startTime;
  }

  isCancelledState(): boolean {
    return this.isCancelled;
  }

  /**
   * 【機能】: メッセージバリデーション
   * 【改善点】: 状態管理クラスでの一元的な検証
   * 【テスト対応】: TC-043-006, 012の不正メッセージ処理テストに対応
   */
  validateMessage(message: any): boolean {
    // 【基本検証】: 必須フィールドの存在確認
    if (!message || message.type !== 'PROGRESS_UPDATE') {
      return false;
    }

    // 【型検証】: currentIndexとtotalCountが数値であることを確認
    if (message.currentIndex != null && typeof message.currentIndex !== 'number') {
      return false;
    }

    // 【論理検証】: currentIndexがtotalCount以下であることを確認
    if (message.totalCount != null && message.currentIndex != null &&
        message.currentIndex > message.totalCount) {
      return false;
    }

    return true;
  }

  /**
   * 【機能】: ステータス値を日本語テキストに変換
   * 【改善点】: 状態管理での一元的な変換処理
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'waiting': return '待機中';
      case 'generating': return '生成中';
      case 'downloading': return 'ダウンロード中';
      case 'completed': return '完了しました';
      case 'error': return 'エラーが発生しました';
      case 'cancelled': return 'キャンセル済み';
      default: return '処理中';
    }
  }

  /**
   * 【機能】: キャンセルと完了の競合状態を判定
   * 【改善点】: 状態管理での競合判定
   * 【テスト対応】: TC-043-008のキャンセル競合状態テストに対応
   */
  shouldIgnoreCompletionMessage(status: string): boolean {
    return this.isCancelled && status === 'completed';
  }

  /**
   * 【機能】: 通信監視の開始
   * 【改善点】: タイムアウト管理の効率化
   */
  startCommunicationMonitoring(): void {
    this.communicationTimeoutId = window.setTimeout(() => {
      this.handleCommunicationTimeout();
    }, this.communicationTimeoutMs);
  }

  /**
   * 【機能】: 通信タイムアウトのリセット
   * 【改善点】: 効率的なタイマー管理
   */
  private resetCommunicationTimeout(): void {
    if (this.communicationTimeoutId) {
      clearTimeout(this.communicationTimeoutId);
    }
    this.startCommunicationMonitoring();
  }

  /**
   * 【機能】: 通信断絶時の処理
   * 【改善点】: 状態管理での一元的なエラーハンドリング
   * 【テスト対応】: TC-043-005の通信断絶検出テストに対応
   */
  private handleCommunicationTimeout(): void {
    // 【通信断絶チェック】: 現在時刻と最終メッセージ時刻の差を確認
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;

    if (timeSinceLastMessage >= this.communicationTimeoutMs) {
      // 【状態変更通知】: 通信断絶を示すイベントを発行
      this.lastMessageTime = 0; // 通信断絶の印として0に設定

      // 【UI更新コールバック】: 登録されていればコールバックを呼び出し
      if (this.onTimeout) {
        this.onTimeout();
      }
    }
  }

  /**
   * 【機能】: 通信断絶状態の確認
   * 【改善点】: 状態の読み取り専用アクセス
   */
  isCommunicationTimedOut(): boolean {
    return this.lastMessageTime === 0;
  }

  /**
   * 【機能】: タイムアウト時のコールバックを設定
   * 【改善点】: UI更新のためのコールバック登録
   */
  setTimeoutCallback(callback: () => void): void {
    this.onTimeout = callback;
  }

  /**
   * 【機能】: リソースのクリーンアップ
   * 【改善点】: メモリリーク防止
   */
  cleanup(): void {
    if (this.communicationTimeoutId) {
      clearTimeout(this.communicationTimeoutId);
      this.communicationTimeoutId = undefined;
    }
  }
}