// テストファイル: src/popup/preset-selector.red.test.ts
// 【テストフェーズ】: TDD Red フェーズ（失敗するテスト作成）
// 【対象機能】: TASK-041 プロンプトプリセット読み込み/選択UI
// 【テスト方針】: まだ実装されていないPresetSelector関数群を呼び出して意図的にテストを失敗させる

import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { Preset } from '../config/presets';

// 【対象実装】: まだ存在しない PresetSelector クラス（Red フェーズで意図的に失敗）
// 【設計意図】: プリセット選択UIの責務を単一クラスに集約
import { PresetSelector } from './preset-selector';

describe('プロンプトプリセット読み込み/選択UI', () => {
  let presetSelector: PresetSelector;
  let mockElements: any;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にDOM要素モックとテスト環境を初期化
    // 【環境初期化】: 前のテストの影響を受けないよう、全てのモックをクリーンな状態にリセット
    vi.clearAllMocks();

    // 【DOM要素モック準備】: プリセット選択UIに必要なDOM要素をモック化
    mockElements = {
      promptSelect: {
        innerHTML: '',
        value: '',
        options: [],
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
      },
      searchInput: {
        value: '',
        addEventListener: vi.fn(),
      },
    };

    // 【テスト対象初期化】: PresetSelector インスタンスを作成（Red フェーズで失敗予定）
    presetSelector = new PresetSelector(mockElements);
  });

  test('TC-002: HTMLSelectElementへのプリセット選択肢表示', () => {
    // 【テスト目的】: 読み込んだプリセットがselect要素のoptionとして正しく表示されること
    // 【テスト内容】: loadPresets関数でプリセットデータを渡し、DOM要素に選択肢が生成される処理
    // 【期待される動作】: プリセット名がoption要素のtextContentに設定され、valueにプリセットIDが設定される
    // 🟢 信頼性レベル: popup.html既存構造（promptSelect要素）とテストケース定義書に基づく

    // 【テストデータ準備】: 最小限の有効なプリセットデータで、UI表示の基本動作を確認
    // 【初期条件設定】: プリセット配列には1つの有効なプリセットが含まれ、必須フィールドが全て設定済み
    const mockPresets: Preset[] = [
      {
        name: 'テストプリセット',
        prompt: 'beautiful landscape, scenic view, natural lighting, high quality, detailed',
        negative: 'blurry, low quality, distorted',
        parameters: {
          steps: 28,
          cfgScale: 7,
          sampler: 'euler_a',
        },
      },
    ];

    // 【実際の処理実行】: PresetSelectorのloadPresets関数を呼び出してプリセットをUI要素に読み込む
    // 【処理内容】: 与えられたプリセット配列をselect要素のoption要素として動的に生成し、DOM に追加する
    presetSelector.loadPresets(mockPresets);

    // 【結果検証】: プリセットデータがselect要素に正しく反映されていることを確認
    // 【期待値確認】: option要素が正確に1個生成され、プリセット名とデータが正しく設定されている

    // 【確認内容】: select要素のoption数が期待値（初期option + 読み込みプリセット）と一致 🟢
    expect(mockElements.promptSelect.options).toHaveLength(2); // デフォルト + プリセット1個

    // 【確認内容】: 生成されたoption要素のテキストがプリセット名と一致することを確認 🟢
    expect(mockElements.promptSelect.options[1].textContent).toBe('テストプリセット');

    // 【確認内容】: option要素のvalue属性にプリセットIDが適切に設定されていることを確認 🟢
    expect(mockElements.promptSelect.options[1].value).toBe('0'); // インデックスベースのID
  });

  test('TC-003: プリセット選択後のSTART_GENERATIONメッセージ送信', () => {
    // 【テスト目的】: ユーザーがプリセットを選択して生成ボタン押下時の正常フローを確認
    // 【テスト内容】: プリセット選択→getSelectedPreset→START_GENERATIONメッセージ構築の一連の処理
    // 【期待される動作】: 選択プリセットの内容でSTART_GENERATIONメッセージが正しく構築される
    // 🟢 信頼性レベル: popup.jsの既存START_GENERATIONロジックとmessagingRouterの実装に基づく

    // 【テストデータ準備】: 実際のユーザー操作シナリオを模擬するプリセットと設定データ
    // 【初期条件設定】: プリセットが選択された状態を再現し、設定値も実際の使用例に近い値を設定
    const selectedPreset: Preset = {
      name: '美しい風景',
      prompt: 'beautiful landscape, scenic view, natural lighting, high quality, detailed',
      negative: 'blurry, low quality, distorted',
      parameters: {
        steps: 28,
        cfgScale: 7,
        sampler: 'euler_a',
      },
    };

    const generationSettings = {
      imageCount: 1,
      seed: -1,
      filenameTemplate: '{date}_{prompt}_{idx}',
    };

    // プリセットを読み込んで選択状態を設定
    presetSelector.loadPresets([selectedPreset]);
    mockElements.promptSelect.value = '0'; // 最初のプリセットを選択

    // 【実際の処理実行】: 選択されたプリセットデータを取得し、START_GENERATIONメッセージを構築
    // 【処理内容】: getSelectedPreset関数で現在選択中のプリセットを取得し、buildStartGenerationMessage関数でメッセージを構築
    const selectedPresetData = presetSelector.getSelectedPreset();
    const message = presetSelector.buildStartGenerationMessage(
      selectedPresetData,
      generationSettings
    );

    // 【結果検証】: 構築されたメッセージがSTART_GENERATION規格に準拠し、データが正確であることを確認
    // 【期待値確認】: REQ-006メッセージ通信要件とService Worker連携要件に基づくメッセージ形状

    // 【確認内容】: 選択されたプリセットデータが正確に取得できることを確認 🟢
    expect(selectedPresetData).not.toBeNull();
    expect(selectedPresetData!.name).toBe('美しい風景');

    // 【確認内容】: START_GENERATIONメッセージのtype要素が正しく設定されることを確認 🟢
    expect(message.type).toBe('START_GENERATION');

    // 【確認内容】: プロンプトデータが正確にメッセージに含まれることを確認 🟢
    expect(message.prompt).toBe(
      'beautiful landscape, scenic view, natural lighting, high quality, detailed'
    );

    // 【確認内容】: パラメータが正しくマージされてメッセージに含まれることを確認 🟢
    expect(message.parameters).toEqual({
      steps: 28,
      cfgScale: 7,
      sampler: 'euler_a',
      seed: -1,
      count: 1,
    });

    // 【確認内容】: 設定値が正しくメッセージに含まれることを確認 🟢
    expect(message.settings).toEqual({
      imageCount: 1,
      seed: -1,
      filenameTemplate: '{date}_{prompt}_{idx}',
    });
  });

  test('TC-004: プリセット検索・フィルタ機能', () => {
    // 【テスト目的】: 検索入力による動的フィルタリング機能の正常動作を確認
    // 【テスト内容】: filterPresets関数で検索文字列に基づくプリセット絞り込みとUI更新
    // 【期待される動作】: 検索文字列に部分一致するプリセットのみを選択肢に表示
    // 🟡 信頼性レベル: 要件定義書の検索機能記述から妥当推測（オプション機能として明記）

    // 【テストデータ準備】: 多数のプリセットから目的のものを素早く見つける用途を想定
    // 【初期条件設定】: 名前に「風景」を含むプリセットと含まないプリセットを混在させた配列
    const mockPresets: Preset[] = [
      {
        name: '美しい風景',
        prompt: 'beautiful landscape',
        negative: '',
        parameters: { steps: 28, cfgScale: 7, sampler: 'euler_a' },
      },
      {
        name: 'アニメキャラ',
        prompt: 'anime character',
        negative: '',
        parameters: { steps: 32, cfgScale: 8, sampler: 'euler_a' },
      },
      {
        name: '風景画',
        prompt: 'landscape painting',
        negative: '',
        parameters: { steps: 30, cfgScale: 7.5, sampler: 'dpm_2m' },
      },
    ];

    // プリセットを読み込み
    presetSelector.loadPresets(mockPresets);

    // 【実際の処理実行】: filterPresets関数で「風景」という検索文字列によるフィルタリングを実行
    // 【処理内容】: 検索文字列に部分一致するプリセットのみを抽出し、select要素のoption表示を動的に更新
    presetSelector.filterPresets('風景');

    // 【結果検証】: フィルタリング結果が正確であり、UI表示が適切に更新されることを確認
    // 【期待値確認】: ユーザビリティ向上、大量プリセットでの操作性確保の観点から期待される動作

    // 【確認内容】: フィルタリング結果として「美しい風景」と「風景画」のみが表示されることを確認 🟡
    expect(mockElements.promptSelect.options).toHaveLength(3); // デフォルト + フィルタ結果2個
    expect(mockElements.promptSelect.options[1].textContent).toBe('美しい風景');
    expect(mockElements.promptSelect.options[2].textContent).toBe('風景画');
  });

  test('TC-005: プリセットファイル読み込み失敗時のエラーハンドリング', () => {
    // 【テスト目的】: ファイル欠損、JSON構文エラー、権限不足での読み込み失敗時の適切な処理
    // 【テスト内容】: handleLoadError関数で読み込み失敗時のエラー処理とユーザー通知
    // 【期待される動作】: アプリケーション起動を阻害せず、適切なエラーメッセージと代替手段を提供
    // 🟢 信頼性レベル: presets.tsのloadPresetsFromFile関数エラーハンドリング実装に基づく

    // 【テストデータ準備】: ファイルシステムエラー、手動編集ミス、デプロイ不備を想定した異常データ
    // 【初期条件設定】: プリセット読み込みが失敗した状態を模擬するため、エラーオブジェクトを準備
    const loadError = new Error('プリセットファイルの読み込みに失敗しました');

    // 【実際の処理実行】: handleLoadError関数でファイル読み込み失敗時の処理を実行
    // 【処理内容】: エラーログ出力、代替表示設定、アプリケーション継続動作の保証
    const result = presetSelector.handleLoadError(loadError);

    // 【結果検証】: エラー時でもシステム継続動作を保証し、適切なユーザー体験を提供することを確認
    // 【期待値確認】: 堅牢性の確保とユーザー体験の保護の観点から期待される動作

    // 【確認内容】: エラー処理が完了し、システムが継続動作可能な状態であることを確認 🟢
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('プリセットファイルの読み込みに失敗しました');

    // 【確認内容】: デフォルト表示が設定され、ユーザーに適切な案内が表示されることを確認 🟢
    // 【セキュリティ改善対応】: innerHTML の代わりに options プロパティによる安全なDOM操作を検証
    expect(mockElements.promptSelect.options).toHaveLength(1);
    expect(mockElements.promptSelect.options[0].textContent).toContain(
      'プリセットが見つかりません'
    );

    // 【確認内容】: エラー状態でも他機能には影響しないことを確認 🟢
    expect(result.continueOperation).toBe(true);
  });

  test('TC-008: プリセット数の境界値テスト（1個および50個）', () => {
    // 【テスト目的】: システム性能とUX品質を保証する上限・下限値での動作確認
    // 【テスト内容】: 最小プリセット数（1個）と最大プリセット数（50個）での処理性能とUI表示
    // 【期待される動作】: 極端な条件下でも安定した動作と適切な応答速度を確保
    // 🟢 信頼性レベル: 要件定義書の性能要件（50個程度、<200ms）に基づく

    // 【テストデータ準備】: 最小構成での運用と大規模プリセット集での運用を想定
    // 【初期条件設定】: 境界値（1個、50個）のプリセット配列を動的に生成

    // 最小ケース: 1個のプリセット
    const singlePreset: Preset[] = [
      {
        name: '単一プリセット',
        prompt: 'single preset test',
        negative: '',
        parameters: { steps: 28, cfgScale: 7, sampler: 'euler_a' },
      },
    ];

    // 最大ケース: 50個のプリセット
    const fiftyPresets: Preset[] = Array.from({ length: 50 }, (_, i) => ({
      name: `プリセット${i + 1}`,
      prompt: `test prompt ${i + 1}`,
      negative: '',
      parameters: { steps: 28, cfgScale: 7, sampler: 'euler_a' },
    }));

    // 【実際の処理実行】: loadPresets関数で境界値データの読み込み処理を実行し、処理時間を測定
    // 【処理内容】: 最小・最大プリセット数での読み込み処理とUI更新の性能測定

    // 最小ケースのテスト
    const startTime1 = performance.now();
    presetSelector.loadPresets(singlePreset);
    const endTime1 = performance.now();

    // 【結果検証】: 最小ケース（1個）での処理性能とUI表示の正確性を確認
    // 【期待値確認】: 性能要件の境界での動作保証とシステム安定性の確保

    // 【確認内容】: 最小ケース（1個）で正常な選択・送信動作、UI表示の適切性を確認 🟢
    expect(mockElements.promptSelect.options).toHaveLength(2); // デフォルト + プリセット1個
    expect(endTime1 - startTime1).toBeLessThan(200); // 200ms以内のレスポンス

    // 最大ケースのテスト
    const startTime2 = performance.now();
    presetSelector.loadPresets(fiftyPresets);
    const endTime2 = performance.now();

    // 【確認内容】: 最大ケース（50個）で200ms以内のレスポンス、UI表示崩れなし、メモリ効率性を確認 🟢
    expect(mockElements.promptSelect.options).toHaveLength(51); // デフォルト + プリセット50個
    expect(endTime2 - startTime2).toBeLessThan(200); // 200ms以内のレスポンス
  });
});
