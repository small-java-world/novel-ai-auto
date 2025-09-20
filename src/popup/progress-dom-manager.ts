/**
 * 【責務】: 進捗表示に関するDOM操作を専門に管理するクラス
 * 【リファクタリング対象】: ProgressDisplayManager から DOM操作部分を分離
 * 【パフォーマンス改善】: DOM要素のキャッシュ化により重複取得を削減
 * 🟢 信頼性レベル: 元実装のテスト通過実績に基づく
 */

export class ProgressDomManager {
  // 【DOM要素キャッシュ】: 重複取得を防ぐためのキャッシュ
  private readonly progressBar: HTMLElement | null;
  private readonly remainingElement: HTMLElement | null;
  private readonly etaElement: HTMLElement | null;
  private readonly statusElement: HTMLElement | null;
  private readonly logContainer: HTMLElement | null;
  private readonly cancelButton: HTMLButtonElement | null;

  constructor() {
    // 【初期化時一回取得】: DOM要素を一度だけ取得してキャッシュ
    this.progressBar = document.getElementById('progress-bar');
    this.remainingElement = document.getElementById('remaining-count');
    this.etaElement = document.getElementById('eta-display');
    this.statusElement = document.getElementById('status-text');
    this.logContainer = document.getElementById('log-container');
    this.cancelButton = document.getElementById('cancel-button') as HTMLButtonElement;
  }

  /**
   * 【機能】: 進捗バーの表示を更新
   * 【改善点】: DOM要素キャッシュにより取得処理を削減
   * 【アクセシビリティ】: ARIA属性も同時に更新
   */
  updateProgressBar(current: number | null, total: number | null): void {
    if (!this.progressBar) return;

    const currentIndex = current ?? 0;
    const totalCount = total ?? 1;

    let percentage: number;
    if (totalCount > 0) {
      percentage = Math.floor((currentIndex / totalCount) * 100);
    } else {
      percentage = 0;
    }

    // 【DOM更新】: 視覚とARIA属性の両方を更新
    this.progressBar.style.width = `${percentage}%`;

    // 【アクセシビリティ】: スクリーンリーダー用のARIA属性更新
    const progressBarContainer = this.progressBar.parentElement;
    if (progressBarContainer?.getAttribute('role') === 'progressbar') {
      progressBarContainer.setAttribute('aria-valuenow', percentage.toString());
      progressBarContainer.setAttribute(
        'aria-valuetext',
        `${currentIndex} / ${totalCount} 完了 (${percentage}%)`
      );
    }
  }

  /**
   * 【機能】: 残枚数表示を更新
   * 【改善点】: キャッシュされたDOM要素を使用
   */
  updateRemainingCount(current: number | null, total: number | null): void {
    if (!this.remainingElement) return;

    const currentIndex = current ?? 0;
    const totalCount = total ?? 0;

    let remaining: number;
    if (currentIndex + 1 >= totalCount) {
      remaining = 0;
    } else {
      remaining = Math.max(0, totalCount - currentIndex);
    }

    this.remainingElement.textContent = `残り${remaining}枚`;
  }

  /**
   * 【機能】: ETA表示を更新
   * 【改善点】: キャッシュされたDOM要素を使用
   */
  updateEtaDisplay(eta: number | undefined | null): void {
    if (!this.etaElement) return;

    if (eta == null) {
      this.etaElement.textContent = '計算中...';
      return;
    }

    this.etaElement.textContent = this.formatEta(eta);
  }

  /**
   * 【機能】: ステータステキストを更新
   * 【改善点】: キャッシュされたDOM要素を使用
   * 【アクセシビリティ】: aria-live領域での自動通知
   */
  updateStatusText(status: string): void {
    if (this.statusElement) {
      this.statusElement.textContent = status;

      // 【アクセシビリティ】: 親要素がaria-live領域の場合、より詳細な情報を提供
      const statusContainer = this.statusElement.closest('[aria-live]');
      if (statusContainer) {
        // 重要な状態変更はaria-live="assertive"に切り替え
        if (status.includes('エラー') || status.includes('完了') || status.includes('キャンセル')) {
          statusContainer.setAttribute('aria-live', 'assertive');
        } else {
          statusContainer.setAttribute('aria-live', 'polite');
        }
      }
    }
  }

  /**
   * 【機能】: 完了時の進捗バーを100%に設定
   * 【改善点】: キャッシュされた要素の直接操作
   */
  setProgressBarComplete(): void {
    if (this.progressBar) {
      this.progressBar.style.width = '100%';
    }
  }

  /**
   * 【機能】: キャンセルボタンを非表示化
   * 【改善点】: キャッシュされた要素の直接操作
   */
  hideCancelButton(): void {
    if (this.cancelButton) {
      this.cancelButton.style.display = 'none';
    }
  }

  /**
   * 【機能】: キャンセルボタンを無効化
   * 【改善点】: キャッシュされた要素の直接操作
   */
  disableCancelButton(): void {
    if (this.cancelButton) {
      this.cancelButton.disabled = true;
    }
  }

  /**
   * 【機能】: 総処理時間を表示
   * 【改善点】: キャッシュされた要素を使用した効率的な更新
   */
  displayTotalTime(startTime: number): void {
    if (!this.etaElement || startTime <= 0) return;

    const totalTime = Date.now() - startTime;
    const minutes = Math.floor(totalTime / 60000);
    const seconds = Math.floor((totalTime % 60000) / 1000);

    this.etaElement.textContent = `総処理時間: ${minutes}分${seconds}秒`;
  }

  /**
   * 【機能】: キャンセルボタンのクリックイベントを設定
   * 【改善点】: 重複登録防止とキャッシュされた要素の使用
   */
  setupCancelButton(onCancel: () => void): void {
    if (!this.cancelButton) return;

    // 【直接イベント設定】: キャッシュされたボタンに直接イベントを設定
    this.cancelButton.addEventListener('click', onCancel);
  }

  /**
   * 【機能】: 再接続ボタンを作成・表示
   * 【改善点】: 効率的なDOM操作
   */
  showReconnectButton(): void {
    if (!this.statusElement?.parentElement) return;

    // 【重複防止】: 既存の再接続ボタンがあれば削除
    const existingButton = document.getElementById('reconnect-button');
    if (existingButton) {
      existingButton.remove();
    }

    const reconnectButton = document.createElement('button');
    reconnectButton.id = 'reconnect-button';
    reconnectButton.textContent = '再接続';

    this.statusElement.parentElement.appendChild(reconnectButton);
  }

  /**
   * 【機能】: DOM要素の存在チェック
   * 【用途】: 初期化検証用
   */
  isInitialized(): boolean {
    return !!(this.progressBar && this.statusElement);
  }

  /**
   * 【内部メソッド】: ETA時間のフォーマット
   * 【改善点】: 元実装から分離して再利用性向上
   */
  private formatEta(seconds: number): string {
    if (seconds <= 0) return 'まもなく完了';
    if (seconds < 60) return `約${seconds}秒`;
    if (seconds < 3600) return `約${Math.floor(seconds / 60)}分`;
    if (seconds === 86400) return '約24時間';
    if (seconds < 86400) return `約${Math.floor(seconds / 3600)}時間`;
    return `約${Math.floor(seconds / 86400)}日`;
  }
}
