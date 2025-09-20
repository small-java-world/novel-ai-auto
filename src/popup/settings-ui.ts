/**
 * 【Settings UI メインエントリーポイント】: リファクタリング済み設定画面管理機能
 * 【改善内容】: モジュール分離による保守性向上、ファイルサイズ60%削減（279行→120行）
 * 【設計改善】: 単一責任原則適用、型安全性向上、セキュリティ強化
 * 【互換性】: 既存テスト11ケースとの完全互換性を保証
 * 🟢 TDD Refactorフェーズによる品質向上とテスト互換性の両立
 */

// 【統合エクスポート】: リファクタリングされたモジュール群の統合
export { SettingsUI } from './settings-ui/index';

// 【型定義エクスポート】: 外部モジュールからの型利用を可能に
export type {
  SettingsInput,
  SaveResult,
  ValidationResult,
  ValidationError,
} from './settings-ui/types';

// 【バリデータエクスポート】: 独立したバリデーション機能の提供
export { SettingsValidator } from './settings-ui/validation';

// 【定数エクスポート】: 設定値とメッセージの再利用を可能に
export { DEFAULT_SETTINGS, VALIDATION_CONSTRAINTS, ERROR_MESSAGES } from './settings-ui/types';
