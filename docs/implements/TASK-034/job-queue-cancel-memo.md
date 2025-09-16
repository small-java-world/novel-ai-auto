# TDD開発メモ: ジョブキュー/キャンセル制御

## 概要

- 機能名: ジョブキュー/キャンセル制御 (Job Queue/Cancel Control)
- 開発開始: 2025-09-16
- 現在のフェーズ: Red（失敗テスト作成完了）

## 関連ファイル

- 要件定義: `doc/implementation/TASK-034-job-queue-cancel-requirements.md`
- テストケース定義: `doc/implementation/TASK-034-job-queue-cancel-testcases.md`
- 実装ファイル: `src/utils/job-queue-manager.ts` (未実装)
- テストファイル: `src/utils/job-queue-manager.red.test.ts`

## Redフェーズ（失敗するテスト作成）

### 作成日時

2025-09-16

### テストケース

実装した7つのテストケース：

1. **TC-001**: 単枚生成（imageCount=1）の正常実行
2. **TC-002**: 複数枚生成（imageCount=3）の順次実行
3. **TC-004**: 実行中ジョブのキャンセル処理
4. **TC-005**: 不正ジョブIDでのキャンセル要求拒否
5. **TC-007**: 最小枚数（imageCount=1）の境界値処理
6. **TC-009**: ゼロ枚数（imageCount=0）の異常処理
7. **TC-010**: 同時キャンセル競合の排他制御

### テストコード

`src/utils/job-queue-manager.red.test.ts` に以下の機能テストを実装：

- **JobQueueManager インターフェース**: 複数枚生成ジョブの管理クラス
- **主要メソッド**:
  - `startJob(job: GenerationJob)`: ジョブ開始
  - `cancelJob(jobId: string)`: ジョブキャンセル
  - `handleImageReady(jobId, url, index, fileName)`: 画像完了処理
  - `getJob(jobId: string)`: ジョブ状態取得
  - `cancelAll()`: 全ジョブクリーンアップ

### 期待される失敗

現在の失敗理由：
```
Cannot resolve module './job-queue-manager' from src/utils/job-queue-manager.red.test.ts
```

実装されていないファイル：
- `src/utils/job-queue-manager.ts`
- `JobQueueManager` インターフェース
- `createJobQueueManager` ファクトリ関数

### 次のフェーズへの要求事項

Greenフェーズで実装すべき内容：

1. **JobQueueManager クラス**:
   - ジョブ状態管理（pending → running → completed/cancelled）
   - 複数枚生成の順次実行制御
   - 進捗管理とUI通知

2. **キャンセル機能**:
   - 即時キャンセル（NFR-202対応）
   - 競合状態での排他制御
   - 適切なエラーハンドリング

3. **入力検証**:
   - imageCount の境界値チェック（>= 1）
   - ジョブID の存在確認
   - 不正データの事前拒否

4. **Chrome Extension 連携**:
   - Content Script への生成指示
   - Progress Update のブロードキャスト
   - Download Image の管理

## 品質評価（Redフェーズ）

✅ **高品質**:
- テスト実行: 期待通り失敗（モジュール未実装）
- 期待値: 明確で具体的（7つのテストシナリオ）
- アサーション: 適切な検証ポイント設定
- 実装方針: JobQueueManager パターンで明確

## 技術的考慮事項

### 信頼性レベル評価
- 🟢 **青信号** (4ケース): REQ-103、NFR-202、既存型定義に基づく
- 🟡 **黄信号** (3ケース): エラーハンドリング、境界値、並行処理の推測

### 設計パターン
- **State Management**: ジョブステータスの状態遷移管理
- **Observer Pattern**: 進捗更新の通知機能
- **Queue Processing**: 順次実行による枚数制御
- **Error Recovery**: キャンセル時のリソース解放

### Chrome Extension 制約
- Service Worker でのメモリ効率的な状態管理
- Message Passing による非同期通信
- タブライフサイクルとの整合性確保

## Greenフェーズ（最小実装）

### 実装日時

2025-09-16

### 実装方針

テストケースを通すための最小限実装を採用：
- シンプルなMap-based状態管理
- 必要最小限のChrome Extension API連携
- エラーハンドリングの基本実装
- ハードコーディング許可（リファクタで改善予定）

### 実装コード

`src/utils/job-queue-manager.ts` に以下の機能を実装：

- **JobQueueManagerImpl クラス**: 核となるジョブ管理機能
- **状態管理**: Map<string, GenerationJob> による単純なストレージ
- **Chrome API連携**: tabs.sendMessage, runtime.sendMessage
- **OperationResult インターフェース**: 操作結果の標準化

### テスト結果

✅ **全7テストケースが成功**:
1. 単枚生成ジョブの正常実行
2. 複数枚生成ジョブの順次実行
3. 実行中ジョブのキャンセル処理
4. 不正ジョブIDでのキャンセル要求拒否
5. 最小枚数（1枚）の境界値処理
6. ゼロ枚数（0枚）の異常処理
7. 同時キャンセル競合の排他制御

### 課題・改善点

Refactorフェーズで改善すべき点：
1. **エラーハンドリング強化**: より詳細なエラー分類と復旧処理
2. **状態管理最適化**: メモリ効率とパフォーマンス改善
3. **Chrome API統合**: より堅牢な通信エラー処理
4. **型安全性向上**: より厳密な型チェック
5. **ログ機能追加**: デバッグとモニタリング強化

# TASK-034 ジョブキュー/キャンセル制御 TDD開発完了記録

## 確認すべきドキュメント

- `docs/implements/TASK-034/job-queue-cancel-memo.md`
- `docs/implements/TASK-034/job-queue-cancel-green-phase.md`
- `docs/implements/TASK-034/job-queue-cancel-refactor-phase.md`

## 🎯 最終結果 (2025-09-16)
- **実装率**: 100% (7/7テストケース)
- **品質判定**: 合格
- **TODO更新**: ✅完了マーク追加

## 💡 重要な技術学習
### 実装パターン
- **JobQueueManager パターン**: Map-based状態管理による効率的なジョブ追跡
- **Chrome Extension 通信**: tabs.sendMessage と runtime.sendMessage による非同期通信
- **原子的状態更新**: 競合状態対応の直接プロパティ更新パターン

### テスト設計
- **TDD Red-Green-Refactor サイクル**: 失敗テスト → 最小実装 → 品質改善の段階的アプローチ
- **Chrome API モック**: globalThis.chrome によるブラウザAPI環境の模擬
- **競合状態テスト**: Promise.all による並行キャンセル要求の検証パターン

### 品質保証
- **セキュリティ強化**: 包括的入力検証、DoS防止、ファイル名サニタイゼーション
- **メモリ管理**: TTLベース自動クリーンアップと容量制限による効率化
- **エラーハンドリング**: 構造化エラーレスポンスと詳細ログによる保守性向上

## ⚠️ 注意点
- **Chrome Extension API依存**: テスト環境では通信エラーを無視する設計
- **メモリ制限**: 大量ジョブ時のスケーラビリティ要考慮（現在は100ジョブ制限）

---
*TDD完全実装による production-ready コードを達成*