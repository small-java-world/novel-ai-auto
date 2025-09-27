アップロードありがとう。要点は把握しました。まずは“いますぐ効く”修正だけ最短で当てましょう（詳細レポは受け取ったとおりでOK）。

# 直当てホットフィックス（短く3点）

1. # ポジティブが入らない件：**可視・最前面エディタ限定**で書き込み

`resolvePromptInput()` の最終段に「画面に見えている / フォーカス可能 / z-indexが高い」順で `.ProseMirror, textarea` を取り直してください。

```ts
function pickTopVisibleEditor(scope: ParentNode = document): HTMLElement | null {
  const cands = Array.from(scope.querySelectorAll<HTMLElement>('.ProseMirror, textarea'))
    .filter(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    })
    .sort((a,b) => (parseInt(getComputedStyle(b).zIndex || '0')||0) - (parseInt(getComputedStyle(a).zIndex || '0')||0));
  return cands[0] ?? null;
}
// resolvePromptInput() の最後で:
const top = pickTopVisibleEditor();
if (top) return top;
```

これで「別インスタンスへ書いてた」事故を封じます。

2. # キャラ追加が反応しない件：**メニュー/カードを“待ってから”入力**

既に導入済の `waitForMenu()` と `waitLastCharacterCard()` を **必ず**経由。クリック前は `scrollIntoView({block:'center'})` → `await new Promise(r=>setTimeout(r,50))` を挟んでからクリック、クリック後は `await waitForMenu()` を必須化してください。**カード入力は `waitLastCharacterCard()` の戻りだけを対象**にします。

3. # 入力の確定度UP：**paste駆動 → 読み戻し** を既定に

`setInputValue()` の CE ルートで `insertText` に成功しても **追いpaste** を入れてから `confirmTextApplied()` で検証。失敗時は **Backspace 全消し→paste** の再試行も1回だけ許容してください。

```ts
async function writeRich(el: HTMLElement, text: string) {
  // 全選択→Backspace
  const sel = getSelection(); sel?.removeAllRanges();
  const r = document.createRange(); r.selectNodeContents(el); sel?.addRange(r);
  document.execCommand('delete', false);
  // DataTransfer paste
  const dt = new DataTransfer(); dt.setData('text/plain', text);
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
```

最後に `await confirmTextApplied(el, text, 'positive')`。これで“見た目だけ空”を潰します。

---

# 追加で入れておくと安心なミニパッチ

* **編集有効化トグル**：ラベル近傍から `role="switch"` を優先探索し、`aria-checked` が想定と違えばクリック。
* **Shadow/Portal 再帰**：メニューやDLボタン探索は `queryAllDeep(root)` 的な再帰で `shadowRoot` を潜る処理を共通化。
* **ログの粒度**：`positive-confirm-failed` 時は「DOMパス」「可視状態」「z-index」「innerText先頭80字」を一緒に記録。

---

# これで様子見 → 次段

この3点だけで「ポジティブ反映」「＋キャラクター動作」はだいたい通るはず。通ったら次はダウンロード検出（Shadow/Portal前提での `Download`/`ZIP` ボタン探索強化）を仕上げます。必要なら、上の断片をあなたの `content.ts` / `multi-character-sequence.ts` に差し込みやすい\*\*差分パッチ（diff）\*\*形式で出します。
