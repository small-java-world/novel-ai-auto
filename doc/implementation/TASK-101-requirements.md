# TASK-101 プロンプト合成機能（TDD要件整理）

## 1. 機能の概要（EARS要件定義書・設計文書ベース）
- 🟢 何をする機能か: 共通プロンプトとプリセット固有プロンプトを自動合成し、結果をプレビュー／NovelAI UIへ適用する【REQ-101-001, REQ-101-002, REQ-101-005】
- 🟢 解決する課題: プロンプト作成者が共通部分と固有部分を分離して管理し、入力時間短縮と品質一貫性を得る【Story1/Story2】
- 🟢 想定ユーザー: プロンプト作成者／NovelAIユーザー（ユーザーストーリーの “As a” に準拠）
- 🟡 システム内での位置づけ: Popup UI での操作 → Service Worker → Content Script でDOM適用という既存アーキテクチャの中で、合成結果をDOMへ反映する中核ロジックとして動作（architecture.md「システム概要」「Content Script」）
- **参照したEARS要件**: REQ-101-001〜005, REQ-101-101〜104, REQ-101-401〜403
- **参照した設計文書**: docs/design/novelai-auto-generator/architecture.md（概要, Content Script/Popup UI 節）

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）
- 🟢 入力パラメータ: `commonPrompts.base`, `commonPrompts.negative`, `preset.positive`, `preset.negative`, `preset.parameters`（docs/spec/prompt-file-format.md, REQ-101-001/002）
- 🟢 出力値: `SynthesisResult`（positive/negative/warnings/characterCount/appliedRule を含む）【TASK-101要件書 技術仕様】
- 🟡 入出力の関係性: `synthesize(common, preset, ruleId?) → SynthesisResult`、`preview` で表示、`applyToNovelAI` でDOM反映という流れ（同要件書のクラス定義, architecture.md Content Script 節）
- 🟡 データフロー: Popup UI から Service Worker → Content Script → NovelAI DOM に合成結果が渡る（docs/design/novelai-auto-generator/dataflow.md「ユーザーインタラクションフロー」）
- **参照したEARS要件**: REQ-101-001, REQ-101-002, REQ-101-005, REQ-101-101〜103
- **参照した設計文書**: docs/spec/prompt-file-format.md, docs/design/novelai-auto-generator/dataflow.md, docs/implementation/TASK-101-prompt-synthesis-requirements.md（SynthesisRule/SynthesisResult）

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）
- 🟢 パフォーマンス: 合成処理 ≤100ms、プレビュー反映 ≤50ms、メモリ使用量 ≤合成データ×1.5【NFR-101-001〜003】
- 🟢 信頼性/セキュリティ: 成功率99%以上、文字数制限検出100%、エラー発生時の詳細ログ記録【NFR-101-101〜103】
- 🟡 互換性/制約: プロンプト2000文字上限、重複語の適切処理、特殊文字エスケープ【REQ-101-401〜403】
- 🟡 アーキテクチャ制約: Manifest V3 構成で実装し、Content Script と Popup 内で完結させる（architecture.md「アーキテクチャパターン」「コンポーネント構成」）
- 🟡 データベース制約: プロンプトセットは `chrome.storage` を通じて保持し、共通プロンプトはファイル仕様に従う（architecture.md「Storage」、prompt-file-format.md）
- 🟡 API制約: APPLY_AND_GENERATE / PROGRESS_UPDATE など既存メッセージ仕様に従う（api-endpoints.md）
- **参照したEARS要件**: NFR-101-001〜003, NFR-101-101〜103, REQ-101-401〜403
- **参照した設計文書**: architecture.md, prompt-file-format.md, api-endpoints.md

## 4. 想定される使用例（EARSEdgeケース・データフローベース）
- 🟢 基本パターン: 共通+固有プロンプトを合成→プレビュー→文字数表示→NovelAIに適用【REQ-101-001〜005】
- 🟡 データフロー: Popupでルール/プリセット選択→Service WorkerがContent Scriptへ合成依頼→DOM操作→進捗/結果メッセージ（dataflow.md）
- 🟢 エッジケース: 空文字、特殊文字、長文、無効ルール、同時合成、途中変更、メモリ不足、文字エンコーディング問題など【EDGE-101-001〜004, EDGE-101-101〜104】
- 🟢 エラーケース: 文字数超過警告、デフォルトルールへのフォールバック、ログ記録など【REQ-101-101, REQ-101-104, EDGE群】
- **参照したEARS要件**: REQ-101-101〜104, EDGE-101-001〜004, EDGE-101-101〜104
- **参照した設計文書**: docs/design/novelai-auto-generator/dataflow.md, docs/implementation/TASK-101-prompt-synthesis-requirements.md

## 5. EARS要件・設計文書との対応関係
- **参照したユーザーストーリー**: ストーリー1（効率的なプロンプト作成）、ストーリー2（プロンプトの組み合わせ）
- **参照した機能要件**: REQ-101-001〜005, REQ-101-101〜104, REQ-101-401〜403
- **参照した非機能要件**: NFR-101-001〜003, NFR-101-101〜103, NFR-101-201〜203
- **参照したEdgeケース**: EDGE-101-001〜004, EDGE-101-101〜104
- **参照した受け入れ基準**: 要件書の機能/非機能/統合テスト項目
- **参照した設計文書**:
  - **アーキテクチャ**: docs/design/novelai-auto-generator/architecture.md
  - **データフロー**: docs/design/novelai-auto-generator/dataflow.md
  - **型定義**: docs/spec/prompt-file-format.md, TASK-101要件書の `SynthesisRule` / `SynthesisResult`
  - **データベース**: architecture.md「Storage」節
  - **API仕様**: docs/design/novelai-auto-generator/api-endpoints.md

---

## 品質判定
- ✅ 高品質（要件の曖昧さなし、入出力仕様・制約条件が明確、既存設計との整合性を確認済みで実装可能性が高い）

## TODO更新
- doc/todo.md に「TDD: TASK-101 プロンプト合成機能 - Requirements 完了（品質 ✅）」として記録し、次フェーズを TestCases に設定

## 次のステップ
- 次のお勧めステップ: `/tdd-testcases TASK-101` でテストケースの洗い出しを行います。
