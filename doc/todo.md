# TODO

### 更新履歴（自動）
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
