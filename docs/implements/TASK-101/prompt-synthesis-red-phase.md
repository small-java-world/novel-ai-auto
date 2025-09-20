# TDD Redフェーズ設計: prompt-synthesis

## 実施日
- 2025-09-20 11:05 (設計)
- 2025-09-20 11:55 (実装完了)

## 対象テストケース
- TC-101-001: デフォルトルールで共通とプリセットを合成（🟢 信頼性: REQ-101-001/002/005, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-002: プリセットファーストルールで合成（🟢 信頼性: REQ-101-003, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-003: カスタムテンプレートルールで合成（🟢 信頼性: REQ-101-003, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-004: プレビュー機能（🟢 信頼性: REQ-101-002, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-005: NovelAI UIへの適用（🟢 信頼性: REQ-101-005, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-006: 共通プロンプト未設定時の処理（🟢 信頼性: REQ-101-102, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-007: プリセット固有プロンプト未設定時の処理（🟢 信頼性: REQ-101-103, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-008: 無効な合成ルール時のデフォルトルール使用（🟢 信頼性: REQ-101-104, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-009: 文字数制限超過時の警告生成（🟢 信頼性: REQ-101-101/401, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-010: 特殊文字を含むプロンプトの処理（🟢 信頼性: REQ-101-403/EDGE-101-002, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-011: 空のプロンプト文字列の処理（🟢 信頼性: EDGE-101-001, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-012: 極端に長いプロンプトの処理（🟢 信頼性: EDGE-101-003, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-013: バリデーション機能（🟢 信頼性: REQ-101-401, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-014: 複数同時合成の独立性（🟢 信頼性: EDGE-101-101, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- TC-101-015: 文字数2000ちょうどでの処理（🟢 信頼性: REQ-101-401, docs/implementation/TASK-101-prompt-synthesis-requirements.md）

## 非機能要件テストケース
- NFR-101-001: パフォーマンス要件 - 合成処理100ms以内（🟢 信頼性: NFR-101-001, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- NFR-101-002: パフォーマンス要件 - プレビュー更新50ms以内（🟢 信頼性: NFR-101-002, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- NFR-101-003: メモリ使用量要件 - 合成データサイズの1.5倍以下（🟢 信頼性: NFR-101-003, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- NFR-101-101: 信頼性要件 - 合成処理成功率99%以上（🟢 信頼性: NFR-101-101, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- NFR-101-102: 信頼性要件 - 文字数制限検出率100%（🟢 信頼性: NFR-101-102, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- NFR-101-103: 信頼性要件 - エラー発生時の詳細ログ記録（🟢 信頼性: NFR-101-103, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- NFR-101-201: 保守性要件 - 合成ルールの設定ファイル管理（🟢 信頼性: NFR-101-201, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- NFR-101-202: 保守性要件 - 単体テスト可能な設計（🟢 信頼性: NFR-101-202, docs/implementation/TASK-101-prompt-synthesis-requirements.md）
- NFR-101-203: 保守性要件 - テストカバレッジ85%以上（🟢 信頼性: NFR-101-203, docs/implementation/TASK-101-prompt-synthesis-requirements.md）

## テスト観点
- 正方向プロンプトの連結順序（共通→プリセット、プリセット→共通、カスタムテンプレート）
- 負方向プロンプトの連結順序（共通→プリセット、プリセット→共通、カスタムテンプレート）
- 文字数カウントの正確性（positive / negative / total）
- 警告配列の内容（空、文字数超過警告、その他の警告）
- 適用されたルール ID の正確性（default, preset-first, custom, invalid-fallback）
- 未設定プロンプトの適切な処理（空文字列、undefined、null）
- 特殊文字のエスケープ処理
- 文字数制限（2000文字）の検出と警告生成

## Given-When-Then

### TC-101-001: デフォルトルールで共通とプリセットを合成
- **Given**: 共通プロンプト（base, negative）とプリセット（positive, negative, parameters）を要件仕様の代表値で準備（🟢）
- **When**: `PromptSynthesizer.synthesize(common, preset, 'default')` を呼び出し（🟢）
- **Then**: 期待される正方向/負方向の文字列、3種の文字数、警告配列長0、適用ルール ID が `default` であることを検証（🟢）

### TC-101-002: プリセットファーストルールで合成
- **Given**: 共通プロンプトとプリセットプロンプトを準備（🟢）
- **When**: `PromptSynthesizer.synthesize(common, preset, 'preset-first')` を呼び出し（🟢）
- **Then**: プリセット→共通の順序で合成され、適用ルール ID が `preset-first` であることを検証（🟢）

### TC-101-003: カスタムテンプレートルールで合成
- **Given**: 共通プロンプト、プリセットプロンプト、カスタムテンプレート `"{preset}, {common}"` を準備（🟢）
- **When**: `PromptSynthesizer.synthesize(common, preset, 'custom')` を呼び出し（🟢）
- **Then**: カスタムテンプレートに従って合成され、適用ルール ID が `custom` であることを検証（🟢）

### TC-101-004: 共通プロンプト未設定時の処理
- **Given**: 共通プロンプトが空文字列、プリセットプロンプトを準備（🟢）
- **When**: `PromptSynthesizer.synthesize(common, preset, 'default')` を呼び出し（🟢）
- **Then**: プリセット固有プロンプトのみが使用され、警告配列が空であることを検証（🟢）

### TC-101-005: プリセット固有プロンプト未設定時の処理
- **Given**: 共通プロンプト、プリセット固有プロンプトが空文字列を準備（🟢）
- **When**: `PromptSynthesizer.synthesize(common, preset, 'default')` を呼び出し（🟢）
- **Then**: 共通プロンプトのみが使用され、警告配列が空であることを検証（🟢）

### TC-101-006: 文字数制限超過時の警告生成
- **Given**: 2000文字を超える長いプロンプトを準備（🟢）
- **When**: `PromptSynthesizer.synthesize(common, preset, 'default')` を呼び出し（🟢）
- **Then**: 合成結果に文字数超過警告が含まれ、警告配列に適切なメッセージが設定されることを検証（🟢）

### TC-101-007: 無効な合成ルール時のデフォルトルール使用
- **Given**: 共通プロンプト、プリセットプロンプト、無効なルールID `'invalid'` を準備（🟢）
- **When**: `PromptSynthesizer.synthesize(common, preset, 'invalid')` を呼び出し（🟢）
- **Then**: デフォルトルールが適用され、適用ルール ID が `default` であることを検証（🟢）

### TC-101-008: 空のプロンプト文字列の処理
- **Given**: 共通プロンプト、プリセットプロンプトが空文字列を準備（🟢）
- **When**: `PromptSynthesizer.synthesize(common, preset, 'default')` を呼び出し（🟢）
- **Then**: 空文字列が返され、警告配列が空であることを検証（🟢）

### TC-101-009: 特殊文字を含むプロンプトの処理
- **Given**: 特殊文字（`,`, `;`, `[`, `]`, `{`, `}`）を含むプロンプトを準備（🟢）
- **When**: `PromptSynthesizer.synthesize(common, preset, 'default')` を呼び出し（🟢）
- **Then**: 特殊文字が適切にエスケープされ、合成結果が期待通りであることを検証（🟢）

### TC-101-010: 極端に長いプロンプトの処理
- **Given**: 10000文字を超える極端に長いプロンプトを準備（🟢）
- **When**: `PromptSynthesizer.synthesize(common, preset, 'default')` を呼び出し（🟢）
- **Then**: 合成処理が正常に完了し、適切な警告が生成されることを検証（🟢）

## 実装完了状況
- ✅ **テストファイル作成**: `src/popup/prompt-synthesis.test.ts` に24個のテストケースを実装
- ✅ **基本機能テスト**: 15個の機能要件テストケース（TC-101-001〜015）
- ✅ **非機能要件テスト**: 9個の非機能要件テストケース（NFR-101-001〜203）
- ✅ **テスト実行確認**: 全24テストケースが期待通りに失敗（Redフェーズ完了）

## 失敗条件
- 現状の実装は `PromptSynthesizer.synthesize` が `Error` を投げるため、テストは例外発生で失敗
- 期待する失敗メッセージ: `PromptSynthesizer.synthesize is not implemented yet.`
- 全24テストケースが期待通りに失敗し、Redフェーズが正常に完了

## Greenフェーズへの指針
- デフォルトルールの文字列合成と文字数カウント処理を実装
- 警告配列を初期化し、ルールメタデータ（`id`, `parameters`）を返却
- 将来的なルール切替を考慮し、ruleId に応じた分岐構造を準備
- パフォーマンス要件（100ms以内）とメモリ効率性を考慮した実装
- エラーハンドリングとログ記録機能の実装

## 実装ファイル
- **テストファイル**: `src/popup/prompt-synthesis.test.ts` (662行)
- **型定義**: テストファイル内に `CommonPrompts`, `PresetData`, `SynthesisRule`, `SynthesisResult` 等を定義
- **モッククラス**: `PromptSynthesizer` クラスのモック実装（実装前の状態）
