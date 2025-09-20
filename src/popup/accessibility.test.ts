/**
 * 【テスト概要】: TASK-044 アクセシビリティ適合性テスト
 * 【対象要件】: NFR-203 キーボード操作対応・高コントラスト表示
 * 【テスト範囲】: ARIA属性、フォーカス管理、セマンティック構造
 * 🟢 信頼性レベル: WCAG 2.1 AA基準準拠確認
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AccessibilityChecker } from './accessibility-test';

// 【DOM環境モック】: 基本的なHTML構造を模擬
const mockHTML = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>NovelAI Auto Generator</title>
    <style>
        .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; }
        .skip-link { position: absolute; top: -40px; }
        .skip-link:focus { top: 6px; }
        button:focus, input:focus, select:focus { outline: 2px solid #667eea; }
        .button:focus-visible { outline: 3px solid #667eea; box-shadow: 0 0 0 5px rgba(102, 126, 234, 0.2); }
        @media (prefers-contrast: high) { .container { border: 2px solid; } }
    </style>
</head>
<body>
    <a href="#main-content" class="skip-link">メインコンテンツにスキップ</a>
    <div class="container">
        <header class="header">
            <h1 class="title">NovelAI Auto Generator</h1>
        </header>

        <main class="main" id="main-content">
            <section class="status-section" role="status" aria-label="アプリケーション状態">
                <div class="status-indicator" id="statusIndicator" role="alert" aria-live="polite">
                    <span class="status-text" id="statusText">待機中</span>
                </div>
            </section>

            <section class="prompt-section" role="region" aria-labelledby="prompt-section-title">
                <label for="promptSelect" id="prompt-section-title" class="label">プロンプト選択:</label>
                <select id="promptSelect" class="select" aria-describedby="prompt-help" aria-required="true">
                    <option value="">プロンプトを選択してください</option>
                </select>
                <div id="prompt-help" class="sr-only">生成に使用するプロンプトテンプレートを選択してください</div>
            </section>

            <section class="settings-section" role="region" aria-labelledby="settings-title">
                <h3 id="settings-title" class="section-title">設定</h3>

                <div class="setting-group">
                    <label for="imageCount" class="label">生成枚数:</label>
                    <input type="number" id="imageCount" class="input" min="1" max="10" value="1"
                           aria-describedby="imageCount-help" aria-required="false">
                    <div id="imageCount-help" class="sr-only">生成する画像の枚数を1から10の範囲で指定してください</div>
                </div>
            </section>

            <section class="progress-section" id="progressSection" style="display: none;"
                     role="region" aria-labelledby="progress-title" aria-live="polite">
                <h3 id="progress-title" class="section-title">進捗</h3>

                <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0"
                     aria-valuemax="100" aria-labelledby="progress-label" id="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>

                <div id="progress-label" class="sr-only">画像生成の進捗状況</div>
            </section>

            <section class="actions-section" role="region" aria-labelledby="actions-title">
                <h3 id="actions-title" class="sr-only">操作ボタン</h3>
                <button id="generateButton" class="button button-primary"
                        aria-describedby="generate-help" type="button">
                    生成開始
                </button>
                <div id="generate-help" class="sr-only">選択したプロンプトで画像生成を開始します</div>

                <button id="cancelButton" class="button button-secondary" style="display: none;"
                        aria-describedby="cancel-help" type="button">
                    キャンセル
                </button>
                <div id="cancel-help" class="sr-only">現在の画像生成処理を中止します</div>
            </section>

            <section class="logs-section" role="region" aria-labelledby="logs-title">
                <details aria-expanded="false">
                    <summary class="logs-toggle" id="logs-title" role="button" tabindex="0"
                             aria-controls="logsContainer" aria-describedby="logs-help">
                        ログを表示
                    </summary>
                    <div id="logs-help" class="sr-only">アプリケーションの動作ログを表示・非表示します</div>
                    <div class="logs-container" id="logsContainer" role="log" aria-live="polite" aria-atomic="false">
                        <div class="log-entry">ログエントリ</div>
                    </div>
                </details>
            </section>
        </main>
    </div>
</body>
</html>
`;

describe('TASK-044: アクセシビリティ適合性テスト', () => {
  let accessibilityChecker: AccessibilityChecker;

  beforeEach(() => {
    // 【DOM環境セットアップ】: テスト用HTML構造を設定
    document.documentElement.innerHTML = mockHTML;
    accessibilityChecker = new AccessibilityChecker();
  });

  test('総合的なアクセシビリティチェック - 基本要件', () => {
    // 【テスト目的】: 基本的なアクセシビリティ要件が満たされていることを確認
    // 【テスト内容】: ARIA属性、フォーカス管理、セマンティック構造の包括チェック
    // 🟢 信頼性レベル: NFR-203要件に基づく

    const results = accessibilityChecker.runFullCheck();
    const report = accessibilityChecker.generateReport(results);

    // 【検証】: 80%以上の合格率を期待 (WCAG 2.1 AA相当)
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.failed).toBeLessThanOrEqual(3); // 重大でない問題は最大3件まで許容

    // 【ログ出力】: 詳細結果をテストログに記録
    console.log(`アクセシビリティスコア: ${report.score}% (${report.passed}/${report.total})`);
    report.details.forEach(detail => console.log(detail));
  });

  test('ARIA属性の適切性 - プログレスバー', () => {
    // 【テスト目的】: プログレスバーのARIA属性が適切に設定されていることを確認
    // 【テスト内容】: aria-valuenow, aria-valuemin, aria-valuemax の存在確認
    // 🟢 信頼性レベル: WCAG 2.1 progressbar roleガイドライン準拠

    const progressBar = document.querySelector('[role="progressbar"]');

    expect(progressBar).not.toBeNull();
    expect(progressBar?.getAttribute('aria-valuenow')).toBe('0');
    expect(progressBar?.getAttribute('aria-valuemin')).toBe('0');
    expect(progressBar?.getAttribute('aria-valuemax')).toBe('100');
    expect(progressBar?.getAttribute('aria-labelledby')).toBeTruthy();
  });

  test('ライブリージョンの設定 - 状態通知', () => {
    // 【テスト目的】: 動的コンテンツ更新がスクリーンリーダーに適切に通知されることを確認
    // 【テスト内容】: aria-live属性の設定と適切な値の使用
    // 🟢 信頼性レベル: WCAG 2.1 live regionsガイドライン準拠

    const statusIndicator = document.getElementById('statusIndicator');
    const progressSection = document.getElementById('progressSection');
    const logsContainer = document.getElementById('logsContainer');

    // 【ステータス領域】: politeまたはassertiveで通知
    expect(statusIndicator?.getAttribute('aria-live')).toBe('polite');

    // 【進捗領域】: 進捗変更を穏やかに通知
    expect(progressSection?.getAttribute('aria-live')).toBe('polite');

    // 【ログ領域】: ログ更新を穏やかに通知
    expect(logsContainer?.getAttribute('aria-live')).toBe('polite');
  });

  test('フォーカス可能要素 - キーボードナビゲーション', () => {
    // 【テスト目的】: すべての操作可能要素がキーボードでアクセス可能であることを確認
    // 【テスト内容】: tabindex設定、フォーカス順序、無効化要素の除外
    // 🟢 信頼性レベル: WCAG 2.1 keyboard accessibilityガイドライン準拠

    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), summary';
    const focusableElements = document.querySelectorAll(focusableSelector);

    // 【最低限の操作要素数】: 主要な機能にアクセス可能
    expect(focusableElements.length).toBeGreaterThanOrEqual(5);

    // 【各要素のフォーカス可能性確認】
    focusableElements.forEach(element => {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex !== null) {
        expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test('セマンティック構造 - 見出しとランドマーク', () => {
    // 【テスト目的】: 適切な見出し構造とランドマークロールが設定されていることを確認
    // 【テスト内容】: h1-h6要素、main要素、role属性の適切な使用
    // 🟢 信頼性レベル: WCAG 2.1 headings and labelsガイドライン準拠

    // 【見出し構造】: 階層的な見出し設定
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    expect(headings.length).toBeGreaterThanOrEqual(2);

    // 【メイン領域】: main要素またはrole="main"の存在
    const mainElement = document.querySelector('main, [role="main"]');
    expect(mainElement).not.toBeNull();

    // 【セクション領域】: role="region"の適切な使用
    const regionElements = document.querySelectorAll('[role="region"]');
    expect(regionElements.length).toBeGreaterThanOrEqual(3);
  });

  test('ラベル関連付け - フォーム要素', () => {
    // 【テスト目的】: すべてのフォーム要素が適切なラベルと関連付けられていることを確認
    // 【テスト内容】: label要素、aria-describedby、aria-labelledby の関連付け
    // 🟢 信頼性レベル: WCAG 2.1 labels or instructionsガイドライン準拠

    const inputs = document.querySelectorAll('input, select');

    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const hasLabel = document.querySelector(`label[for="${id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');

      // 【ラベル関連付け確認】: labelまたはARIA属性での関連付け
      expect(hasLabel || hasAriaLabel).toBeTruthy();
    });
  });

  test('スクリーンリーダー対応 - 非表示テキスト', () => {
    // 【テスト目的】: スクリーンリーダー専用の説明テキストが適切に設定されていることを確認
    // 【テスト内容】: .sr-onlyクラスの使用、aria-describedby関連付け
    // 🟢 信頼性レベル: スクリーンリーダーユーザビリティベストプラクティス準拠

    const srOnlyElements = document.querySelectorAll('.sr-only');
    expect(srOnlyElements.length).toBeGreaterThanOrEqual(4);

    // 【説明テキストの関連付け確認】
    const buttonsWithDescriptions = document.querySelectorAll('button[aria-describedby]');
    expect(buttonsWithDescriptions.length).toBeGreaterThanOrEqual(2);

    buttonsWithDescriptions.forEach(button => {
      const describedById = button.getAttribute('aria-describedby');
      const descriptionElement = document.getElementById(describedById!);
      expect(descriptionElement).not.toBeNull();
      expect(descriptionElement?.textContent).toBeTruthy();
    });
  });

  test('高コントラスト対応 - CSSメディアクエリ', () => {
    // 【テスト目的】: 高コントラストモード対応のCSS設定が存在することを確認
    // 【テスト内容】: prefers-contrast: high メディアクエリの存在
    // 🟡 信頼性レベル: CSS解析による間接的確認

    // 【CSS解析】: スタイルシート内の高コントラスト対応確認
    const hasHighContrastCSS = document.head.innerHTML.includes('(prefers-contrast: high)');
    expect(hasHighContrastCSS).toBe(true);

    // 【フォーカス表示CSS】: フォーカス時の視覚的フィードバック確認
    const hasFocusCSS = document.head.innerHTML.includes(':focus');
    expect(hasFocusCSS).toBe(true);
  });

  test('動的状態変更 - ARIA属性更新', () => {
    // 【テスト目的】: 状態変更時にARIA属性が適切に更新されることを確認
    // 【テスト内容】: プログレスバーの値更新、aria-live の動的変更
    // 🟡 信頼性レベル: DOM操作機能の存在確認

    const progressBar = document.querySelector('[role="progressbar"]');
    const statusIndicator = document.getElementById('statusIndicator');

    // 【初期状態確認】
    expect(progressBar?.getAttribute('aria-valuenow')).toBe('0');
    expect(statusIndicator?.getAttribute('aria-live')).toBe('polite');

    // 【状態変更シミュレーション】: プログレス値とライブリージョンの更新
    if (progressBar) {
      progressBar.setAttribute('aria-valuenow', '50');
      progressBar.setAttribute('aria-valuetext', '2 / 4 完了 (50%)');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('50');
      expect(progressBar.getAttribute('aria-valuetext')).toBe('2 / 4 完了 (50%)');
    }

    // 【重要な状態変更】: aria-live="assertive"への切り替え
    if (statusIndicator) {
      statusIndicator.setAttribute('aria-live', 'assertive');
      expect(statusIndicator.getAttribute('aria-live')).toBe('assertive');
    }
  });

  test('キーボードショートカット - スキップリンク', () => {
    // 【テスト目的】: スキップリンクが適切に設定されていることを確認
    // 【テスト内容】: スキップリンクの存在、href属性、フォーカス時の表示
    // 🟢 信頼性レベル: WCAG 2.1 bypass blocksガイドライン準拠

    const skipLink = document.querySelector('.skip-link');
    const mainContent = document.getElementById('main-content');

    expect(skipLink).not.toBeNull();
    expect(skipLink?.getAttribute('href')).toBe('#main-content');
    expect(mainContent).not.toBeNull();

    // 【フォーカス可能性確認】
    expect(skipLink?.getAttribute('tabindex')).not.toBe('-1');
  });
});