/**
 * 【テストファイル】: Image URL Extraction（画像URL抽出）のテストケース
 * 【TDDフェーズ】: Red - 失敗するテストを作成
 * 【テスト目的】: NovelAI生成完了後の画像URL抽出機能をテスト
 * 【改善内容】: 実装前のテストファーストアプローチで品質を担保
 * 【設計方針】: Given-When-Then パターンによる分かりやすいテスト構造
 * 【パフォーマンス】: DOM操作の効率性とメモリ管理をテスト
 * 【保守性】: 各テストケースの独立性と再利用性を重視
 * 🟢 信頼性レベル: 要件定義書(REQ-004)とタスク定義に基づく実装
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImageUrlExtractor } from './image-url-extractor';

describe('Image URL Extraction（画像URL抽出）', () => {
  let imageUrlExtractor: ImageUrlExtractor;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にDOM環境を初期化し、一貫したテスト条件を保証
    // 【環境初期化】: 前のテストの影響を受けないよう、DOM状態をクリーンにリセット
    document.body.innerHTML = '';
    imageUrlExtractor = new ImageUrlExtractor();

    // 【Chrome APIモック】: テスト環境でのChrome runtime API動作を模擬
    // 【メッセージング準備】: IMAGE_READYメッセージ送信のテストを可能にする
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
      },
    } as any;
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後に作成されたDOM要素やモックを削除
    // 【状態復元】: 次のテストに影響しないよう、DOM状態とモックを元の状態に戻す
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('URL抽出と重複削除', () => {
    test('生成された画像URLを正常に抽出できる', async () => {
      // 【テスト目的】: NovelAIのギャラリーまたは完了要素から画像URLを抽出する機能を確認
      // 【テスト内容】: DOM内の画像要素から有効なURLを抽出し、配列として返却する処理をテスト
      // 【期待される動作】: 画像要素のsrc属性値が正しく抽出され、有効なURL配列として返される
      // 🟢 信頼性レベル: 要件定義書REQ-004の画像ダウンロード機能に基づく

      // 【テストデータ準備】: NovelAIの画像ギャラリーを模したDOM構造を用意し、抽出対象のURLを設定
      // 【初期条件設定】: 画像生成完了後のギャラリー状態を再現するため、複数の画像要素を配置
      document.body.innerHTML = `
        <div class="novelai-gallery">
          <img src="https://novelai.net/image1.png" alt="Generated Image 1" />
          <img src="https://novelai.net/image2.png" alt="Generated Image 2" />
          <img src="https://novelai.net/image3.png" alt="Generated Image 3" />
        </div>
      `;

      // 【実際の処理実行】: ImageUrlExtractorのextractImageUrls機能を呼び出してURL抽出を実行
      // 【処理内容】: DOM内の画像要素を検索し、src属性からURL一覧を抽出する処理を実行
      const urls = await imageUrlExtractor.extractImageUrls();

      // 【結果検証】: 抽出されたURL配列が期待される形式と内容であることを確認
      // 【期待値確認】: 3つの画像URLが正しく抽出され、順序も保持されていることを検証
      expect(urls).toEqual([
        'https://novelai.net/image1.png',
        'https://novelai.net/image2.png',
        'https://novelai.net/image3.png',
      ]); // 【確認内容】: 抽出されたURL配列の内容と順序が期待値と一致することを確認 🟢

      expect(urls).toHaveLength(3); // 【確認内容】: 抽出されたURL数が期待される3つであることを確認 🟢
    });

    test('重複したURLを削除して一意のURL配列を返す', async () => {
      // 【テスト目的】: 複数の画像要素に同じURLが含まれている場合の重複除去機能を確認
      // 【テスト内容】: 同一のURL文字列を持つ画像要素が複数存在する場合、重複を削除して一意のURLのみを返す処理をテスト
      // 【期待される動作】: 重複したURLは除去され、ユニークなURL配列のみが返却される
      // 🟢 信頼性レベル: タスク定義の「重複削除」要件に基づく実装

      // 【テストデータ準備】: 意図的に重複URLを含む画像要素を配置して重複削除機能をテスト
      // 【初期条件設定】: 同じURLを持つ画像要素を複数配置し、重複削除処理の必要性を作り出す
      document.body.innerHTML = `
        <div class="novelai-gallery">
          <img src="https://novelai.net/image1.png" alt="Generated Image 1" />
          <img src="https://novelai.net/image2.png" alt="Generated Image 2" />
          <img src="https://novelai.net/image1.png" alt="Duplicate Image 1" />
          <img src="https://novelai.net/image3.png" alt="Generated Image 3" />
          <img src="https://novelai.net/image2.png" alt="Duplicate Image 2" />
        </div>
      `;

      // 【実際の処理実行】: 重複URLを含むDOM構造でURL抽出処理を実行
      // 【処理内容】: 画像要素から抽出したURLの重複を除去し、ユニークなURL配列を生成する処理を実行
      const urls = await imageUrlExtractor.extractImageUrls();

      // 【結果検証】: 重複が除去され、ユニークなURL配列のみが返されることを確認
      // 【期待値確認】: 重複したURLが削除され、3つのユニークなURLのみが残ることを検証
      expect(urls).toEqual([
        'https://novelai.net/image1.png',
        'https://novelai.net/image2.png',
        'https://novelai.net/image3.png',
      ]); // 【確認内容】: 重複除去後のURL配列が期待される内容と一致することを確認 🟢

      expect(urls).toHaveLength(3); // 【確認内容】: 重複除去により5個の画像要素から3個のユニークURLが抽出されることを確認 🟢
    });

    test('無効なURLや空のsrc属性を除外する', async () => {
      // 【テスト目的】: 無効なURL文字列や空のsrc属性を持つ画像要素から、有効なURLのみを抽出する機能を確認
      // 【テスト内容】: 空文字列、相対パス、無効な形式のURLを含む画像要素群から、有効なHTTPS URLのみを抽出する処理をテスト
      // 【期待される動作】: 有効なURL形式（https://で始まる）のみが抽出され、無効なURLは無視される
      // 🟢 信頼性レベル: セキュリティ要件とURL検証のベストプラクティスに基づく

      // 【テストデータ準備】: 意図的に無効なURLや空のsrc属性を持つ画像要素を配置してフィルタリング機能をテスト
      // 【初期条件設定】: 有効なURLと無効なURLを混在させ、適切なフィルタリング処理の必要性を作り出す
      document.body.innerHTML = `
        <div class="novelai-gallery">
          <img src="https://novelai.net/valid-image1.png" alt="Valid Image 1" />
          <img src="" alt="Empty src" />
          <img src="/relative/path/image.png" alt="Relative path" />
          <img src="invalid-url" alt="Invalid URL" />
          <img src="https://novelai.net/valid-image2.png" alt="Valid Image 2" />
          <img alt="No src attribute" />
        </div>
      `;

      // 【実際の処理実行】: 無効なURLを含むDOM構造でURL抽出とフィルタリング処理を実行
      // 【処理内容】: 画像要素のsrc属性から有効なURL形式のみを抽出し、無効なものは除外する処理を実行
      const urls = await imageUrlExtractor.extractImageUrls();

      // 【結果検証】: 有効なHTTPS URLのみが抽出され、無効なURLや空文字列は除外されることを確認
      // 【期待値確認】: 6個の画像要素から有効な2個のHTTPS URLのみが抽出されることを検証
      expect(urls).toEqual([
        'https://novelai.net/valid-image1.png',
        'https://novelai.net/valid-image2.png',
      ]); // 【確認内容】: 有効なHTTPS URLのみが抽出され、無効なURLは除外されることを確認 🟢

      expect(urls).toHaveLength(2); // 【確認内容】: 6個の画像要素から2個の有効URLのみが抽出されることを確認 🟢
    });
  });

  describe('順序管理', () => {
    test('複数画像生成時に正しい順序でURLを返す', async () => {
      // 【テスト目的】: 複数の画像が生成された場合、DOM内の表示順序と一致する順序でURLを抽出する機能を確認
      // 【テスト内容】: DOM内の画像要素の並び順を保持したまま、URL配列として返却する処理をテスト
      // 【期待される動作】: 画像要素のDOM内順序が、抽出されるURL配列の順序として正確に反映される
      // 🟢 信頼性レベル: タスク定義の「順序管理」要件に基づく実装

      // 【テストデータ準備】: 明確な順序を持つ画像要素を配置して順序保持機能をテスト
      // 【初期条件設定】: DOM内での配置順序が明確に分かるよう、番号付きのファイル名を持つ画像要素を順番に配置
      document.body.innerHTML = `
        <div class="novelai-gallery">
          <img src="https://novelai.net/image-001.png" alt="First Generated Image" />
          <img src="https://novelai.net/image-002.png" alt="Second Generated Image" />
          <img src="https://novelai.net/image-003.png" alt="Third Generated Image" />
          <img src="https://novelai.net/image-004.png" alt="Fourth Generated Image" />
        </div>
      `;

      // 【実際の処理実行】: 順序を持つ画像要素群からURL抽出処理を実行
      // 【処理内容】: DOM内の画像要素を順序通りに検索し、配置順序を保持したURL配列を生成する処理を実行
      const urls = await imageUrlExtractor.extractImageUrls();

      // 【結果検証】: 抽出されたURL配列の順序がDOM内の画像要素順序と一致することを確認
      // 【期待値確認】: 4つのURLがDOM内の配置順序と同じ順序で配列に格納されていることを検証
      expect(urls).toEqual([
        'https://novelai.net/image-001.png',
        'https://novelai.net/image-002.png',
        'https://novelai.net/image-003.png',
        'https://novelai.net/image-004.png',
      ]); // 【確認内容】: URL配列の順序がDOM内の画像要素の配置順序と完全に一致することを確認 🟢

      expect(urls[0]).toBe('https://novelai.net/image-001.png'); // 【確認内容】: 最初の要素が期待される最初の画像URLであることを確認 🟢
      expect(urls[3]).toBe('https://novelai.net/image-004.png'); // 【確認内容】: 最後の要素が期待される最後の画像URLであることを確認 🟢
    });

    test('指定された数の画像URLのみを順序通りに返す', async () => {
      // 【テスト目的】: 生成画像数の上限指定機能により、指定された数のURLのみを順序通りに抽出する機能を確認
      // 【テスト内容】: DOM内に多数の画像要素が存在する場合、指定された最大数までのURLを順序を保って抽出する処理をテスト
      // 【期待される動作】: 指定された数（maxCount）を超えない範囲で、DOM順序通りのURL配列が返却される
      // 🟢 信頼性レベル: 画像生成数制限のユーザビリティ要件に基づく実装

      // 【テストデータ準備】: 抽出上限を超える数の画像要素を配置して数量制限機能をテスト
      // 【初期条件設定】: 5個の画像要素を配置し、3個までの抽出上限を設定して制限機能の動作を確認
      document.body.innerHTML = `
        <div class="novelai-gallery">
          <img src="https://novelai.net/image-1.png" alt="Image 1" />
          <img src="https://novelai.net/image-2.png" alt="Image 2" />
          <img src="https://novelai.net/image-3.png" alt="Image 3" />
          <img src="https://novelai.net/image-4.png" alt="Image 4" />
          <img src="https://novelai.net/image-5.png" alt="Image 5" />
        </div>
      `;

      // 【実際の処理実行】: 最大3個のURL抽出制限を設定してURL抽出処理を実行
      // 【処理内容】: DOM内の最初の3個の画像要素のみからURLを抽出し、残りの要素は無視する処理を実行
      const urls = await imageUrlExtractor.extractImageUrls(3);

      // 【結果検証】: 指定された数（3個）のURLのみが順序通りに抽出されることを確認
      // 【期待値確認】: 5個の画像要素から最初の3個のURLのみが順序を保って抽出されることを検証
      expect(urls).toEqual([
        'https://novelai.net/image-1.png',
        'https://novelai.net/image-2.png',
        'https://novelai.net/image-3.png',
      ]); // 【確認内容】: 指定上限数（3個）のURLが順序通りに抽出されることを確認 🟢

      expect(urls).toHaveLength(3); // 【確認内容】: 抽出されたURL数が指定上限数（3個）と一致することを確認 🟢
      expect(urls).not.toContain('https://novelai.net/image-4.png'); // 【確認内容】: 上限を超えた4番目以降の画像URLが含まれていないことを確認 🟢
    });
  });

  describe('エラーハンドリング', () => {
    test('画像要素が見つからない場合は空配列を返す', async () => {
      // 【テスト目的】: NovelAIのギャラリー要素や画像要素が存在しない場合の適切なエラーハンドリングを確認
      // 【テスト内容】: DOM内に画像要素が全く存在しない場合、エラーを発生させずに空配列を返却する処理をテスト
      // 【期待される動作】: 画像要素の不在時にエラーを投げることなく、空の配列を正常な戻り値として返す
      // 🟢 信頼性レベル: 異常系処理のベストプラクティスに基づく実装

      // 【テストデータ準備】: 意図的に画像要素を含まないDOM構造を用意してエラーハンドリングをテスト
      // 【初期条件設定】: ギャラリー要素は存在するが画像要素が全く含まれていない状態を再現
      document.body.innerHTML = `
        <div class="novelai-gallery">
          <p>No images generated yet.</p>
          <div class="loading-spinner"></div>
        </div>
      `;

      // 【実際の処理実行】: 画像要素が存在しないDOM構造でURL抽出処理を実行
      // 【処理内容】: 画像要素の検索を試行し、見つからない場合のエラーハンドリング処理を実行
      const urls = await imageUrlExtractor.extractImageUrls();

      // 【結果検証】: エラーが発生せず、空配列が返されることを確認
      // 【期待値確認】: 画像要素不在時に例外を投げることなく、長さ0の配列が返されることを検証
      expect(urls).toEqual([]); // 【確認内容】: 画像要素が存在しない場合に空配列が返されることを確認 🟢
      expect(urls).toHaveLength(0); // 【確認内容】: 返される配列の長さが0であることを確認 🟢
    });

    test('DOM解析エラー時に適切なエラーメッセージで例外を投げる', async () => {
      // 【テスト目的】: DOM解析中の予期しないエラーに対する適切な例外処理を確認
      // 【テスト内容】: querySelector等のDOM操作でエラーが発生した場合、意味のあるエラーメッセージで例外を投げる処理をテスト
      // 【期待される動作】: DOM解析エラー時に、元のエラー情報を含む詳細なエラーメッセージで例外が投げられる
      // 🟡 信頼性レベル: DOM操作エラーの発生パターンは推測を含むが一般的な異常系処理

      // 【テストデータ準備】: DOM操作でエラーが発生しやすい状況を人工的に作り出してエラーハンドリングをテスト
      // 【初期条件設定】: querySelectorにエラーを発生させるモックを設定し、DOM解析エラーを強制的に発生させる
      const originalQuerySelector = document.querySelector;
      document.querySelector = vi.fn().mockImplementation(() => {
        throw new Error('DOM access denied');
      });

      // 【実際の処理実行】: DOM解析エラーが発生する状況でURL抽出処理を実行
      // 【処理内容】: DOM要素検索時にエラーが発生し、それを適切に捕捉して例外として再投げする処理を実行

      // 【結果検証】: 適切なエラーメッセージで例外が投げられることを確認
      // 【期待値確認】: DOM解析エラーを示すメッセージと元のエラー情報を含む例外が投げられることを検証
      await expect(imageUrlExtractor.extractImageUrls()).rejects.toThrow(
        'DOM解析中にエラーが発生しました'
      ); // 【確認内容】: DOM解析エラー時に適切なエラーメッセージで例外が投げられることを確認 🟡

      // 【後処理】: テスト用にモックしたDOM操作を元の状態に復元
      document.querySelector = originalQuerySelector;
    });

    test('URLタイムアウト時に適切なエラーハンドリングを行う', async () => {
      // 【テスト目的】: URL抽出処理が指定時間内に完了しない場合のタイムアウト処理を確認
      // 【テスト内容】: DOM検索や画像URL抽出処理が長時間応答しない場合、適切にタイムアウトエラーを発生させる処理をテスト
      // 【期待される動作】: 指定されたタイムアウト時間を超えた場合、処理を中断してタイムアウトエラーを投げる
      // 🟡 信頼性レベル: タイムアウト処理は実装上の推測を含むが一般的な非同期処理パターン

      // 【テストデータ準備】: タイムアウトが発生しやすい状況を作り出してタイムアウト処理をテスト
      // 【初期条件設定】: 通常の画像要素を配置しつつ、処理時間のタイムアウト制限を短く設定
      document.body.innerHTML = `
        <div class="novelai-gallery">
          <img src="https://novelai.net/timeout-test-image.png" alt="Timeout Test Image" />
        </div>
      `;

      // 【実際の処理実行】: 極短いタイムアウト設定でURL抽出処理を実行
      // 【処理内容】: 1ms のタイムアウト設定により、正常な処理でも意図的にタイムアウトを発生させる処理を実行

      // 【結果検証】: タイムアウト時に適切なエラーメッセージで例外が投げられることを確認
      // 【期待値確認】: 指定タイムアウト時間内に処理が完了せず、タイムアウトエラーが発生することを検証
      await expect(imageUrlExtractor.extractImageUrls(undefined, 1)).rejects.toThrow(
        'URL抽出処理がタイムアウトしました'
      ); // 【確認内容】: タイムアウト時に適切なエラーメッセージで例外が投げられることを確認 🟡
    });
  });

  describe('GenerationMonitorとの統合', () => {
    test('生成完了時にIMAGE_READYメッセージを送信する', async () => {
      // 【テスト目的】: URL抽出完了後にService WorkerへのIMAGE_READYメッセージ送信機能を確認
      // 【テスト内容】: 画像URL抽出が成功した場合、各URLについてIMAGE_READYメッセージを適切な形式で送信する処理をテスト
      // 【期待される動作】: 抽出されたURLごとにjobId、url、index、fileNameを含むメッセージが送信される
      // 🟢 信頼性レベル: メッセージ形式定義(messages.ts)とGenerationMonitor統合要件に基づく実装

      // 【テストデータ準備】: IMAGE_READYメッセージ送信をテストするため画像要素とジョブ情報を設定
      // 【初期条件設定】: 2個の画像要素を配置し、特定のjobIdでURL抽出とメッセージ送信を実行
      document.body.innerHTML = `
        <div class="novelai-gallery">
          <img src="https://novelai.net/test-image-1.png" alt="Test Image 1" />
          <img src="https://novelai.net/test-image-2.png" alt="Test Image 2" />
        </div>
      `;

      const jobId = 'test-job-123';
      const expectedFileName1 = '2025-09-16_test-prompt_seed123_001.png';
      const expectedFileName2 = '2025-09-16_test-prompt_seed123_002.png';

      // 【実際の処理実行】: ジョブIDとファイル名テンプレートを指定してURL抽出とメッセージ送信を実行
      // 【処理内容】: 画像URL抽出後、各URLについてIMAGE_READYメッセージを生成してChrome runtime APIで送信する処理を実行
      await imageUrlExtractor.extractAndNotifyImageUrls(jobId, {
        date: '2025-09-16',
        prompt: 'test-prompt',
        seed: 'seed123',
      });

      // 【結果検証】: 期待される形式のIMAGE_READYメッセージが正しい回数送信されることを確認
      // 【期待値確認】: 2個の画像URLについて、それぞれ適切なペイロード形式でメッセージが送信されることを検証
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2); // 【確認内容】: 2個の画像に対して2回のメッセージ送信が行われることを確認 🟢

      expect(chrome.runtime.sendMessage).toHaveBeenNthCalledWith(1, {
        type: 'IMAGE_READY',
        payload: {
          jobId: jobId,
          url: 'https://novelai.net/test-image-1.png',
          index: 0,
          fileName: expectedFileName1,
        },
      }); // 【確認内容】: 1番目の画像に対する適切なIMAGE_READYメッセージが送信されることを確認 🟢

      expect(chrome.runtime.sendMessage).toHaveBeenNthCalledWith(2, {
        type: 'IMAGE_READY',
        payload: {
          jobId: jobId,
          url: 'https://novelai.net/test-image-2.png',
          index: 1,
          fileName: expectedFileName2,
        },
      }); // 【確認内容】: 2番目の画像に対する適切なIMAGE_READYメッセージが送信されることを確認 🟢
    });

    test('ファイル名テンプレートが正しく適用される', async () => {
      // 【テスト目的】: 画像ファイル名生成時のテンプレート適用機能を確認
      // 【テスト内容】: 日付、プロンプト、シード、インデックスを含むファイル名テンプレートが正しく適用されてファイル名が生成される処理をテスト
      // 【期待される動作】: {date}_{prompt}_{seed}_{idx}形式のテンプレートが各パラメータで置換され、適切なファイル名が生成される
      // 🟢 信頼性レベル: ファイル名テンプレート仕様とファイル名サニタイゼーション要件に基づく実装

      // 【テストデータ準備】: ファイル名テンプレート機能をテストするため特定のパラメータを設定
      // 【初期条件設定】: 1個の画像要素を配置し、特殊文字を含むプロンプトでファイル名生成をテスト
      document.body.innerHTML = `
        <div class="novelai-gallery">
          <img src="https://novelai.net/special-image.png" alt="Special Image" />
        </div>
      `;

      const jobId = 'filename-test-job';
      const templateParams = {
        date: '2025-09-16',
        prompt: 'fantasy-character/with:special*chars',
        seed: 'abc123def',
      };

      // 【実際の処理実行】: 特殊文字を含むパラメータでファイル名テンプレート適用処理を実行
      // 【処理内容】: ファイル名テンプレートに各パラメータを適用し、無効文字のサニタイゼーションを行う処理を実行
      await imageUrlExtractor.extractAndNotifyImageUrls(jobId, templateParams);

      // 【結果検証】: 特殊文字がサニタイゼーションされ、適切な形式のファイル名が生成されることを確認
      // 【期待値確認】: 特殊文字（/, :, *）がアンダースコアに置換され、安全なファイル名が生成されることを検証
      const expectedFileName = '2025-09-16_fantasy-character_with_special_chars_abc123def_001.png';

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'IMAGE_READY',
        payload: {
          jobId: jobId,
          url: 'https://novelai.net/special-image.png',
          index: 0,
          fileName: expectedFileName,
        },
      }); // 【確認内容】: 特殊文字がサニタイゼーションされた適切なファイル名でメッセージが送信されることを確認 🟢
    });

    test('Chrome runtime APIが利用できない場合のエラーハンドリング', async () => {
      // 【テスト目的】: Chrome Extension環境外でのAPIアクセスエラーに対する適切なエラーハンドリングを確認
      // 【テスト内容】: chrome.runtime.sendMessageが利用できない環境で、エラーを適切に処理してメッセージ送信を安全に失敗させる処理をテスト
      // 【期待される動作】: Chrome API不在時にエラーを投げることなく、適切な警告ログを出力して処理を継続する
      // 🟢 信頼性レベル: Chrome Extension外環境でのロバストネス要件に基づく実装

      // 【テストデータ準備】: Chrome runtime APIが利用できない環境を模擬してエラーハンドリングをテスト
      // 【初期条件設定】: chrome オブジェクトを undefined に設定し、API不在状況を再現
      global.chrome = undefined;

      document.body.innerHTML = `
        <div class="novelai-gallery">
          <img src="https://novelai.net/test-image.png" alt="Test Image" />
        </div>
      `;

      const jobId = 'api-error-test-job';

      // 【実際の処理実行】: Chrome runtime API不在環境でURL抽出とメッセージ送信処理を実行
      // 【処理内容】: Chrome API呼び出し時のエラーを適切に捕捉し、例外を投げずに処理を継続する処理を実行

      // 【結果検証】: Chrome API不在時にエラーが投げられることなく、正常に処理が完了することを確認
      // 【期待値確認】: API利用不可時に例外を投げることなく、適切な警告処理で継続されることを検証
      await expect(
        imageUrlExtractor.extractAndNotifyImageUrls(jobId, {
          date: '2025-09-16',
          prompt: 'test-prompt',
          seed: 'test-seed',
        })
      ).resolves.not.toThrow(); // 【確認内容】: Chrome API不在時に例外が投げられず、正常に処理が完了することを確認 🟢
    });
  });
});
