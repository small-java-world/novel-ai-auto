# TODO

### 更新履歴（自動）
- 2025-09-20: TDD: TASK-101 プロンプト合成機能 - Refactor 完了（品質✅）
  - 品質判定: ✅ 高品質（セキュリティ・パフォーマンスレビューで問題がなく、DRYかつ拡張性ある構造に改善）
  - 次のフェーズを追加: Verifyフェーズ（完全性検証）開始予定 → コマンド /tdd-verify-complete prompt-synthesis

- 2025-09-20: TDD: TASK-101 プロンプト合成機能 - Green 完了（品質✅）
  - 品質判定: ✅ 高品質（最小実装でテスト合格、要件通りの合成処理が確認済み）
  - 次のフェーズを追加: Refactorフェーズ（品質改善）開始予定 → コマンド /tdd-refactor prompt-synthesis

- 2025-09-20: TDD: TASK-101 プロンプト合成機能 - Red 完了（品質✅）
  - 品質判定: ✅ 高品質（失敗テストが要件仕様を正確にカバーし、期待値と実装指針が明確）
  - 次のフェーズを追加: Greenフェーズ（最小実装）開始予定 → コマンド /tdd-green prompt-synthesis

- 2025-09-20: TDD: TASK-101 プロンプト合成機能 - TestCases 完了（品質✅）
  - 品質判定: ✅ 高品質（正常/異常/境界を網羅し、期待値と参照資料を明文化）
  - 次のフェーズを追加: Redフェーズ（失敗テスト作成）開始予定 → コマンド /tdd-red prompt-synthesis

- 2025-09-20: TDD: TASK-101 プロンプト合成機能 - Requirements 完了（品質✅）
  - 品質判定: ✅ 高品質（要件の曖昧さなし、入出力仕様・制約条件が明確、既存設計との整合性を確認済みで実装可能性が高い）
  - 次のフェーズを追加: TestCasesフェーズ（テストケース設計）開始予定 → コマンド `/tdd-testcases prompt-synthesis`

- 2025-09-15: テストケース洗い出し completed（messaging-router）
  - 品質判定: ✅ 高品質（正常系/異常系/境界値を網羅、TS+Vitest 確定、実装可能）
  - 次のフェーズを追加: Redフェーズ（失敗テスト作成）開始予定 → コマンド `/tdd-red messaging-router`

## TDD: messaging-router�i���b�Z�[�W���[�^/�v���g�R�������j

- ���: �e�X�g�P�[�X�􂢏o�� ���� ?�imessaging-router-testcases.md �ǉ��j
- ����: ����/�ُ�/���E��ԗ��B�����e�X�g�Ɨv���ɐ����B�o�b�N�I�t/�T�j�^�C�Y/�������𖾊m���B
- �i������: ���i���i���ޖԗ��A���Ғl���m�ATS+Vitest�m��A�����\�j
- �ύX: `doc/implementation/messaging-router-requirements.md`�i�v���j�ɑ��� `doc/implementation/messaging-router-testcases.md`�i�e�X�g�j��ǉ�
- ���A�N�V�����iRed�t�F�[�Y�J�n�j:
  - [/tdd-red] ���s�e�X�g�̍쐬�imessaging-router�j
  - �D��: PROGRESS_UPDATE �`���AIMAGE_READY��DOWNLOAD_IMAGE�A���m/�s��payload���ہADL���s�o�b�N�I�t���
  - ���l: storage �֘A�̖������e�X�g�͕ʃ^�X�N�ŊǗ�

## TDD: file-name-template-sanitization（ファイル名テンプレート/サニタイズ）

- 現在のTODO: テストケース洗い出し → completed
- 反映: `doc/implementation/file-name-template-sanitization-testcases.md` を追加
- 品質判定: 高品質（正常/異常/境界網羅、期待値明確、TS+Vitest、実装容易）
- 次のフェーズ: Redフェーズ（失敗テスト作成） → completed（`src/utils/fileNameTemplate.red.test.ts` 追加）
- 次のフェーズ: Greenフェーズ（最小実装） → completed（`generateSanitizedFileName` 追加）
- 次のフェーズ: Refactorフェーズ（品質改善） → completed（内部型導入・コメント強化）
- 検証: テスト実装率 83%（15/18）→ 追加テストを要検討
- 未実装テスト候補:
  - forbiddenChars/replacement カスタマイズ（正常）
  - ちょうど maxLength の非切り詰め（境界）
  - 長い拡張子ケースで非保持分岐（境界）
  - idx=0 → 1 フォールバック（境界, 要仕様合意）
- 次アクション: 追加テスト実装を行うか要判断（実施なら `/tdd-testcases file-name-template-sanitization` の追補 → `/tdd-red`）

### TDD: file-name-template-sanitization ✅ 完了 (TDD開発完了 - 追加4テスト含む全テスト合格)

- [x] テストケース洗い出し
- [x] Redフェーズ（失敗テスト作成）
- [x] Greenフェーズ（最小実装）
- [x] Refactorフェーズ（品質改善）
- [x] Verify（完全性検証）


## TDD: download-handler（ダウンロードハンドラー） ✅ **完了** (TDD開発完了 - 6テストケース全通過)

- [x] テストケース作成（6件）
- [x] Red（失敗テスト先行）
- [x] Green（最小実装で合格）
- [x] Refactor（品質改善・Abort対応強化・メッセージ整流化）
- [x] Verify（完全性検証、要件網羅 100%）

### TDD: TASK-023 Image URL Extraction（画像URL抽出） ✅ **完了** (TDD開発完了 - 11テストケース全通過)

- [x] Red（失敗テスト作成）
- [x] Green（最小実装）
- [x] Refactor（アーキテクチャ改善・セキュリティ強化・パフォーマンス最適化）
- [x] Verify（完全性検証、要件網羅 100%）

### TDD: TASK-041 プロンプトプリセット読み込み/選択UI ✅ **完了** (TDD開発完了 - 5テストケース全通過)

- [x] Requirements（要件定義、8項目の主要機能要件明確化）
- [x] TestCases（テストケース設計、10個のテストケース仕様作成）
- [x] Red（失敗テスト作成、PresetSelectorクラス実装前の意図的失敗）
- [x] Green（最小実装、全テストケース通過の機能実装）
- [x] Refactor（品質改善、XSS対策・適応型検索・構造化エラー処理）
- [x] Verify（完全性検証、要件網羅率100%・production-ready品質達成）

### TDD: TASK-042 設定UI（seed/count/テンプレート/リトライ） ✅ **完了** (TDD開発完了 - 11テストケース全通過)

- [x] Requirements（要件定義、10項目の主要機能要件明確化）
- [x] TestCases（テストケース設計、11個のテストケース仕様作成）
- [x] Red（失敗テスト作成、SettingsUIクラス実装前の意図的失敗）
- [x] Green（最小実装、全テストケース通過の機能実装）
- [x] Refactor（品質改善、モジュール分離・セキュリティ強化・60%コード削減）
- [x] Verify（完全性検証、要件網羅率100%・テスト互換性100%維持）

### TDD: TASK-070 ログイン要求の検出と再開 ✅ **完了** (TDD開発完了 - 13テストケース全通過)

- [x] Requirements（要件定義、EARS要件REQ-102・EDGE-004に基づく明確化）
- [x] TestCases（テストケース設計、13個のテストケース仕様作成）
- [x] Red（失敗テスト作成、LoginDetectionManagerクラス実装前の意図的失敗）
- [x] Green（最小実装、全テストケース通過の機能実装）
- [x] Refactor（品質改善、設定分離・DOMキャッシュ・セキュリティ強化・586行高品質実装）
- [x] Verify（完全性検証、要件網羅率100%・実装率100%・品質判定合格）

### TDD: TASK-071 Network Recovery Handler (オフライン/復帰ハンドリング) ✅ **完了** (TDD開発完了 - 13テストケース全通過)

- [x] Requirements（要件定義、EARS要件EDGE-002に基づくネットワーク状態監視機能明確化）
- [x] TestCases（テストケース設計、13個のテストケース仕様作成 - 正常系5・異常系4・境界値4）
- [x] Red（失敗テスト作成、Network Recovery Handler実装前の意図的失敗）
- [x] Green（最小実装、全テストケース通過の機能実装）
- [x] Refactor（品質改善、セキュリティ強化・モジュール化・DRY原則適用・4モジュール構成）
- [x] Verify（完全性検証、要件網羅率100%・実装率100%・セキュリティ強化・production-ready品質達成）

### TDD: TASK-073 境界値テスト統合（文字数/枚数システム全体） ✅ **完了** (TDD開発完了 - 11テストケース全通過)

- [x] Requirements（要件定義、EDGE-101/102/104の境界値要件明確化）
- [x] TestCases（テストケース設計、11個のテストケース仕様作成 - 正常系3・異常系4・組み合わせ4）
- [x] Red（失敗テスト作成、境界値テスト統合実装前の意図的失敗）
- [x] Green（最小実装、全テストケース通過の機能実装）
- [x] Refactor（品質改善、モジュール分離・定数外部化・73%コード削減・4ファイル構成）
- [x] Verify（完全性検証、要件網羅率100%・実装率100%・EARS要件完全準拠）
## TDD: TASK-081 E2Eテスト（End-to-End）

- [x] Requirements（要件定義済み・品質判定: ⚠️→修正後 ✅ 高品質）
- [x] TestCases（今回完了・品質判定: ✅ 高品質）
- [ ] Redフェーズ（失敗テスト作成）
- [ ] Greenフェーズ（実装）
- [ ] Refactorフェーズ（改善）
- [ ] Verifyフェーズ（総合検証）

次のコマンド候補: /tdd-red TASK-081

### TDD: TASK-100 ローカルファイル選択機能 ✅ **完了** (TDD開発完了 - 11テストケース全通過)

- [x] Requirements（要件定義、8項目の主要機能要件明確化）
- [x] TestCases（テストケース設計、11個のテストケース仕様作成）
- [x] Red（失敗テスト作成、ローカルファイル選択機能実装前の意図的失敗）
- [x] Green（最小実装、全テストケース通過の機能実装）
- [x] Refactor（品質改善、関数分離・型安全性強化・セキュリティ強化・383行高品質実装）
- [x] Verify（完全性検証、要件網羅率100%・実装率100%・品質判定合格）

## TDD: TASK-101 プロンプト合成機能（プロンプト合成ロジック）

- 現状のTODO: Refactor 完了（品質✅）
- 参照ドキュメント: docs/implementation/TASK-101-prompt-synthesis-requirements.md, docs/design/novelai-auto-generator/architecture.md, docs/design/novelai-auto-generator/dataflow.md
- 品質判定: ✅ 高品質（分類網羅・期待値明確・技術選択確定・実装可能性確認済み）
- 次のフェーズ: Verifyフェーズ（完全性検証）開始予定 → コマンド /tdd-verify-complete prompt-synthesis
- メモ: Verifyフェーズでカバレッジ・警告生成要件の検証と追加テスト観点の洗い出しを実施する

