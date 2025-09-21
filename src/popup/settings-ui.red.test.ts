// 【テスト対象モジュール】: Settings UI管理機能（まだ実装されていない）
// 【TDDフェーズ】: Red Phase - 失敗するテストを作成してTDD開発を開始
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Mock } from 'vitest';

// 【インポート】: まだ実装されていないSettingsUIクラス（意図的にテスト失敗を引き起こす）
// 🔴 実装されていないクラスをインポート - テストが失敗することを確認するため
import { SettingsUI } from './settings-ui';

// 【Chrome APIモック】: test/setup.tsで設定されたChrome APIモックを使用
// 🟢 既存のテスト環境基盤を活用
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
  },
};
vi.mocked(global.chrome.storage).local = mockChromeStorage.local;

describe('TASK-042 Settings UI - 設定画面機能', () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にモック状態をクリアし、独立したテスト環境を確保
    // 【環境初期化】: 前のテストの影響を受けないよう、全てのモック関数の呼び出し履歴をリセット
    vi.clearAllMocks();
    mockChromeStorage.local.get.mockClear();
    mockChromeStorage.local.set.mockClear();
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後にDOM要素をクリーンアップ
    // 【状態復元】: 次のテストに影響しないよう、DOM環境を初期状態に戻す
    document.body.innerHTML = '';
  });

  describe('TC-001: 正常系テスト', () => {
    test('TC-001-001: デフォルト設定値の初期表示', async () => {
      // 【テスト目的】: Settings UI初期化時のデフォルト値設定と表示機能確認
      // 【テスト内容】: chrome.storage読み込み → デフォルト値適用 → フォーム表示の一連の流れ
      // 【期待される動作】: 各設定フィールドに適切なデフォルト値が表示される
      // 🟢 TASK-042要件定義書のデフォルト値仕様に基づく確実なテストケース

      // 【テストデータ準備】: 初回起動を想定した空のストレージ状態を模擬
      // 【初期条件設定】: chrome.storage.local.get が空オブジェクトを返すよう設定
      // 【前提条件確認】: DOM環境とChrome APIモックが利用可能な状態
      mockChromeStorage.local.get.mockResolvedValue({});

      // 【実際の処理実行】: Settings UI コンポーネントの初期化処理を実行
      // 【処理内容】: ストレージ読み込み → デフォルト値適用 → DOM要素への値設定
      // 【実行タイミング】: コンポーネント初期化の最初のフェーズで実行
      const settingsUI = new SettingsUI();
      await settingsUI.initialize();

      // 【結果検証】: 各フォームフィールドの値がデフォルト値と一致することを確認
      // 【期待値確認】: TASK-042要件定義で明示されたデフォルト値との整合性確認
      // 【品質保証】: ユーザー体験における第一印象の品質確保
      expect(settingsUI.getImageCount()).toBe(10); // 【確認内容】: 画像生成数デフォルト値10の設定確認 🟢
      expect(settingsUI.getSeedMode()).toBe('random'); // 【確認内容】: シードモードがランダムに設定されることを確認 🟢
      expect(settingsUI.getSeedValue()).toBeUndefined(); // 【確認内容】: ランダムモード時はシード値が未設定であることを確認 🟢
      expect(settingsUI.getFilenameTemplate()).toBe('{date}_{prompt}_{seed}_{idx}'); // 【確認内容】: ファイル名テンプレートデフォルト値の設定確認 🟢
      expect(settingsUI.getRetrySettings()).toEqual({
        maxAttempts: 3,
        baseDelayMs: 1000,
        factor: 2.0,
      }); // 【確認内容】: リトライ設定のデフォルト値が全て正しく設定されることを確認 🟢
    });

    test('TC-001-002: 設定値の保存成功パターン', async () => {
      // 【テスト目的】: フォーム入力値の検証通過と chrome.storage への保存処理確認
      // 【テスト内容】: 有効な設定値入力 → バリデーション → ストレージ保存の流れ
      // 【期待される動作】: バリデーションが成功し、設定値がストレージに保存され、ユーザーに成功フィードバックが表示される
      // 🟢 EARS要件REQ-005の設定保存機能に直接対応する確実なテストケース

      // 【テストデータ準備】: 実際のユーザーが設定しそうな妥当なカスタム値を用意
      // 【初期条件設定】: chrome.storageのモック設定とSettingsUI初期化
      // 【前提条件確認】: 全制約条件内の有効値を使用してバリデーション通過を保証
      const testSettings = {
        imageCount: 25,
        seedMode: 'fixed' as const,
        seedValue: 12345,
        filenameTemplate: '{date}_custom_{seed}',
        retrySettings: {
          maxAttempts: 5,
          baseDelayMs: 2000,
          factor: 1.5,
        },
      };

      mockChromeStorage.local.set.mockResolvedValue(void 0);
      const settingsUI = new SettingsUI();
      await settingsUI.initialize();

      // 【実際の処理実行】: 設定値の保存処理を実行
      // 【処理内容】: 入力値検証 → chrome.storage.local.set呼び出し → 成功レスポンス
      // 【実行タイミング】: ユーザーが設定を保存するタイミングで実行
      const result = await settingsUI.saveSettings(testSettings);

      // 【結果検証】: 保存処理の成功と正しいストレージ操作を確認
      // 【期待値確認】: バリデーション通過、ストレージ保存、成功ステータス返却の確認
      // 【品質保証】: 設定保存機能の信頼性とユーザー体験の確保
      expect(result.validationResult.isValid).toBe(true); // 【確認内容】: バリデーション成功の確認 🟢
      expect(result.validationResult.errors).toEqual({}); // 【確認内容】: エラーが存在しないことの確認 🟢
      expect(result.storageStatus).toBe('success'); // 【確認内容】: ストレージ保存成功ステータスの確認 🟢
      expect(result.savedSettings).toEqual(testSettings); // 【確認内容】: 保存された設定値が入力値と一致することの確認 🟢
      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
        namespace_settings: testSettings,
      }); // 【確認内容】: Chrome storage API が正しい値で呼び出されることの確認 🟢
    });

    test('TC-001-003: 保存済み設定の読み込み表示', async () => {
      // 【テスト目的】: chrome.storage からの設定読み込みと UI への反映機能確認
      // 【テスト内容】: ストレージから既存設定を読み込み → UI要素への値設定 → 表示確認
      // 【期待される動作】: 保存済み設定値がフォームに正確に復元され、以前の設定状態が再現される
      // 🟢 EARS要件REQ-005の設定取得機能に直接対応する確実なテストケース

      // 【テストデータ準備】: ユーザーが以前カスタマイズした設定データを模擬
      // 【初期条件設定】: chrome.storageに保存済み設定が存在する状態を再現
      // 【前提条件確認】: 保存済み設定値は全て有効な値で構成されている
      const savedSettings = {
        imageCount: 50,
        seedMode: 'fixed' as const,
        seedValue: 98765,
        filenameTemplate: '{prompt}_{idx}_custom',
        retrySettings: {
          maxAttempts: 8,
          baseDelayMs: 3000,
          factor: 2.5,
        },
      };

      mockChromeStorage.local.get.mockResolvedValue({
        namespace_settings: savedSettings,
      });

      // 【実際の処理実行】: 設定読み込みと UI 初期化処理を実行
      // 【処理内容】: chrome.storage.local.get → 設定値抽出 → UI要素への値設定
      // 【実行タイミング】: Settings UI画面を開いた時の初期化フェーズ
      const settingsUI = new SettingsUI();
      await settingsUI.initialize();

      // 【結果検証】: 読み込まれた設定値が正確にUI要素に反映されることを確認
      // 【期待値確認】: 保存済み設定値とUI表示値の完全一致を検証
      // 【品質保証】: 設定永続化機能の信頼性とデータ整合性の確保
      expect(settingsUI.getImageCount()).toBe(50); // 【確認内容】: 画像生成数の復元確認 🟢
      expect(settingsUI.getSeedMode()).toBe('fixed'); // 【確認内容】: シードモードの復元確認 🟢
      expect(settingsUI.getSeedValue()).toBe(98765); // 【確認内容】: シード値の復元確認 🟢
      expect(settingsUI.getFilenameTemplate()).toBe('{prompt}_{idx}_custom'); // 【確認内容】: ファイル名テンプレートの復元確認 🟢
      expect(settingsUI.getRetrySettings()).toEqual({
        maxAttempts: 8,
        baseDelayMs: 3000,
        factor: 2.5,
      }); // 【確認内容】: リトライ設定の復元確認 🟢
    });
  });

  describe('TC-002: 異常系テスト', () => {
    test('TC-002-001: 画像生成数の範囲外エラー', async () => {
      // 【テスト目的】: imageCount フィールドの制約違反に対するバリデーションエラー処理確認
      // 【テスト内容】: 範囲外の数値入力 → バリデーション実行 → エラーメッセージ生成と表示
      // 【期待される動作】: 1未満または100超過の値で適切なエラーメッセージが表示される
      // 🟢 TASK-042要件定義の制約条件（1-100範囲）に基づく確実なテストケース

      // 【テストデータ準備】: 制約違反の数値を意図的に用意してエラー処理を検証
      // 【初期条件設定】: Settings UI を初期化し、無効な値での検証準備
      // 【前提条件確認】: 0および101は明確に制約範囲外の値
      const invalidSettings = {
        imageCount: 0,
        seedMode: 'random' as const,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
        retrySettings: { maxAttempts: 3, baseDelayMs: 1000, factor: 2.0 },
      };

      const settingsUI = new SettingsUI();
      await settingsUI.initialize();

      // 【実際の処理実行】: 無効な設定値でバリデーション処理を実行
      // 【処理内容】: 入力値検証 → 制約チェック → エラーメッセージ生成
      // 【実行タイミング】: ユーザーが無効な値を入力して保存を試行した時
      const result = await settingsUI.saveSettings(invalidSettings);

      // 【結果検証】: バリデーションエラーの適切な検出と処理を確認
      // 【期待値確認】: バリデーション失敗、具体的エラーメッセージ、保存処理の阻止
      // 【品質保証】: ユーザーエラーの事前防止とシステム安定性の保証
      expect(result.validationResult.isValid).toBe(false); // 【確認内容】: バリデーション失敗の確認 🟢
      expect(result.validationResult.errors.imageCount).toBe('1以上100以下の値を入力してください'); // 【確認内容】: 具体的なエラーメッセージの確認 🟢
      expect(result.storageStatus).toBe('error'); // 【確認内容】: 保存処理が実行されないことの確認 🟢
      expect(mockChromeStorage.local.set).not.toHaveBeenCalled(); // 【確認内容】: 無効値での保存が阻止されることの確認 🟢
    });

    test('TC-002-002: シード値の型エラー処理', async () => {
      // 【テスト目的】: seedMode="fixed"時の無効シード値に対するバリデーションエラー処理確認
      // 【テスト内容】: 固定シードモードで型違反値入力 → バリデーション → エラー処理
      // 【期待される動作】: 数値以外や範囲外の値で適切なエラーメッセージが表示される
      // 🟡 EARS要件REQ-301とシード制約から妥当に推測したテストケース

      // 【テストデータ準備】: seedMode="fixed"で無効なシード値を意図的に設定
      // 【初期条件設定】: 固定シードモードで数値以外の値を使用してエラー処理を検証
      // 【前提条件確認】: seedMode="fixed"時はseedValueが0以上2^32-1以下の整数である必要
      const invalidSettings = {
        imageCount: 10,
        seedMode: 'fixed' as const,
        seedValue: -1, // 負の値は無効
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
        retrySettings: { maxAttempts: 3, baseDelayMs: 1000, factor: 2.0 },
      };

      const settingsUI = new SettingsUI();
      await settingsUI.initialize();

      // 【実際の処理実行】: 無効なシード値でバリデーション処理を実行
      // 【処理内容】: シード値の型・範囲チェック → エラーメッセージ生成
      // 【実行タイミング】: 固定シードモードで無効値を入力した時
      const result = await settingsUI.saveSettings(invalidSettings);

      // 【結果検証】: シード値バリデーションエラーの適切な検出と処理を確認
      // 【期待値確認】: シード値固有のエラーメッセージとバリデーション失敗の確認
      // 【品質保証】: NovelAI連携における生成パラメータの整合性保証
      expect(result.validationResult.isValid).toBe(false); // 【確認内容】: バリデーション失敗の確認 🟢
      expect(result.validationResult.errors.seedValue).toBe('0以上の整数値を入力してください'); // 【確認内容】: シード値固有のエラーメッセージ確認 🟡
      expect(result.storageStatus).toBe('error'); // 【確認内容】: 保存処理が実行されないことの確認 🟢
    });

    test('TC-002-003: ファイル名テンプレートの無効文字エラー', async () => {
      // 【テスト目的】: ファイル名テンプレートの使用禁止文字に対するバリデーションエラー処理確認
      // 【テスト内容】: 禁止文字を含むテンプレート入力 → サニタイゼーション検証 → エラー処理
      // 【期待される動作】: ファイルシステム禁止文字で適切なエラーメッセージが表示される
      // 🟢 TASK-042要件定義のファイル名制約と既存TASK-011実装に基づく確実なテストケース

      // 【テストデータ準備】: ファイルシステムで禁止されている文字を意図的に含むテンプレート
      // 【初期条件設定】: クロスプラットフォーム対応の禁止文字（<>:|?）を使用
      // 【前提条件確認】: これらの文字はWindows/macOS/Linuxで共通してファイル名に使用不可
      const invalidSettings = {
        imageCount: 10,
        seedMode: 'random' as const,
        filenameTemplate: '{date}<>:|?{prompt}',
        retrySettings: { maxAttempts: 3, baseDelayMs: 1000, factor: 2.0 },
      };

      const settingsUI = new SettingsUI();
      await settingsUI.initialize();

      // 【実際の処理実行】: 無効な文字を含むファイル名テンプレートでバリデーション実行
      // 【処理内容】: ファイル名サニタイゼーション → 禁止文字検出 → エラーメッセージ生成
      // 【実行タイミング】: ユーザーが禁止文字を含むテンプレートを入力した時
      const result = await settingsUI.saveSettings(invalidSettings);

      // 【結果検証】: ファイル名テンプレートバリデーションエラーの適切な検出を確認
      // 【期待値確認】: 禁止文字の特定とユーザーフレンドリーなエラーメッセージ
      // 【品質保証】: ファイルダウンロード時のエラー防止とセキュリティ確保
      expect(result.validationResult.isValid).toBe(false); // 【確認内容】: バリデーション失敗の確認 🟢
      expect(result.validationResult.errors.filenameTemplate).toContain(
        'ファイル名に使用できない文字が含まれています'
      ); // 【確認内容】: ファイル名禁止文字エラーメッセージの確認 🟢
      expect(result.storageStatus).toBe('error'); // 【確認内容】: 保存処理が実行されないことの確認 🟢
    });

    test('TC-002-004: Chrome Storage保存失敗エラー', async () => {
      // 【テスト目的】: chrome.storage API での保存処理失敗に対するエラーハンドリング確認
      // 【テスト内容】: 有効な設定値 + ストレージ保存失敗 → エラー処理 → ユーザーフィードバック
      // 【期待される動作】: ストレージエラー時に適切なエラーメッセージとリトライ案内が表示される
      // 🔴 Chrome拡張の実運用経験からの推測、具体的要件定義なし

      // 【テストデータ準備】: バリデーション通過する有効な設定値を用意
      // 【初期条件設定】: chrome.storage.local.set がRejectされる状況をモック
      // 【前提条件確認】: 設定値自体は有効だが、ストレージ操作でエラーが発生する状況
      const validSettings = {
        imageCount: 25,
        seedMode: 'random' as const,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
        retrySettings: { maxAttempts: 5, baseDelayMs: 2000, factor: 1.5 },
      };

      mockChromeStorage.local.set.mockRejectedValue(new Error('Storage quota exceeded'));
      const settingsUI = new SettingsUI();
      await settingsUI.initialize();

      // 【実際の処理実行】: Chrome storage API での保存失敗シナリオを実行
      // 【処理内容】: バリデーション通過 → chrome.storage.local.set呼び出し → Promise reject
      // 【実行タイミング】: ストレージ容量満杯やアクセス権限問題が発生した時
      const result = await settingsUI.saveSettings(validSettings);

      // 【結果検証】: ストレージエラー時の適切なエラーハンドリングを確認
      // 【期待値確認】: バリデーション通過後のストレージエラー処理と分かりやすいエラーメッセージ
      // 【品質保証】: ブラウザ環境制約に対する適切な対応とユーザー体験の維持
      expect(result.validationResult.isValid).toBe(true); // 【確認内容】: バリデーションは成功していることの確認 🟢
      expect(result.storageStatus).toBe('error'); // 【確認内容】: ストレージ処理のエラーステータス確認 🟢
      expect(result.errorMessage).toBe(
        '設定の保存に失敗しました。しばらく時間をおいて再試行してください。'
      ); // 【確認内容】: ユーザーフレンドリーなエラーメッセージ確認 🔴
    });
  });

  describe('TC-003: 境界値テスト', () => {
    test('TC-003-001: 画像生成数の境界値テスト', async () => {
      // 【テスト目的】: 画像生成数制約範囲の境界値（1と100）での動作保証確認
      // 【テスト内容】: 最小値1と最大値100での保存処理 → 両方で成功することを確認
      // 【期待される動作】: 境界値が確実に有効値として処理され、保存が成功する
      // 🟢 TASK-042要件定義の1-100制約範囲に基づく明確な境界値テスト

      // 【テストデータ準備】: 制約範囲の両端（1と100）の値を用意
      // 【初期条件設定】: 境界値以外は標準的な有効値で設定し、境界値の影響を分離
      // 【前提条件確認】: 1と100は制約範囲内の有効な境界値
      const minBoundarySettings = {
        imageCount: 1, // 最小境界値
        seedMode: 'random' as const,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
        retrySettings: { maxAttempts: 3, baseDelayMs: 1000, factor: 2.0 },
      };

      const maxBoundarySettings = {
        imageCount: 100, // 最大境界値
        seedMode: 'random' as const,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
        retrySettings: { maxAttempts: 3, baseDelayMs: 1000, factor: 2.0 },
      };

      mockChromeStorage.local.set.mockResolvedValue(void 0);
      const settingsUI = new SettingsUI();
      await settingsUI.initialize();

      // 【実際の処理実行】: 最小境界値（1）での保存処理を実行
      // 【処理内容】: 境界値バリデーション → 有効性確認 → ストレージ保存
      // 【実行タイミング】: 最少限生成（1枚）の設定時
      const minResult = await settingsUI.saveSettings(minBoundarySettings);

      // 【実際の処理実行】: 最大境界値（100）での保存処理を実行
      // 【処理内容】: 境界値バリデーション → 有効性確認 → ストレージ保存
      // 【実行タイミング】: 大量生成（100枚）の設定時
      const maxResult = await settingsUI.saveSettings(maxBoundarySettings);

      // 【結果検証】: 両境界値での成功動作を確認
      // 【期待値確認】: 境界値が確実に有効値として判定され、保存処理が成功する
      // 【品質保証】: 極端な条件でもアプリケーションが安定動作することを確認
      expect(minResult.validationResult.isValid).toBe(true); // 【確認内容】: 最小境界値（1）のバリデーション成功確認 🟢
      expect(maxResult.validationResult.isValid).toBe(true); // 【確認内容】: 最大境界値（100）のバリデーション成功確認 🟢
      expect(minResult.storageStatus).toBe('success'); // 【確認内容】: 最小境界値での保存成功確認 🟢
      expect(maxResult.storageStatus).toBe('success'); // 【確認内容】: 最大境界値での保存成功確認 🟢
    });

    test('TC-003-002: リトライ設定の境界値組み合わせテスト', async () => {
      // 【テスト目的】: retrySettings の各パラメータ境界値が独立して正しく判定されることを確認
      // 【テスト内容】: 複数制約パラメータの境界値同時適用 → 個別制約の独立性確認
      // 【期待される動作】: 各制約の境界値が複合的に適用されても、個別に正しく検証される
      // 🟡 TASK-042要件定義から各制約を組み合わせた妥当な推測テストケース

      // 【テストデータ準備】: 各パラメータの制約範囲端を組み合わせた極端な設定
      // 【初期条件設定】: 最少リトライ・最長遅延・最大係数という特殊な組み合わせ
      // 【前提条件確認】: maxAttempts=1, baseDelayMs=5000, factor=3.0 が各々の境界値
      const boundaryRetrySettings = {
        imageCount: 10,
        seedMode: 'random' as const,
        filenameTemplate: '{date}_{prompt}_{seed}_{idx}',
        retrySettings: {
          maxAttempts: 1, // 最小値境界
          baseDelayMs: 5000, // 最大値境界
          factor: 3.0, // 最大値境界
        },
      };

      mockChromeStorage.local.set.mockResolvedValue(void 0);
      const settingsUI = new SettingsUI();
      await settingsUI.initialize();

      // 【実際の処理実行】: 複合境界値でのバリデーションと保存処理を実行
      // 【処理内容】: 各パラメータの個別制約チェック → 複合的な有効性確認 → ストレージ保存
      // 【実行タイミング】: 極端なリトライ設定を適用する特殊な運用要求時
      const result = await settingsUI.saveSettings(boundaryRetrySettings);

      // 【結果検証】: 複数制約パラメータの境界値における独立性と整合性を確認
      // 【期待値確認】: 各制約が相互影響せず、個別境界値が正しく有効判定される
      // 【品質保証】: パラメータ間の相互影響を排除し、個別制約の確実な動作を保証
      expect(result.validationResult.isValid).toBe(true); // 【確認内容】: 複合境界値でのバリデーション成功確認 🟡
      expect(result.storageStatus).toBe('success'); // 【確認内容】: 複合境界値での保存成功確認 🟡
      expect(result.savedSettings.retrySettings).toEqual({
        maxAttempts: 1,
        baseDelayMs: 5000,
        factor: 3.0,
      }); // 【確認内容】: 境界値が正確に保存されることの確認 🟡
    });

    test('TC-003-003: ファイル名テンプレートの最大長境界テスト', async () => {
      // 【テスト目的】: ファイル名テンプレート255文字境界での動作保証確認
      // 【テスト内容】: 最大長255文字のテンプレート文字列での保存処理
      // 【期待される動作】: 最大長255文字で確実に保存・生成が可能である
      // 🟡 TASK-042要件定義とファイルシステム制約からの妥当な推測テストケース

      // 【テストデータ準備】: 255文字の有効なテンプレート文字列を構築
      // 【初期条件設定】: 基本トークン + 226文字の追加文字で255文字に調整
      // 【前提条件確認】: 255文字がファイルシステム制約とTASK-042要件の上限値
      const maxLengthTemplate = '{date}_{prompt}_{seed}_{idx}_' + 'a'.repeat(226); // 合計255文字
      const maxLengthSettings = {
        imageCount: 10,
        seedMode: 'random' as const,
        filenameTemplate: maxLengthTemplate,
        retrySettings: { maxAttempts: 3, baseDelayMs: 1000, factor: 2.0 },
      };

      mockChromeStorage.local.set.mockResolvedValue(void 0);
      const settingsUI = new SettingsUI();
      await settingsUI.initialize();

      // 【実際の処理実行】: 最大長ファイル名テンプレートでの保存処理を実行
      // 【処理内容】: 長さ制約チェック → 有効性確認 → ストレージ保存
      // 【実行タイミング】: 詳細な分類や説明を含む長いテンプレートの利用時
      const result = await settingsUI.saveSettings(maxLengthSettings);

      // 【結果検証】: 最大長境界でのファイル名テンプレート処理の安定性を確認
      // 【期待値確認】: 255文字が確実に有効長として判定され、保存処理が成功する
      // 【品質保証】: ファイルシステム制限ギリギリでの安定動作を保証
      expect(maxLengthTemplate.length).toBe(255); // 【確認内容】: テンプレート文字列が正確に255文字であることの確認 🟢
      expect(result.validationResult.isValid).toBe(true); // 【確認内容】: 最大長でのバリデーション成功確認 🟡
      expect(result.storageStatus).toBe('success'); // 【確認内容】: 最大長での保存成功確認 🟡
      expect(result.savedSettings.filenameTemplate).toBe(maxLengthTemplate); // 【確認内容】: 最大長テンプレートが正確に保存されることの確認 🟡
    });

    test('TC-003-004: 空文字・null・undefined の境界テスト', async () => {
      // 【テスト目的】: 必須フィールドの空値入力に対するエラー処理の確実な動作確認
      // 【テスト内容】: 空文字・null・undefined の各パターンでバリデーションエラー検証
      // 【期待される動作】: 空値で確実にエラーが発生し、適切なエラーメッセージが表示される
      // 🟢 フォームバリデーションの基本要件、TASK-042の必須フィールド仕様に基づく確実なテストケース

      // 【テストデータ準備】: JavaScript のfalsy値パターンを意図的に設定
      // 【初期条件設定】: 各必須フィールドに異なるタイプの空値を適用
      // 【前提条件確認】: これらの値は全て必須フィールドの最小存在条件を満たしていない
      const emptySettings = {
        imageCount: null as any, // null値
        seedMode: 'fixed' as const,
        seedValue: undefined, // undefined（固定シードモード時は必須）
        filenameTemplate: '', // 空文字
        retrySettings: { maxAttempts: 3, baseDelayMs: 1000, factor: 2.0 },
      };

      const settingsUI = new SettingsUI();
      await settingsUI.initialize();

      // 【実際の処理実行】: 空値を含む設定でバリデーション処理を実行
      // 【処理内容】: 必須性チェック → 空値検証 → 各フィールド個別のエラーメッセージ生成
      // 【実行タイミング】: フォーム初期化エラー、ユーザーの意図しない削除、通信エラー時
      const result = await settingsUI.saveSettings(emptySettings);

      // 【結果検証】: 必須フィールドの空値検証が全フィールドで統一的に機能することを確認
      // 【期待値確認】: 空値が確実に無効値として識別され、適切なエラーメッセージが表示される
      // 【品質保証】: 予期しない空値に対する適切なエラーハンドリングとユーザビリティの確保
      expect(result.validationResult.isValid).toBe(false); // 【確認内容】: バリデーション失敗の確認 🟢
      expect(result.validationResult.errors.imageCount).toBe('画像生成数を入力してください'); // 【確認内容】: null値に対するエラーメッセージ確認 🟢
      expect(result.validationResult.errors.seedValue).toBe(
        '固定シードモード時はシード値が必要です'
      ); // 【確認内容】: undefined値に対するエラーメッセージ確認 🟢
      expect(result.validationResult.errors.filenameTemplate).toBe(
        'ファイル名テンプレートは必須です'
      ); // 【確認内容】: 空文字に対するエラーメッセージ確認 🟢
      expect(result.storageStatus).toBe('error'); // 【確認内容】: 保存処理が実行されないことの確認 🟢
    });
  });
});
