/**
 * TASK-071: Network Recovery Handler Configuration
 * 【機能概要】: ネットワーク復旧ハンドラーの設定値と定数を集約管理
 * 【改善内容】: マジックナンバーの外部化とセキュリティ設定の集中管理
 * 【設計方針】: 設定変更時の影響範囲を最小化し、セキュリティポリシーを統一
 * 🟢 信頼性レベル: 要件定義書の閾値仕様に基づく設定値の定義
 */

/**
 * 【基本設定】: ネットワーク復旧処理の基本パラメータ
 * 【セキュリティ考慮】: 各設定値の上限・下限を安全な範囲に制限
 */
export const NETWORK_RECOVERY_CONFIG = {
  // 【フラッピング防止設定】: ネットワーク状態変化の安定性判定
  FLAPPING_THRESHOLD_MS: 5000, // 🟢 要件定義の5秒閾値に基づく

  // 【監視間隔設定】: ネットワーク状態監視の性能制御
  MAX_MONITORING_INTERVAL_MS: 1000, // 🟢 要件定義の1秒上限に基づく
  MIN_MONITORING_INTERVAL_MS: 100,   // 🟡 システム負荷を考慮した最小値

  // 【同時実行制御】: システム負荷防止のための制限値
  DEFAULT_MAX_CONCURRENT_JOBS: 5,    // 🟡 システム安定性を考慮した適切な値
  ABSOLUTE_MAX_CONCURRENT_JOBS: 20,  // 🔴 システム保護のための絶対上限

  // 【入力値制限】: セキュリティ強化のための入力値制約
  MAX_JOB_ID_LENGTH: 100,            // 🟡 実用性とセキュリティのバランス
  MAX_TIMESTAMP_FUTURE_OFFSET: 300000, // 🟡 5分以内の未来タイムスタンプを許可
  MAX_DURATION_MS: 86400000,         // 🟡 24時間を上限とした妥当な範囲

  // 【リトライ設定】: 段階的再開の性能制御
  DEFAULT_RETRY_BASE_DELAY: 500,     // 🟢 TASK-032リトライエンジン仕様に基づく
  DEFAULT_RETRY_FACTOR: 2.0,         // 🟢 指数バックオフの標準係数
  MAX_RETRY_ATTEMPTS: 10,            // 🟡 過度なリトライを防ぐための上限
} as const;

/**
 * 【セキュリティポリシー】: 入力値検証とサニタイゼーションの規則
 * 【保護対象】: インジェクション攻撃、DoS攻撃、データ破損の防止
 */
export const SECURITY_POLICIES = {
  // 【ジョブID検証パターン】: 英数字とハイフン・アンダースコアのみ許可
  VALID_JOB_ID_PATTERN: /^[a-zA-Z0-9_-]+$/,

  // 【禁止文字パターン】: スクリプトインジェクション防止
  FORBIDDEN_PATTERNS: [
    /<script/i,           // XSS防止
    /javascript:/i,       // JavaScriptスキーム防止
    /data:/i,            // データURLスキーム防止
    /vbscript:/i,        // VBScriptスキーム防止
    /on\w+\s*=/i,        // イベントハンドラ防止
  ],

  // 【文字列長制限】: メモリ枯渇攻撃の防止
  MAX_ERROR_MESSAGE_LENGTH: 500,
  MAX_WARNING_MESSAGE_LENGTH: 200,
  MAX_USER_MESSAGE_LENGTH: 300,
} as const;

/**
 * 【メッセージテンプレート】: セキュアで一貫性のあるエラーメッセージ
 * 【セキュリティ考慮】: 機密情報の漏洩防止と攻撃者への情報提供を最小化
 */
export const ERROR_MESSAGES = {
  // 【入力値エラー】: ユーザー向けの分かりやすいメッセージ
  INVALID_JOB_ID: 'ジョブIDの形式が正しくありません',
  INVALID_TIMESTAMP: 'タイムスタンプが有効な範囲を超えています',
  INVALID_DURATION: '継続時間が許可された範囲を超えています',
  INVALID_ARRAY_INPUT: '入力データの形式が正しくありません',

  // 【システムエラー】: 内部エラーの安全な表現
  NETWORK_DETECTION_UNAVAILABLE: 'ネットワーク状態の検出機能が利用できません',
  STORAGE_OPERATION_FAILED: 'データ保存処理でエラーが発生しました',
  RETRY_LIMIT_EXCEEDED: '再試行回数が上限に達しました',

  // 【フォールバック処理】: 安全な継続処理の説明
  FALLBACK_ONLINE_ASSUMPTION: 'ネットワーク状態をオンラインと仮定して処理を継続します',
  FALLBACK_CURRENT_TIME: '現在時刻を使用して処理を継続します',
  FALLBACK_FORCE_STOP: 'システム保護のため処理を強制停止しました',
} as const;

/**
 * 【パフォーマンス設定】: 処理効率と応答性能の最適化設定
 * 【メモリ管理】: メモリ使用量の制御とガベージコレクション支援
 */
export const PERFORMANCE_CONFIG = {
  // 【バッチ処理設定】: 大量データ処理の効率化
  MAX_BATCH_SIZE: 50,              // 🟡 一度に処理する最大ジョブ数
  BATCH_PROCESSING_DELAY: 10,      // 🟡 バッチ間の処理間隔（ms）

  // 【キャッシュ設定】: 計算結果の再利用による性能向上
  CACHE_TTL_MS: 60000,             // 🟡 キャッシュの有効期間（1分）
  MAX_CACHE_ENTRIES: 100,          // 🟡 キャッシュエントリの最大数

  // 【メモリ制限】: メモリ枯渇の防止
  MAX_ERROR_LOG_ENTRIES: 1000,     // 🟡 エラーログの最大保持数
  MAX_MESSAGE_QUEUE_SIZE: 500,     // 🟡 メッセージキューの最大サイズ
} as const;

/**
 * 【開発・デバッグ設定】: 開発時の利便性向上とデバッグ支援
 * 【プロダクション除外】: 本番環境では無効化される設定
 */
export const DEBUG_CONFIG = {
  // 【ログレベル設定】: 開発時の詳細ログ出力制御
  ENABLE_VERBOSE_LOGGING: false,   // 🔴 プロダクションでは必ずfalse
  ENABLE_PERFORMANCE_METRICS: false, // 🔴 性能測定の有効化

  // 【テスト支援設定】: テスト実行時の動作制御
  ENABLE_TEST_HOOKS: false,        // 🔴 テスト用フックの有効化
  TEST_ERROR_SIMULATION: false,    // 🔴 エラーシミュレーションの有効化
} as const;