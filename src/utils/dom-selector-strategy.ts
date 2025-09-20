// DOM セレクタ戦略とフォールバック機能の型定義
// このファイルはTASK-020の実装完了時に実装される予定です

/**
 * サポートされる要素タイプの列挙
 * NovelAI UI の主要な操作要素を識別するためのタイプ
 */
export type ElementType =
  | 'prompt-input' // プロンプト入力欄
  | 'negative-input' // ネガティブプロンプト入力欄
  | 'generate-button' // 生成開始ボタン
  | 'seed-input' // シード値入力欄
  | 'steps-input' // ステップ数入力欄
  | 'sampler-select' // サンプラー選択
  | 'cfg-scale-input' // CFGスケール入力欄
  | 'count-input' // 生成枚数入力欄
  | 'progress-indicator' // 進捗表示要素
  | 'image-gallery'; // 生成画像ギャラリー

/**
 * セレクタ設定オブジェクト
 * 要素探索の動作を制御するための設定
 */
export interface SelectorConfig {
  /** 優先順位順のセレクタ配列 */
  selectors: string[];
  /** タイムアウト時間（ミリ秒） */
  timeout: number;
  /** リトライ設定（オプション） */
  retry?: {
    maxAttempts: number;
    baseDelay: number;
    multiplier: number;
  };
}

/**
 * 要素検証結果オブジェクト
 * 要素の操作可能性を示す結果
 */
export interface ElementValidationResult {
  /** 発見された要素 */
  element: HTMLElement | null;
  /** 操作可能かどうか */
  isInteractable: boolean;
  /** 警告メッセージ配列 */
  warnings: string[];
}

/**
 * DOM セレクタエラークラス
 * 要素探索失敗時の詳細情報を含むエラー
 */
export class DOMSelectorError extends Error {
  public readonly elementType: ElementType;
  public readonly type: 'timeout' | 'not-found' | 'not-interactable';
  public readonly attemptedSelectors: string[];
  public readonly elapsedTime: number;

  constructor(
    message: string,
    elementType: ElementType,
    type: 'timeout' | 'not-found' | 'not-interactable',
    attemptedSelectors: string[],
    elapsedTime: number
  ) {
    super(message);
    this.name = 'DOMSelectorError';
    this.elementType = elementType;
    this.type = type;
    this.attemptedSelectors = attemptedSelectors;
    this.elapsedTime = elapsedTime;
  }
}

/**
 * 【エラーメッセージ定数】: 構造化されたエラーメッセージの管理
 * 【保守性向上】: エラーメッセージの一元管理と将来的な国際化対応
 * 【設計方針】: 診断情報を含む詳細なエラーメッセージを関数で生成
 * 🟡 信頼性レベル: 元資料のエラーハンドリング要件を構造化して実装
 */
const ErrorMessages = {
  /**
   * 【タイムアウトエラー】: 要素探索タイムアウト時のメッセージ生成
   * @param elementType 探索対象の要素タイプ
   * @param elapsedTime 経過時間（ミリ秒）
   * @returns 構造化されたエラーメッセージ
   */
  TIMEOUT_ERROR: (elementType: ElementType, elapsedTime: number): string =>
    `要素タイプ '${elementType}' のフォールバック探索がタイムアウトしました (${elapsedTime}ms)`,

  /**
   * 【要素未発見エラー】: 全セレクタ失敗時のメッセージ生成
   * @param elementType 探索対象の要素タイプ
   * @param selectorCount 試行したセレクタ数
   * @returns 構造化されたエラーメッセージ
   */
  ELEMENT_NOT_FOUND: (elementType: ElementType, selectorCount: number): string =>
    `要素タイプ '${elementType}' が見つかりません (${selectorCount}個のセレクタを試行)`,

  /**
   * 【操作不可エラー】: 要素は存在するが操作できない場合のメッセージ
   * @param elementType 対象の要素タイプ
   * @param reason 操作不可の理由
   * @returns 構造化されたエラーメッセージ
   */
  NOT_INTERACTABLE: (elementType: ElementType, reason: string): string =>
    `要素タイプ '${elementType}' は操作できません (理由: ${reason})`,

  /**
   * 【警告メッセージ】: 要素の状態に関する警告
   */
  WARNINGS: {
    ELEMENT_NOT_FOUND: 'element not found',
    DISABLED: 'disabled',
    NOT_VISIBLE: 'element not visible',
  } as const,
} as const;

/**
 * 【型安全ヘルパー関数】: フォーム要素のdisabled状態を型安全に検証
 * 【セキュリティ強化】: 型アサーションを避け、instanceof を使用した安全な型チェック
 * 【設計方針】: HTMLFormElement系の要素のみをdisabled対象として識別
 * 🟢 信頼性レベル: 標準HTML仕様のdisabled属性定義に基づく
 * @param element 検証対象のHTML要素
 * @returns disabled状態のフォーム要素かどうか
 */
function isFormElementDisabled(element: HTMLElement): boolean {
  // 【型ガード実装】: instanceof による安全な型チェック 🟢
  // 【対象要素】: HTML標準でdisabled属性をサポートする要素のみを対象
  return (
    (element instanceof HTMLInputElement && element.disabled) ||
    (element instanceof HTMLButtonElement && element.disabled) ||
    (element instanceof HTMLSelectElement && element.disabled) ||
    (element instanceof HTMLTextAreaElement && element.disabled) ||
    (element instanceof HTMLFieldSetElement && element.disabled) ||
    (element instanceof HTMLOptGroupElement && element.disabled) ||
    (element instanceof HTMLOptionElement && element.disabled)
  );
}

/**
 * 【パフォーマンス最適化ヘルパー】: 要素の可視性を効率的にチェック
 * 【改善内容】: 重複するgetComputedStyle呼び出しを1回に最適化
 * 【設計方針】: 計算済みスタイルをキャッシュして性能向上を実現
 * 🟡 信頼性レベル: 元資料のcontent.tsパターンを最適化して実装
 * @param element 検証対象のHTML要素
 * @returns 要素が可視状態かどうか
 */
function isElementVisible(element: HTMLElement): boolean {
  // 【基本可視性チェック】: offsetParentベースの高速判定 🟢
  if (element.offsetParent === null) {
    return false;
  }

  // 【詳細可視性チェック】: computedStyleの1回取得で効率化 🟡
  // 【パフォーマンス最適化】: 複数回のgetComputedStyle呼び出しを削減
  const computedStyle = window.getComputedStyle(element);
  return computedStyle.visibility !== 'hidden' && computedStyle.display !== 'none';
}

/**
 * 【セキュリティ強化ヘルパー】: CSSセレクタの安全性を検証
 * 【セキュリティ対策】: セレクタインジェクション攻撃の防止
 * 【設計方針】: 安全なセレクタパターンのみを許可
 * 🔴 信頼性レベル: セキュリティ要件として新規追加（元資料にない推測）
 * @param selector 検証対象のCSSセレクタ
 * @returns セレクタが安全かどうか
 */
function isSafeCSSSelector(selector: string): boolean {
  // 【基本検証】: 空文字列や異常に長いセレクタを拒否
  if (!selector || selector.length > 1000) {
    return false;
  }

  // 【危険パターン検出】: 明らかに危険なパターンを拒否 🔴
  const dangerousPatterns = [/javascript:/i, /expression\(/i, /url\(/i, /@import/i, /<script/i];

  return !dangerousPatterns.some((pattern) => pattern.test(selector));
}

/**
 * 【機能概要】: 優先順位付きセレクタを使用してDOM要素を探索し、フォールバック機能を提供する
 * 【実装方針】: テストケースを通すための最小限実装、セレクタ配列を順次試行して可視要素のみ返却
 * 【テスト対応】: Red フェーズで作成された優先順位テスト、可視性テスト、性能テストを通すための実装
 * 🟢 信頼性レベル: 元資料のREQ-105フォールバック探索要件とcontent.tsの実装パターンに基づく
 * @param elementType 探索する要素のタイプ
 * @param config セレクタ設定
 * @returns 発見された要素またはnull
 */
export function findElementWithFallback(
  elementType: ElementType,
  config: SelectorConfig
): HTMLElement | null {
  // 【入力値検証】: 不正な設定値を早期に検出してエラーを防ぐ 🟢
  if (!config || !config.selectors || config.selectors.length === 0) {
    return null;
  }

  // 【セレクタ順次試行】: 設定された優先順位に従って要素を探索 🟢
  for (const selector of config.selectors) {
    // 【セキュリティ検証】: セレクタの安全性を事前チェック 🔴
    if (!isSafeCSSSelector(selector)) {
      // 【危険セレクタスキップ】: 安全でないセレクタは実行せずにスキップ
      continue;
    }

    try {
      // 【要素取得】: DOM APIを使用してセレクタに該当する要素を取得
      const element = document.querySelector(selector) as HTMLElement;

      if (element) {
        // 【可視性チェック】: 最適化されたヘルパー関数による効率的な判定 🟡
        // 【パフォーマンス改善】: 重複するgetComputedStyle呼び出しを削減
        // 【テスト対応】: 非表示要素除外テストを通すための実装
        if (isElementVisible(element)) {
          // 【成功時返却】: 可視かつ存在する要素を発見した場合は即座に返却
          return element;
        }
        // 【非表示要素スキップ】: 非表示要素は無視して次のセレクタを試行
      }
    } catch (error) {
      // 【セレクタエラー無視】: 不正セレクタによるエラーを無視して次を試行
      continue;
    }
  }

  // 【全セレクタ失敗】: 全てのフォールバックセレクタが失敗した場合はnullを返却
  return null;
}

/**
 * 【機能概要】: 指定タイムアウト時間内で要素の出現を非同期的に待機し、動的DOM変更に対応
 * 【改善内容】: MutationObserverによる動的DOM監視機能を追加し、SPA環境に完全対応
 * 【実装方針】: 即座の要素探索とMutationObserverによる継続監視を組み合わせた包括的実装
 * 【テスト対応】: Red フェーズで作成されたタイムアウトエラー通知テストとエラーハンドリングテストを通すための実装
 * 🟡 信頼性レベル: 元資料のEDGE-001要件にMutationObserver機能を追加して強化
 * @param elementType 待機する要素のタイプ
 * @param config セレクタ設定
 * @returns 発見された要素を含むPromise
 */
export async function waitForElementWithTimeout(
  elementType: ElementType,
  config: SelectorConfig
): Promise<HTMLElement> {
  // 【実装開始時刻記録】: エラー時の経過時間計算のための開始時刻を記録 🟡
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    let observer: MutationObserver | null = null;

    // 【リソースクリーンアップ】: タイマーとオブザーバーの適切な後始末 🟡
    const cleanup = () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };

    // 【タイムアウトタイマー設定】: 指定時間経過後にDOMSelectorErrorを発生
    const timeoutId = setTimeout(() => {
      cleanup();
      const elapsedTime = Date.now() - startTime;

      // 【構造化エラー生成】: 構造化されたエラーメッセージによる詳細な診断情報 🟡
      // 【保守性向上】: エラーメッセージの一元管理により保守性を向上
      const error = new DOMSelectorError(
        ErrorMessages.TIMEOUT_ERROR(elementType, elapsedTime),
        elementType,
        'timeout',
        config.selectors,
        elapsedTime
      );

      reject(error);
    }, config.timeout);

    // 【成功時の共通処理】: 要素発見時のクリーンアップと返却
    const handleElementFound = (element: HTMLElement) => {
      cleanup();
      clearTimeout(timeoutId);
      resolve(element);
    };

    // 【即座の要素探索】: まず現在のDOMから即座に要素を探索 🟢
    const immediateElement = findElementWithFallback(elementType, config);
    if (immediateElement) {
      handleElementFound(immediateElement);
      return;
    }

    // 【動的DOM監視開始】: MutationObserverによる動的要素出現の監視 🟡
    // 【SPA対応】: AJAX読み込みやSPA でのDOM変更に対応
    observer = new MutationObserver((_mutations) => {
      // 【変更検出時の探索】: DOM変更が検出された際に再度要素探索を実行
      const element = findElementWithFallback(elementType, config);
      if (element) {
        handleElementFound(element);
      }
    });

    // 【監視対象設定】: document全体を監視対象として設定 🟡
    // 【監視設定】: 子要素の追加・削除、属性変更、サブツリー変更を監視
    observer.observe(document.body, {
      childList: true, // 子要素の追加・削除を監視
      subtree: true, // サブツリー全体を監視
      attributes: true, // 属性変更を監視（class, style等）
      attributeFilter: ['class', 'style', 'id'], // 要素識別に重要な属性のみ監視
    });
  });
}

/**
 * 【機能概要】: DOM要素の操作可能性を検証し、無効化状態や警告情報を含む詳細な結果を返却
 * 【実装方針】: テストケースを通すための最小限実装、disabled属性の検出と警告情報生成
 * 【テスト対応】: Red フェーズで作成されたインタラクタビリティ検証テストを通すための実装
 * 🟡 信頼性レベル: 元資料に具体的記述はないがUI操作の安定性に必要な機能として推測
 * @param element 検証する要素
 * @returns 検証結果オブジェクト
 */
export function validateElementInteractable(element: HTMLElement | null): ElementValidationResult {
  // 【結果オブジェクト初期化】: 検証結果の基本構造を初期化 🟡
  const result: ElementValidationResult = {
    element,
    isInteractable: true,
    warnings: [],
  };

  // 【null要素処理】: 要素が存在しない場合の適切な処理
  if (!element) {
    // 【null時の操作不可判定】: 存在しない要素は当然操作不可能
    result.isInteractable = false;
    // 【構造化警告】: 警告メッセージの一元管理による保守性向上 🟡
    result.warnings.push(ErrorMessages.WARNINGS.ELEMENT_NOT_FOUND);
    return result;
  }

  // 【disabled状態検証】: フォーム要素のdisabled属性を型安全にチェック 🟢
  // 【セキュリティ強化】: 型アサーションを削除し、型ガードによる安全な実装
  // 【テスト対応】: disabled要素警告テストを通すための実装
  if (isFormElementDisabled(element)) {
    // 【操作不可判定】: disabled要素は操作不可能として判定
    result.isInteractable = false;
    // 【構造化警告】: 構造化された警告メッセージによる保守性向上 🟡
    // 【テスト対応】: テストで期待される 'disabled' 文字列を警告配列に追加
    result.warnings.push(ErrorMessages.WARNINGS.DISABLED);
  }

  // 【追加検証項目】: 将来的な拡張のための基本的な操作可能性チェック
  // 【可視性再確認】: 要素の表示状態も操作可能性に影響
  if (element.offsetParent === null) {
    result.isInteractable = false;
    // 【構造化警告】: 可視性警告メッセージの構造化による保守性向上 🟡
    result.warnings.push(ErrorMessages.WARNINGS.NOT_VISIBLE);
  }

  // 【検証結果返却】: 全ての検証を完了した結果オブジェクトを返却
  return result;
}
