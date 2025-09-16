# TDD開発メモ: UI スケルトン/状態管理

## 概要

- 機能名: Popup UI スケルトン/状態管理
- 開発開始: 2025-01-17
- 現在のフェーズ: Red（失敗テスト作成完了）

## 関連ファイル

- 要件定義: `doc/implementation/ui-skeleton-state-management-requirements.md`
- テストケース定義: `doc/implementation/ui-skeleton-state-management-testcases.md`
- 実装ファイル: `src/popup/ui-state-manager.ts`
- テストファイル: `src/popup/ui-state-manager.red.test.ts`

## Redフェーズ（失敗するテスト作成）

### 作成日時

2025-01-17

### テストケース

以下のテストケースを実装：

1. **設定管理機能**:
   - TC-001: 初回起動時の設定デフォルト値読み込み
   - TC-002: ユーザー設定変更時の即座保存
   - TC-003: 既存設定値での起動時復元

2. **UI状態管理機能**:
   - TC-006: 待機状態でのUI表示制御
   - TC-007: 生成状態でのUI表示制御

3. **進捗表示機能**:
   - TC-008: GENERATION_PROGRESSメッセージでの進捗表示更新

4. **メッセージ通信機能**:
   - TC-004: START_GENERATIONメッセージの正常送信

5. **ログ表示機能**:
   - TC-009: ログメッセージの正常追加と表示

6. **異常系テスト**:
   - TC-010: ストレージ保存エラー時のエラーハンドリング

7. **境界値テスト**:
   - TC-014: 画像枚数最小値（1）での正常動作確認
   - TC-017: ファイル名テンプレート空文字での代替処理

### テストコード

全17テストケースのうち、主要な8テストケースを `src/popup/ui-state-manager.red.test.ts` に実装済み。

#### 主要な設計方針

1. **Chrome Extension API のモック化**:
   - `chrome.storage.local.get/set`
   - `chrome.runtime.sendMessage`
   - DOM要素の完全モック

2. **型安全性の確保**:
   - TypeScript型定義に基づいたテストデータ作成
   - インターフェース準拠の検証

3. **日本語コメント充実**:
   - 各テストケースの目的・内容・期待動作を明記
   - Given/When/Then構造での明確な段階分け
   - 信頼性レベル（🟢🟡🔴）の表示

### 期待される失敗

すべてのテストケースは `UIStateManager` クラスのメソッドが `throw new Error('method is not implemented yet')` を実行するため失敗する。

具体的な失敗メッセージ例：
```
Error: UIStateManager is not implemented yet
Error: initializeSettings is not implemented yet
Error: saveSettings is not implemented yet
Error: updateUIState is not implemented yet
```

### 次のフェーズへの要求事項

Greenフェーズで実装すべき内容：

1. **UIStateManagerクラスの基本実装**:
   - コンストラクタでDOM要素の保持
   - Chrome Storage API との連携
   - UI要素の状態制御

2. **設定管理機能**:
   - デフォルト値での初期化
   - ユーザー設定の保存・復元
   - chrome.storage.local API の活用

3. **UI状態制御機能**:
   - 待機中・生成中状態の表示切り替え
   - ボタン・進捗セクションの表示制御
   - CSS クラスとスタイルの操作

4. **進捗表示機能**:
   - プログレスバーの更新
   - 進捗テキスト・ETA表示
   - 視覚的なフィードバック提供

5. **メッセージ通信機能**:
   - chrome.runtime.sendMessage API の活用
   - START_GENERATION メッセージの送信
   - 適切なメッセージ形式の構築

6. **ログ表示機能**:
   - ログエントリの作成・追加
   - 時刻付きログの表示
   - DOM操作による動的更新

7. **エラーハンドリング**:
   - ストレージエラーの適切な処理
   - ユーザーフレンドリーなエラーメッセージ
   - システムの継続動作保証

8. **境界値対応**:
   - 最小値・最大値での安定動作
   - 空文字・null値の安全な処理
   - デフォルト値への代替処理

## Greenフェーズ（最小実装）

### 実装日時

未実装

### 実装方針

未定

### 実装コード

未実装

### テスト結果

未実行

### 課題・改善点

未定

## Refactorフェーズ（品質改善）

### リファクタ日時

未実装

### 改善内容

未定

### セキュリティレビュー

未実施

### パフォーマンスレビュー

未実施

### 最終コード

未実装

### 品質評価

未実施