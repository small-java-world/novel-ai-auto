### NovelAI拡張: キャラクター追加未実装の事実と是正案（2025-09-23）

本書は ChatGPT へ相談するための一次資料です。最新ログと現行コードから、どこまで動作しており、何が未実装かを事実ベースで明記します。

---

## いま実際にできていること

- メインのポジティブプロンプト入力（read-back一致まで確認）
- 生成ボタンのクリック → 無効→再有効サイクルで完了検出
- 画像ダウンロード（保存ボタン検出0のため、`<a download>` フォールバックで保存）

代表ログ抜粋（2025-09-23 21:39 実行）

```316:346:logs-20250923-213912.json
{"kind":"MULTI_CHAR_APPLY","data":{"index":0,"name":"アニメヒロイン"}}
{"kind":"DIAG","data":{"step":"prompt-input-found"}}
{"kind":"DIAG","data":{"step":"positive-set"}}
{"kind":"DIAG","data":{"step":"positive-confirm-ok"}}
{"kind":"DIAG","data":{"step":"negative-confirm-ok"}}
```

```376:404:logs-20250923-213912.json
{"kind":"DIAG","data":{"step":"after-generate-click"}}
{"kind":"DIAG","data":{"step":"generate-button-state"}}
...
{"kind":"WR_COMPLETED","data":{"url":"https://image.novelai.net/ai/generate-image-stream"}}
```

```406:418:logs-20250923-213912.json
{"kind":"DIAG","data":{"step":"dl-gallery"}}
{"kind":"DIAG","data":{"step":"dl-target-image"}}
{"kind":"DIAG","data":{"step":"dl-candidates","data":{"total":0}}}
```

```420:441:logs-20250923-213912.json
{"kind":"DIAG","data":{"step":"download-button-not-found-simple"}}
{"kind":"DL_CLICKED","data":{"strategy":"fallback-anchor"}}
{"kind":"DL_CREATED"}
{"kind":"DL_COMPLETE"}
{"kind":"DIAG","data":{"step":"generation-completed-successfully"}}
```

---

## できていないこと（誤認の是正）

結論: キャラクター追加（Add Character UI でのスロット追加・性別選択・カード入力）は実装も実行もされていません。

- 背景の逐次処理で「キャラごとに適用」は、実際には「メインのプロンプト欄へ文字列を上書き→生成→DL」を繰り返しているだけです。
- ログに「キャラ追加ボタン押下」「メニュー出現」「カード検出/入力」等の痕跡は一切ありません（該当の DIAG もコードも未連携）。

根拠（コード）

1) 背景は各キャラに対し `APPLY_PROMPT` を送信しているだけ（UIのキャラ追加は依頼していない）

```447:505:src/background.ts
// composite.characters をループし、各回ごとに APPLY_PROMPT を content へ送るだけ
// APPLY_MULTI_CHARACTER_PROMPT は送っていない
```

2) Content 側の `handleApplyPrompt` は「メインの prompt/negative 入力→生成→DL」を行うのみ（キャラ追加操作は無い）

```518:741:src/content.ts
async function handleApplyPrompt(...) {
  // prompt/negative の入力、パラメータ適用、生成・DL の最小ループのみ
}
```

3) マルチキャラ用ハンドラは存在するが、「実際に UI へキャラを追加する関数」を呼んでいない

```236:254:src/utils/multi-character-sequence.ts
// 現状は simulatePromptApplication(...) を呼び、結局 handleApplyPrompt を使うだけ
```

```326:446:src/utils/multi-character-sequence.ts
// 実 UI 操作: clickAddCharacterButton → selectCharacterGender → fillCharacterCard
// だが applyCharacterPrompt(...) からは呼ばれていない（未配線）
```

根拠（ログ）

- 各キャラで `MULTI_CHAR_APPLY` は出るが、その後の流れは毎回「メイン欄への適用→生成→DL」。キャラ追加に関するログはゼロ。
  - 例: 2人目・3人目も同様に `prompt-input-found`→`positive-set`→`generate`→`download-button-not-found-simple`→フォールバックDLの流れのみ。

```452:472:logs-20250923-213912.json
{"kind":"DIAG","data":{"step":"apply-payload","data":{"charMeta":{"index":1,"name":"ファンタジー騎士"}}}}
{"kind":"DIAG","data":{"step":"positive-set"}}
{"kind":"DIAG","data":{"step":"negative-confirm-ok"}}
```

```526:541:logs-20250923-213912.json
{"kind":"DIAG","data":{"step":"download-button-not-found-simple"}}
{"kind":"DL_CREATED"}
{"kind":"DL_COMPLETE"}
```

---

## なぜ誤解が生じたか

- 「3キャラ順次処理」という文言が、「キャラ追加UIも自動で操作できている」と読める表現だったため。
- 実際には「順次＝メイン欄に各キャラの（共通込み）文を上書き→1枚生成→DL」を繰り返しているだけです。キャラ追加ボタンは押していません。

---

## 是正案（実装方針の具体）

1) 背景からは一度だけ `APPLY_MULTI_CHARACTER_PROMPT` を送る

```447:471:src/background.ts
// 変更案（概略）: composite のまま一度だけ APPLY_MULTI_CHARACTER_PROMPT を post
// 既存の各キャラごとの APPLY_PROMPT ループは撤去
```

2) Content 側ハンドラで `MultiCharacterSequenceHandler` を使用し、「実 UI 操作」を呼ぶ

```466:482:src/content.ts
case 'APPLY_MULTI_CHARACTER_PROMPT':
  multiCharacterHandler.handleMultiCharacterSequence(...)
```

3) `applyCharacterPrompt(...)` を `applyCharacterPromptToDOM(...)` に切り替え

```236:254:src/utils/multi-character-sequence.ts
// 現状: simulatePromptApplication(...)（=メイン欄に書くだけ）
// 変更: applyCharacterPromptToDOM(...) を呼び、
//       clickAddCharacterButton → selectCharacterGender → fillCharacterCard の経路を実行
```

4) 失敗しやすいポイントの補強

- 追加ボタン探索: XPath/CSS/ShadowRoot再帰・ポータル対応・可視/フォーカス/スクロール＆小待機の順守。
- メニュー検出: `waitForMenu()` のタイムアウト/再試行・shadow/portal横断。
- 直後のカード特定: `waitLastCharacterCard()` の観測増強（増加検知→戻りカードのみ対象）。
- 診断ログ: `char-add-clicked` `gender-selected` `card-filled` など粒度の細かい DIAG を追加。

---

## まとめ（短く）

- 事実: 現状は「メイン欄に適用→生成→DL」だけ。キャラ追加UIは一切操作していない。
- 誤解: 「順次処理＝キャラ追加できている」ではない。単に順次でメイン欄に上書きしているだけ。
- 是正: 背景→APPLY_MULTI_CHARACTER_PROMPT、Content→MultiCharacterSequenceHandler で applyCharacterPromptToDOM を呼ぶ実装に切替。Shadow/Portal対策と詳細DIAGを追加。


