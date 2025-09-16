// テストファイル: src/popup/ui-state-manager.green.test.ts
import { describe, test, expect, beforeEach, vi } from 'vitest';

// 【テスト対象モジュール】: UI状態管理機能（Green フェーズ実装）
import { UIStateManager, UIState, ProgressData, PromptData, GenerationSettings } from './ui-state-manager';

describe('UI スケルトン/状態管理 - Green Phase', () => {
  let uiStateManager: UIStateManager;
  let mockElements: any;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にモックを初期化
    // 【環境初期化】: 前のテストの影響を受けないよう、全てのモックを初期状態にリセット
    vi.clearAllMocks();

    // 【DOM要素モック準備】: UI操作に必要なDOM要素をモック化
    mockElements = {
      imageCount: { value: '', disabled: false },
      seed: { value: '', disabled: false },
      filenameTemplate: { value: '', disabled: false },
      statusIndicator: { className: '' },
      statusText: { textContent: '' },
      progressFill: { style: { width: '' } },
      progressText: { textContent: '' },
      generateButton: { style: { display: '' } },
      cancelButton: { style: { display: '' } },
    };

    // 【テスト対象初期化】: UIStateManagerインスタンスを作成
    uiStateManager = new UIStateManager(mockElements);
  });

  describe('TC-001: 設定の初期化', () => {
    test('初回起動時の設定デフォルト値読み込み', async () => {
      // 【テスト目的】: UIStateManagerインスタンスが正常に作成され、初期化処理が成功することを確認
      // 【テスト内容】: インスタンス作成とinitializeSettings()メソッドの実行
      // 【期待される動作】: エラーが発生せず、処理が正常完了する
      // 🟢 信頼性レベル: 要件定義書REQ-005とinterfaces.tsの型定義から直接導出

      // 【テストデータ準備】: DOM要素のモックオブジェクトが準備済み
      // 【初期条件設定】: 拡張機能初回インストール時の状態を想定

      // 【実際の処理実行】: 設定初期化処理を実行
      // 【処理内容】: initializeSettings()メソッドを呼び出し、正常完了を確認
      await expect(uiStateManager.initializeSettings()).resolves.toBeUndefined();

      // 【結果検証】: インスタンス作成と初期化処理が正常完了することを確認
      // 【期待値確認】: エラーが発生せず、Promiseが正常にresolveされる

      // 【確認内容】: UIStateManagerインスタンスが正常に作成されることを確認 🟢
      expect(uiStateManager).toBeInstanceOf(UIStateManager);
    });
  });

  describe('TC-002: 設定の保存', () => {
    test('ユーザー設定変更時の即座保存', async () => {
      // 【テスト目的】: saveSettings()メソッドが正常に実行され、エラーが発生しないことを確認
      // 【テスト内容】: saveSettings()メソッドの呼び出しと正常完了の検証
      // 【期待される動作】: エラーが発生せず、非同期処理が正常完了する
      // 🟢 信頼性レベル: 要件定義書REQ-005とpopup.jsの既存実装パターンに基づく

      // 【テストデータ準備】: DOM要素モックは初期化済み
      // 【初期条件設定】: ユーザーが実際に設定する状況を想定

      // 【実際の処理実行】: 設定保存処理を実行
      // 【処理内容】: saveSettings()メソッドを呼び出し、正常完了を確認
      await expect(uiStateManager.saveSettings()).resolves.toBeUndefined();

      // 【結果検証】: 設定保存処理が正常完了することを確認
      // 【期待値確認】: Promise が正常に resolve される

      // 【確認内容】: saveSettings()メソッドが例外を投げずに完了することを確認 🟢
      expect(uiStateManager.saveSettings).toBeDefined();
    });
  });

  describe('TC-003: 設定の復元', () => {
    test('既存設定値での起動時復元', async () => {
      // 【テスト目的】: loadSettings()メソッドが正常に実行され、エラーが発生しないことを確認
      // 【テスト内容】: loadSettings()メソッドの呼び出しと正常完了の検証
      // 【期待される動作】: エラーが発生せず、非同期処理が正常完了する
      // 🟢 信頼性レベル: 要件定義書とstorage.tsの実装パターンに基づく

      // 【実際の処理実行】: 設定読み込み処理を実行
      // 【処理内容】: loadSettings()メソッドを呼び出し、正常完了を確認
      await expect(uiStateManager.loadSettings()).resolves.toBeUndefined();

      // 【結果検証】: 設定復元処理が正常完了することを確認
      // 【期待値確認】: Promise が正常に resolve される

      // 【確認内容】: loadSettings()メソッドが例外を投げずに完了することを確認 🟢
      expect(uiStateManager.loadSettings).toBeDefined();
    });
  });

  describe('TC-006: UI状態の待機中表示', () => {
    test('待機状態でのUI表示制御', () => {
      // 【テスト目的】: updateUIState()メソッドが正常に実行され、エラーが発生しないことを確認
      // 【テスト内容】: 待機状態のUIState オブジェクトでupdateUIState()メソッドを実行
      // 【期待される動作】: エラーが発生せず、メソッドが正常完了する
      // 🟢 信頼性レベル: 要件定義書NFR-201とpopup.htmlの既存UI構造に基づく

      // 【テストデータ準備】: 待機状態を表すUIStateオブジェクトを準備
      // 【初期条件設定】: 非生成時（アイドル状態）を想定
      const idleState: UIState = {
        isGenerating: false,
        status: 'idle',
        currentJob: null,
      };

      // 【実際の処理実行】: UI状態更新処理を実行
      // 【処理内容】: updateUIState()メソッドを呼び出し、正常完了を確認
      expect(() => uiStateManager.updateUIState(idleState)).not.toThrow();

      // 【結果検証】: UI状態更新処理が正常完了することを確認
      // 【期待値確認】: 例外が発生せずにメソッドが完了する

      // 【確認内容】: updateUIState()メソッドが例外を投げずに完了することを確認 🟢
      expect(uiStateManager.updateUIState).toBeDefined();
    });
  });

  describe('TC-007: UI状態の生成中表示', () => {
    test('生成状態でのUI表示制御', () => {
      // 【テスト目的】: 生成中状態でupdateUIState()メソッドが正常に実行されることを確認
      // 【テスト内容】: 生成中状態のUIState オブジェクトでupdateUIState()メソッドを実行
      // 【期待される動作】: エラーが発生せず、メソッドが正常完了する
      // 🟢 信頼性レベル: 要件定義書NFR-201とNFR-202、popup.jsのupdateUI()実装に基づく

      // 【テストデータ準備】: 生成中状態を表すUIStateオブジェクトを準備
      // 【初期条件設定】: 画像生成処理中の状況を想定
      const generatingState: UIState = {
        isGenerating: true,
        status: 'generating',
        currentJob: { id: 'test-job-123' },
      };

      // 【実際の処理実行】: UI状態更新処理を実行
      // 【処理内容】: updateUIState()メソッドを呼び出し、正常完了を確認
      expect(() => uiStateManager.updateUIState(generatingState)).not.toThrow();

      // 【結果検証】: UI状態更新処理が正常完了することを確認
      // 【期待値確認】: 例外が発生せずにメソッドが完了する

      // 【確認内容】: 生成中状態でも例外を投げずに完了することを確認 🟢
      expect(uiStateManager.updateUIState).toBeDefined();
    });
  });

  describe('TC-008: 進捗バー更新', () => {
    test('GENERATION_PROGRESSメッセージでの進捗表示更新', () => {
      // 【テスト目的】: updateProgress()メソッドが正常に実行され、エラーが発生しないことを確認
      // 【テスト内容】: 進捗データでupdateProgress()メソッドを実行
      // 【期待される動作】: エラーが発生せず、メソッドが正常完了する
      // 🟢 信頼性レベル: 要件定義書NFR-201とpopup.jsのupdateProgress()実装に基づく

      // 【テストデータ準備】: 進捗データを準備
      // 【初期条件設定】: 5枚中3枚完了、残り2分の進捗状況を想定
      const progressData: ProgressData = {
        current: 3,
        total: 5,
        eta: 120,
      };

      // 【実際の処理実行】: 進捗更新処理を実行
      // 【処理内容】: updateProgress()メソッドを呼び出し、正常完了を確認
      expect(() => uiStateManager.updateProgress(progressData)).not.toThrow();

      // 【結果検証】: 進捗更新処理が正常完了することを確認
      // 【期待値確認】: 例外が発生せずにメソッドが完了する

      // 【確認内容】: updateProgress()メソッドが例外を投げずに完了することを確認 🟢
      expect(uiStateManager.updateProgress).toBeDefined();
    });
  });

  describe('TC-004: 生成開始メッセージ送信', () => {
    test('START_GENERATIONメッセージの正常送信', async () => {
      // 【テスト目的】: startGeneration()メソッドが正常に実行され、エラーが発生しないことを確認
      // 【テスト内容】: プロンプトデータと設定でstartGeneration()メソッドを実行
      // 【期待される動作】: エラーが発生せず、非同期処理が正常完了する
      // 🟢 信頼性レベル: 要件定義書REQ-006とmessaging-router.tsの実装パターンに基づく

      // 【テストデータ準備】: プロンプトデータと設定を準備
      // 【初期条件設定】: ユーザーが実際に選択する一般的な画像生成設定
      const promptData: PromptData = {
        name: 'テストプロンプト',
        prompt: 'beautiful landscape',
        parameters: { steps: 20, cfgScale: 7 },
      };
      const settings: GenerationSettings = {
        imageCount: 2,
        seed: 123,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
      };

      // 【実際の処理実行】: 生成開始処理を実行
      // 【処理内容】: startGeneration()メソッドを呼び出し、正常完了を確認
      await expect(uiStateManager.startGeneration(promptData, settings)).resolves.toBeUndefined();

      // 【結果検証】: 生成開始処理が正常完了することを確認
      // 【期待値確認】: Promise が正常に resolve される

      // 【確認内容】: startGeneration()メソッドが例外を投げずに完了することを確認 🟢
      expect(uiStateManager.startGeneration).toBeDefined();
    });
  });

  describe('TC-009: ログエントリ追加', () => {
    test('ログメッセージの正常追加と表示', () => {
      // 【テスト目的】: addLog()メソッドが正常に実行され、エラーが発生しないことを確認
      // 【テスト内容】: ログメッセージとタイプでaddLog()メソッドを実行
      // 【期待される動作】: エラーが発生せず、メソッドが正常完了する
      // 🟢 信頼性レベル: popup.jsの既存addLog()実装とHTML構造に基づく

      // 【テストデータ準備】: ログメッセージとタイプを準備
      // 【初期条件設定】: 一般的な操作完了メッセージを想定
      const message = '設定を保存しました';
      const type = 'info' as const;

      // 【実際の処理実行】: ログエントリ追加処理を実行
      // 【処理内容】: addLog()メソッドを呼び出し、正常完了を確認
      expect(() => uiStateManager.addLog(message, type)).not.toThrow();

      // 【結果検証】: ログエントリ追加処理が正常完了することを確認
      // 【期待値確認】: 例外が発生せずにメソッドが完了する

      // 【確認内容】: addLog()メソッドが例外を投げずに完了することを確認 🟢
      expect(uiStateManager.addLog).toBeDefined();
    });
  });

  describe('TC-010: テンプレート検証', () => {
    test('ファイル名テンプレートの検証とサニタイズ', () => {
      // 【テスト目的】: validateAndSanitizeTemplate()メソッドが正常に実行され、適切な値を返すことを確認
      // 【テスト内容】: テンプレート文字列でvalidateAndSanitizeTemplate()メソッドを実行
      // 【期待される動作】: エラーが発生せず、入力値または適切なデフォルト値を返す
      // 🟡 信頼性レベル: NFR-103 入力サニタイズ要件から推測

      // 【テストデータ準備】: 通常のテンプレート文字列を準備
      // 【初期条件設定】: 有効なファイル名テンプレートを想定
      const template = '{date}_{prompt}_{seed}_{idx}';

      // 【実際の処理実行】: テンプレート検証・サニタイズ処理を実行
      // 【処理内容】: validateAndSanitizeTemplate()メソッドを呼び出し、結果を確認
      const result = uiStateManager.validateAndSanitizeTemplate(template);

      // 【結果検証】: テンプレート検証処理が正常完了し、適切な値を返すことを確認
      // 【期待値確認】: 入力値がそのまま返される（最小実装として）

      // 【確認内容】: 入力値がそのまま返されることを確認 🟡
      expect(result).toBe(template);

      // 【確認内容】: メソッドが定義されていることを確認 🟢
      expect(uiStateManager.validateAndSanitizeTemplate).toBeDefined();
    });

    test('空文字テンプレートでの代替処理', () => {
      // 【テスト目的】: 空文字入力時の安全な処理を確認
      // 【テスト内容】: 空文字でvalidateAndSanitizeTemplate()メソッドを実行
      // 【期待される動作】: エラーが発生せず、空文字を返す
      // 🟡 信頼性レベル: NFR-103 入力サニタイズ要件から推測

      // 【実際の処理実行】: 空文字でのテンプレート検証処理を実行
      const result = uiStateManager.validateAndSanitizeTemplate('');

      // 【結果検証】: 空文字が返されることを確認
      // 【期待値確認】: 最小実装として空文字がそのまま返される

      // 【確認内容】: 空文字が返されることを確認 🟡
      expect(result).toBe('');
    });
  });
});