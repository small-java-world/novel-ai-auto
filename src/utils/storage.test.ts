// テストファイル: src/utils/storage.test.ts
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageAPI, createStorage } from './storage';

// Chrome Storage API モック設定
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};

// グローバルchromeオブジェクトのモック
(globalThis as any).chrome = {
  storage: mockChromeStorage,
  runtime: {
    lastError: undefined,
  },
};

describe('ストレージラッパー実装', () => {
  let storage: StorageAPI;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にChromeストレージのモックをリセットし、一貫したテスト条件を保証
    // 【環境初期化】: 前のテストの影響を受けないよう、ストレージモックの状態をクリーンにリセット
    vi.clearAllMocks();
    mockChromeStorage.local.get.mockResolvedValue({});
    mockChromeStorage.local.set.mockResolvedValue(undefined);
    storage = createStorage();
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後にイベントリスナーやタイマーをクリーンアップ
    // 【状態復元】: 次のテストに影響しないよう、グローバル状態を元に戻す
    vi.clearAllMocks();
  });

  describe('基本的なget/set操作', () => {
    test('settings名前空間への保存と取得の整合性', async () => {
      // 【テスト目的】: settings名前空間に保存したデータが正確に取得できることを確認する
      // 【テスト内容】: 設定データをsetで保存し、getで取得して同じ値が返されることをテスト
      // 【期待される動作】: 保存した設定データが完全に一致した状態で取得できる
      // 🟢 信頼性レベル: タスク定義の単体テスト要件「get/setの整合」に基づく確実なテスト

      // 【テストデータ準備】: 実際の設定データ構造に基づいたテストデータを用意
      // 【初期条件設定】: Chrome拡張機能で使用される典型的な設定値を設定
      const testSettings = {
        imageCount: 5,
        seed: 12345,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
        retrySettings: {
          maxAttempts: 3,
          baseDelayMs: 1000,
          factor: 2.0,
        },
      };

      // 【実際の処理実行】: ストレージラッパーのset機能を呼び出し、settings名前空間にデータを保存
      // 【処理内容】: chrome.storage.local.setを内部で呼び出し、名前空間付きでデータを保存する処理
      await storage.set('settings', testSettings);

      // Chrome API モックの設定: 保存されたデータが取得時に返されるよう設定
      mockChromeStorage.local.get.mockResolvedValue({
        namespace_settings: testSettings,
      });

      // 【実際の処理実行】: ストレージラッパーのget機能を呼び出し、settings名前空間からデータを取得
      // 【処理内容】: chrome.storage.local.getを内部で呼び出し、名前空間付きでデータを取得する処理
      const retrievedSettings = await storage.get('settings');

      // 【結果検証】: 保存したデータと取得したデータが完全に一致することを確認
      // 【期待値確認】: オブジェクトの深い比較により、ネストしたプロパティまで同じ値であることを検証
      expect(retrievedSettings).toEqual(testSettings); // 【確認内容】: 設定データの完全一致を確認し、データの整合性を保証 🟢
      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
        namespace_settings: testSettings,
      }); // 【確認内容】: Chrome APIが正しい名前空間付きキーで呼び出されたことを確認 🟢
    });

    test('presets名前空間への配列データの保存と取得', async () => {
      // 【テスト目的】: presets名前空間に配列形式のプロンプトデータが正確に保存・取得できることを確認
      // 【テスト内容】: プロンプトプリセットの配列をsetで保存し、getで取得して同じ配列が返されることをテスト
      // 【期待される動作】: 保存したプロンプト配列が順序と内容を保持した状態で取得できる
      // 🟢 信頼性レベル: タスク定義の名前空間「presets」要件に基づく確実なテスト

      // 【テストデータ準備】: config/prompts.jsonの構造に基づいたプリセット配列データを用意
      // 【初期条件設定】: 実際のプロンプトプリセット使用パターンを模擬したテストデータ
      const testPresets = [
        {
          id: 'preset-1',
          name: 'Fantasy Character',
          prompt: 'beautiful fantasy character, detailed artwork',
          negative: 'low quality, blurry',
          parameters: {
            steps: 28,
            cfgScale: 7.5,
          },
        },
        {
          id: 'preset-2',
          name: 'Landscape',
          prompt: 'beautiful landscape, nature scenery',
          negative: 'people, buildings',
          parameters: {
            steps: 20,
            cfgScale: 8.0,
          },
        },
      ];

      // 【実際の処理実行】: ストレージラッパーのset機能でpresets名前空間に配列データを保存
      // 【処理内容】: プロンプトプリセット配列をJSON形式でChromeストレージに保存する処理
      await storage.set('presets', testPresets);

      // Chrome API モックの設定: 保存されたプリセット配列が取得時に返されるよう設定
      mockChromeStorage.local.get.mockResolvedValue({
        namespace_presets: testPresets,
      });

      // 【実際の処理実行】: ストレージラッパーのget機能でpresets名前空間から配列データを取得
      // 【処理内容】: chrome.storage.local.getを呼び出し、プリセット配列をJSONから復元する処理
      const retrievedPresets = await storage.get('presets');

      // 【結果検証】: 保存したプリセット配列と取得した配列が完全に一致することを確認
      // 【期待値確認】: 配列の要素数、順序、各オブジェクトの全プロパティが同じ値であることを検証
      expect(retrievedPresets).toEqual(testPresets); // 【確認内容】: プリセット配列の完全一致を確認し、配列データの整合性を保証 🟢
      expect(Array.isArray(retrievedPresets)).toBe(true); // 【確認内容】: 取得データが配列形式であることを確認 🟢
      expect(retrievedPresets).toHaveLength(2); // 【確認内容】: 配列の要素数が保存時と同じであることを確認 🟢
    });
  });

  describe('初期値とデフォルト値の処理', () => {
    test('未初期化のsettings名前空間からデフォルト値を取得', async () => {
      // 【テスト目的】: settings名前空間が未初期化の場合にデフォルト値が正しく返されることを確認
      // 【テスト内容】: 空のストレージ状態でsettingsを取得し、予め定義されたデフォルト値が返されることをテスト
      // 【期待される動作】: ストレージが空でもアプリケーションが正常に動作するようデフォルト設定が提供される
      // 🟢 信頼性レベル: タスク定義のエラーハンドリング要件「未初期化の場合に既定値へフォールバック」に基づく確実なテスト

      // 【テストデータ準備】: ストレージが空の状態を模擬（Chrome API が空オブジェクトを返すケース）
      // 【初期条件設定】: 新規インストール時やストレージがクリアされた状態を想定
      mockChromeStorage.local.get.mockResolvedValue({});

      // 【実際の処理実行】: ストレージラッパーのget機能で未初期化のsettingsを取得
      // 【処理内容】: ストレージが空の場合にデフォルト設定値を返すフォールバック機能をテスト
      const defaultSettings = await storage.get('settings');

      // 【結果検証】: デフォルト値が適切に設定されていることを確認
      // 【期待値確認】: アプリケーションが正常動作するために必要な最小限のデフォルト設定が提供される
      expect(defaultSettings).toEqual({
        imageCount: 1,
        seed: -1,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
        retrySettings: {
          maxAttempts: 5,
          baseDelayMs: 500,
          factor: 2.0,
        },
      }); // 【確認内容】: デフォルト設定値が仕様通りに設定されていることを確認 🟢
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith(['namespace_settings']); // 【確認内容】: Chrome APIが正しいキーで呼び出されたことを確認 🟢
    });

    test('未初期化のjobs名前空間から空配列を取得', async () => {
      // 【テスト目的】: jobs名前空間が未初期化の場合に空配列が返されることを確認
      // 【テスト内容】: ストレージにジョブデータがない状態でjobsを取得し、空配列が返されることをテスト
      // 【期待される動作】: ジョブ履歴がない新規状態でも配列操作が安全に行える
      // 🟢 信頼性レベル: タスク定義の名前空間「jobs」要件とデフォルト値フォールバックに基づく確実なテスト

      // 【テストデータ準備】: ストレージが空の状態を模擬
      // 【初期条件設定】: ジョブ履歴がない初期状態を想定
      mockChromeStorage.local.get.mockResolvedValue({});

      // 【実際の処理実行】: ストレージラッパーのget機能で未初期化のjobsを取得
      // 【処理内容】: 配列型のデータが未初期化の場合に空配列を返すフォールバック機能をテスト
      const defaultJobs = await storage.get('jobs');

      // 【結果検証】: 空配列が返されることを確認
      // 【期待値確認】: 配列操作が安全に行えるよう、nullやundefinedではなく空配列が返される
      expect(defaultJobs).toEqual([]); // 【確認内容】: デフォルトで空配列が返されることを確認 🟢
      expect(Array.isArray(defaultJobs)).toBe(true); // 【確認内容】: 戻り値が配列型であることを確認 🟢
    });
  });

  describe('変更監視機能', () => {
    test('settings名前空間の変更を監視するコールバックが実行される', async () => {
      // 【テスト目的】: settings名前空間の変更時にコールバック関数が正しく実行されることを確認
      // 【テスト内容】: observeメソッドでコールバックを登録し、settings変更時にコールバックが呼ばれることをテスト
      // 【期待される動作】: データ変更時にUIや他コンポーネントにリアルタイムで通知される
      // 🟢 信頼性レベル: タスク定義の単体テスト要件「変更監視（モック）」に基づく確実なテスト

      // 【テストデータ準備】: 変更検知をテストするためのコールバック関数モックを用意
      // 【初期条件設定】: Chrome storage onChanged イベントのテスト環境を構築
      const mockCallback = vi.fn();
      const changeData = {
        namespace_settings: {
          newValue: { imageCount: 3 },
          oldValue: { imageCount: 1 },
        },
      };

      // 【実際の処理実行】: ストレージラッパーのobserve機能でsettings変更監視を開始
      // 【処理内容】: chrome.storage.onChanged.addListenerを内部で呼び出し、変更監視を設定する処理
      storage.observe('settings', mockCallback);

      // Chrome storage onChanged イベントを手動で発火（テスト用）
      const registeredCallback = mockChromeStorage.local.onChanged.addListener.mock.calls[0][0];
      registeredCallback(changeData, 'local');

      // 【結果検証】: コールバック関数が正しい引数で実行されることを確認
      // 【期待値確認】: 変更データが適切に加工されてコールバックに渡される
      expect(mockCallback).toHaveBeenCalledWith({
        newValue: { imageCount: 3 },
        oldValue: { imageCount: 1 },
      }); // 【確認内容】: コールバックが変更データと共に呼び出されたことを確認 🟢
      expect(mockChromeStorage.local.onChanged.addListener).toHaveBeenCalledTimes(1); // 【確認内容】: Chrome APIのイベントリスナーが1回だけ登録されたことを確認 🟢
    });

    test('複数の名前空間を同時監視する場合の分離処理', async () => {
      // 【テスト目的】: 複数の名前空間を同時監視した際に、適切な名前空間のコールバックのみが実行されることを確認
      // 【テスト内容】: settingsとjobsの両方を監視し、settings変更時にはsettingsコールバックのみが呼ばれることをテスト
      // 【期待される動作】: 名前空間が分離されており、無関係な変更通知が送られない
      // 🟡 信頼性レベル: タスク要件から推測した高度な分離機能のテスト

      // 【テストデータ準備】: 複数の名前空間監視をテストするためのコールバック関数を分けて用意
      // 【初期条件設定】: settings用とjobs用の独立したコールバックを設定
      const settingsCallback = vi.fn();
      const jobsCallback = vi.fn();
      const changeData = {
        namespace_settings: {
          newValue: { imageCount: 5 },
          oldValue: { imageCount: 3 },
        },
      };

      // 【実際の処理実行】: ストレージラッパーで複数名前空間の監視を設定
      // 【処理内容】: 複数のobserve呼び出しで異なる名前空間を同時監視する処理
      storage.observe('settings', settingsCallback);
      storage.observe('jobs', jobsCallback);

      // Chrome storage onChanged イベントを手動で発火（settings変更のみ）
      const registeredCallback = mockChromeStorage.local.onChanged.addListener.mock.calls[0][0];
      registeredCallback(changeData, 'local');

      // 【結果検証】: 該当する名前空間のコールバックのみが実行されることを確認
      // 【期待値確認】: settings変更時にはsettingsコールバックのみが呼ばれ、jobsコールバックは呼ばれない
      expect(settingsCallback).toHaveBeenCalledTimes(1); // 【確認内容】: settingsコールバックが1回実行されたことを確認 🟡
      expect(jobsCallback).not.toHaveBeenCalled(); // 【確認内容】: jobsコールバックが呼ばれていないことを確認し、名前空間分離を検証 🟡
    });
  });

  describe('エラーハンドリング', () => {
    test('Chrome storage APIエラー時のフォールバック処理', async () => {
      // 【テスト目的】: Chrome storage API呼び出し時のエラーが適切にハンドリングされることを確認
      // 【テスト内容】: Chrome APIがエラーを返した場合に、適切なエラー情報とデフォルト値が返されることをテスト
      // 【期待される動作】: APIエラーでもアプリケーションがクラッシュせず、安全にフォールバックする
      // 🟢 信頼性レベル: タスク定義のエラーハンドリング要件「取得失敗時に既定値へフォールバック」に基づく確実なテスト

      // 【テストデータ準備】: Chrome API エラー状態を模擬
      // 【初期条件設定】: ストレージアクセス権限エラーやネットワークエラーを想定
      const storageError = new Error('Storage quota exceeded');
      mockChromeStorage.local.get.mockRejectedValue(storageError);

      // 【実際の処理実行】: エラーが発生する状態でストレージラッパーのget機能を実行
      // 【処理内容】: Chrome API エラーをキャッチしてデフォルト値を返すエラーハンドリング処理をテスト
      const result = await storage.get('settings');

      // 【結果検証】: エラー時でもデフォルト値が返されることを確認
      // 【期待値確認】: アプリケーションが継続動作できるよう適切なフォールバック値が提供される
      expect(result).toEqual({
        imageCount: 1,
        seed: -1,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
        retrySettings: {
          maxAttempts: 5,
          baseDelayMs: 500,
          factor: 2.0,
        },
      }); // 【確認内容】: APIエラー時でもデフォルト設定が返されることを確認 🟢
    });

    test('不正なデータ形式の保存時にエラーを返却', async () => {
      // 【テスト目的】: JSON シリアライズ不可能なデータの保存時に適切なエラーが返されることを確認
      // 【テスト内容】: 循環参照を含むオブジェクトなど、JSON化できないデータを保存してエラーが返されることをテスト
      // 【期待される動作】: 不正なデータ保存を事前に検知し、明確なエラーメッセージを提供する
      // 🟢 信頼性レベル: タスク定義のエラーハンドリング要件「JSONシリアライズ時にエラーを返却しログ記録」に基づく確実なテスト

      // 【テストデータ準備】: JSON シリアライズ不可能な循環参照オブジェクトを作成
      // 【初期条件設定】: JSON.stringify() が失敗するデータ構造を意図的に作成
      const circularRef: any = { name: 'test' };
      circularRef.self = circularRef; // 循環参照を作成

      // 【実際の処理実行】: 不正なデータでストレージラッパーのset機能を実行
      // 【処理内容】: JSON シリアライズエラーを検知してエラーを返すバリデーション処理をテスト
      const result = await storage.set('settings', circularRef);

      // 【結果検証】: 適切なエラー情報が返されることを確認
      // 【期待値確認】: エラーの種類と理由が明確に示され、開発者が問題を特定できる
      expect(result).toEqual({
        success: false,
        error: 'Failed to serialize data: Converting circular structure to JSON',
        context: { namespace: 'settings' },
      }); // 【確認内容】: JSON シリアライズエラーが適切に検知されエラー情報が返されることを確認 🟢
    });

    test('ストレージ容量制限超過時のエラーハンドリング', async () => {
      // 【テスト目的】: Chrome extension storage の容量制限超過時に適切なエラーが返されることを確認
      // 【テスト内容】: 大量データ保存でQuotaExceededErrorが発生した場合のエラーハンドリングをテスト
      // 【期待される動作】: 容量超過を検知し、ユーザーに分かりやすいエラーメッセージを提供する
      // 🟡 信頼性レベル: タスク要件から推測した容量制限エラーのハンドリングテスト

      // 【テストデータ準備】: Chrome storage の容量制限超過エラーを模擬
      // 【初期条件設定】: QUOTA_BYTES_PER_ITEM 制限を超えるデータサイズを想定
      const quotaError = new Error('QUOTA_BYTES_PER_ITEM quota exceeded');
      quotaError.name = 'QuotaExceededError';
      mockChromeStorage.local.set.mockRejectedValue(quotaError);

      const largeData = {
        imageCount: 1000,
        largeArray: new Array(10000).fill('large data item'),
      };

      // 【実際の処理実行】: 大容量データでストレージラッパーのset機能を実行
      // 【処理内容】: 容量制限エラーをキャッチして適切なエラーメッセージを返す処理をテスト
      const result = await storage.set('settings', largeData);

      // 【結果検証】: 容量制限エラーが適切にハンドリングされることを確認
      // 【期待値確認】: エラー種類の特定とユーザー向けの分かりやすいエラーメッセージが提供される
      expect(result).toEqual({
        success: false,
        error: 'Storage quota exceeded. Please reduce data size or clear old data.',
        context: { namespace: 'settings', errorType: 'QuotaExceededError' },
      }); // 【確認内容】: 容量制限エラーが検知され適切なエラーメッセージが返されることを確認 🟡
    });
  });

  describe('統合テスト（モック環境）', () => {
    test('Popup と Service Worker 間でのsettingsデータ同期', async () => {
      // 【テスト目的】: PopupとService Worker間でsettingsデータが正しく同期されることを確認
      // 【テスト内容】: Popup側でsettings更新後、Service Worker側で同じデータが取得できることをテスト
      // 【期待される動作】: 両コンポーネント間でリアルタイムにデータが共有される
      // 🟢 信頼性レベル: タスク定義の統合テスト要件「Popup と SW 間の同期」に基づく確実なテスト

      // 【テストデータ準備】: Popup側とService Worker側での設定データ更新をシミュレート
      // 【初期条件設定】: 実際の拡張機能における Popup ↔ Service Worker 通信パターンを模擬
      const initialSettings = {
        imageCount: 1,
        seed: -1,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
      };

      const updatedSettings = {
        imageCount: 5,
        seed: 42,
        filenameTemplate: '{Character}_{date}_{seed}_{idx}',
      };

      // 【実際の処理実行】: Popup側での設定保存をシミュレート
      // 【処理内容】: ストレージラッパーを使用してPopup側で設定データを更新する処理
      await storage.set('settings', initialSettings);

      // Chrome storage の状態を更新（Service Worker側で取得できるようにモック設定）
      mockChromeStorage.local.get.mockResolvedValue({
        namespace_settings: initialSettings,
      });

      // Service Worker側での初回データ取得をシミュレート
      const serviceWorkerData1 = await storage.get('settings');

      // Popup側での設定更新をシミュレート
      await storage.set('settings', updatedSettings);

      // Chrome storage の状態を更新後の値に変更
      mockChromeStorage.local.get.mockResolvedValue({
        namespace_settings: updatedSettings,
      });

      // Service Worker側での更新後データ取得をシミュレート
      const serviceWorkerData2 = await storage.get('settings');

      // 【結果検証】: 両コンポーネント間でデータが正しく同期されることを確認
      // 【期待値確認】: 同じストレージラッパーを使用することで一貫したデータアクセスが実現される
      expect(serviceWorkerData1).toEqual(initialSettings); // 【確認内容】: Service Worker側で初回データが正しく取得できることを確認 🟢
      expect(serviceWorkerData2).toEqual(updatedSettings); // 【確認内容】: Service Worker側で更新後データが正しく取得できることを確認 🟢
      expect(mockChromeStorage.local.set).toHaveBeenCalledTimes(2); // 【確認内容】: Chrome APIが両回とも正しく呼び出されたことを確認 🟢
    });
  });
});
