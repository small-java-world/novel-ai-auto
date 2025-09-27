ナイスログ。ざっくり要約すると、**メインPositiveは入ってる**／**Negativeは“別のProseMirror”に書いて読んでいる疑い**／**実DLボタンは押せているが完了検知が弱い**／**マルチキャラ遷移は未実装**、ですね。

以下、“いますぐ効く”順に手当てします。

---

## A) Negative欄の取り違いを潰す（セマンティック優先の特定アルゴリズム）

**狙い:** ラベル→近傍→カード内→最後にヒューリスティック、の順で **同一フィールドを一意に** 指す。

```ts
// 1) ラベルから近傍探索（日英対応: 「除外したい要素 / Undesired / Negative」）
function findNegativeEditor(): HTMLElement | null {
  const label = Array.from(document.querySelectorAll<HTMLElement>('label, span, div, p'))
    .find(n => /(除外したい要素|Undesired|Negative)/i.test(n.textContent || ''));
  if (label) {
    const scope = label.closest('[class]') ?? label.parentElement ?? document.body;
    // 「同じ行/同じセクション」の editor を優先
    const near = scope.querySelector<HTMLElement>('.ProseMirror, textarea');
    if (near) return near;
  }
  // 2) “キャラクタープロンプト”セクション内（カード内の負欄）
  const negInCards = Array.from(document.querySelectorAll<HTMLElement>('[data-testid*="character-card" i], [class*="character-card" i]'))
    .map(card => card.querySelector<HTMLElement>('[placeholder*="Negative" i], .ProseMirror, textarea'))
    .filter(Boolean) as HTMLElement[];
  if (negInCards[0]) return negInCards[negInCards.length - 1]; // 直近カードを優先

  // 3) フォールバック: placeholder/aria-label で Negative を特定
  const byAttr = document.querySelector<HTMLElement>('textarea[placeholder*="Negative" i], textarea[aria-label*="Negative" i]');
  if (byAttr) return byAttr;

  // 4) 最終手段: 画面上の .ProseMirror 群のうち “主プロンプト以外”かつ “ラベル『Negative』に最も近い”もの
  const editors = Array.from(document.querySelectorAll<HTMLElement>('.ProseMirror'));
  // 先に main positive を除外
  const mainPos = document.querySelector<HTMLElement>('.prompt-input-box-prompt .ProseMirror');
  const candidates = editors.filter(e => e !== mainPos);
  return candidates[0] || null;
}
```

**書き込み＆読戻し**は、あなたのメイン用ホットフィックス関数（`writeToEditor` / `confirmApplied`）をそのまま流用でOK。**必ず同じ要素参照**で `set → confirm` してください（別要素を再探索して read-back しない）。

---

## B) “同じフィールドを読んでいる”ことを証明するログを追加

**読戻し時**に、DOMパスと抜粋を必ず残します。UI齟齬の特定が一気に早くなります。

```ts
function domPath(el: Element): string {
  const parts: string[] = [];
  for (let e: Element | null = el; e && e.nodeType === 1; e = e.parentElement) {
    const idx = Array.from(e.parentElement?.children || []).filter(n => n.tagName === e.tagName).indexOf(e) + 1;
    parts.unshift(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className ? '.' + Array.from(e.classList).join('.') : ''}${idx>1?`:nth-of-type(${idx})`:''}`);
  }
  return parts.join(' > ');
}

async function confirmAppliedWithProof(el: HTMLElement, expect: string, tag: string) {
  const actual = (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) ? el.value : (el.textContent ?? '');
  const ok = (actual ?? '').replace(/\s+/g,' ').trim().startsWith(String(expect).replace(/\s+/g,' ').trim().slice(0,24));
  console.debug(`[confirm] ${tag}`, {
    ok,
    path: domPath(el),
    id: el.id || 'no-id',
    cls: el.className,
    sample: (actual || '').slice(0, 120),
    attrs: el.getAttributeNames().reduce((m,k)=> (m[k]=el.getAttribute(k)!, m), {} as Record<string,string>)
  });
  if (!ok) throw new Error(`${tag}: readback mismatch`);
}
```

> これを **Negative適用の直後**にも必ず呼んでください（`tag='negative'`）。

---

## C) ダウンロード“完了”検知を堅牢化（拡張の background で受ける）

**現状:** ボタン押下→待機ログまでは出てるが、完了イベント未記録。**対策:** `chrome.downloads` を使い、**backgroundで onCreated / onChanged を監視**し、**コンテンツ側へ resolve**。

**前提:** `manifest.json` に `"permissions": ["downloads"]` を追加。

```ts
// background.ts
chrome.downloads.onCreated.addListener(item => {
  // NovelAI由来のファイル名/URL ならタグ付け（example: domainや拡張子で判定）
  chrome.runtime.sendMessage({ type: 'DL_CREATED', id: item.id, filename: item.filename, url: item.url });
});
chrome.downloads.onChanged.addListener(delta => {
  if (delta.state?.current === 'complete') {
    chrome.runtime.sendMessage({ type: 'DL_COMPLETED', id: delta.id });
  }
});
```

**コンテンツ側**は、DLボタン押下後に **“次キャラへ進めるのは DL\_COMPLETED を受けてから”** に変更（`SITE_DOWNLOAD_COMPLETE` 相当をこれで置換）。これで

* 生成→DLボタン押下→**ブラウザの実ダウンロード完了**→次ステップ
  の順が保証できます。

> もしサイト内の“保存”が**Blob URL**等で `chrome.downloads` に乗らないケースがあるなら、**フォールバックの `<a download>`**（すでに実装済み）を使った場合は **`chrome.downloads.download(...)`** を **background** から明示発火に切替えるのが確実（content→backgroundへメッセージ、background側で `chrome.downloads.download` 実行→onChangedで完了監視）。

---

## D) 進行管理（状態機械）を最小で強化

**原因:** 「2人目以降へ進まない」＝ DL完了待ちが取れず次トリガが起きていない。
**対策:** 背景側で **小さなステートマシン**を持ち、`GENERATED → DL_CLICKED → DL_COMPLETED → NEXT_CHAR` のイベント実行にする。

```ts
// background.ts (概略)
type MultiCharState = 'IDLE'|'GENERATING'|'WAIT_DL'|'ADVANCE';
let state: MultiCharState = 'IDLE';
function onGenerated() { state='WAIT_DL'; }
function onDownloadCompleted() { if (state==='WAIT_DL'){ state='ADVANCE'; sendToContent('NEXT_CHARACTER'); } }
```

> いまは **“DL押下まで”**はできているので、**“完了検知→次へ”** だけ足せば回ります。

---

## E) すぐ差し込みたい“3つの追加ログ”

1. **negative-target-picked**: `path/id/class/outerHTML冒頭100字` を出す（どの要素に書くか明示）
2. **negative-confirm-ok**: 上の `confirmAppliedWithProof` を使って、**同じ要素**で読戻しOKを証明
3. **dl-flow**: `DL_BUTTON_FOUND(strategy, path)` → `DL_CLICKED` → **`DL_CREATED(id, filename)`** → **`DL_COMPLETED(id)`**

> これで **「UIに入っていない」の真偽**と**DL完了の有無**が、客観ログで一発判定できます。

---

### まとめ（今日のToDo）

* [ ] Negative: 上の **`findNegativeEditor()`** と **`confirmAppliedWithProof()`** を導入して “同一要素” を厳密化
* [ ] Download: `chrome.downloads` の **onCreated/onChanged** 監視＋**完了で次へ** の配線
* [ ] Logs: `negative-target-picked`／`negative-confirm-ok`／`dl-flow` を追加

これで **「Positiveは入る／Negativeも“目で見て入る”」** が担保でき、**DL完了を待って次キャラ**のループに繋げられます。追加のログが出たら、その場で読み解いて次のボトルネックを潰します。
