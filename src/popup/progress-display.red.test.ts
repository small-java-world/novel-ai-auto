// テストファイル: progress-display.red.test.ts
// TASK-043: 進捗/残枚数/ETA/ログ表示 + キャンセル機能のRedフェーズテスト

import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';
import { ProgressDisplayManager } from './progress-display-manager';
import type { ProgressUpdateMessage, CancelJobMessage, LogEntry } from '../types';

// Chrome Extension API モック
const mockSendMessage = vi.fn();
Object.defineProperty(global, 'chrome', {
  value: {
    runtime: {
      sendMessage: mockSendMessage,
    },
  },
  writable: true,
});

describe('TASK-043: 進捗/残枚数/ETA/ログ表示 + キャンセル機能', () => {
  let progressManager: ProgressDisplayManager;
  let mockProgressBar: HTMLElement;
  let mockStatusText: HTMLElement;
  let mockRemainingCount: HTMLElement;
  let mockEtaDisplay: HTMLElement;
  let mockCancelButton: HTMLButtonElement;
  let mockLogContainer: HTMLElement;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にDOM要素とProgressDisplayManagerを初期化し、一貫したテスト環境を提供
    // 【環境初期化】: 前のテストの影響を受けないよう、全てのモックとDOM要素をクリーンな状態にリセット

    // DOM要素のモック作成
    mockProgressBar = document.createElement('div');
    mockProgressBar.id = 'progress-bar';
    mockProgressBar.style.width = '0%';

    mockStatusText = document.createElement('div');
    mockStatusText.id = 'status-text';

    mockRemainingCount = document.createElement('div');
    mockRemainingCount.id = 'remaining-count';

    mockEtaDisplay = document.createElement('div');
    mockEtaDisplay.id = 'eta-display';

    mockCancelButton = document.createElement('button');
    mockCancelButton.id = 'cancel-button';

    mockLogContainer = document.createElement('div');
    mockLogContainer.id = 'log-container';

    document.body.appendChild(mockProgressBar);
    document.body.appendChild(mockStatusText);
    document.body.appendChild(mockRemainingCount);
    document.body.appendChild(mockEtaDisplay);
    document.body.appendChild(mockCancelButton);
    document.body.appendChild(mockLogContainer);

    // Chrome APIモックのリセット
    mockSendMessage.mockClear();

    // ProgressDisplayManagerインスタンス作成（まだ実装されていないため失敗する）
    progressManager = new ProgressDisplayManager();
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後に作成したDOM要素を削除し、次のテストへの影響を防止
    // 【状態復元】: グローバル状態とDOM状態を元に戻し、テスト間の独立性を保証
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  // TC-043-001: 基本的な進捗表示の更新
  test('PROGRESS_UPDATEメッセージ受信時の進捗表示更新', () => {
    // 【テスト目的】: Service WorkerからのPROGRESS_UPDATEメッセージを受信した際のUI更新処理が正確に動作することを確認
    // 【テスト内容】: 進捗バー、残枚数、ETA、状態表示の同期更新をテスト
    // 【期待される動作】: メッセージ受信から100ms以内にすべてのUI要素が正確に更新される
    // 🟢 信頼性レベル: 要件定義書のメッセージ仕様とNFR-002（500ms周期）に基づく

    // 【テストデータ準備】: 5枚中3枚目を処理中の典型的な進捗状況を模擬し、UI計算ロジックの正確性を検証
    // 【初期条件設定】: 進捗表示が初期状態（0%）であることを確認
    const progressMessage: ProgressUpdateMessage = {
      type: 'PROGRESS_UPDATE',
      currentIndex: 2,
      totalCount: 5,
      status: 'generating',
      eta: 45,
      timestamp: Date.now(),
    };

    // 【実際の処理実行】: updateProgress メソッドを呼び出してUI更新処理を実行
    // 【処理内容】: 進捗データからUI表示値を計算し、各DOM要素に反映する処理
    progressManager.updateProgress(progressMessage);

    // 【結果検証】: UI要素が期待される値で正確に更新されたことを確認
    // 【期待値確認】: NFR-201要件に基づく進捗・残枚数・ETAの明確な表示を検証
    expect(mockProgressBar.style.width).toBe('40%'); // 【確認内容】: 進捗バーが(2/5)*100=40%で表示されることを確認 🟢
    expect(mockRemainingCount.textContent).toBe('残り3枚'); // 【確認内容】: 残枚数が(5-2)=3枚で正確に表示されることを確認 🟢
    expect(mockEtaDisplay.textContent).toBe('約45秒'); // 【確認内容】: ETA表示が受信した45秒で正確に表示されることを確認 🟢
    expect(mockStatusText.textContent).toBe('生成中'); // 【確認内容】: ステータスが'generating'から「生成中」に正しく変換されることを確認 🟢
  });

  // TC-043-002: キャンセルボタンによる処理停止
  test('ユーザーキャンセル操作とCANCEL_JOBメッセージ送信', () => {
    // 【テスト目的】: キャンセルボタン押下時のCANCEL_JOBメッセージ送信とUI状態変更が正確に動作することを確認
    // 【テスト内容】: クリックイベントからメッセージ送信、UI状態更新までの一連の処理をテスト
    // 【期待される動作】: NFR-202要件に基づく1秒以内のキャンセル応答を実現
    // 🟢 信頼性レベル: 要件定義書のCANCEL_JOBメッセージ仕様とNFR-202要件に基づく

    // 【テストデータ準備】: 生成中状態でのキャンセル操作を模擬し、実際のユーザー操作パターンを検証
    // 【初期条件設定】: 進捗管理が生成中状態であることを確認
    const currentJobId = 'test-job-123';
    progressManager.setCurrentJobId(currentJobId);

    // 【実際の処理実行】: キャンセルボタンのクリックイベントを発火してキャンセル処理を実行
    // 【処理内容】: CANCEL_JOBメッセージの構築・送信とUI状態の「キャンセル中」への変更
    mockCancelButton.click();

    // 【結果検証】: CANCEL_JOBメッセージの送信とUI状態変更を確認
    // 【期待値確認】: chrome.runtime.sendMessageが適切なペイロードで呼び出されることを検証
    const expectedCancelMessage: CancelJobMessage = {
      type: 'CANCEL_JOB',
      jobId: currentJobId,
      reason: 'user_requested',
    };

    expect(mockSendMessage).toHaveBeenCalledWith(expectedCancelMessage); // 【確認内容】: 適切なCANCEL_JOBメッセージがService Workerに送信されることを確認 🟢
    expect(mockStatusText.textContent).toBe('キャンセル中...'); // 【確認内容】: UI状態が「キャンセル中」に即座に変更されることを確認 🟢
    expect(mockCancelButton.disabled).toBe(true); // 【確認内容】: キャンセルボタンが無効化され重複処理を防止することを確認 🟢
  });

  // TC-043-003: 完了状態の表示
  test('全画像生成完了時の最終状態表示', () => {
    // 【テスト目的】: 最後の画像生成完了時のcompletedステータス表示が正確に動作することを確認
    // 【テスト内容】: 完了状態での進捗100%、完了メッセージ、処理時間表示をテスト
    // 【期待される動作】: ユーザーに明確な完了通知と総処理時間を提供
    // 🟢 信頼性レベル: 要件定義書の正常フローとNFR-201明確表示要件に基づく

    // 【テストデータ準備】: 5枚の生成が全て完了した最終状態を模擬し、完了処理の正確性を検証
    // 【初期条件設定】: 開始時間を記録して処理時間計算の基準を設定
    const startTime = Date.now() - 120000; // 2分前に開始
    progressManager.setStartTime(startTime);

    const completedMessage: ProgressUpdateMessage = {
      type: 'PROGRESS_UPDATE',
      currentIndex: 4,
      totalCount: 5,
      status: 'completed',
      eta: 0,
      timestamp: Date.now(),
    };

    // 【実際の処理実行】: updateProgress メソッドで完了状態の処理を実行
    // 【処理内容】: 完了状態の検出、総処理時間の計算、UI要素の最終状態への更新
    progressManager.updateProgress(completedMessage);

    // 【結果検証】: 完了状態のUI表示が正確に行われることを確認
    // 【期待値確認】: 100%進捗表示と適切な完了メッセージの表示を検証
    expect(mockProgressBar.style.width).toBe('100%'); // 【確認内容】: 進捗バーが100%で表示されることを確認 🟢
    expect(mockStatusText.textContent).toBe('完了しました'); // 【確認内容】: 完了状態が明確に表示されることを確認 🟢
    expect(mockRemainingCount.textContent).toBe('残り0枚'); // 【確認内容】: 残枚数が0枚で表示されることを確認 🟢
    expect(mockCancelButton.style.display).toBe('none'); // 【確認内容】: キャンセルボタンが非表示になることを確認 🟢
    expect(mockEtaDisplay.textContent).toContain('総処理時間:'); // 【確認内容】: 総処理時間が表示されることを確認 🟡
  });

  // TC-043-004: ログエントリの表示更新
  test('処理ログの動的表示とスクロール管理', () => {
    // 【テスト目的】: 成功・失敗・警告ログの表示と最大5件の管理が正確に動作することを確認
    // 【テスト内容】: 新しいログの追加、古いログの自動削除、ログレベル別表示をテスト
    // 【期待される動作】: ユーザーが処理状況を詳細に把握できるログ管理機能
    // 🟡 信頼性レベル: 要件定義書のログ表示（最大5件）から妥当推測

    // 【テストデータ準備】: 実際の処理中に発生する典型的なログエントリを模擬し、ログ管理機能を検証
    // 【初期条件設定】: ログコンテナが空の状態であることを確認
    const logEntries: LogEntry[] = [
      { type: 'success', message: '画像1をダウンロードしました', timestamp: Date.now() },
      { type: 'warning', message: 'リトライが発生しました', timestamp: Date.now() - 1000 },
      { type: 'error', message: 'ダウンロードに失敗しました', timestamp: Date.now() - 2000 },
    ];

    // 【実際の処理実行】: addLogEntries メソッドでログエントリの追加処理を実行
    // 【処理内容】: ログエントリの追加、HTMLエスケープ処理、最大件数制御
    progressManager.addLogEntries(logEntries);

    // 【結果検証】: ログエントリが正確に表示され管理されることを確認
    // 【期待値確認】: ログレベル別の色分けと適切な件数制限を検証
    const logElements = mockLogContainer.children;
    expect(logElements.length).toBe(3); // 【確認内容】: 3つのログエントリが正確に表示されることを確認 🟢
    expect(logElements[0].textContent).toContain('画像1をダウンロードしました'); // 【確認内容】: 最新のログが最初に表示されることを確認 🟡
    expect(logElements[0].className).toContain('log-success'); // 【確認内容】: successログが適切なCSSクラスを持つことを確認 🟡
    expect(logElements[1].className).toContain('log-warning'); // 【確認内容】: warningログが適切なCSSクラスを持つことを確認 🟡
    expect(logElements[2].className).toContain('log-error'); // 【確認内容】: errorログが適切なCSSクラスを持つことを確認 🟡
  });

  // TC-043-005: メッセージ通信断絶の検出
  test('PROGRESS_UPDATEメッセージが長期間来ない場合の処理', () => {
    // 【テスト目的】: 5秒以上メッセージが受信されない場合の通信断絶検出が正確に動作することを確認
    // 【テスト内容】: タイムアウト検出、エラー表示、再接続ボタン表示をテスト
    // 【期待される動作】: Chrome拡張特有の通信問題に対する適切な検出と回復処理
    // 🟡 信頼性レベル: 要件定義書のエッジケース「メッセージ断絶」から妥当推測

    // 【テストデータ準備】: 通信断絶状況を模擬し、タイムアウト検出機能を検証
    // 【初期条件設定】: 最後のメッセージ受信から5秒経過した状態を設定
    vi.useFakeTimers();

    const initialMessage: ProgressUpdateMessage = {
      type: 'PROGRESS_UPDATE',
      currentIndex: 1,
      totalCount: 5,
      status: 'generating',
      timestamp: Date.now(),
    };

    progressManager.updateProgress(initialMessage);

    // 【実際の処理実行】: 5秒間のタイムアウトを発生させて通信断絶検出を実行
    // 【処理内容】: タイムアウト検出、エラー状態への遷移、再接続UI表示
    vi.advanceTimersByTime(5000);

    // 【結果検証】: 通信断絶が正確に検出され適切な表示が行われることを確認
    // 【期待値確認】: エラーメッセージと再接続オプションの表示を検証
    expect(mockStatusText.textContent).toBe('通信中断'); // 【確認内容】: 通信断絶状態が明確に表示されることを確認 🟡
    expect(document.querySelector('#reconnect-button')).toBeTruthy(); // 【確認内容】: 再接続ボタンが表示されることを確認 🟡

    vi.useRealTimers();
  });

  // TC-043-006: 不正なPROGRESS_UPDATEメッセージの処理
  test('形式不正・データ不整合メッセージのエラーハンドリング', () => {
    // 【テスト目的】: 必須フィールド欠損、型不正、論理的不整合の検出が正確に動作することを確認
    // 【テスト内容】: メッセージバリデーション、エラーログ記録、フォールバック表示をテスト
    // 【期待される動作】: 不正データによるUI破綻とアプリケーションクラッシュを防止
    // 🟡 信頼性レベル: 要件定義書のメッセージ検証要件から妥当推測

    // 【テストデータ準備】: 各種の不正メッセージパターンを模擬し、バリデーション機能を検証
    // 【初期条件設定】: 正常な初期状態から不正メッセージを受信する状況を設定
    const invalidMessages = [
      { type: 'PROGRESS_UPDATE', currentIndex: 'invalid', totalCount: 5 }, // 型不正
      { type: 'PROGRESS_UPDATE', currentIndex: 10, totalCount: 5 }, // 論理的不整合
      { type: 'PROGRESS_UPDATE', currentIndex: 2 }, // 必須フィールド欠損
    ];

    invalidMessages.forEach((invalidMessage, index) => {
      // 【実際の処理実行】: updateProgress メソッドで不正メッセージの処理を実行
      // 【処理内容】: メッセージバリデーション、エラーログ記録、安全なフォールバック
      progressManager.updateProgress(invalidMessage as any);

      // 【結果検証】: 不正メッセージが適切に処理され安全性が保たれることを確認
      // 【期待値確認】: バリデーションエラーログと前回状態の保持を検証
      expect(mockStatusText.textContent).not.toBe(''); // 【確認内容】: UI表示が空白にならないことを確認 🟡
    });
  });

  // TC-043-008: キャンセル処理の競合状態
  test('キャンセル処理中の完了通知受信時の状態整合', () => {
    // 【テスト目的】: CANCEL_JOB送信とPROGRESS_UPDATE(completed)の競合時の状態管理が正確に動作することを確認
    // 【テスト内容】: 競合状態での状態整合性、最終状態の決定をテスト
    // 【期待される動作】: 状態の不整合によるUI表示混乱を防止し論理的一貫性を保持
    // 🟢 信頼性レベル: 要件定義書のキャンセル競合エッジケースに基づく

    // 【テストデータ準備】: キャンセル操作と完了通知の競合状況を模擬し、状態管理の堅牢性を検証
    // 【初期条件設定】: 生成中状態からキャンセル操作を開始
    const jobId = 'test-job-race';
    progressManager.setCurrentJobId(jobId);

    // キャンセル操作を実行
    mockCancelButton.click();

    // 【実際の処理実行】: キャンセル送信直後に完了メッセージを受信する競合状態を実行
    // 【処理内容】: 競合状態の検出、状態優先度の決定、最終状態の確定
    const completedMessage: ProgressUpdateMessage = {
      type: 'PROGRESS_UPDATE',
      currentIndex: 4,
      totalCount: 5,
      status: 'completed',
      timestamp: Date.now(),
    };

    progressManager.updateProgress(completedMessage);

    // 【結果検証】: 競合状態でキャンセル状態が優先されることを確認
    // 【期待値確認】: キャンセル状態の優先と状態の論理的一貫性を検証
    expect(mockStatusText.textContent).toBe('キャンセル済み'); // 【確認内容】: 最終状態がキャンセル済みになることを確認（完了ではない） 🟢
    expect(mockCancelButton.disabled).toBe(true); // 【確認内容】: キャンセルボタンが無効状態を維持することを確認 🟢
  });

  // TC-043-009: 進捗値の境界値テスト
  test('currentIndex・totalCountの境界値での表示確認', () => {
    // 【テスト目的】: 進捗計算の数学的な境界条件での正確性確認
    // 【テスト内容】: 0%、100%、単一画像での進捗計算と表示をテスト
    // 【期待される動作】: 除算エラーや負値表示を回避し全境界値で同一のUI表示ロジックを実現
    // 🟢 信頼性レベル: 数学的計算の境界値として確定

    // 【テストデータ準備】: 進捗計算の数学的境界値を模擬し、計算精度を検証
    // 【初期条件設定】: 各境界値でのUI表示を個別に検証
    const boundaryTests = [
      { currentIndex: 0, totalCount: 5, expectedPercent: '0%', expectedStatus: '開始準備中' },
      { currentIndex: 4, totalCount: 5, expectedPercent: '80%', expectedStatus: '生成中' },
      { currentIndex: 0, totalCount: 1, expectedPercent: '0%', expectedStatus: '開始準備中' },
    ];

    boundaryTests.forEach((test, index) => {
      // 【実際の処理実行】: 各境界値でのupdateProgress処理を実行
      // 【処理内容】: 境界値での進捗計算、パーセンテージ変換、UI反映
      const message: ProgressUpdateMessage = {
        type: 'PROGRESS_UPDATE',
        currentIndex: test.currentIndex,
        totalCount: test.totalCount,
        status: 'generating',
        timestamp: Date.now(),
      };

      progressManager.updateProgress(message);

      // 【結果検証】: 境界値での進捗表示が数学的に正確であることを確認
      // 【期待値確認】: 除算エラー回避と正確なパーセンテージ計算を検証
      expect(mockProgressBar.style.width).toBe(test.expectedPercent); // 【確認内容】: 境界値での進捗バー表示が数学的に正確であることを確認 🟢
    });
  });

  // TC-043-010: ETA値の境界値テスト
  test('推定残り時間の極値での表示確認', () => {
    // 【テスト目的】: 時間表示フォーマットの境界条件での適切性確認
    // 【テスト内容】: 短時間・長時間での時間単位変換と表示をテスト
    // 【期待される動作】: 全時間範囲で読みやすい表示と単位変換の正確性を実現
    // 🟡 信頼性レベル: 一般的な時間表示パターンから妥当推測

    // 【テストデータ準備】: 時間単位の変換境界値を模擬し、表示フォーマットを検証
    // 【初期条件設定】: 各時間境界値での表示フォーマットを個別に検証
    const etaTests = [
      { eta: 0, expected: 'まもなく完了' },
      { eta: 1, expected: '約1秒' },
      { eta: 59, expected: '約59秒' },
      { eta: 60, expected: '約1分' },
      { eta: 3600, expected: '約1時間' },
      { eta: 86400, expected: '約24時間' },
    ];

    etaTests.forEach((test) => {
      // 【実際の処理実行】: 各ETA値でのupdateProgress処理を実行
      // 【処理内容】: ETA値の時間単位変換、適切なフォーマット選択、UI反映
      const message: ProgressUpdateMessage = {
        type: 'PROGRESS_UPDATE',
        currentIndex: 2,
        totalCount: 5,
        status: 'generating',
        eta: test.eta,
        timestamp: Date.now(),
      };

      progressManager.updateProgress(message);

      // 【結果検証】: ETA表示が時間単位に応じて適切にフォーマットされることを確認
      // 【期待値確認】: 単位変換の正確性と表示の一貫性を検証
      expect(mockEtaDisplay.textContent).toBe(test.expected); // 【確認内容】: ETA表示が時間範囲に応じて適切なフォーマットで表示されることを確認 🟡
    });
  });

  // TC-043-012: null・undefined値の堅牢性テスト
  test('PROGRESS_UPDATEメッセージの部分null値処理', () => {
    // 【テスト目的】: JavaScript環境での予期しない値に対する防御の確認
    // 【テスト内容】: null/undefined値での安全なフォールバック処理をテスト
    // 【期待される動作】: 部分的null値でもUI表示が破綻せず予測可能な挙動を実現
    // 🟢 信頼性レベル: JavaScript/TypeScriptの標準的な防御パターンに基づく

    // 【テストデータ準備】: 部分的なnull/undefined値を含むメッセージを模擬し、防御的プログラミングを検証
    // 【初期条件設定】: null値混在状態でのアプリケーション継続動作を確認
    const nullMessage = {
      type: 'PROGRESS_UPDATE',
      currentIndex: null,
      totalCount: 5,
      status: 'generating',
      eta: undefined,
      error: null,
      timestamp: null,
    };

    // 【実際の処理実行】: null値を含むメッセージでのupdateProgress処理を実行
    // 【処理内容】: null値検出、デフォルト値でのフォールバック、安全なUI更新
    progressManager.updateProgress(nullMessage as any);

    // 【結果検証】: null値でもアプリケーションが継続動作し安全な表示が行われることを確認
    // 【期待値確認】: デフォルト値でのフォールバックと部分的情報での最低限表示を検証
    expect(mockProgressBar.style.width).toBe('0%'); // 【確認内容】: null値でもデフォルト進捗(0%)が表示されることを確認 🟢
    expect(mockStatusText.textContent).toBe('生成中'); // 【確認内容】: 有効なstatus値は正しく表示されることを確認 🟢
    expect(mockEtaDisplay.textContent).toBe('計算中...'); // 【確認内容】: eta=undefinedでもフォールバック表示されることを確認 🟡
  });
});