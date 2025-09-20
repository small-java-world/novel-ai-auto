# TASK-101 プロンプト合成機能 テストケース

## 正常系テストケース（基本動作）

### TC-101-001: デフォルトルールで共通とプリセットを合成
- **テスト名**: デフォルトルールで共通とプリセットを合成
  - **何をテストするか**: `PromptSynthesizer.synthesize` がデフォルトルールで共通プロンプトとプリセット固有プロンプトを順序通りに連結するか
  - **期待される動作**: 正方向は共通→固有、負方向は共通→固有で合成され、警告なしで `SynthesisResult` を返す
- **入力値**: 
  - `commonPrompts.base = "masterpiece, best quality"`
  - `commonPrompts.negative = "low quality, blurry"`
  - `preset.positive = "1girl, blue hair"`
  - `preset.negative = "bad hands"`
  - `preset.parameters = { steps: 28, cfgScale: 7 }`
  - `ruleId = "default"`
  - **入力データの意味**: 典型的な共通プロンプトとプリセットを使用してデフォルト挙動を確認
- **期待される結果**: 
  - `result.positive === "masterpiece, best quality, 1girl, blue hair"`
  - `result.negative === "low quality, blurry, bad hands"`
  - `result.characterCount.total` が個々の長さ合計と一致
  - `result.warnings` が空配列
  - `result.appliedRule.id === "default"`
  - **期待結果の理由**: REQ-101-001/002/005 で定義された基本合成仕様と `SynthesisResult` 型定義に基づく
- **テストの目的**: デフォルトルールの合成仕様が要件通りかを保証
  - **確認ポイント**: 連結順序・文字数集計・適用ルール識別子の一貫性
- 🟢 参照資料: REQ-101-001, REQ-101-002, REQ-101-005, docs/spec/prompt-file-format.md, docs/implementation/TASK-101-prompt-synthesis-requirements.md

### TC-101-002: プリセット優先ルールで順序を入れ替える
- **テスト名**: プリセット優先ルールで順序を入れ替える
  - **何をテストするか**: `parameters.order = 'preset-first'` のルールが正方向の合成順をプリセット→共通に変更するか
  - **期待される動作**: 正方向の文字列がプリセット語句で開始し、`appliedRule.id` が該当ルールを指す
- **入力値**:
  - `commonPrompts.base = "masterpiece"`
  - `preset.positive = "1girl"`
  - `rule.parameters.order = 'preset-first'`
  - **入力データの意味**: 最小限の語句で順序変更を可視化
- **期待される結果**:
  - `result.positive` が `"1girl, masterpiece"` 形式
  - `result.appliedRule.parameters.order === 'preset-first'`
  - `result.warnings` が空
  - **期待結果の理由**: REQ-101-003 と合成ルール仕様により順序変更が許可されるため
- **テストの目的**: ルールごとの順序制御が働くことを確認
  - **確認ポイント**: 順序・区切り文字・適用ルールメタデータ
- 🟢 参照資料: REQ-101-003, docs/implementation/TASK-101-prompt-synthesis-requirements.md, docs/spec/prompt-file-format.md

### TC-101-003: カスタムテンプレートでプレースホルダーを展開
- **テスト名**: カスタムテンプレートでプレースホルダーを展開
  - **何をテストするか**: `customTemplate` に `{common}` と `{preset}` を含めた場合にテンプレート通りの文字列が生成されるか
  - **期待される動作**: 正方向文字列がカスタムテンプレート (`"{preset} :: {common}"`) に従い整形される
- **入力値**:
  - `commonPrompts.base = "masterpiece"`
  - `preset.positive = "1girl"`
  - `rule.parameters = { order: 'custom', customTemplate: "{preset} :: {common}", separator: " | " }`
  - **入力データの意味**: UI プレビューのプレースホルダー仕様 (docs/implementation/TASK-101-prompt-synthesis-requirements.md) を再現
- **期待される結果**:
  - `result.positive === "1girl :: masterpiece"`
  - `result.appliedRule.parameters.customTemplate` がそのまま返却
  - `warnings` 空
  - **期待結果の理由**: カスタムテンプレート欄のプレースホルダー仕様に基づく
- **テストの目的**: テンプレート機能が UI 仕様通りに適用されるかを検証
  - **確認ポイント**: テンプレート適用順位・デフォルト区切りの無視・プレースホルダー展開
- 🟡 参照資料: docs/implementation/TASK-101-prompt-synthesis-requirements.md (UI 仕様)。テンプレート適用方法は仕様推測のため黄信号

### TC-101-004: プレビュー関数がリアルタイム結果を返す
- **テスト名**: プレビュー関数がリアルタイム結果を返す
  - **何をテストするか**: `preview` が `synthesize` と同等の結果を返し、状態を変化させずに UI 表示更新に使えるか
  - **期待される動作**: `preview(common, preset)` の戻り値が `synthesize` の結果と一致し、警告・文字数情報が即時取得できる
- **入力値**: TC-101-001 と同じデータセットを使用
  - **入力データの意味**: プレビューと本番結果の差異がないことを確認するため同一入力を使用
- **期待される結果**:
  - `previewResult` と `synthesizeResult` の `positive`, `negative`, `characterCount`, `warnings` が一致
  - 内部状態変更 (保存や DOM 適用) が発生しないことを spy/stub で確認
  - **期待結果の理由**: REQ-101-002 (リアルタイムプレビュー) が `SynthesisResult` を通じて満たされるべきため
- **テストの目的**: プレビューの無副作用性と整合性を担保
  - **確認ポイント**: 戻り値比較・副作用抑制
- 🟢 参照資料: REQ-101-002, docs/implementation/TASK-101-prompt-synthesis-requirements.md

### TC-101-005: 合成結果を NovelAI UI に適用
- **テスト名**: 合成結果を NovelAI UI に適用
  - **何をテストするか**: `applyToNovelAI(result)` が `chrome.runtime.sendMessage` 経由で `APPLY_PROMPT` を連携し、成功レスポンスを処理するか
  - **期待される動作**: DOM 適用用メッセージに `prompt=result.positive`, `parameters=preset.parameters` が含まれ、成功レスポンスで `success: true` が返る
- **入力値**: TC-101-001 の `SynthesisResult` と `preset.parameters`
  - **入力データの意味**: 標準的な成功フローを再現
- **期待される結果**:
  - `chrome.runtime.sendMessage` が `{ type: 'APPLY_PROMPT', prompt: result.positive, parameters }` を受信
  - レスポンス `success: true` 時に Promise resolve
  - エラーログが出力されない
  - **期待結果の理由**: REQ-101-005 と API 仕様 (APPLY_AND_GENERATE メッセージ) に従う
- **テストの目的**: 合成ロジックと DOM 適用フローの結合点を保証
  - **確認ポイント**: 送信メッセージのペイロード・レスポンス処理・エラー伝播なし
- 🟢 参照資料: REQ-101-005, docs/design/novelai-auto-generator/api-endpoints.md, src/content.ts

## 異常系テストケース（エラーハンドリング）

### TC-101-101: 共通プロンプト未設定時にプリセットのみ合成
- **テスト名**: 共通プロンプト未設定時にプリセットのみ合成
  - **エラーケースの概要**: `commonPrompts.base` と `commonPrompts.negative` が空の場合のフォールバック
  - **エラー処理の重要性**: 共通プロンプトが未定義でも生成を継続し、一貫性ある動作を保証
- **入力値**:
  - `commonPrompts.base = ""`
  - `preset.positive = "1girl"`
  - **不正な理由**: 必須入力 (共通プロンプト) が欠落
  - **実際の発生シナリオ**: 新規セットアップ時に共通プロンプトが未登録のケース
- **期待される結果**:
  - `result.positive === "1girl"`
  - `warnings` に "common prompt missing" 相当の文言
  - `appliedRule.id === 'default'`
  - **エラーメッセージの内容**: ユーザーに入力不足を知らせる警告文
  - **システムの安全性**: 例外を投げずにフォールバックし続行
- **テストの目的**: REQ-101-102 のフォールバック処理を検証
  - **品質保証の観点**: フォールバック時のユーザーフィードバックと安全な継続
- 🟡 参照資料: REQ-101-102 (フォールバック定義)。警告文具体表現は仕様推測のため黄信号

### TC-101-102: プリセット未設定時に共通プロンプトのみ適用
- **テスト名**: プリセット未設定時に共通プロンプトのみ適用
  - **エラーケースの概要**: プリセットの正方向・負方向が空の状態
  - **エラー処理の重要性**: プリセット欠落時でも既存共通プロンプトで生成を継続する必要
- **入力値**:
  - `preset.positive = ""`, `preset.negative = ""`
  - **不正な理由**: プリセット側の必須情報欠落
  - **実際の発生シナリオ**: プリセット定義ミスや読み込み失敗
- **期待される結果**:
  - `result.positive === commonPrompts.base`
  - `warnings` にプリセット欠落の通知
  - `characterCount.positive` が共通のみの長さ
  - **エラーメッセージの内容**: プリセット不足を伝える
  - **システムの安全性**: 例外なく継続
- **テストの目的**: REQ-101-103 のフォールバック確認
  - **品質保証の観点**: 欠落データ時の安全な継続
- 🟡 参照資料: REQ-101-103。警告文の具体化は推定

### TC-101-103: 無効な合成ルールIDでデフォルトにフォールバック
- **テスト名**: 無効な合成ルールIDでデフォルトにフォールバック
  - **エラーケースの概要**: `ruleId = "unknown"` の場合
  - **エラー処理の重要性**: 不正なルール指定でも安全に既定ルール適用
- **入力値**:
  - `ruleId = "unknown"`
  - **不正な理由**: 登録されていないルール ID
  - **実際の発生シナリオ**: 設定ファイル破損や UI 側の不整合
- **期待される結果**:
  - `result.appliedRule.id === "default"`
  - `warnings` にフォールバック通知
  - **エラーメッセージの内容**: 無効ルールを示す
  - **システムの安全性**: 例外なし
- **テストの目的**: REQ-101-104 のフォールバックを検証
  - **品質保証の観点**: 誤設定時の堅牢性
- 🟡 参照資料: REQ-101-104。警告メッセージ文面は推測

### TC-101-104: DOM 未検出時に applyToNovelAI がエラーを戻す
- **テスト名**: DOM 未検出時に applyToNovelAI がエラーを戻す
  - **エラーケースの概要**: Content Script がプロンプト入力を特定できない (`DOM_NOT_FOUND`)
  - **エラー処理の重要性**: ユーザーへ DOM 解決エラーを通知し安全に停止する必要
- **入力値**:
  - `chrome.runtime.sendMessage` が `{ success: false, error: 'Prompt input not found', attemptedSelectors: [...] }` を返すようスタブ
  - **不正な理由**: NovelAI UI 変更などで DOM セレクタが無効
  - **実際の発生シナリオ**: NovelAI 側の UI アップデート
- **期待される結果**:
  - `applyToNovelAI` が例外 (Rejected Promise) または `ApplicationResult.success === false`
  - エラーメッセージに試行したセレクタ一覧が含まれる
  - **エラーメッセージの内容**: `content.ts` の `DOMSelectorError` 形式
  - **システムの安全性**: DOM 書き込みを行わず終了
- **テストの目的**: DOM 解決失敗時のエラーパスを確認
  - **品質保証の観点**: UI 変更時の障害検知とログ保全
- 🟢 参照資料: src/content.ts (DOMSelectorError), docs/design/novelai-auto-generator/api-endpoints.md (ERROR メッセージ)

## 境界値テストケース（最小値・最大値・特殊条件）

### TC-101-201: 文字数2000ちょうどで警告無し
- **テスト名**: 文字数2000ちょうどで警告無し
  - **境界値の意味**: NovelAI のプロンプト上限 (REQ-101-401)
  - **境界値での動作保証**: 上限ちょうどでも警告を出さず許容
- **入力値**:
  - `commonPrompts.base = "a" * 1000`
  - `preset.positive = "b" * 1000`
  - **境界値選択の根拠**: 合計 2000 文字で閾値
  - **実際の使用場面**: 長文プロンプトを最大許容で使用
- **期待される結果**:
  - `characterCount.total === 2000`
  - `warnings` は空
  - `validateResult(result).valid === true`
  - **境界での正確性**: カウントが正確で、閾値内は許容
  - **一貫した動作**: 閾値内は成功、超過時のみ警告
- **テストの目的**: 上限値での正常動作を確認
  - **堅牢性の確認**: 上限値でも処理が遅延/失敗しない
- 🟢 参照資料: REQ-101-401, docs/implementation/TASK-101-prompt-synthesis-requirements.md

### TC-101-202: 2001文字で警告とバリデーションエラー
- **テスト名**: 2001文字で警告とバリデーションエラー
  - **境界値の意味**: 上限超過時の挙動
  - **境界値での動作保証**: 超過時に警告とバリデーション NG
- **入力値**:
  - `commonPrompts.base = "a" * 1001`
  - `preset.positive = "b" * 1000`
  - **境界値選択の根拠**: 合計 2001 文字で 1 文字超過
  - **実際の使用場面**: 大量タグで閾値を超えるケース
- **期待される結果**:
  - `warnings` に文字数超過の文言
  - `validateResult(result).valid === false` と `reason === 'CHAR_LIMIT_EXCEEDED'`
  - **境界での正確性**: 超過分が検知される
  - **一貫した動作**: 超過時は適用拒否
- **テストの目的**: 文字数制限の厳密チェック
  - **堅牢性の確認**: 超過時の警告&バリデーション一致
- 🟢 参照資料: REQ-101-101, NFR-101-003, docs/implementation/TASK-101-prompt-synthesis-requirements.md

### TC-101-203: 空文字入力時にトリムされた結果を返す
- **テスト名**: 空文字入力時にトリムされた結果を返す
  - **境界値の意味**: 最小入力値
  - **境界値での動作保証**: 空文字は安全に処理
- **入力値**:
  - `commonPrompts.base = ""`
  - `preset.positive = ""`
  - **境界値選択の根拠**: EDGE-101-001 に対応
  - **実際の使用場面**: ユーザーがクリア操作を実行
- **期待される結果**:
  - `result.positive === ""`
  - `warnings` に空入力通知
  - `validateResult(result).valid === true`
  - **境界での正確性**: 空文字をそのまま許容
  - **一貫した動作**: 空→許容、非空→通常処理
- **テストの目的**: 空入力の安全処理
  - **堅牢性の確認**: 例外なしで処理継続
- 🟡 参照資料: EDGE-101-001。警告表現は推測

### TC-101-204: 特殊文字を含むプロンプトのエスケープ確認
- **テスト名**: 特殊文字を含むプロンプトのエスケープ確認
  - **境界値の意味**: エンコーディング問題 (EDGE-101-104) 対応
  - **境界値での動作保証**: 特殊文字が欠落/二重エスケープしない
- **入力値**:
  - `commonPrompts.base = "<tag>&amp;"`
  - `preset.positive = '"quote"'`
  - **境界値選択の根拠**: HTML/JSON で問題になりやすい文字の組合せ
  - **実際の使用場面**: タグに記号を含めるプロンプト
- **期待される結果**:
  - `result.positive` に `<tag>&amp;, "quote"` が正しく含まれる
  - ダブルエスケープや欠落が無い
  - `warnings` にエスケープ成功を報告 (必要なら)
  - **境界での正確性**: 文字列が正確に保持
  - **一貫した動作**: 特殊文字でも通常処理
- **テストの目的**: REQ-101-403 の特殊文字処理を検証
  - **堅牢性の確認**: 文字化け/例外が発生しない
- 🟢 参照資料: REQ-101-403, docs/spec/prompt-file-format.md (特殊文字要件)

### TC-101-205: 複数同時合成が独立して完了する
- **テスト名**: 複数同時合成が独立して完了する
  - **境界値の意味**: 同時実行 (EDGE-101-101)
  - **境界値での動作保証**: 並列処理でも結果が混ざらない
- **入力値**:
  - `Promise.all` で異なるプリセット2件を同時に `synthesize`
  - **境界値選択の根拠**: 同時実行を再現
  - **実際の使用場面**: ユーザーが連続でプリセットを切り替え
- **期待される結果**:
  - それぞれの `result.appliedRule` と `positive` が入力に対応
  - 内部キャッシュが干渉せず警告無し
  - **境界での正確性**: 各 Promise の結果が正しい
  - **一貫した動作**: 並列数に依存しない
- **テストの目的**: 合成ロジックのスレッドセーフ性確認
  - **堅牢性の確認**: レースコンディション防止
- 🟢 参照資料: EDGE-101-101, docs/implementation/TASK-101-prompt-synthesis-requirements.md

## テスト実装言語・フレームワーク
- **プログラミング言語**: TypeScript
  - **言語選択の理由**: 既存コードベースが TypeScript (src/ 以下) であり、型定義 `SynthesisResult` 等が提供されているため整合性が高い
  - **テストに適した機能**: 型補完・ESM サポート・`happy-dom` などのテストユーティリティと親和
- **テストフレームワーク**: Vitest
  - **フレームワーク選択の理由**: `package.json` で `vitest` が標準テストランナーとして設定済み (`npm run test`)
  - **テスト実行環境**: `vitest.config.ts` + `happy-dom` による DOM シミュレーション環境
- 🟢 参照資料: package.json (scripts/test), vitest.config.ts, 既存テスト資産

## テストケース実装時の日本語コメント指針

```javascript
// 【テスト目的】: [このテストで何を確認するかを日本語で明記]
// 【テスト内容】: [具体的にどのような処理をテストするかを説明]
// 【期待される動作】: [正常に動作した場合の結果を説明]
// 🟢🟡🔴 この内容の信頼性レベルを記載
```

```javascript
// 【テストデータ準備】: [なぜこのデータを用意するかの理由]
// 【初期条件設定】: [テスト実行前の状態を説明]
// 【前提条件確認】: [テスト実行に必要な前提条件を明記]
```

```javascript
// 【実際の処理実行】: [どの機能/メソッドを呼び出すかを説明]
// 【処理内容】: [実行される処理の内容を日本語で説明]
// 【実行タイミング】: [なぜこのタイミングで実行するかを説明]
```

```javascript
// 【結果検証】: [何を検証するかを具体的に説明]
// 【期待値確認】: [期待される結果とその理由を説明]
// 【品質保証】: [この検証がシステム品質にどう貢献するかを説明]
```

```javascript
// 【検証項目】: [この検証で確認している具体的な項目]
// 🟢🟡🔴 この内容の信頼性レベルを記載
expect(result.validPaths).toHaveLength(2); // 【確認内容】: 有効なパスが正確に2つ検出されることを確認
expect(result.invalidPaths).toContain('nonexistent.json'); // 【確認内容】: 存在しないファイルが無効パスとして適切に分類されることを確認
```

```javascript
beforeEach(() => {
  // 【テスト前準備】: [各テスト実行前に行う準備作業の説明]
  // 【環境初期化】: [テスト環境をクリーンな状態にする理由と方法]
});

afterEach(() => {
  // 【テスト後処理】: [各テスト実行後に行うクリーンアップ作業の説明]
  // 【状態復元】: [次のテストに影響しないよう状態を復元する理由]
});
```
