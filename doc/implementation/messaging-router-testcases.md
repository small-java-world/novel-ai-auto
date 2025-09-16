# TDDテストケース洗い出し: messaging-router

本ドキュメントは、Service Worker のメッセージルータである messaging-router のテストケース一覧です。要件定義・設計（docs/design/novelai-auto-generator/*）と既存実装・テスト（src/router/messagingRouter.ts, src/messaging-router.test.ts）に基づきます。

## 1. 正常系テストケース（基本的な動作）

- テスト名: START_GENERATION を CS に橋渡し（APPLY_AND_GENERATE 送信）
  - 何をテストするか: START_GENERATION を受理し、対象タブを特定して CS へ APPLY_AND_GENERATE を送る
  - 期待される動作: `chrome.tabs.query` でタブ特定→`chrome.tabs.sendMessage(tabId,{ type:'APPLY_AND_GENERATE', payload:{ job }})` を1回送信
  - 入力値: `{ type:'START_GENERATION', payload:{ job:{ id:'uuid-1', prompt:'p', params:{ steps:28 }}}}`
    - 入力データの意味: 最小限の正当なジョブ
  - 期待される結果: `tabs.sendMessage` が期待payloadで1回呼ばれる
    - 期待結果の理由: 機能要件 REQ-006/データフローの基本経路
  - テストの目的: 基本ルーティングの成立確認
    - 確認ポイント: 送信先タブID・メッセージshape・呼び出し回数
  - 信頼性: 🟢（既存テスト・設計一致）

- テスト名: PROGRESS_UPDATE を Popup へ即時ブロードキャスト
  - 何をテストするか: 受理した進捗をそのまま runtime 経由で転送
  - 期待される動作: `chrome.runtime.sendMessage({ type:'PROGRESS_UPDATE', payload })` を1回呼び出し（タイマー未使用）
  - 入力値: `{ type:'PROGRESS_UPDATE', payload:{ jobId:'j1', status:'running', progress:{ current:1, total:3, etaSeconds:20 }}}`
    - 入力データの意味: 一般的な進捗イベント
  - 期待される結果: runtime.sendMessage が同一payloadで1回呼ばれる
    - 期待結果の理由: NFR-002 目標の低レイテンシ経路
  - テストの目的: 進捗表示の即時性検証
    - 確認ポイント: 呼び出し回数、payload透過、タイマー未使用
  - 信頼性: 🟢

- テスト名: IMAGE_READY で DOWNLOAD_IMAGE を即時指示
  - 何をテストするか: 画像URLとファイル名を受理して DL を指示
  - 期待される動作: `chrome.runtime.sendMessage({ type:'DOWNLOAD_IMAGE', payload:{ url, fileName }})` が即時呼ばれる
  - 入力値: `{ type:'IMAGE_READY', payload:{ jobId:'j1', url:'https://ex.com/a.png', index:0, fileName:'a.png' }}`
    - 入力データの意味: 正常な画像ダウンロード指示
  - 期待される結果: DOWNLOAD_IMAGE 送信1回、タイマー未使用
    - 期待結果の理由: 画像準備後の自動保存要件 REQ-004
  - テストの目的: 完了通知→保存の経路成立
    - 確認ポイント: URL/ファイル名の透過性と即時性
  - 信頼性: 🟢

- テスト名: OPEN_OR_FOCUS_TAB（既存タブがあればフォーカス）
  - 何をテストするか: 既存 NovelAI タブがある場合、create せず update(active:true)
  - 期待される動作: `tabs.update(id,{active:true})` を1回、`tabs.create` は未呼び出し
  - 入力値: `tabs.query` が `[ { id:77, url:'https://novelai.net/generate' } ]` を返す
    - 入力データの意味: 既存タブありの代表
  - 期待される結果: update 呼び出し1回、create 未呼び出し
    - 期待結果の理由: REQ-101 タブ制御
  - テストの目的: タブ制御要件準拠の確認
    - 確認ポイント: query 結果に応じた分岐
  - 信頼性: 🟢（既存テストあり）

- テスト名: OPEN_OR_FOCUS_TAB（タブが無ければ新規作成）
  - 何をテストするか: 既存タブが無い場合、`tabs.create` で新規作成
  - 期待される動作: `tabs.create({ url:'https://novelai.net/', active:true })` を1回
  - 入力値: `tabs.query` が `[]` を返す
    - 入力データの意味: 不在ケース
  - 期待される結果: create 呼び出し1回
    - 期待結果の理由: REQ-101 タブ制御
  - テストの目的: 起動フローの網羅
    - 確認ポイント: URL/active の妥当性
  - 信頼性: 🟢（既存テストあり）

- テスト名: 非常に長い prompt でも橋渡しされる
  - 何をテストするか: 大きな payload でも START_GENERATION→APPLY_AND_GENERATE が成立
  - 期待される動作: `tabs.sendMessage` 1回、payloadが破損せず透過
  - 入力値: prompt 長さ 10,000 文字
    - 入力データの意味: 実運用の大きなプロンプト
  - 期待される結果: 呼び出し成立・長さ保持
    - 期待結果の理由: 実運用境界の確認
  - テストの目的: 大 payload 耐性
    - 確認ポイント: 送信呼び出し成立と payload 長
  - 信頼性: 🟢（既存テストあり）

## 2. 異常系テストケース（エラーハンドリング）

- テスト名: START_GENERATION の payload 不正は ERROR(INVALID_PAYLOAD)
  - エラーケースの概要: `job` 欠落・型不整合
  - エラー処理の重要性: 不正入力の早期遮断で安定化
  - 入力値: `{ type:'START_GENERATION', payload:{} }`
    - 不正な理由: 必須 `job` 欠落（interfaces.ts）
    - 実際の発生シナリオ: 不整合なメッセージ送信
  - 期待される結果: `ERROR{ code:'INVALID_PAYLOAD' }` を Popup へ通知
    - エラーメッセージの内容: 原因を簡潔に特定
    - システムの安全性: CS への送信を行わない
  - テストの目的: 入力検証の確認
    - 品質保証の観点: 想定外入力での暴走防止
  - 信頼性: 🟢

- テスト名: PROGRESS_UPDATE の current > total は ERROR(PROGRESS_INCONSISTENT)
  - エラーケースの概要: 進捗値の矛盾
  - エラー処理の重要性: UI 表示の整合性維持
  - 入力値: `{ type:'PROGRESS_UPDATE', payload:{ jobId:'j', status:'running', progress:{ current:5, total:3 }}}`
    - 不正な理由: 定義上不整合（interfaces.ts）
    - 実際の発生シナリオ: DOM読み取り誤り等
  - 期待される結果: ERROR を送信し PROGRESS_UPDATE はブロードキャストしない
    - エラーメッセージの内容: code='PROGRESS_INCONSISTENT'
    - システムの安全性: 誤表示回避
  - テストの目的: 進捗検証の堅牢化
    - 品質保証の観点: UI の信頼性
  - 信頼性: 🟢

- テスト名: PROGRESS_UPDATE 送信先不在でも例外にしない
  - エラーケースの概要: Popup 側が一時未受信
  - エラー処理の重要性: 一時不在で処理を止めない
  - 入力値: runtime.sendMessage が `Receiving end does not exist` を返す
    - 不正な理由: 受け手不在
    - 実際の発生シナリオ: Popup 未表示
  - 期待される結果: ERROR を発行せず、内部で握り潰す
    - エラーメッセージの内容: 発さない
    - システムの安全性: ロジック継続
  - テストの目的: 一時的不整合の許容
    - 品質保証の観点: 可用性
  - 信頼性: 🟢

- テスト名: IMAGE_READY の URL 不正は ERROR(INVALID_URL)
  - エラーケースの概要: `javascript:`/`data:` 等
  - エラー処理の重要性: セキュリティ確保（NFR-103）
  - 入力値: `{ type:'IMAGE_READY', payload:{ url:'javascript:alert(1)', fileName:'x' }}`
    - 不正な理由: 非 http/https
    - 実際の発生シナリオ: 想定外値流入
  - 期待される結果: `ERROR{ code:'INVALID_URL' }` を通知、DOWNLOAD_IMAGE は送らない
    - エラーメッセージの内容: URL 不正
    - システムの安全性: 実行系 API を呼ばない
  - テストの目的: 安全なDL指示のみ通す
    - 品質保証の観点: 悪性入力の遮断
  - 信頼性: 🟢

- テスト名: DOWNLOAD_FAILED を指数バックオフで再送（最大3回）
  - エラーケースの概要: ダウンロード失敗の再試行制御
  - エラー処理の重要性: 可用性と無限再試行防止
  - 入力値: `ERROR{ code:'DOWNLOAD_FAILED', context:{ url, fileName }}` を連続投入、フェイクタイマーで 500/1000/2000ms を進める
    - 不正な理由: 一時的失敗
    - 実際の発生シナリオ: ネットワーク不安定
  - 期待される結果: 500→1000→2000ms で DOWNLOAD_IMAGE を再送、4回目は ERROR を通知して打ち切り
    - エラーメッセージの内容: `Retry attempts exhausted`
    - システムの安全性: 上限で停止
  - テストの目的: バックオフ挙動の確認
    - 品質保証の観点: 安全な再試行
  - 信頼性: 🟢（既存テスト・実装一致）

- テスト名: 不明なメッセージタイプは ERROR(UNKNOWN_MESSAGE)
  - エラーケースの概要: 未定義 type
  - エラー処理の重要性: サポート外入力の明示
  - 入力値: `{ type:'FOO', payload:{} }`
    - 不正な理由: 未定義
    - 実際の発生シナリオ: 将来拡張・誤送信
  - 期待される結果: `ERROR{ code:'UNKNOWN_MESSAGE' }` を通知
    - エラーメッセージの内容: type 名を含む
    - システムの安全性: 以降処理を行わない
  - テストの目的: フェイルファスト
    - 品質保証の観点: 誤動作防止
  - 信頼性: 🟡（妥当推測、実装準拠）

## 3. 境界値テストケース（最小値、最大値、null等）

- テスト名: fileName サニタイズで全禁止文字のみは 'image' にフォールバック
  - 境界値の意味: 入力が全て禁止文字
  - 境界値での動作保証: DOWNLOAD_IMAGE の `fileName` が `image` 始まり
  - 入力値: `fileName=':/\\*?"<>|'`
    - 境界値選択の根拠: 設計の禁止集合
    - 実際の使用場面: 不正入力混入
  - 期待される結果: `'image'` で開始するファイル名に置換
    - 境界での正確性: 空文字を許さない
    - 一貫した動作: 他は変更なし
  - テストの目的: サニタイズ下限
    - 堅牢性の確認: 任意入力で安全
  - 信頼性: 🟢（既存テスト一致）

- テスト名: fileName 長さ上限 128 で拡張子を保持して切り詰め
  - 境界値の意味: ちょうど/1超過
  - 境界値での動作保証: ベース名切り詰め、拡張子保持
  - 入力値: 128文字近傍の `name.ext`
    - 境界値選択の根拠: 設計コメント（NFR-103/EDGE-103）
    - 実際の使用場面: 長いテンプレート
  - 期待される結果: 最大長以内、拡張子残存
    - 境界での正確性: off-by-one 無し
    - 一貫した動作: 他の項目へ影響なし
  - テストの目的: 長さ制約の確認
    - 堅牢性の確認: 破損防止
  - 信頼性: 🟡（設計コメント＋実装からの推測）

- テスト名: バックオフ境界（直前/到達でのみ発火）
  - 境界値の意味: 499/500, 999/1000, 1999/2000ms
  - 境界値での動作保証: しきい値未満で未送信、到達で送信
  - 入力値: フェイクタイマーで各時刻に進める
    - 境界値選択の根拠: base=500, factor=2, attempts=0..2
    - 実際の使用場面: 再試行タイミング
  - 期待される結果: しきい値を跨いだ時点のみ再送
    - 境界での正確性: 時間計算の正確性
    - 一貫した動作: 全段で同規則
  - テストの目的: タイミング正確性
    - 堅牢性の確認: 時間管理の正しさ
  - 信頼性: 🟢（既存テスト一致）

- テスト名: タブ存在有無の分岐（空配列/1件）
  - 境界値の意味: query 結果の両極
  - 境界値での動作保証: create/update の正確な分岐
  - 入力値: `tabs.query` が `[]` と `[ { id } ]`
    - 境界値選択の根拠: 網羅性
    - 実際の使用場面: 初回/再訪
  - 期待される結果: 期待通りの API 呼び出し
    - 境界での正確性: 誤呼び出し無し
    - 一貫した動作: 常に同規則
  - テストの目的: 分岐網羅
    - 堅牢性の確認: 例外を最小化
  - 信頼性: 🟢（既存テスト一致）

## 開発言語・フレームワーク

- プログラミング言語: TypeScript
  - 言語選択の理由: 既存コードと型定義（docs/design/.../interfaces.ts）に一致し、型安全で回帰防止に有利
  - テストに適した機能: 型補完、型ガード、リテラル型でメッセージshape検証が容易
- テストフレームワーク: Vitest
  - フレームワーク選択の理由: 既存設定（vitest.config.ts, test/setup.ts）と互換、Jest互換API
  - テスト実行環境: Node + jsdom、Chrome API はモック
  - 信頼性: 🟢（リポジトリ構成に一致）

## テストケース実装時の日本語コメント指針

```javascript
// 【テスト目的】: このテストで何を確認するかを日本語で明記
// 【テスト内容】: 具体的にどのような処理をテストするかを説明
// 【期待される動作】: 正常に動作した場合の結果を説明
// 🟢🟡🔴 この内容の信頼性レベルを記載
```

```javascript
// 【テストデータ準備】: なぜこのデータを用意するかの理由
// 【初期条件設定】: テスト実行前の状態を説明
// 【前提条件確認】: テスト実行に必要な前提条件を明記
```

```javascript
// 【実際の処理実行】: どの機能/メソッドを呼び出すかを説明
// 【処理内容】: 実行される処理の内容を日本語で説明
// 【実行タイミング】: なぜこのタイミングで実行するかを説明
```

```javascript
// 【結果検証】: 何を検証するかを具体的に説明
// 【期待値確認】: 期待される結果とその理由を説明
// 【品質保証】: この検証がシステム品質にどう貢献するかを説明
```

```javascript
// 【検証項目】: この検証で確認している具体的な項目
// 🟢🟡🔴 この内容の信頼性レベルを記載
expect(result.valid).toBe(true);
```

```javascript
beforeEach(() => {
  // 【テスト前準備】: 各テスト実行前に行う準備作業の説明
  // 【環境初期化】: テスト環境をクリーンな状態にする理由と方法
});

afterEach(() => {
  // 【テスト後処理】: 各テスト実行後に行うクリーンアップ作業の説明
  // 【状態復元】: 次のテストに影響しないよう状態を復元する理由
});
```

---

品質判定: ✅ 高品質
- 正常系・異常系・境界値を網羅
- 期待値が明確に定義
- 技術選択: TypeScript + Vitest に確定
- 実装可能性: 現在のスタックで実行可能

次のお勧めステップ: `/tdd-red` でRedフェーズ（失敗テスト作成）を開始します。

