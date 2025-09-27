受領。要点は「**キャラ追加は未実装**、現状は“メイン欄を上書き→生成→DL”の繰り返しのみ」という事実確認で一致です。

# いますぐやる修正（最短ルート）

1. **背景→一発指令に変更**

   * 各キャラごとに `APPLY_PROMPT` を送るループを廃止。
   * **`APPLY_MULTI_CHARACTER_PROMPT`** を **1回だけ** 送信し、content 側で全工程を実DOM操作で実行。

2. **content 側で実DOM操作に切替**

   * 受信ハンドラ：`case 'APPLY_MULTI_CHARACTER_PROMPT'` を追加。
   * `simulatePromptApplication(...)`（メイン欄上書きだけ）→ **`applyCharacterPromptToDOM(...)`** に置換。
   * 経路は **`clickAddCharacterButton → waitForMenu → selectCharacterGender → waitLastCharacterCard → fillCharacterCard`** を厳守（Shadow/Portal再帰 + スクロール＆小待機）。

3. **診断ログを粒度UP**

   * 追加：`char-add-clicked` / `menu-ready` / `gender-selected` / `card-detected` / `char-positive-set` / `char-negative-set` / `char-weight-set`。
   * 読み戻し検証：各欄で `confirmTextApplied()` を必須化（先頭一致→不一致なら即リトライ/中断）。

4. **DLボタン探索の堅牢化（任意だが推奨）**

   * `queryAllDeep()` で **ShadowRoot/Portal横断**の再帰探索。
   * まずカード近傍→見つからなければ `[role="dialog"| "listbox"]` 内を再探索。
   * 0件のみ `<a download>` フォールバック。

# 参考パッチ（概略diff）

```diff
// background.ts
- for (const ch of composite.characters) {
-   send(APPLY_PROMPT, { prompt: build(ch) });
- }
+ send(APPLY_MULTI_CHARACTER_PROMPT, { composite });

// content.ts
+ case 'APPLY_MULTI_CHARACTER_PROMPT':
+   await multiCharacterHandler.handleMultiCharacterSequence(msg.composite);
+   break;

// utils/multi-character-sequence.ts
- async simulatePromptApplication(ch) { /* main prompt overwrite */ }
+ async applyCharacterPromptToDOM(ch) {
+   await clickAddCharacterButton();
+   const menu = await waitForMenu();
+   await selectCharacterGender(menu, ch.gender);
+   const card = await waitLastCharacterCard();
+   await fillCharacterCard(card, ch.positive, ch.negative, ch.weight);
+ }
+ // handleMultiCharacterSequence: characters.forEach → applyCharacterPromptToDOM → generate → download
```

# 動作確認チェックリスト

* 2人目以降で **`char-add-clicked` → `menu-ready` → `card-detected`** がログに出る。
* 各カードで **`char-positive-set` / `char-negative-set`** 後に **read-back OK**。
* 生成後、**DLボタン押下ログ** or **フォールバック**のどちらかが毎回出る。
* 「メイン欄上書きだけ」のログがなくなる（`prompt-input-found` がカード側中心へ移行）。

必要なら、この方針で**完全PR用の具体diff**（実ファイル行番号合わせ）も出します。
