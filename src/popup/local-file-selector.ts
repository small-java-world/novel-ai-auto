/**
 * TASK-100 ローカルファイル選択機能
 * ユーザーがローカルファイルシステムからプロンプトファイルを選択・読み込む機能
 *
 * TDD Refactorフェーズ: 品質改善とコード最適化
 */

import { PromptData, LocalFileLoadResult } from '../types';

// 【セレクタープロファイル自動選択結果型】: ファイル読み込みと同時にselectorProfileも返す
export interface LocalFileLoadResultWithSelector extends LocalFileLoadResult {
  selectorProfile?: string;
}

// 【定数定義】: ファイル処理に関する設定値を一元管理 🟢
const FILE_SIZE_LIMITS = {
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MIN_SIZE_BYTES: 1, // 空ファイル判定
} as const;

const ERROR_MESSAGES = {
  FILE_SIZE_EXCEEDED: 'ファイルサイズが制限(10MB)を超えています',
  EMPTY_FILE: 'ファイルにデータが含まれていません',
  INVALID_JSON: 'ファイル形式が不正です。JSONファイルを確認してください',
  MISSING_NAME: 'プリセット名(name)が設定されていないデータがあります',
  MISSING_PROMPT: 'プロンプト(prompt)が設定されていないデータがあります',
  INVALID_NEGATIVE: 'negative フィールドの形式が不正です',
  INVALID_PARAMETERS: 'parameters フィールドの形式が不正です',
  INVALID_ARRAY: 'データが配列形式ではありません',
  READ_FAILED: 'ファイルの読み込みに失敗しました。ファイルの状態を確認してください',
  READ_RESULT_NOT_STRING: 'ファイル読み込み結果が文字列ではありません',
  FILE_READ_ERROR: 'ファイル読み込みエラー',
  INVALID_CHARACTERS_BLOCK: 'characters ブロックの形式が不正です',
} as const;

const SUPPORTED_EXTENSIONS = ['.json', '.naiprompts'] as const;

// 【型定義】: より厳密な型安全性を確保 🟢
type ValidationResult = {
  isValid: boolean;
  errorMessage?: string;
};

type FileValidationResult = ValidationResult;
type DataValidationResult = ValidationResult;

// 【ヘルパー関数群】: 責任分離されたファイル処理機能 🟢

/**
 * 【機能概要】: ファイルの基本属性（サイズ、空ファイル）を検証
 * 【実装方針】: 早期リターンパターンで効率的な検証を実行
 * 【テスト対応】: TC-002-001（サイズ超過）、TC-003-002（空ファイル）対応
 * 🟢 信頼性レベル: 要件定義書とテストケースから明確に定義された仕様
 * @param file - 検証対象のFileオブジェクト
 * @returns FileValidationResult - 検証結果
 */
function validateFileBasics(file: File): FileValidationResult {
  // 【ファイルサイズ検証】: メモリ枯渇防止のための10MB制限チェック 🟢
  if (file.size > FILE_SIZE_LIMITS.MAX_SIZE_BYTES) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.FILE_SIZE_EXCEEDED,
    };
  }

  // 【空ファイル検証】: 0バイトファイルの検出とエラー返却 🟢
  if (file.size < FILE_SIZE_LIMITS.MIN_SIZE_BYTES) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.EMPTY_FILE,
    };
  }

  return { isValid: true };
}

/**
 * 【機能概要】: JSON文字列を安全に解析し、結果をValidationResultで返す
 * 【実装方針】: try-catch使用で構文エラーをキャッチし、適切なエラーメッセージを提供
 * 【テスト対応】: TC-002-002（JSON形式エラー）対応
 * 🟢 信頼性レベル: 標準JSON.parse APIと要件定義から明確に定義
 * @param content - JSON文字列
 * @returns ValidationResult & { data?: any } - 解析結果
 */
function parseJsonSafely(content: string): ValidationResult & { data?: any } {
  try {
    const parsedData = JSON.parse(content);
    return {
      isValid: true,
      data: parsedData,
    };
  } catch (jsonError) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_JSON,
    };
  }
}

/**
 * 【機能概要】: 解析されたデータがPromptData配列形式に適合するかを検証
 * 【実装方針】: 配列型チェック後、各要素の必須フィールドを段階的に検証
 * 【テスト対応】: TC-002-003（必須フィールド欠如）対応
 * 🟢 信頼性レベル: PromptDataインターフェース定義と必須フィールド要件から実装
 * @param data - 検証対象のデータ
 * @returns DataValidationResult - 検証結果
 */
function validatePromptDataStructure(data: unknown): DataValidationResult {
  // 【配列型検証】: データが配列型であることを確認 🟢
  if (!Array.isArray(data)) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_JSON,
    };
  }

  // 【要素検証】: 配列の各要素がPromptData形式に適合するかチェック 🟢
  const validationError = validatePromptDataElements(data);
  if (validationError) {
    return {
      isValid: false,
      errorMessage: validationError,
    };
  }

  return { isValid: true };
}

/**
 * 【機能概要】: エラー結果のLocalFileLoadResultオブジェクトを生成
 * 【実装方針】: エラーレスポンスの統一化とコード重複の削減
 * 【テスト対応】: 全エラーケースで共通のレスポンス形式を保証
 * 🟢 信頼性レベル: LocalFileLoadResultインターフェース仕様に準拠
 * @param errorMessage - エラーメッセージ
 * @param file - 対象ファイル
 * @returns LocalFileLoadResult - エラー結果
 */
function createErrorResult(errorMessage: string, file: File): LocalFileLoadResult {
  return {
    success: false,
    error: errorMessage,
    fileSize: file.size,
    fileName: file.name,
  };
}

/**
 * 【機能概要】: 成功結果のLocalFileLoadResultオブジェクトを生成
 * 【実装方針】: 成功レスポンスの統一化とタイプセーフティの確保
 * 【テスト対応】: 正常系テストケースで期待される結果形式を保証
 * 🟢 信頼性レベル: LocalFileLoadResultインターフェース仕様に準拠
 * @param data - PromptData配列
 * @param file - 対象ファイル
 * @returns LocalFileLoadResult - 成功結果
 */
function createSuccessResult(data: PromptData[], file: File): LocalFileLoadResult {
  return {
    success: true,
    data,
    fileSize: file.size,
    fileName: file.name,
  };
}

/**
 * 【機能概要】: selectorProfile付き成功結果のLocalFileLoadResultWithSelectorオブジェクトを生成
 * 【実装方針】: セレクタープロファイル自動選択機能付きの成功レスポンス
 * @param data - PromptData配列
 * @param file - 対象ファイル
 * @param selectorProfile - 自動選択されたセレクタープロファイル
 * @returns LocalFileLoadResultWithSelector - selectorProfile付き成功結果
 */
function createSuccessResultWithSelector(data: PromptData[], file: File, selectorProfile?: string): LocalFileLoadResultWithSelector {
  return {
    success: true,
    data,
    fileSize: file.size,
    fileName: file.name,
    selectorProfile,
  };
}

/**
 * 【機能概要】: PromptData配列の各要素が必須フィールドを持っているかを検証
 * 【実装方針】: 配列の各要素に対して必須・オプションフィールドの型安全性を検証
 * 【テスト対応】: TC-002-003テストケースで期待される検証処理
 * 🟢 信頼性レベル: PromptDataインターフェース定義と必須フィールド要件から実装
 * @param data - 検証対象のデータ配列
 * @returns string | null - エラーメッセージ、問題ない場合はnull
 */
function validatePromptDataElements(data: unknown[]): string | null {
  // 【要素毎検証】: 各要素が適切なPromptData形式かを順次チェック 🟢
  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    // 【必須フィールド検証: name】: nameフィールドの存在と型をチェック 🟢
    if (
      !item ||
      typeof item !== 'object' ||
      !('name' in item) ||
      !item.name ||
      typeof item.name !== 'string'
    ) {
      return ERROR_MESSAGES.MISSING_NAME;
    }

    // 【必須フィールド検証: prompt】: promptフィールドの存在と型をチェック 🟢
    if (!('prompt' in item) || !item.prompt || typeof item.prompt !== 'string') {
      return ERROR_MESSAGES.MISSING_PROMPT;
    }

    // 【オプションフィールド検証: negative】: 存在する場合のみ型チェック 🟡
    if ('negative' in item && item.negative !== undefined && typeof item.negative !== 'string') {
      return ERROR_MESSAGES.INVALID_NEGATIVE;
    }

    // 【オプションフィールド検証: parameters】: 存在する場合のみ型チェック 🟡
    if (
      'parameters' in item &&
      item.parameters !== undefined &&
      typeof item.parameters !== 'object'
    ) {
      return ERROR_MESSAGES.INVALID_PARAMETERS;
    }
  }

  // 【検証成功】: すべての検証をパスした場合はnullを返す 🟢
  return null;
}

/**
 * 【機能概要】: ローカルプロンプトファイルを読み込んでPromptData[]形式で返す
 * 【実装方針】: 段階的検証パターンで責任分離し、各段階でエラーハンドリングを実行
 * 【テスト対応】: 全11テストケース（正常系3、異常系4、境界値4）を通すための実装
 * 🟢 信頼性レベル: 要件定義書とテストケースから明確に定義された仕様
 * @param file - 読み込み対象のFileオブジェクト
 * @returns Promise<LocalFileLoadResult> - 読み込み結果
 */
export async function loadLocalPromptFile(file: File): Promise<LocalFileLoadResult> {
  const result = await loadLocalPromptFileWithSelector(file);
  return {
    success: result.success,
    data: result.data,
    error: result.error,
    fileSize: result.fileSize,
    fileName: result.fileName,
  };
}

/**
 * 【機能概要】: ローカルプロンプトファイルを読み込み、selectorProfileも自動選択して返す
 * 【実装方針】: セレクタープロファイルの自動選択機能を追加
 * 【使用場面】: popup.js で selectorProfile を自動設定する際に使用
 * @param file - 読み込み対象のFileオブジェクト
 * @returns Promise<LocalFileLoadResultWithSelector> - selectorProfile付き読み込み結果
 */
export async function loadLocalPromptFileWithSelector(file: File): Promise<LocalFileLoadResultWithSelector> {
  // 【段階1: ファイル基本検証】: サイズと基本属性をチェック 🟢
  const basicValidation = validateFileBasics(file);
  if (!basicValidation.isValid) {
    return createErrorResult(basicValidation.errorMessage!, file);
  }

  try {
    // 【段階2: ファイル読み込み】: FileReader APIを使用してテキスト読み込み 🟢
    const content = await readFileAsText(file);

    // 【段階3: JSON解析】: 安全なJSON解析とエラーハンドリング 🟢
    const parseResult = parseJsonSafely(content);
    if (!parseResult.isValid) {
      return createErrorResult(parseResult.errorMessage!, file);
    }

    // 【段階4: データ正規化とselectorProfile検出】: 2系統のスキーマをサポート
    const normalizationResult = normalizeToPromptDataArrayWithSelector(parseResult.data);
    if (!normalizationResult.data) {
      return createErrorResult(ERROR_MESSAGES.INVALID_JSON, file);
    }

    // 【段階5: データ構造検証】: PromptData配列形式の検証 🟢
    const dataValidation = validatePromptDataStructure(normalizationResult.data);
    if (!dataValidation.isValid) {
      return createErrorResult(dataValidation.errorMessage!, file);
    }

    // 【段階6: 成功結果返却】: 正常にパースされたデータとselectorProfileを返す 🟢
    return createSuccessResultWithSelector(normalizationResult.data, file, normalizationResult.selectorProfile);
  } catch (error) {
    // 【例外処理】: 予期しないエラーに対する安全な処理 🟡
    return createErrorResult(ERROR_MESSAGES.READ_FAILED, file);
  }
}

// Normalize various character-based schemas into PromptData[] with selectorProfile
function normalizeToPromptDataArray(input: unknown): PromptData[] | null {
  const result = normalizeToPromptDataArrayWithSelector(input);
  return result.data;
}

/**
 * 【機能概要】: データ正規化とselectorProfile自動検出を同時実行
 * 【実装方針】: ファイル形式を判定し、共通selectorProfileがあれば検出
 * @param input - 正規化対象のデータ
 * @returns data: PromptData[], selectorProfile?: string
 */
function normalizeToPromptDataArrayWithSelector(input: unknown): { data: PromptData[] | null; selectorProfile?: string } {
  // Case A: Already PromptData[]
  if (Array.isArray(input)) {
    // 【selectorProfile検出】: 配列内の共通selectorProfileを検出
    const selectorProfiles = new Set<string>();
    for (const item of input) {
      if (item && typeof item === 'object' && 'selectorProfile' in item && typeof item.selectorProfile === 'string') {
        selectorProfiles.add(item.selectorProfile);
      }
    }

    // 共通のselectorProfileがある場合は自動選択
    const commonSelectorProfile = selectorProfiles.size === 1 ? Array.from(selectorProfiles)[0] : undefined;

    return {
      data: input as PromptData[],
      selectorProfile: commonSelectorProfile,
    };
  }

  // Case B: characters block
  if (input && typeof input === 'object' && 'characters' in (input as any)) {
    const characters = (input as any).characters;
    if (!characters || typeof characters !== 'object') {
      return { data: null };
    }

    const out: PromptData[] = [];
    const selectorProfiles = new Set<string>();

    for (const [key, value] of Object.entries(characters as Record<string, any>)) {
      if (!value || typeof value !== 'object') continue;
      const name: string = value.name || key;
      const selectorProfile: string | undefined =
        typeof value.selectorProfile === 'string' ? value.selectorProfile : undefined;
      const prompts = value.prompts || {};
      const positive: string | undefined =
        typeof prompts.positive === 'string' ? prompts.positive : undefined;
      const negative: string | undefined =
        typeof prompts.negative === 'string' ? prompts.negative : undefined;
      const settings: any = value.settings || undefined;

      if (!positive) continue;

      // selectorProfile情報を収集
      if (selectorProfile) {
        selectorProfiles.add(selectorProfile);
      }

      const pd: PromptData = {
        name,
        prompt: positive,
        negative,
        parameters: settings,
        selectorProfile,
      };
      out.push(pd);
    }

    // 共通のselectorProfileがある場合は自動選択
    const commonSelectorProfile = selectorProfiles.size === 1 ? Array.from(selectorProfiles)[0] : undefined;

    return {
      data: out,
      selectorProfile: commonSelectorProfile,
    };
  }

  return { data: null };
}

/**
 * 【機能概要】: FileReader APIを使用してファイルをテキストとして読み込む
 * 【実装方針】: Promiseベースの非同期処理でFileReaderをラップ
 * 【テスト対応】: ファイル読み込み失敗時のエラーハンドリングをサポート
 * 🟡 信頼性レベル: 一般的なFileReader API使用パターンから実装
 * @param file - 読み込み対象のFileオブジェクト
 * @returns Promise<string> - ファイル内容のテキスト
 */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // 【FileReader初期化】: ブラウザ標準APIを使用してファイル読み込み 🟢
    const reader = new FileReader();

    // 【成功時処理】: ファイル読み込み完了時にPromiseを解決 🟡
    reader.onload = () => {
      // 【結果検証】: 読み込み結果がstring型であることを確認 🟡
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('ファイル読み込み結果が文字列ではありません'));
      }
    };

    // 【エラー時処理】: ファイル読み込み失敗時にPromiseを拒否 🟡
    reader.onerror = () => {
      reject(new Error('ファイル読み込みエラー'));
    };

    // 【読み込み開始】: テキスト形式でファイル読み込みを開始 🟢
    reader.readAsText(file);
  });
}

/**
 * 【機能概要】: ファイル選択UIを表示してユーザーにファイルを選択させる
 * 【実装方針】: HTML input[type="file"]要素を動的に作成してクリックイベントを発火
 * 【テスト対応】: 現在のテストでは直接呼び出されないため、最小限実装
 * 🔴 信頼性レベル: 元資料にない推測実装（将来の拡張用）
 * @returns Promise<File | null> - 選択されたファイル、またはキャンセル時はnull
 */
export async function selectLocalFile(): Promise<File | null> {
  return new Promise((resolve) => {
    // 【最小限実装】: テストでは使用されないため、基本的な実装のみ 🔴
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.naiprompts';

    // 【ファイル選択処理】: ユーザーがファイルを選択した時の処理 🔴
    input.onchange = () => {
      const file = input.files?.[0] || null;
      resolve(file);
    };

    // 【キャンセル処理】: ユーザーがキャンセルした時の処理 🔴
    input.oncancel = () => {
      resolve(null);
    };

    // 【ファイル選択ダイアログ表示】: クリックでダイアログを開く 🔴
    input.click();
  });
}

/**
 * 【機能概要】: ファイルサイズが制限内かどうかを検証する
 * 【実装方針】: シンプルなサイズ比較で10MB制限をチェック
 * 【テスト対応】: 現在のテストでは直接呼び出されないが、将来の拡張用
 * 🟢 信頼性レベル: 要件定義書で明確に指定された10MB制限
 * @param file - 検証対象のFileオブジェクト
 * @param maxSizeBytes - 最大サイズ（バイト）、デフォルト10MB
 * @returns boolean - サイズが制限内かどうか
 */
export function validateFileSize(file: File, maxSizeBytes: number = 10 * 1024 * 1024): boolean {
  // 【サイズ比較】: ファイルサイズと制限値を比較 🟢
  return file.size <= maxSizeBytes;
}

/**
 * 【機能概要】: PromptData配列の各要素が必須フィールドを持っているかを検証
 * 【実装方針】: 各要素のname/promptフィールドの存在をチェック
 * 【テスト対応】: TC-002-003テストケースで期待される検証処理
 * 🟢 信頼性レベル: PromptDataインターフェース定義と必須フィールド要件から実装
 * @param data - 検証対象のデータ
 * @returns string | null - エラーメッセージ、問題ない場合はnull
 */
export function validatePromptData(data: any): string | null {
  // 【配列型検証】: データが配列型であることを確認 🟡
  if (!Array.isArray(data)) {
    return 'データが配列形式ではありません';
  }

  // 【各要素検証】: 配列の各要素がPromptData形式に適合するかチェック 🟢
  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    // 【必須フィールド検証: name】: nameフィールドの存在と型をチェック 🟢
    if (!item.name || typeof item.name !== 'string') {
      // 【エラーメッセージ】: TC-002-003テストケースで期待される正確なメッセージ 🟢
      return 'プリセット名(name)が設定されていないデータがあります';
    }

    // 【必須フィールド検証: prompt】: promptフィールドの存在と型をチェック 🟢
    if (!item.prompt || typeof item.prompt !== 'string') {
      // 【エラーメッセージ】: promptフィールド不足時のエラー 🟡
      return 'プロンプト(prompt)が設定されていないデータがあります';
    }

    // 【オプションフィールド検証】: negative、parametersは存在する場合のみ型チェック 🟡
    if (item.negative !== undefined && typeof item.negative !== 'string') {
      return 'negative フィールドの形式が不正です';
    }

    if (item.parameters !== undefined && typeof item.parameters !== 'object') {
      return 'parameters フィールドの形式が不正です';
    }
  }

  // 【検証成功】: すべての検証をパスした場合はnullを返す 🟢
  return null;
}

// 【型ガード関数】: 型安全性向上のためのユーティリティ関数群 🟡

/**
 * 【機能概要】: オブジェクトが有効なPromptData形式かを型ガードで判定
 * 【実装方針】: TypeScriptの型ガード機能を活用した型安全性の向上
 * 【テスト対応】: 将来の型安全性テスト用（現在は使用されない）
 * 🟡 信頼性レベル: TypeScript型システムとPromptDataインターフェースから実装
 * @param obj - 検証対象のオブジェクト
 * @returns obj is PromptData - 型ガードの結果
 */
export function isValidPromptData(obj: unknown): obj is PromptData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'prompt' in obj &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).prompt === 'string' &&
    ((obj as any).negative === undefined || typeof (obj as any).negative === 'string') &&
    ((obj as any).parameters === undefined || typeof (obj as any).parameters === 'object')
  );
}

/**
 * 【機能概要】: ファイル拡張子が対応形式かを判定
 * 【実装方針】: 定数化された対応拡張子リストとの照合
 * 【テスト対応】: 将来のファイル形式検証テスト用（現在は使用されない）
 * 🟢 信頼性レベル: 要件定義書で明確に指定された対応形式から実装
 * @param filename - ファイル名
 * @returns boolean - 対応形式かどうか
 */
export function isSupportedFileExtension(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext));
}
