import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  findElementWithFallback,
  ElementType,
  SelectorConfig,
  DOMSelectorError,
  waitForElementWithTimeout,
  validateElementInteractable,
} from './dom-selector-strategy';
import { guardRejection } from '../../test/helpers';

describe('DOM セレクタ戦略とフォールバック', () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にクリーンなDOM環境を初期化し、一貫したテスト条件を保証
    // 【環境初期化】: 前のテストの影響を受けないよう、DOM構造をリセットしてテスト分離を実現
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後にDOM環境とグローバル変数をクリーンアップ
    // 【状態復元】: 次のテストに影響しないよう、グローバルスコープの状態を元に戻す
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('セレクタ解決の優先順位テスト', () => {
    test('プロンプト入力欄: 第1候補が見つかった場合は第1候補を返す', () => {
      // 【テスト目的】: セレクタの優先順位が正しく動作し、第1候補が存在する場合は他を試行せずに返すことを確認
      // 【テスト内容】: 複数のセレクタ候補があるDOM環境で、最も優先度の高いセレクタが選択されることをテスト
      // 【期待される動作】: 第1候補のセレクタにマッチする要素が存在する場合、即座にその要素を返す
      // 🟢 信頼性レベル: 元資料のREQ-105とcontentScript実装パターンに基づく

      // 【テストデータ準備】: NovelAIの複数のプロンプト入力欄パターンを模擬するため複数候補を配置
      // 【初期条件設定】: 第1候補と第2候補の両方が存在する状態でテスト実行
      document.body.innerHTML = `
        <textarea id="prompt-input-v1" class="primary-prompt"></textarea>
        <textarea id="prompt-input-v2" class="fallback-prompt"></textarea>
      `;

      const config: SelectorConfig = {
        selectors: ['#prompt-input-v1', '#prompt-input-v2'],
        timeout: 1000,
      };

      // 【実際の処理実行】: セレクタ戦略の主要機能である優先順位による要素解決を実行
      // 【処理内容】: 設定されたセレクタ配列の順序に従って要素を探索し、最初にマッチした要素を返す
      const result = findElementWithFallback('prompt-input' as ElementType, config);

      // 【結果検証】: 第1候補の要素が正しく選択されたことを確認
      // 【期待値確認】: 第1候補のIDを持つ要素が返され、第2候補は無視されることを検証
      expect(result).not.toBeNull(); // 【確認内容】: 要素が正常に発見されたことを確認 🟢
      expect(result?.id).toBe('prompt-input-v1'); // 【確認内容】: 優先順位の高い第1候補が選択されたことを確認 🟢
    });

    test('プロンプト入力欄: 第1候補が失敗した場合は第2候補を試行', () => {
      // 【テスト目的】: フォールバック機能が正しく動作し、第1候補が見つからない場合に第2候補を試行することを確認
      // 【テスト内容】: 第1候補が存在しないDOM環境で、セレクタが第2候補まで探索を継続することをテスト
      // 【期待される動作】: 第1候補でマッチしない場合、自動的に第2候補以降のセレクタを順次試行
      // 🟢 信頼性レベル: 元資料のREQ-105フォールバック探索要件とcontent.tsの実装パターンに基づく

      // 【テストデータ準備】: 第1候補は存在せず第2候補のみ存在する状況を模擬
      // 【初期条件設定】: フォールバック動作をテストするため、優先セレクタを意図的に欠如させる
      document.body.innerHTML = `
        <textarea id="prompt-input-v2" class="fallback-prompt"></textarea>
      `;

      const config: SelectorConfig = {
        selectors: ['#prompt-input-v1', '#prompt-input-v2'],
        timeout: 1000,
      };

      // 【実際の処理実行】: フォールバック探索機能の動作を検証
      // 【処理内容】: 第1候補で失敗した場合に第2候補への自動切り替えが行われるかを確認
      const result = findElementWithFallback('prompt-input' as ElementType, config);

      // 【結果検証】: フォールバック機能により第2候補が正しく選択されたことを確認
      // 【期待値確認】: 第1候補の失敗後、第2候補が正常に発見されることを検証
      expect(result).not.toBeNull(); // 【確認内容】: フォールバック探索が成功したことを確認 🟢
      expect(result?.id).toBe('prompt-input-v2'); // 【確認内容】: 第2候補が正しく選択されたことを確認 🟢
    });

    test('全セレクタが失敗した場合はnullを返す', () => {
      // 【テスト目的】: 全てのフォールバックセレクタが失敗した場合のエラーハンドリングが適切に動作することを確認
      // 【テスト内容】: 設定されたセレクタ全てにマッチする要素がないDOM環境での動作をテスト
      // 【期待される動作】: 全セレクタ探索後にnullを返し、後続のエラーハンドリングに適切に連携
      // 🟢 信頼性レベル: 元資料のEDGE-001エラーハンドリング要件に基づく

      // 【テストデータ準備】: 設定セレクタにマッチしない異なる構造のDOMを配置
      // 【初期条件設定】: 全てのセレクタが失敗する状況を意図的に作成
      document.body.innerHTML = `
        <div id="different-element">Not a prompt input</div>
      `;

      const config: SelectorConfig = {
        selectors: ['#prompt-input-v1', '#prompt-input-v2'],
        timeout: 1000,
      };

      // 【実際の処理実行】: 全セレクタ失敗時のエラーハンドリング動作を検証
      // 【処理内容】: 全ての設定セレクタを順次試行し、全て失敗した場合の戻り値を確認
      const result = findElementWithFallback('prompt-input' as ElementType, config);

      // 【結果検証】: 全セレクタ失敗時に適切にnullが返されることを確認
      // 【期待値確認】: 要素が見つからない場合の標準的な戻り値としてnullを検証
      expect(result).toBeNull(); // 【確認内容】: 全セレクタ失敗時にnullが返されることを確認 🟢
    });
  });

  describe('タイムアウト時のエラー通知', () => {
    test('設定タイムアウト時間内に要素が見つからない場合はTimeoutErrorを投げる', async () => {
      // 【テスト目的】: タイムアウト機能が正しく動作し、設定時間内に要素が見つからない場合に適切なエラーを発生させることを確認
      // 【テスト内容】: 動的DOM変更をシミュレートし、タイムアウト設定値を超えた場合のエラー処理をテスト
      // 【期待される動作】: 設定タイムアウト時間経過後にTimeoutError例外が発生し、エラー詳細が含まれる
      // 🟡 信頼性レベル: 元資料のEDGE-001要件に基づくが、具体的なタイムアウト値は実装時に決定

      // 【テストデータ準備】: 初期状態では要素が存在しない空のDOM環境を設定
      // 【初期条件設定】: タイムアウト動作をテストするため要素を意図的に配置しない
      document.body.innerHTML = '';

      const config: SelectorConfig = {
        selectors: ['#prompt-input-v1'],
        timeout: 100, // 短いタイムアウトでテスト高速化
      };

      // 【実際の処理実行】: タイムアウト機能付き要素待機処理の実行
      // 【処理内容】: 設定タイムアウト時間内での要素探索とタイムアウトエラー発生を確認
      const promise = guardRejection(
        waitForElementWithTimeout('prompt-input' as ElementType, config)
      );

      // 【結果検証】: タイムアウト時間経過後にTimeoutErrorが発生することを確認
      // 【期待値確認】: 正確なエラータイプと要素タイプ情報が含まれることを検証
      await expect(promise).rejects.toThrow(DOMSelectorError); // 【確認内容】: DOMSelectorError例外が発生することを確認 🟡

      try {
        await promise;
      } catch (error) {
        expect((error as DOMSelectorError).elementType).toBe('prompt-input'); // 【確認内容】: エラーに要素タイプが含まれることを確認 🟡
        expect((error as DOMSelectorError).type).toBe('timeout'); // 【確認内容】: エラータイプがtimeoutであることを確認 🟡
      }
    });

    test('タイムアウトエラーには要素タイプと経過時間が含まれる', async () => {
      // 【テスト目的】: タイムアウトエラーに必要な診断情報が含まれ、デバッグとユーザー通知に活用できることを確認
      // 【テスト内容】: タイムアウト発生時のエラーオブジェクトに含まれる情報の内容と精度をテスト
      // 【期待される動作】: エラーオブジェクトに要素タイプ、経過時間、エラーメッセージが適切に格納される
      // 🟡 信頼性レベル: 元資料のEDGE-001要件に基づくが、エラー情報の詳細仕様は実装時に決定

      // 【テストデータ準備】: タイムアウト情報検証のため空DOM環境と短時間設定を用意
      // 【初期条件設定】: エラー情報の精度を測定するため、測定可能な短いタイムアウト値を設定
      document.body.innerHTML = '';
      const startTime = Date.now();

      const config: SelectorConfig = {
        selectors: ['#generate-button'],
        timeout: 150,
      };

      // 【実際の処理実行】: タイムアウトエラーの詳細情報生成機能を実行
      // 【処理内容】: エラー発生時の時刻測定とエラーオブジェクト内容の検証
      try {
        await waitForElementWithTimeout('generate-button' as ElementType, config);
      } catch (error) {
        const endTime = Date.now();
        const elapsedTime = endTime - startTime;

        // 【結果検証】: タイムアウトエラーに必要な診断情報が全て含まれることを確認
        // 【期待値確認】: 要素タイプ、経過時間、エラーメッセージの内容と精度を検証
        expect(error).toBeInstanceOf(DOMSelectorError); // 【確認内容】: 正しいエラークラスのインスタンスであることを確認 🟡
        expect((error as DOMSelectorError).elementType).toBe('generate-button'); // 【確認内容】: エラーに正しい要素タイプが含まれることを確認 🟡
        expect((error as DOMSelectorError).elapsedTime).toBeGreaterThanOrEqual(config.timeout); // 【確認内容】: 経過時間がタイムアウト設定値以上であることを確認 🟡
        expect((error as DOMSelectorError).message).toContain('generate-button'); // 【確認内容】: エラーメッセージに要素タイプが含まれることを確認 🟡
        expect((error as DOMSelectorError).message).toContain('タイムアウト'); // 【確認内容】: エラーメッセージにタイムアウトの語が含まれることを確認 🟡
      }
    });
  });

  describe('要素の可視性とインタラクタビリティ検証', () => {
    test('要素が存在するが非表示の場合はnullを返す', () => {
      // 【テスト目的】: DOM要素が存在してもユーザーから見えない場合は、操作不可能として適切に判定することを確認
      // 【テスト内容】: CSS display:none や visibility:hidden が設定された要素に対する可視性判定をテスト
      // 【期待される動作】: 非表示要素は操作不可能として扱い、フォールバック探索を継続または失敗処理を実行
      // 🟢 信頼性レベル: 元資料のcontent.tsでoffsetParent !== nullチェックが実装済み

      // 【テストデータ準備】: CSS非表示スタイルが適用された要素を配置して可視性判定をテスト
      // 【初期条件設定】: 要素は存在するが非表示状態を模擬するためdisplay:noneを設定
      document.body.innerHTML = `
        <button id="generate-btn" style="display: none;">Generate</button>
      `;

      const config: SelectorConfig = {
        selectors: ['#generate-btn'],
        timeout: 1000,
      };

      // 【実際の処理実行】: 可視性を含めた要素検証機能の動作を確認
      // 【処理内容】: 要素の存在と可視性の両方を満たす要素のみを有効として判定
      const result = findElementWithFallback('generate-button' as ElementType, config);

      // 【結果検証】: 非表示要素が適切に除外されることを確認
      // 【期待値確認】: 存在するが非表示の要素はnullとして扱われることを検証
      expect(result).toBeNull(); // 【確認内容】: 非表示要素が操作不可能として正しく判定されることを確認 🟢
    });

    test('要素が存在し表示されているが無効化されている場合は警告付きで返す', () => {
      // 【テスト目的】: 要素は表示されているがdisabled状態の場合の適切なハンドリングを確認
      // 【テスト内容】: disabled属性が設定されたフォーム要素に対するインタラクタビリティ判定をテスト
      // 【期待される動作】: 無効化要素は警告付きで返され、後続処理で適切にハンドリングされる
      // 🟡 信頼性レベル: 元資料に具体的記述はないが、UI操作の安定性に必要な機能として推測

      // 【テストデータ準備】: 表示されているが無効化された操作要素を配置
      // 【初期条件設定】: disabled状態のボタン要素でインタラクタビリティ判定をテスト
      document.body.innerHTML = `
        <button id="generate-btn" disabled>Generate</button>
      `;

      const element = document.getElementById('generate-btn');

      // 【実際の処理実行】: 要素の操作可能性検証機能を実行
      // 【処理内容】: 要素の表示状態と操作可能状態の両方を総合的に判定
      const result = validateElementInteractable(element);

      // 【結果検証】: 無効化要素に対する適切な判定結果と警告情報を確認
      // 【期待値確認】: 要素は返されるが操作不可能である旨の情報が含まれることを検証
      expect(result.element).toBe(element); // 【確認内容】: 要素自体は正しく返されることを確認 🟡
      expect(result.isInteractable).toBe(false); // 【確認内容】: 操作不可能として正しく判定されることを確認 🟡
      expect(result.warnings).toContain('disabled'); // 【確認内容】: 警告情報にdisabled状態が含まれることを確認 🟡
    });
  });

  describe('エラーハンドリング要件', () => {
    test('主要要素未検出時にフォールバック探索を行い、最終的に明確なエラーを返す', async () => {
      // 【テスト目的】: REQ-105の主要要件である「想定DOMが取得できない場合のフォールバック探索とエラー通知」を検証
      // 【テスト内容】: 全てのセレクタが失敗した場合の包括的なエラーハンドリング処理をテスト
      // 【期待される動作】: フォールバック探索完了後、ユーザーが理解できる明確なエラーメッセージを生成
      // 🟢 信頼性レベル: 元資料のREQ-105とEDGE-001の中核要件に基づく

      // 【テストデータ準備】: 全てのセレクタがマッチしない状況でエラー処理の完全性をテスト
      // 【初期条件設定】: 意図的に該当要素を配置しない環境でエラーハンドリングを検証
      document.body.innerHTML = `
        <div id="unrelated-content">Different page content</div>
      `;

      const config: SelectorConfig = {
        selectors: [
          '#prompt-textarea-v1',
          '#prompt-input-main',
          '.prompt-field-primary',
          '[data-testid="prompt-input"]',
        ],
        timeout: 200,
      };

      // 【実際の処理実行】: 完全なフォールバック探索とエラー生成プロセスを実行
      // 【処理内容】: 全セレクタの順次試行、タイムアウト処理、最終エラー生成までの一連の流れを確認
      try {
        await waitForElementWithTimeout('prompt-input' as ElementType, config);
        // 【結果検証】: ここに到達した場合はテスト失敗（エラーが発生すべき状況）
        expect(true).toBe(false); // 【確認内容】: エラーが発生しなかった場合のテスト失敗を明示 🟢
      } catch (error) {
        // 【期待値確認】: エラーオブジェクトの内容と構造が要件を満たすことを検証
        expect(error).toBeInstanceOf(DOMSelectorError); // 【確認内容】: 適切なエラークラスであることを確認 🟢
        expect((error as DOMSelectorError).elementType).toBe('prompt-input'); // 【確認内容】: エラーに要素タイプが含まれることを確認 🟢
        expect((error as DOMSelectorError).attemptedSelectors).toHaveLength(4); // 【確認内容】: 全セレクタが試行されたことを確認 🟢
        expect((error as DOMSelectorError).message).toContain('フォールバック探索'); // 【確認内容】: エラーメッセージにフォールバック探索の語が含まれることを確認 🟢
        expect((error as DOMSelectorError).message).toContain('prompt-input'); // 【確認内容】: エラーメッセージに要素タイプが含まれることを確認 🟢
      }
    });
  });

  describe('パフォーマンス要件', () => {
    test('単一要素の探索は500ms以内で完了する', async () => {
      // 【テスト目的】: NFR-002の進捗更新間隔500ms要件に準拠し、DOM探索がパフォーマンス要件を満たすことを確認
      // 【テスト内容】: 要素が存在する通常ケースでの探索処理時間をベンチマークテスト
      // 【期待される動作】: 要素発見処理が500ms以内で完了し、全体の応答性を損なわない
      // 🟡 信頼性レベル: NFR-002から推定される性能要件だが、具体的な探索時間制限は実装時に調整

      // 【テストデータ準備】: パフォーマンス測定のため即座に発見可能な要素を配置
      // 【初期条件設定】: 最適なケースでの処理時間をベースラインとして測定
      document.body.innerHTML = `
        <textarea id="prompt-input">Test prompt</textarea>
      `;

      const config: SelectorConfig = {
        selectors: ['#prompt-input'],
        timeout: 5000,
      };

      const startTime = Date.now();

      // 【実際の処理実行】: 要素探索処理の実行時間を測定
      // 【処理内容】: 標準的な要素探索処理の性能特性を確認
      const result = findElementWithFallback('prompt-input' as ElementType, config);

      const endTime = Date.now();
      const elapsedTime = endTime - startTime;

      // 【結果検証】: 要素発見成功と処理時間が性能要件を満たすことを確認
      // 【期待値確認】: 機能的成功と性能的成功の両方を満たすことを検証
      expect(result).not.toBeNull(); // 【確認内容】: 要素が正常に発見されたことを確認 🟡
      expect(elapsedTime).toBeLessThan(500); // 【確認内容】: 処理時間が500ms未満であることを確認 🟡
    });
  });
});
