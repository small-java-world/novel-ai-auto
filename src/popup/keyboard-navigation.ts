/**
 * 【機能概要】: キーボードナビゲーション機能の実装
 * 【アクセシビリティ対応】: NFR-203要件に基づくキーボード操作対応
 * 【対象要素】: フォーカス可能な全てのUI要素
 * 🟢 信頼性レベル: WCAG 2.1 AA準拠の一般的なパターン
 */

export class KeyboardNavigationManager {
  private focusableElements: HTMLElement[];
  private currentFocusIndex: number = -1;

  constructor() {
    this.focusableElements = [];
    this.initializeKeyboardNavigation();
  }

  /**
   * 【機能】: キーボードナビゲーションの初期化
   * 【対応キー】: Tab, Shift+Tab, Enter, Space, Escape
   */
  private initializeKeyboardNavigation(): void {
    this.updateFocusableElements();

    // 【全体キーボードイベント】: ドキュメント全体でのキー処理
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // 【フォーカス追跡】: 現在のフォーカス位置を追跡
    document.addEventListener('focusin', this.handleFocusIn.bind(this));

    // 【DOM変更監視】: 動的要素追加時のフォーカス可能要素更新
    const observer = new MutationObserver(() => {
      this.updateFocusableElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled', 'aria-hidden'],
    });
  }

  /**
   * 【機能】: フォーカス可能要素リストの更新
   * 【対象】: button, input, select, [tabindex], details summary
   */
  private updateFocusableElements(): void {
    const selector = [
      'button:not([disabled]):not([aria-hidden="true"])',
      'input:not([disabled]):not([aria-hidden="true"])',
      'select:not([disabled]):not([aria-hidden="true"])',
      'textarea:not([disabled]):not([aria-hidden="true"])',
      '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
      'details summary:not([disabled]):not([aria-hidden="true"])',
    ].join(', ');

    this.focusableElements = Array.from(document.querySelectorAll(selector));
  }

  /**
   * 【機能】: キーボードイベントの処理
   * 【対応】: Tab循環ナビゲーション、エンターキー、ESCキー
   */
  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Tab':
        this.handleTabNavigation(event);
        break;
      case 'Enter':
      case ' ': // Space
        this.handleActivation(event);
        break;
      case 'Escape':
        this.handleEscape(event);
        break;
      case 'Home':
        this.handleHome(event);
        break;
      case 'End':
        this.handleEnd(event);
        break;
    }
  }

  /**
   * 【機能】: Tabキーによるナビゲーション処理
   * 【動作】: 要素間の循環フォーカス移動
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    if (this.focusableElements.length === 0) return;

    // 【循環フォーカス】: 最初と最後で循環
    if (event.shiftKey) {
      // Shift+Tab: 前の要素へ
      if (this.currentFocusIndex <= 0) {
        this.currentFocusIndex = this.focusableElements.length - 1;
        event.preventDefault();
        this.focusableElements[this.currentFocusIndex].focus();
      }
    } else {
      // Tab: 次の要素へ
      if (this.currentFocusIndex >= this.focusableElements.length - 1) {
        this.currentFocusIndex = 0;
        event.preventDefault();
        this.focusableElements[this.currentFocusIndex].focus();
      }
    }
  }

  /**
   * 【機能】: Enter/Spaceキーによる要素アクティベーション
   * 【対応】: ボタンクリック、details開閉
   */
  private handleActivation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;

    if (target.tagName === 'BUTTON') {
      // ボタンの場合はクリックイベントを発火
      target.click();
      event.preventDefault();
    } else if (target.tagName === 'SUMMARY') {
      // details要素のsummaryの場合は開閉を切り替え
      const details = target.closest('details');
      if (details) {
        details.open = !details.open;
        details.setAttribute('aria-expanded', details.open.toString());
        event.preventDefault();
      }
    }
  }

  /**
   * 【機能】: Escapeキーによるキャンセル処理
   * 【動作】: モーダル閉じる、フォーカスリセット
   */
  private handleEscape(event: KeyboardEvent): void {
    // 【キャンセルボタン】: 表示されている場合はキャンセル実行
    const cancelButton = document.getElementById('cancelButton') as HTMLButtonElement;
    if (cancelButton && !cancelButton.hidden && cancelButton.style.display !== 'none') {
      cancelButton.click();
      event.preventDefault();
      return;
    }

    // 【フォーカスリセット】: 最初のフォーカス可能要素に移動
    if (this.focusableElements.length > 0) {
      this.currentFocusIndex = 0;
      this.focusableElements[0].focus();
      event.preventDefault();
    }
  }

  /**
   * 【機能】: Homeキーで最初の要素にフォーカス
   */
  private handleHome(event: KeyboardEvent): void {
    if (this.focusableElements.length > 0) {
      this.currentFocusIndex = 0;
      this.focusableElements[0].focus();
      event.preventDefault();
    }
  }

  /**
   * 【機能】: Endキーで最後の要素にフォーカス
   */
  private handleEnd(event: KeyboardEvent): void {
    if (this.focusableElements.length > 0) {
      this.currentFocusIndex = this.focusableElements.length - 1;
      this.focusableElements[this.currentFocusIndex].focus();
      event.preventDefault();
    }
  }

  /**
   * 【機能】: フォーカスイベントの処理
   * 【目的】: 現在のフォーカス位置を追跡
   */
  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const index = this.focusableElements.indexOf(target);
    if (index !== -1) {
      this.currentFocusIndex = index;
    }
  }

  /**
   * 【公開API】: 特定要素にプログラム的にフォーカス移動
   * 【用途】: 状態変化時の適切なフォーカス管理
   */
  focusElement(elementId: string): void {
    const element = document.getElementById(elementId) as HTMLElement;
    if (element && !element.disabled) {
      element.focus();
      const index = this.focusableElements.indexOf(element);
      if (index !== -1) {
        this.currentFocusIndex = index;
      }
    }
  }

  /**
   * 【公開API】: アクセシビリティのための要素状態管理
   * 【機能】: 動的な無効化/有効化時のフォーカス調整
   */
  updateElementAccessibility(elementId: string, enabled: boolean): void {
    const element = document.getElementById(elementId) as HTMLElement;
    if (element) {
      if (enabled) {
        element.removeAttribute('disabled');
        element.removeAttribute('aria-disabled');
      } else {
        element.setAttribute('disabled', 'true');
        element.setAttribute('aria-disabled', 'true');

        // 現在フォーカスされている要素が無効化された場合、次の要素に移動
        if (document.activeElement === element) {
          this.moveToNextFocusableElement();
        }
      }

      this.updateFocusableElements();
    }
  }

  /**
   * 【内部機能】: 次のフォーカス可能要素に移動
   */
  private moveToNextFocusableElement(): void {
    if (this.focusableElements.length === 0) return;

    const nextIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
    this.currentFocusIndex = nextIndex;
    this.focusableElements[nextIndex].focus();
  }
}
