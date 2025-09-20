// テストファイル: src/popup/ui-state-manager.eta-format.red.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { UIStateManager, ProgressData } from './ui-state-manager';

describe('UI スケルトン/状態管理 - Red Phase: ETA 表示フォーマット', () => {
  let uiStateManager: UIStateManager;
  let mockElements: any;

  beforeEach(() => {
    // 【テスト前準備】: DOM相当の要素モックを準備
    // 【環境初期化】: updateProgress() が参照する最小限の要素のみ用意
    mockElements = {
      progressFill: { style: { width: '' } },
      progressText: { textContent: '' },
      etaText: { textContent: '' },
    };

    // 【前提条件確認】: UIStateManager が要素を受け取り生成できること
    uiStateManager = new UIStateManager(mockElements);
  });

  test('ETA を二桁ゼロ埋め(分:秒)で表示する', () => {
    // 【テスト目的】: 進捗更新時に ETA を「残り時間: 2分05秒」のように二桁ゼロ埋めで表示する
    // 【テスト内容】: updateProgress() に eta=125 を渡し、etaText の表示を検証
    // 【期待される動作】: `残り時間: 2分05秒` が設定される（秒が二桁）
    // 🟡 信頼性レベル: 既存実装の日本語表記に準拠しつつゼロ埋め仕様を追加定義（妥当な推測）

    // 【テストデータ準備】: 2分5秒 (=125秒) 相当の ETA
    const progress: ProgressData = { current: 3, total: 10, eta: 125 };

    // 【実際の処理実行】: 進捗更新を実行
    uiStateManager.updateProgress(progress);

    // 【結果検証】: 二桁ゼロ埋めの文字列で表示されること
    // 【期待値確認】: 残り時間: 2分05秒（現在は 2分5秒 になる可能性があり Red）
    // 【品質保証】: 視認性・一貫性向上（ログ/スクリーンショットでの差分読みやすさ）
    expect(mockElements.etaText.textContent).toBe('残り時間: 2分05秒');
  });
});

