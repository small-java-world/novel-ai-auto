/**
 * 【責務】: ログエントリの管理と表示を専門に担当するクラス
 * 【リファクタリング対象】: ProgressDisplayManager からログ処理部分を分離
 * 【パフォーマンス改善】: 効率的なDOM操作とメモリ使用量削減
 * 🟢 信頼性レベル: 元実装のテスト通過実績に基づく
 */

import type { LogEntry } from '../types';

export class ProgressLogManager {
  private readonly logContainer: HTMLElement | null;
  private readonly maxLogEntries: number = 5;

  constructor() {
    this.logContainer = document.getElementById('log-container');
  }

  /**
   * 【機能】: ログエントリを表示に追加
   * 【改善点】: 効率的なソートとDOM操作でパフォーマンス向上
   * 【テスト対応】: TC-043-004のログ表示機能テストに対応
   */
  addLogEntries(entries: LogEntry[]): void {
    if (!this.logContainer || entries.length === 0) return;

    // 【最適化】: in-place ソートで不要なコピーを削減
    entries.sort((a, b) => b.timestamp - a.timestamp);

    // 【DOM操作最適化】: DocumentFragmentを使用して一括挿入
    const fragment = document.createDocumentFragment();

    entries.forEach(entry => {
      const logElement = this.createLogElement(entry);
      fragment.appendChild(logElement);
    });

    // 【一括挿入】: 複数回のDOM操作を一回に集約
    this.logContainer.appendChild(fragment);

    // 【件数制限】: 効率的な要素削除
    this.enforceLogLimit();
  }

  /**
   * 【機能】: ログコンテナの初期化状態確認
   * 【用途】: エラーハンドリング用
   */
  isInitialized(): boolean {
    return !!this.logContainer;
  }

  /**
   * 【内部メソッド】: ログエントリのDOM要素を作成
   * 【改善点】: セキュリティとパフォーマンスを維持
   */
  private createLogElement(entry: LogEntry): HTMLElement {
    const logElement = document.createElement('div');

    // 【セキュリティ】: XSS対策のためtextContentを使用
    logElement.className = `log-${entry.type}`;
    logElement.textContent = entry.message;

    return logElement;
  }

  /**
   * 【内部メソッド】: ログ件数制限の実施
   * 【改善点】: 効率的な要素削除でパフォーマンス向上
   */
  private enforceLogLimit(): void {
    if (!this.logContainer) return;

    // 【最適化】: 削除する要素数を一度に計算
    const elementsToRemove = this.logContainer.children.length - this.maxLogEntries;

    if (elementsToRemove > 0) {
      // 【効率的削除】: 末尾から一括削除
      for (let i = 0; i < elementsToRemove; i++) {
        const lastChild = this.logContainer.lastElementChild;
        if (lastChild) {
          this.logContainer.removeChild(lastChild);
        }
      }
    }
  }
}