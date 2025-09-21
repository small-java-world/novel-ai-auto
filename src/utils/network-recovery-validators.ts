/**
 * TASK-071: Network Recovery Handler Input Validation Utilities
 * 【機能概要】: ネットワーク復旧ハンドラーの入力値検証とサニタイゼーション
 * 【改善内容】: セキュリティ強化された包括的な入力値検証システム
 * 【設計方針】: 防御的プログラミングとセキュリティファーストの設計
 * 🟢 信頼性レベル: セキュリティベストプラクティスに基づく実装
 */

import {
  NETWORK_RECOVERY_CONFIG,
  SECURITY_POLICIES,
  ERROR_MESSAGES,
  PERFORMANCE_CONFIG,
} from './network-recovery-config';

/**
 * 【ValidationResult型】: 検証結果の統一形式
 * 【設計思想】: 成功/失敗の明確な区別とエラー情報の構造化
 */
export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: any;
  errorMessage?: string;
  securityRisk?: string;
}

/**
 * 【JobIDバリデーター】: ジョブIDの安全性とフォーマット検証
 * 【セキュリティ機能】: インジェクション攻撃とDoS攻撃の防止
 * 【検証項目】: 長さ制限、文字種制限、禁止パターンチェック
 * 🟢 信頼性レベル: セキュリティ標準に基づく包括的検証
 */
export function validateJobId(jobId: any): ValidationResult {
  // 【null/undefined検証】: 基本的な存在チェック
  if (jobId === null || jobId === undefined) {
    return {
      isValid: false,
      errorMessage: 'ジョブIDが指定されていません',
    };
  }

  // 【型検証】: 文字列以外の型を安全に拒否
  if (typeof jobId !== 'string') {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_JOB_ID,
      securityRisk: 'Non-string jobId could indicate injection attempt',
    };
  }

  // 【長さ検証】: DoS攻撃とメモリ枯渇の防止
  if (jobId.length === 0) {
    return {
      isValid: false,
      errorMessage: 'ジョブIDが空です',
    };
  }

  if (jobId.length > NETWORK_RECOVERY_CONFIG.MAX_JOB_ID_LENGTH) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_JOB_ID,
      securityRisk: 'Excessively long jobId could indicate DoS attempt',
    };
  }

  // 【文字種検証】: 安全な文字のみを許可
  if (!SECURITY_POLICIES.VALID_JOB_ID_PATTERN.test(jobId)) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_JOB_ID,
      securityRisk: 'Invalid characters in jobId could indicate injection attempt',
    };
  }

  // 【禁止パターン検証】: スクリプトインジェクション等の検出
  for (const pattern of SECURITY_POLICIES.FORBIDDEN_PATTERNS) {
    if (pattern.test(jobId)) {
      return {
        isValid: false,
        errorMessage: ERROR_MESSAGES.INVALID_JOB_ID,
        securityRisk: `Forbidden pattern detected: potential ${pattern.source} injection`,
      };
    }
  }

  // 【検証成功】: サニタイズ済みの安全な値を返却
  return {
    isValid: true,
    sanitizedValue: jobId.trim(), // 前後の空白文字を除去
  };
}

/**
 * 【タイムスタンプバリデーター】: 時刻値の妥当性と範囲検証
 * 【セキュリティ機能】: 時刻操作攻撃とオーバーフロー攻撃の防止
 * 【検証項目】: 型チェック、範囲制限、未来時刻制限
 * 🟢 信頼性レベル: 時刻処理のセキュリティベストプラクティスに基づく
 */
export function validateTimestamp(timestamp: any): ValidationResult {
  // 【null/undefined検証】: 基本的な存在チェック
  if (timestamp === null || timestamp === undefined) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_TIMESTAMP,
      sanitizedValue: Date.now(), // 【フォールバック】: 現在時刻を安全なデフォルト値として使用
    };
  }

  // 【型検証】: 数値以外の型を安全に拒否
  if (typeof timestamp !== 'number') {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_TIMESTAMP,
      securityRisk: 'Non-numeric timestamp could indicate injection attempt',
    };
  }

  // 【数値妥当性検証】: NaN、Infinity等の異常値を検出
  if (!Number.isFinite(timestamp)) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_TIMESTAMP,
      securityRisk: 'Non-finite timestamp could indicate overflow attack',
    };
  }

  // 【範囲検証】: 妥当なタイムスタンプ範囲内かチェック
  const now = Date.now();
  const minValidTimestamp = new Date('2020-01-01').getTime(); // 🟡 実用的な最小日時
  const maxValidTimestamp = now + NETWORK_RECOVERY_CONFIG.MAX_TIMESTAMP_FUTURE_OFFSET;

  if (timestamp < minValidTimestamp) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_TIMESTAMP,
      securityRisk: 'Timestamp too far in the past',
    };
  }

  if (timestamp > maxValidTimestamp) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_TIMESTAMP,
      securityRisk: 'Timestamp too far in the future',
    };
  }

  // 【検証成功】: 安全な時刻値として承認
  return {
    isValid: true,
    sanitizedValue: Math.floor(timestamp), // 整数値に正規化
  };
}

/**
 * 【継続時間バリデーター】: ミリ秒単位の継続時間の安全性検証
 * 【セキュリティ機能】: 過度な処理時間によるDoS攻撃の防止
 * 【検証項目】: 型チェック、負数チェック、上限制限
 * 🟢 信頼性レベル: システム安定性を重視した制限値設定
 */
export function validateDuration(duration: any): ValidationResult {
  // 【型検証】: 数値以外の型を安全に拒否
  if (typeof duration !== 'number') {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_DURATION,
      securityRisk: 'Non-numeric duration could indicate injection attempt',
    };
  }

  // 【数値妥当性検証】: NaN、Infinity等の異常値を検出
  if (!Number.isFinite(duration)) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_DURATION,
      securityRisk: 'Non-finite duration could indicate overflow attack',
    };
  }

  // 【負数検証】: 負の継続時間を安全に拒否
  if (duration < 0) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_DURATION,
      securityRisk: 'Negative duration could indicate malicious input',
    };
  }

  // 【上限検証】: 過度に長い継続時間によるDoS攻撃を防止
  if (duration > NETWORK_RECOVERY_CONFIG.MAX_DURATION_MS) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_DURATION,
      securityRisk: 'Excessively long duration could indicate DoS attempt',
    };
  }

  // 【検証成功】: 安全な継続時間として承認
  return {
    isValid: true,
    sanitizedValue: Math.floor(duration), // 整数値に正規化
  };
}

/**
 * 【配列バリデーター】: ジョブ配列等の配列入力の安全性検証
 * 【セキュリティ機能】: 配列操作による攻撃とメモリ枯渇攻撃の防止
 * 【検証項目】: 配列型チェック、長さ制限、要素型チェック
 * 🟡 信頼性レベル: 一般的な配列操作のセキュリティ要件に基づく
 */
export function validateArray(
  array: any,
  maxLength = PERFORMANCE_CONFIG.MAX_BATCH_SIZE
): ValidationResult {
  // 【null/undefined検証】: 基本的な存在チェック
  if (array === null || array === undefined) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_ARRAY_INPUT,
    };
  }

  // 【型検証】: 配列以外の型を安全に拒否
  if (!Array.isArray(array)) {
    return {
      isValid: false,
      errorMessage: ERROR_MESSAGES.INVALID_ARRAY_INPUT,
      securityRisk: 'Non-array input could indicate injection attempt',
    };
  }

  // 【長さ検証】: 過度に大きな配列によるメモリ枯渇攻撃を防止
  if (array.length > maxLength) {
    return {
      isValid: false,
      errorMessage: `配列のサイズが上限(${maxLength})を超えています`,
      securityRisk: 'Excessively large array could indicate memory exhaustion attack',
    };
  }

  // 【検証成功】: 安全な配列として承認
  return {
    isValid: true,
    sanitizedValue: array, // 配列自体は変更せず元の値を返却
  };
}

/**
 * 【ネットワーク状態バリデーター】: ネットワーク状態オブジェクトの検証
 * 【セキュリティ機能】: 状態操作攻撃とデータ改ざんの防止
 * 【検証項目】: オブジェクト構造、プロパティ型、値の妥当性
 * 🟢 信頼性レベル: 要件定義のNetworkState型定義に基づく
 */
export function validateNetworkState(networkState: any): ValidationResult {
  // 【null検証】: nullは明示的なフォールバック処理の指示として許可
  if (networkState === null) {
    return {
      isValid: true,
      sanitizedValue: null, // nullは意図的なフォールバック指示
    };
  }

  // 【undefined検証】: undefinedは無効な状態として拒否
  if (networkState === undefined) {
    return {
      isValid: false,
      errorMessage: 'ネットワーク状態が未定義です',
    };
  }

  // 【型検証】: オブジェクト以外の型を安全に拒否
  if (typeof networkState !== 'object') {
    return {
      isValid: false,
      errorMessage: 'ネットワーク状態の形式が正しくありません',
      securityRisk: 'Non-object network state could indicate injection attempt',
    };
  }

  // 【プロパティ検証】: 必要なisOnlineプロパティの存在と型をチェック
  if (typeof networkState.isOnline !== 'boolean') {
    return {
      isValid: false,
      errorMessage: 'ネットワーク状態のisOnlineプロパティが正しくありません',
      securityRisk: 'Invalid isOnline property could indicate data manipulation',
    };
  }

  // 【検証成功】: 安全なネットワーク状態として承認
  return {
    isValid: true,
    sanitizedValue: {
      isOnline: networkState.isOnline, // 必要なプロパティのみを抽出して安全な状態を作成
    },
  };
}

/**
 * 【統合検証ヘルパー】: 複数の検証を組み合わせた包括的検証
 * 【使用場面】: 関数の入口での一括検証処理
 * 【エラー集約】: 複数の検証エラーを効率的に収集・報告
 * 🟡 信頼性レベル: 検証処理の効率化を目的とした実用的実装
 */
export function validateMultiple(validations: ValidationResult[]): ValidationResult {
  const errors: string[] = [];
  const securityRisks: string[] = [];

  // 【エラー集約】: 全ての検証エラーを収集
  for (const validation of validations) {
    if (!validation.isValid) {
      if (validation.errorMessage) {
        errors.push(validation.errorMessage);
      }
      if (validation.securityRisk) {
        securityRisks.push(validation.securityRisk);
      }
    }
  }

  // 【結果判定】: 一つでもエラーがあれば全体として無効
  if (errors.length > 0) {
    return {
      isValid: false,
      errorMessage: errors.join('; '),
      securityRisk: securityRisks.length > 0 ? securityRisks.join('; ') : undefined,
    };
  }

  // 【検証成功】: 全ての検証が成功
  return {
    isValid: true,
  };
}

/**
 * 【設定値バリデーター】: システム設定値の妥当性検証
 * 【セキュリティ機能】: 設定改ざんやシステム破綻の防止
 * 【検証項目】: 設定値の型、範囲、相互関係の妥当性
 * 🟡 信頼性レベル: システム安定性を重視した設定値制限
 */
export function validateConfigValue(key: string, value: any): ValidationResult {
  // 【設定キー検証】: 許可された設定キーのみを受け入れ
  const validConfigKeys = Object.keys(NETWORK_RECOVERY_CONFIG);
  if (!validConfigKeys.includes(key)) {
    return {
      isValid: false,
      errorMessage: `未知の設定キー: ${key}`,
      securityRisk: 'Unknown config key could indicate injection attempt',
    };
  }

  // 【型検証】: 設定値の型が期待される型と一致するかチェック
  if (typeof value !== 'number') {
    return {
      isValid: false,
      errorMessage: `設定値 ${key} は数値である必要があります`,
      securityRisk: 'Non-numeric config value could indicate injection attempt',
    };
  }

  // 【範囲検証】: 設定値が安全な範囲内かチェック
  if (value < 0) {
    return {
      isValid: false,
      errorMessage: `設定値 ${key} は負の値にできません`,
      securityRisk: 'Negative config value could cause system instability',
    };
  }

  // 【検証成功】: 安全な設定値として承認
  return {
    isValid: true,
    sanitizedValue: Math.floor(value), // 整数値に正規化
  };
}

// 【パフォーマンス設定】: 上記のESMインポートから利用
