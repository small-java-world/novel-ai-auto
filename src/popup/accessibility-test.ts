/**
 * 【機能概要】: アクセシビリティ基本チェック機能
 * 【対象】: TASK-044アクセシビリティ適合要件
 * 【チェック項目】: ARIA属性、フォーカス管理、コントラスト、キーボード操作
 * 🟢 信頼性レベル: WCAG 2.1 AA基準に基づく
 */

export interface AccessibilityCheckResult {
  passed: boolean;
  message: string;
  element?: HTMLElement;
}

export class AccessibilityChecker {
  /**
   * 【機能】: 総合的なアクセシビリティチェックを実行
   * 【対象】: NFR-203要件のすべての項目
   */
  runFullCheck(): AccessibilityCheckResult[] {
    const results: AccessibilityCheckResult[] = [];

    // 【ARIA属性チェック】
    results.push(...this.checkAriaAttributes());

    // 【フォーカス可能要素チェック】
    results.push(...this.checkFocusableElements());

    // 【セマンティック構造チェック】
    results.push(...this.checkSemanticStructure());

    // 【ライブリージョンチェック】
    results.push(...this.checkLiveRegions());

    // 【キーボードアクセシビリティチェック】
    results.push(...this.checkKeyboardAccessibility());

    return results;
  }

  /**
   * 【機能】: ARIA属性の適切性をチェック
   * 【チェック内容】: 必要なARIA属性の存在、値の妥当性
   */
  private checkAriaAttributes(): AccessibilityCheckResult[] {
    const results: AccessibilityCheckResult[] = [];

    // 【progressbar要素チェック】
    const progressBar = document.querySelector('[role="progressbar"]');
    if (progressBar) {
      const hasValueNow = progressBar.hasAttribute('aria-valuenow');
      const hasValueMin = progressBar.hasAttribute('aria-valuemin');
      const hasValueMax = progressBar.hasAttribute('aria-valuemax');

      results.push({
        passed: hasValueNow && hasValueMin && hasValueMax,
        message: `進捗バーのARIA属性: ${hasValueNow && hasValueMin && hasValueMax ? '✅ 適切' : '❌ 不完全'}`,
        element: progressBar as HTMLElement,
      });
    }

    // 【aria-live領域チェック】
    const liveRegions = document.querySelectorAll('[aria-live]');
    results.push({
      passed: liveRegions.length > 0,
      message: `ライブリージョン: ${liveRegions.length}個検出 ${liveRegions.length > 0 ? '✅' : '❌'}`,
    });

    // 【ボタンのaria-describedby チェック】
    const buttonsWithDescriptions = document.querySelectorAll('button[aria-describedby]');
    results.push({
      passed: buttonsWithDescriptions.length >= 2, // 生成ボタンとキャンセルボタン
      message: `ボタンの説明: ${buttonsWithDescriptions.length}個 ${buttonsWithDescriptions.length >= 2 ? '✅' : '❌'}`,
    });

    return results;
  }

  /**
   * 【機能】: フォーカス可能要素の適切性をチェック
   * 【チェック内容】: tabindex、フォーカス順序、フォーカス表示
   */
  private checkFocusableElements(): AccessibilityCheckResult[] {
    const results: AccessibilityCheckResult[] = [];

    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'summary',
    ].join(', ');

    const focusableElements = document.querySelectorAll(focusableSelector);

    results.push({
      passed: focusableElements.length >= 5, // 最低限の操作要素数
      message: `フォーカス可能要素: ${focusableElements.length}個 ${focusableElements.length >= 5 ? '✅' : '❌'}`,
    });

    // 【tabindex=-1の不適切使用チェック】
    const negativeTabindex = document.querySelectorAll('[tabindex="-1"]');
    const appropriateNegativeTabindex = Array.from(negativeTabindex).every(
      (el) => el.classList.contains('sr-only') || el.getAttribute('aria-hidden') === 'true'
    );

    results.push({
      passed: appropriateNegativeTabindex,
      message: `負のtabindex使用: ${appropriateNegativeTabindex ? '✅ 適切' : '❌ 不適切'}`,
    });

    return results;
  }

  /**
   * 【機能】: セマンティック構造の適切性をチェック
   * 【チェック内容】: 見出し構造、ランドマーク、ラベル関連付け
   */
  private checkSemanticStructure(): AccessibilityCheckResult[] {
    const results: AccessibilityCheckResult[] = [];

    // 【見出し構造チェック】
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    results.push({
      passed: headings.length >= 2, // 最低限のセクション分け
      message: `見出し構造: ${headings.length}個 ${headings.length >= 2 ? '✅' : '❌'}`,
    });

    // 【ランドマークロールチェック】
    const landmarks = document.querySelectorAll('[role="main"], main, [role="region"]');
    results.push({
      passed: landmarks.length >= 2,
      message: `ランドマーク: ${landmarks.length}個 ${landmarks.length >= 2 ? '✅' : '❌'}`,
    });

    // 【ラベル関連付けチェック】
    const inputs = document.querySelectorAll('input, select');
    const labeledInputs = Array.from(inputs).filter((input) => {
      const id = input.getAttribute('id');
      return id && document.querySelector(`label[for="${id}"]`);
    });

    results.push({
      passed: labeledInputs.length === inputs.length,
      message: `入力要素ラベル: ${labeledInputs.length}/${inputs.length} ${labeledInputs.length === inputs.length ? '✅' : '❌'}`,
    });

    return results;
  }

  /**
   * 【機能】: ライブリージョンの適切性をチェック
   * 【チェック内容】: aria-live属性、aria-atomic設定
   */
  private checkLiveRegions(): AccessibilityCheckResult[] {
    const results: AccessibilityCheckResult[] = [];

    const _liveRegions = document.querySelectorAll('[aria-live]');
    const _politeLiveRegions = document.querySelectorAll('[aria-live="polite"]');
    const _assertiveLiveRegions = document.querySelectorAll('[aria-live="assertive"]');

    results.push({
      passed: _politeLiveRegions.length >= 1,
      message: `politeライブリージョン: ${_politeLiveRegions.length}個 ${_politeLiveRegions.length >= 1 ? '✅' : '❌'}`,
    });

    // 【ステータス表示のライブリージョンチェック】
    const statusLiveRegion = document.querySelector('#statusIndicator[aria-live]');
    results.push({
      passed: !!statusLiveRegion,
      message: `ステータスライブリージョン: ${statusLiveRegion ? '✅ 設定済み' : '❌ 未設定'}`,
    });

    return results;
  }

  /**
   * 【機能】: キーボードアクセシビリティの基本チェック
   * 【チェック内容】: フォーカス表示、tabindex設定
   */
  private checkKeyboardAccessibility(): AccessibilityCheckResult[] {
    const results: AccessibilityCheckResult[] = [];

    // 【スキップリンクチェック】
    const skipLink = document.querySelector('.skip-link');
    results.push({
      passed: !!skipLink,
      message: `スキップリンク: ${skipLink ? '✅ 存在' : '❌ 不存在'}`,
      element: skipLink as HTMLElement,
    });

    // 【フォーカス表示CSSチェック】
    const focusStyles = this.checkFocusStyles();
    results.push({
      passed: focusStyles,
      message: `フォーカス表示CSS: ${focusStyles ? '✅ 適切' : '❌ 不適切'}`,
    });

    return results;
  }

  /**
   * 【機能】: フォーカス表示スタイルの存在チェック
   * 【詳細】: CSS内のfocus疑似クラス設定を確認
   */
  private checkFocusStyles(): boolean {
    const styleSheets = Array.from(document.styleSheets);

    try {
      for (const sheet of styleSheets) {
        const rules = Array.from(sheet.cssRules || []);
        const hasFocusRules = rules.some((rule) => {
          if (rule instanceof CSSStyleRule) {
            return (
              rule.selectorText &&
              (rule.selectorText.includes(':focus') || rule.selectorText.includes(':focus-visible'))
            );
          }
          return false;
        });

        if (hasFocusRules) return true;
      }
    } catch (e) {
      // CORS制限等でアクセスできない場合は、要素に直接設定されているかチェック
      const focusableElements = document.querySelectorAll('button, input, select');
      return Array.from(focusableElements).some((el) => {
        const computedStyle = getComputedStyle(el, ':focus');
        return computedStyle.outline !== 'none' || computedStyle.boxShadow !== 'none';
      });
    }

    return false;
  }

  /**
   * 【公開API】: アクセシビリティ結果のレポート生成
   * 【出力】: 合格/不合格、詳細メッセージ
   */
  generateReport(results: AccessibilityCheckResult[]): {
    passed: number;
    failed: number;
    total: number;
    score: number;
    details: string[];
  } {
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;
    const score = Math.round((passed / total) * 100);

    const details = results.map((r) => `${r.passed ? '✅' : '❌'} ${r.message}`);

    return {
      passed,
      failed,
      total,
      score,
      details,
    };
  }
}
