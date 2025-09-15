// テストファイル: src/utils/tabManager.test.ts
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// 【テストファイル概要】: TASK-030 タブ管理機能の失敗テストを作成（TDD Red フェーズ）
// 【対象機能】: NovelAI タブの検出・作成・アクティブ化およびエラーハンドリング

// Chrome API のモック設定
const mockChrome = {
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

// グローバル chrome オブジェクトをモック
(globalThis as any).chrome = mockChrome;

// 【実装完了】: TDD Green フェーズで実装された関数をインポート
import { ensureNovelAITab } from './tabManager';

describe('TabManager - TASK-030 タブ管理機能', () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にモックの状態をクリアし、一貫したテスト環境を保証
    // 【環境初期化】: 前のテストの影響を受けないよう、Chrome API のモック呼び出し履歴をリセット
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後にモックの状態をクリーンアップ
    // 【状態復元】: 次のテストに影響しないよう、環境を元の状態に戻す
    vi.resetAllMocks();
  });

  describe('正常系テスト', () => {
    test('既存のNovelAIタブが見つかった場合にアクティブ化する', async () => {
      // 【テスト目的】: 既存のNovelAIタブを検出してアクティブ化する機能のテスト
      // 【テスト内容】: tabs.query で既存タブを検出し、tabs.update でアクティブ化する処理
      // 【期待される動作】: 既存タブが見つかった場合、そのタブをアクティブ化して返却する
      // 🟢 信頼性レベル: TASK-030の基本要件に直接基づいた実装

      // 【テストデータ準備】: 既存のNovelAIタブをシミュレートするためのモックデータ
      // 【初期条件設定】: tabs.query が既存タブを返すよう設定
      const existingTab = { id: 123, url: 'https://novelai.net/generate', active: false };
      mockChrome.tabs.query.mockResolvedValue([existingTab]);
      mockChrome.tabs.update.mockResolvedValue({ ...existingTab, active: true });

      // 【実際の処理実行】: まだ実装されていない ensureNovelAITab 関数を呼び出す
      // 【処理内容】: 既存タブの検出とアクティブ化を実行
      const result = await ensureNovelAITab();

      // 【結果検証】: 関数が既存タブを正しく処理したかを確認
      // 【期待値確認】: アクティブ化されたタブオブジェクトが返却されること
      expect(result).toEqual({ ...existingTab, active: true }); // 【確認内容】: 返却されるタブオブジェクトがアクティブ状態になっていること 🟢
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ url: 'https://novelai.net/*' }); // 【確認内容】: 正しいURLパターンでタブ検索が実行されること 🟢
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(123, { active: true }); // 【確認内容】: 既存タブのIDでアクティブ化が実行されること 🟢
    });

    test('NovelAIタブが存在しない場合に新しいタブを作成する', async () => {
      // 【テスト目的】: NovelAIタブが存在しない場合の新規タブ作成機能のテスト
      // 【テスト内容】: tabs.query で空配列が返された場合に tabs.create で新規タブを作成する処理
      // 【期待される動作】: 新しいNovelAIタブが作成され、そのタブオブジェクトが返却される
      // 🟢 信頼性レベル: TASK-030の基本要件に直接基づいた実装

      // 【テストデータ準備】: 既存タブが存在しない状況をシミュレート
      // 【初期条件設定】: tabs.query が空配列を返し、tabs.create が新しいタブを返すよう設定
      mockChrome.tabs.query.mockResolvedValue([]);
      const newTab = { id: 456, url: 'https://novelai.net/', active: true };
      mockChrome.tabs.create.mockResolvedValue(newTab);

      // 【実際の処理実行】: まだ実装されていない ensureNovelAITab 関数を呼び出す
      // 【処理内容】: 新規タブの作成を実行
      const result = await ensureNovelAITab();

      // 【結果検証】: 関数が新規タブを正しく作成したかを確認
      // 【期待値確認】: 作成されたタブオブジェクトが返却されること
      expect(result).toEqual(newTab); // 【確認内容】: 返却されるタブオブジェクトが作成されたタブと一致すること 🟢
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ url: 'https://novelai.net/*' }); // 【確認内容】: 正しいURLパターンでタブ検索が実行されること 🟢
      expect(mockChrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://novelai.net/',
        active: true,
      }); // 【確認内容】: 正しいパラメータで新規タブ作成が実行されること 🟢
    });
  });

  describe('異常系テスト - TASK-030のエラーハンドリング要件', () => {
    test('tabs.query が失敗した場合にエラーを適切にハンドリングする', () => {
      // 【テスト目的】: tabs.query API の失敗時のエラーハンドリング機能をテスト
      // 【テスト内容】: Chrome API のタブクエリが失敗した場合の挙動を検証
      // 【期待される動作】: API失敗時にエラーが投げられ、ユーザに適切な通知が行われる
      // 🟡 信頼性レベル: TASK-030のエラーハンドリング要件から推測した実装

      // 【テストデータ準備】: tabs.query が失敗する状況をシミュレート
      // 【初期条件設定】: Chrome API の呼び出しがエラーを投げるよう設定
      const queryError = new Error('Failed to query tabs - permission denied');
      mockChrome.tabs.query.mockRejectedValue(queryError);

      // 【実際の処理実行】: まだ実装されていない ensureNovelAITab 関数を呼び出す
      // 【処理内容】: エラー状況での処理実行
      const resultPromise = ensureNovelAITab();

      // 【結果検証】: エラーが適切にハンドリングされるかを確認
      // 【期待値確認】: 関数がエラーを再投げし、適切なエラーメッセージが含まれること
      expect(resultPromise).rejects.toThrow('Failed to query tabs - permission denied'); // 【確認内容】: タブクエリ失敗時の具体的なエラーメッセージが伝播されること 🟡
    });

    test('tabs.create が失敗した場合にエラーを適切にハンドリングする', () => {
      // 【テスト目的】: tabs.create API の失敗時のエラーハンドリング機能をテスト
      // 【テスト内容】: Chrome API の新規タブ作成が失敗した場合の挙動を検証
      // 【期待される動作】: タブ作成失敗時にエラーが投げられ、リカバリ処理またはユーザ通知が行われる
      // 🟡 信頼性レベル: TASK-030のエラーハンドリング要件から推測した実装

      // 【テストデータ準備】: tabs.create が失敗する状況をシミュレート
      // 【初期条件設定】: タブが存在せず、新規作成が失敗するケース
      mockChrome.tabs.query.mockResolvedValue([]);
      const createError = new Error('Failed to create tab - insufficient permissions');
      mockChrome.tabs.create.mockRejectedValue(createError);

      // 【実際の処理実行】: まだ実装されていない ensureNovelAITab 関数を呼び出す
      // 【処理内容】: タブ作成エラー状況での処理実行
      const resultPromise = ensureNovelAITab();

      // 【結果検証】: エラーが適切にハンドリングされるかを確認
      // 【期待値確認】: 関数がエラーを再投げし、適切なエラーメッセージが含まれること
      expect(resultPromise).rejects.toThrow('Failed to create tab - insufficient permissions'); // 【確認内容】: タブ作成失敗時の具体的なエラーメッセージが伝播されること 🟡
    });

    test('tabs.update が失敗した場合にエラーを適切にハンドリングする', () => {
      // 【テスト目的】: tabs.update API の失敗時のエラーハンドリング機能をテスト
      // 【テスト内容】: Chrome API のタブアクティブ化が失敗した場合の挙動を検証
      // 【期待される動作】: タブアクティブ化失敗時にエラーが投げられ、フォールバック処理が実行される
      // 🟡 信頼性レベル: TASK-030のエラーハンドリング要件から推測した実装

      // 【テストデータ準備】: tabs.update が失敗する状況をシミュレート
      // 【初期条件設定】: 既存タブが見つかるが、アクティブ化に失敗するケース
      const existingTab = { id: 789, url: 'https://novelai.net/generate', active: false };
      mockChrome.tabs.query.mockResolvedValue([existingTab]);
      const updateError = new Error('Failed to update tab - tab no longer exists');
      mockChrome.tabs.update.mockRejectedValue(updateError);

      // 【実際の処理実行】: まだ実装されていない ensureNovelAITab 関数を呼び出す
      // 【処理内容】: タブアクティブ化エラー状況での処理実行
      const resultPromise = ensureNovelAITab();

      // 【結果検証】: エラーが適切にハンドリングされるかを確認
      // 【期待値確認】: 関数がエラーを再投げし、適切なエラーメッセージが含まれること
      expect(resultPromise).rejects.toThrow('Failed to update tab - tab no longer exists'); // 【確認内容】: タブアクティブ化失敗時の具体的なエラーメッセージが伝播されること 🟡
    });

    test('無効なタブIDが返された場合のハンドリング', () => {
      // 【テスト目的】: tabs.query が無効なタブオブジェクトを返した場合のエラーハンドリング
      // 【テスト内容】: id プロパティが存在しないか無効なタブオブジェクトの処理
      // 【期待される動作】: 無効なタブデータに対して適切なエラー処理が行われる
      // 🔴 信頼性レベル: 要件には明記されていないが、堅牢性のために必要な実装

      // 【テストデータ準備】: id プロパティが無効なタブオブジェクトをシミュレート
      // 【初期条件設定】: tabs.query が無効なタブデータを返すよう設定
      const invalidTab = { id: null, url: 'https://novelai.net/', active: false };
      mockChrome.tabs.query.mockResolvedValue([invalidTab]);

      // 【実際の処理実行】: まだ実装されていない ensureNovelAITab 関数を呼び出す
      // 【処理内容】: 無効なタブデータの処理実行
      const resultPromise = ensureNovelAITab();

      // 【結果検証】: 無効なタブデータが適切に処理されるかを確認
      // 【期待値確認】: 無効なタブID検出時にエラーが投げられること
      expect(resultPromise).rejects.toThrow('Invalid tab data received'); // 【確認内容】: 無効なタブデータ検出時の適切なエラーメッセージが表示されること 🔴
    });

    test('Chrome API が利用できない環境でのエラーハンドリング', () => {
      // 【テスト目的】: Chrome拡張環境以外でのAPI利用不可時のエラーハンドリング
      // 【テスト内容】: chrome.tabs API が undefined の場合の挙動を検証
      // 【期待される動作】: API利用不可時に適切なエラーメッセージが提供される
      // 🔴 信頼性レベル: 要件には明記されていないが、環境依存性を考慮した堅牢な実装

      // 【テストデータ準備】: Chrome API が利用できない環境をシミュレート
      // 【初期条件設定】: global chrome オブジェクトを一時的に削除
      const originalChrome = (globalThis as any).chrome;
      (globalThis as any).chrome = undefined;

      // 【実際の処理実行】: まだ実装されていない ensureNovelAITab 関数を呼び出す
      // 【処理内容】: Chrome API不可環境での処理実行
      const resultPromise = ensureNovelAITab();

      // 【結果検証】: API利用不可時の適切なエラーハンドリングを確認
      // 【期待値確認】: Chrome API利用不可時の明確なエラーメッセージが表示されること
      expect(resultPromise).rejects.toThrow('Chrome tabs API is not available'); // 【確認内容】: API利用不可環境での適切なエラーメッセージが表示されること 🔴

      // テスト後にChrome APIを復元
      (globalThis as any).chrome = originalChrome;
    });
  });

  describe('境界値テスト', () => {
    test('複数の既存タブが見つかった場合に最初のタブを選択する', async () => {
      // 【テスト目的】: 複数のNovelAIタブが存在する場合の優先順位テスト
      // 【テスト内容】: tabs.query が複数のタブを返した場合に最初のタブが選択される処理
      // 【期待される動作】: 配列の最初のタブがアクティブ化され、他のタブは無視される
      // 🟡 信頼性レベル: 一般的な実装パターンから推測した動作

      // 【テストデータ準備】: 複数のNovelAIタブが存在する状況をシミュレート
      // 【初期条件設定】: tabs.query が複数のタブを返すよう設定
      const multipleTab = [
        { id: 100, url: 'https://novelai.net/generate', active: false },
        { id: 101, url: 'https://novelai.net/settings', active: false },
      ];
      mockChrome.tabs.query.mockResolvedValue(multipleTab);
      mockChrome.tabs.update.mockResolvedValue({ ...multipleTab[0], active: true });

      // 【実際の処理実行】: まだ実装されていない ensureNovelAITab 関数を呼び出す
      // 【処理内容】: 複数タブ存在時の優先選択処理
      const result = await ensureNovelAITab();

      // 【結果検証】: 最初のタブが正しく選択されるかを確認
      // 【期待値確認】: 配列の最初のタブのみがアクティブ化されること
      expect(result).toEqual({ ...multipleTab[0], active: true }); // 【確認内容】: 最初のタブがアクティブ化されて返却されること 🟡
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(100, { active: true }); // 【確認内容】: 最初のタブのIDでのみアクティブ化が実行されること 🟡
      expect(mockChrome.tabs.update).toHaveBeenCalledTimes(1); // 【確認内容】: アクティブ化処理が1回のみ実行されること 🟡
    });

    test('空配列が返された場合に新規タブ作成処理に移行する', async () => {
      // 【テスト目的】: tabs.query が空配列を返した場合の分岐処理テスト
      // 【テスト内容】: 既存タブなしの境界ケースでの新規作成処理
      // 【期待される動作】: 空配列検出時に即座に新規タブ作成処理が実行される
      // 🟢 信頼性レベル: TASK-030の基本要件に直接基づいた実装

      // 【テストデータ準備】: 空配列をシミュレート
      // 【初期条件設定】: タブが全く存在しない状況
      mockChrome.tabs.query.mockResolvedValue([]);
      const newTab = { id: 200, url: 'https://novelai.net/', active: true };
      mockChrome.tabs.create.mockResolvedValue(newTab);

      // 【実際の処理実行】: まだ実装されていない ensureNovelAITab 関数を呼び出す
      // 【処理内容】: 空配列検出時の新規タブ作成処理
      const result = await ensureNovelAITab();

      // 【結果検証】: 空配列から新規作成への分岐が正しく動作するかを確認
      // 【期待値確認】: 新規作成されたタブが返却されること
      expect(result).toEqual(newTab); // 【確認内容】: 新規作成されたタブオブジェクトが返却されること 🟢
      expect(mockChrome.tabs.update).not.toHaveBeenCalled(); // 【確認内容】: 既存タブのアクティブ化処理が実行されないこと 🟢
      expect(mockChrome.tabs.create).toHaveBeenCalledTimes(1); // 【確認内容】: 新規タブ作成が1回のみ実行されること 🟢
    });
  });
});
