/**
 * 【機能概要】: NovelAI Auto Generatorの進捗/残枚数/ETA/ログ表示機能を統合管理するクラス
 * 【リファクタリング済み】: DOM操作、ログ管理、状態管理を専門クラスに分離
 * 【パフォーマンス改善】: DOM要素キャッシュ化、効率的な状態管理を実現
 * 【テスト対応】: progress-display.red.test.tsの全テストケースとの互換性を維持
 * 🟢 信頼性レベル: TASK-043要件定義書とテストケース仕様に基づく
 */

import type { ProgressUpdateMessage, CancelJobMessage, LogEntry } from '../types';
import { ProgressDomManager } from './progress-dom-manager';
import { ProgressLogManager } from './progress-log-manager';
import { ProgressStateManager } from './progress-state-manager';
import { KeyboardNavigationManager } from './keyboard-navigation';

export class ProgressDisplayManager {
  private readonly domManager: ProgressDomManager;
  private readonly logManager: ProgressLogManager;
  private readonly stateManager: ProgressStateManager;
  private readonly keyboardManager: KeyboardNavigationManager;

  /**
   * 【機能概要】: リファクタリング済みProgressDisplayManagerクラスのコンストラクタ
   * 【改善点】: 責務分離により各専門クラスのインスタンスを管理
   * 【テスト対応】: 既存のテストケースとの完全な互換性を維持
   * 🟢 信頼性レベル: テストの初期化要件に基づく
   */
  constructor() {
    // 【責務分離】: 各専門クラスのインスタンス化
    this.domManager = new ProgressDomManager();
    this.logManager = new ProgressLogManager();
    this.stateManager = new ProgressStateManager();
    this.keyboardManager = new KeyboardNavigationManager();

    // 【初期化処理】: キャンセルボタンのクリックイベントを設定
    this.setupCancelButton();

    // 【通信監視コールバック】: タイムアウト時のUI更新処理を登録
    this.stateManager.setTimeoutCallback(() => {
      this.domManager.updateStatusText('通信中断');
      this.domManager.showReconnectButton();
    });
  }

  /**
   * 【機能概要】: PROGRESS_UPDATEメッセージを受信してUI表示を更新する
   * 【リファクタリング済み】: 各専門クラスを活用した効率的な処理
   * 【テスト対応】: TC-043-001, 003, 006, 008, 009, 012の各テストケースに対応
   * 🟢 信頼性レベル: 要件定義書のPROGRESS_UPDATEメッセージ仕様に基づく
   * @param message - Service Workerから受信したPROGRESS_UPDATEメッセージ
   */
  updateProgress(message: ProgressUpdateMessage): void {
    // 【メッセージ検証】: StateManagerでの一元的な検証
    if (!this.stateManager.validateMessage(message)) {
      console.warn('不正な進捗データを受信しました', message);
      // 【状態保持】: 不正メッセージでも前回の状態を維持
      if (!document.getElementById('status-text')?.textContent) {
        this.domManager.updateStatusText('処理中');
      }
      return;
    }

    // 【通信監視更新】: StateManagerでの効率的な状態管理
    this.stateManager.updateLastMessageTime();

    // 【通信断絶チェック】: StateManagerでの監視処理
    if (this.stateManager.isCommunicationTimedOut()) {
      this.domManager.updateStatusText('通信中断');
      this.domManager.showReconnectButton();
      return;
    }

    // 【キャンセル状態確認】: StateManagerでの競合状態判定
    if (this.stateManager.shouldIgnoreCompletionMessage(message.status)) {
      this.domManager.updateStatusText('キャンセル済み');
      return;
    }

    // 【UI更新】: DomManagerによる効率的なDOM操作
    this.domManager.updateProgressBar(message.currentIndex, message.totalCount);
    this.domManager.updateRemainingCount(message.currentIndex, message.totalCount);
    this.domManager.updateEtaDisplay(message.eta);
    this.domManager.updateStatusText(this.stateManager.getStatusText(message.status));

    // 【完了処理】: 完了状態の場合は特別な処理を実行
    if (message.status === 'completed') {
      this.domManager.setProgressBarComplete();
      this.handleCompletedState();
    }
  }

  /**
   * 【機能概要】: 現在のジョブIDを設定する
   * 【リファクタリング済み】: StateManagerによる一元的な状態管理
   * 【テスト対応】: TC-043-002のキャンセル機能テストに対応
   * 🟢 信頼性レベル: テストのsetCurrentJobId呼び出し要件に基づく
   * @param jobId - 設定するジョブID
   */
  setCurrentJobId(jobId: string): void {
    this.stateManager.setCurrentJobId(jobId);
  }

  /**
   * 【機能概要】: 処理開始時刻を設定する
   * 【リファクタリング済み】: StateManagerによる一元的な状態管理
   * 【テスト対応】: TC-043-003の総処理時間表示テストに対応
   * 🟡 信頼性レベル: テストから妥当な推測で実装
   * @param startTime - 処理開始時刻（Unix timestamp）
   */
  setStartTime(startTime: number): void {
    this.stateManager.setStartTime(startTime);
  }

  /**
   * 【機能概要】: ログエントリを表示に追加する
   * 【リファクタリング済み】: LogManagerによる効率的なログ管理
   * 【テスト対応】: TC-043-004のログ表示機能テストに対応
   * 🟡 信頼性レベル: 要件定義書のログ表示（最大5件）から推測
   * @param entries - 追加するログエントリの配列
   */
  addLogEntries(entries: LogEntry[]): void {
    this.logManager.addLogEntries(entries);
  }

  /**
   * 【機能概要】: 完了状態の特別な処理を実行する
   * 【リファクタリング済み】: DomManagerを活用した効率的な処理
   * 【テスト対応】: TC-043-003の完了状態表示テストに対応
   * 【アクセシビリティ】: 完了時のフォーカス管理
   * 🟡 信頼性レベル: 完了時の期待動作から推測
   */
  private handleCompletedState(): void {
    // 【DomManager活用】: キャッシュされた要素での効率的な操作
    this.domManager.hideCancelButton();
    this.domManager.displayTotalTime(this.stateManager.getStartTime());

    // 【アクセシビリティ】: 完了時にキャンセルボタンを無効化し、生成ボタンにフォーカス戻す
    this.keyboardManager.updateElementAccessibility('cancelButton', false);
    this.keyboardManager.updateElementAccessibility('generateButton', true);
    this.keyboardManager.focusElement('generateButton');
  }

  /**
   * 【機能概要】: キャンセルボタンのクリックイベントを設定する
   * 【リファクタリング済み】: DomManagerとStateManagerを活用した効率的な処理
   * 【テスト対応】: TC-043-002のキャンセル機能テストに対応
   * 【アクセシビリティ】: キャンセル時のフォーカス管理
   * 🟢 信頼性レベル: テストのクリックイベント要件に基づく
   */
  private setupCancelButton(): void {
    this.domManager.setupCancelButton(() => {
      // 【重複防止】: StateManagerでの状態確認
      if (this.stateManager.isCancelledState()) return;

      // 【状態更新】: StateManagerでの一元管理
      this.stateManager.setCancelledState();

      // 【UI更新】: DomManagerでの効率的なDOM操作
      this.domManager.updateStatusText('キャンセル中...');
      this.domManager.disableCancelButton();

      // 【アクセシビリティ】: キャンセル後のフォーカス管理
      this.keyboardManager.updateElementAccessibility('cancelButton', false);
      this.keyboardManager.focusElement('generateButton');

      // 【メッセージ送信】: StateManagerからのジョブID取得
      const cancelMessage: CancelJobMessage = {
        type: 'CANCEL_JOB',
        jobId: this.stateManager.getCurrentJobId(),
        reason: 'user_requested',
      };

      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(cancelMessage);
      }
    });
  }

}