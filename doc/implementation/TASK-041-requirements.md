# TDD要件定義・機能仕様の整理

TDD開発を開始します。以下の機能について要件を整理しました：

**【機能名】**: TASK-041 プロンプトプリセット読み込み/選択UI

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🟢 **機能の目的**: NovelAI Auto Generatorのポップアップ画面で、事前定義されたプロンプトプリセットをユーザーが選択可能にする機能
- 🟢 **解決する問題**: ユーザーが手入力せずにワンクリックで画像生成を開始できるようにし、手動入力の手間と入力ミスを削減
- 🟢 **想定ユーザー**: NovelAIで画像生成を行うユーザー（EARS要件定義書のユーザーストーリー1参照）
- 🟢 **システム内での位置づけ**: Popup UIコンポーネントの一部として、プリセット選択からSTART_GENERATIONメッセージ送信までの責務を担う
- **参照したEARS要件**: REQ-001 (プロンプト選択・適用要件)
- **参照した設計文書**: architecture.md のフロントエンド設計、popup.html の既存UI構造

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 入力パラメータ
- 🟢 **config/prompts.json**: プリセットデータのファイル（Preset[]型）
  - `name`: プリセット表示名（string, 1-100文字）
  - `prompt`: 生成用プロンプト（string, 5-2000文字）
  - `negative`: ネガティブプロンプト（string, 0-2000文字）
  - `parameters`: 生成パラメータ（PresetParameters型）
- 🟡 **ユーザー選択**: DOM selectエレメントからの選択値（HTMLSelectElement.value）
- 🟢 **検索・フィルタ入力**: プリセット名での絞り込み（オプション機能）

### 出力値
- 🟢 **START_GENERATIONメッセージ**: Service Workerへ送信される形式
  ```typescript
  {
    type: 'START_GENERATION',
    prompt: string,
    parameters: { seed: number, count: number, steps: number, cfgScale: number, sampler: string },
    settings: { imageCount: number, seed: number, filenameTemplate: string }
  }
  ```
- 🟢 **UI表示更新**: プリセット選択肢のDOM反映、エラーメッセージ表示

### 入出力の関係性
- 🟢 プリセット選択 → UI状態更新 → START_GENERATIONメッセージ構築・送信

**参照したEARS要件**: REQ-001, REQ-006 (メッセージ通信)
**参照した設計文書**: src/config/presets.ts のPreset型定義, src/popup/ui-state-manager.ts のstartGeneration関数

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### パフォーマンス要件
- 🟢 **応答性**: プリセット読み込み・選択はユーザーが体感できる遅延なし（<200ms）
- 🟢 **プリセット数制限**: 現実的な数（50個程度）での性能確保

### セキュリティ要件
- 🟢 **データ検証**: プリセットデータの形式検証（presets.ts validatePresets関数使用）
- 🟢 **XSS対策**: HTMLエスケープ処理（ui-state-manager.ts escapeHtml関数使用）

### 互換性要件
- 🟢 **Chrome拡張制約**: Manifest V3環境での動作保証
- 🟢 **DOM操作**: 既存popup.htmlの構造を変更せずに機能追加

### アクセシビリティ制約
- 🟢 **キーボード操作**: selectエレメントのキーボードナビゲーション対応
- 🟢 **フォーカス制御**: 検索フィルタでのフォーカス管理

**参照したEARS要件**: NFR-201 (UI要件), NFR-103 (入力サニタイズ), REQ-403 (最小権限)
**参照した設計文書**: architecture.md の主要設計決定（アクセシビリティ）

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 基本的な使用パターン
- 🟢 **正常フロー**: ポップアップ起動 → プリセット一覧表示 → プリセット選択 → 生成開始ボタン押下 → START_GENERATIONメッセージ送信
- 🟢 **検索フロー**: プリセット名での絞り込み → 対象プリセット選択 → 生成開始

### エッジケース
- 🟡 **プリセット読み込み失敗**: config/prompts.json不正・存在しない場合の案内メッセージ表示
- 🟡 **空プリセットリスト**: 有効なプリセットが0個の場合の案内とデフォルト動作
- 🟢 **選択未実施状態**: プリセット未選択での生成ボタン押下時のバリデーションエラー

### エラーケース
- 🟡 **JSON解析失敗**: ファイル読み込み・パース失敗時の代替表示
- 🟡 **メッセージ送信失敗**: chrome.runtime.sendMessage失敗時のエラーハンドリング

**参照したEARS要件**: EDGE-001 (DOM操作失敗時の処理), REQ-006 (メッセージ通信エラー)
**参照した設計文書**: src/config/presets.ts のエラーハンドリング実装

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- ユーザーストーリー1: プロンプトからワンクリック生成

### 参照した機能要件
- **REQ-001**: プロンプト選択・config/prompts.json読み込み・適用
- **REQ-006**: メッセージ通信（START_GENERATION送信）

### 参照した非機能要件
- **NFR-201**: 進捗・残枚数・直近のエラーを明確に表示
- **NFR-202**: ユーザーがいつでもキャンセルできる
- **NFR-103**: 入力サニタイズとパスインジェクション防止

### 参照したEdgeケース
- **EDGE-001**: DOM操作失敗時の処理継続・ユーザー通知

### 参照した設計文書
- **アーキテクチャ**: architecture.md のコンポーネント構成（フロントエンド・Popup UI）
- **型定義**: src/config/presets.ts のPreset型, src/popup/ui-state-manager.ts のGenerationSettings型
- **既存実装**: popup.html のselect要素, popup.js のSTART_GENERATIONメッセージ送信ロジック

## 品質判定

✅ **高品質**:
- 要件の曖昧さ: なし（EARS要件REQ-001に基づく明確な仕様）
- 入出力定義: 完全（既存TypeScript型定義を活用）
- 制約条件: 明確（Chrome拡張環境・アクセシビリティ・セキュリティ）
- 実装可能性: 確実（既存UI基盤とプリセット管理機能を活用）

## 次のステップ

**次のお勧めステップ**: `/tdd-testcases` でテストケースの洗い出しを行います。