
ナイスまとめ。ここから“原因つぶし→すぐ効く修正”に落とし込みます。
ポイントは **(A) 入力先の特定** と **(B) ProseMirror等リッチエディタへの“効く”書き込み**、**(C)「キャラクターを追加」UIのポータル/シャドウ越え対応＋待機** の3つです。以下は**そのまま差し替えや追記ができるパッチ断片**です。

---

# A. 入力先の特定を強化（XPathを最優先→CSSプロファイル併用）

`resolvePromptInput()` のフォールバック順を **Selenium互換XPathを最優先** に。失敗時のログに「**実際に当たったセレクタ**」を残します。

```ts
// src/content.ts（抜粋・置換推奨）
async function resolvePromptInput(): Promise<HTMLElement> {
  const tried: string[] = [];

  const byXPath = (xp: string): HTMLElement | null => {
    tried.push(`XPATH:${xp}`);
    const r = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return (r.singleNodeValue as HTMLElement) ?? null;
  };

  // 1) Selenium実績のXPath（日本語/英語UI両対応）
  const xpaths = [
    "//*[contains(normalize-space(),'プロンプト')]/following::textarea[1]",
    "//*[contains(normalize-space(),'プロンプト')]/following::*[@contenteditable='true'][1]",
    "//textarea[contains(@placeholder,'Positive') or contains(@aria-label,'Positive')]",
    "//textarea[@rows and not(@readonly)]",
    // 英語UIのラベル直後
    "//*[contains(normalize-space(),'Prompt')]/following::textarea[1]",
    "//*[contains(normalize-space(),'Prompt')]/following::*[@contenteditable='true'][1]",
  ];
  for (const xp of xpaths) {
    const el = byXPath(xp);
    if (el) return el;
  }

  // 2) 旧プロファイル（CSS）を“並列で”試す
  const cssCandidates = [
    '.prompt-input-box-prompt .ProseMirror',
    '.prompt-input-box-prompt textarea',
    '.prompt-input-box-base-prompt textarea',
    '.prompt-input-box-base-prompt .ProseMirror',
    '.ProseMirror[contenteditable="true"]',
  ];
  for (const sel of cssCandidates) {
    tried.push(`CSS:${sel}`);
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }

  // 3) 近傍探索（ラベル→親→子孫の ProseMirror/textarea）
  const label = Array.from(document.querySelectorAll<HTMLElement>('label, span, div, p'))
    .find(n => /^(プロンプト|Prompt)$/i.test(n.textContent?.trim() ?? ''));
  if (label) {
    const scope = label.closest('[class]') ?? label.parentElement ?? document.body;
    const el = scope.querySelector<HTMLElement>('.ProseMirror, textarea');
    if (el) return el;
  }

  console.warn('resolvePromptInput: not found. tried=', tried);
  throw new Error('Positive prompt field not found');
}
```

**同様に Negative用 `resolveNegativePromptInput()` も XPath 最優先に**：

```ts
const negXPath = [
  "//*[contains(normalize-space(),'除外したい要素')]/following::textarea[1]",
  "//*[contains(normalize-space(),'Undesired') or contains(normalize-space(),'Negative')]/following::textarea[1]",
  "//*[contains(normalize-space(),'除外したい要素')]/following::*[@contenteditable='true'][1]",
  "//textarea[contains(@placeholder,'Negative') or contains(@aria-label,'Negative')]",
  "(//textarea[@rows and not(@readonly)])[last()]"
];
```

---

# B. リッチエディタへの“確実に入る”書き込み

`execCommand('insertText')` だけだと最近のProseMirror/React更新で**反映しない**ケースがあります。
以下の**多段フォールバック**に入れ替えると成功率が上がります。

```ts
// src/content.ts（抜粋・置換）
function setInputValue(element: HTMLElement, value: string): void {
  const text = typeof value === 'string' ? value : String(value ?? '');

  // 0) 可視化＆フォーカス
  element.scrollIntoView({ block: 'center' });
  (element as HTMLElement).focus({ preventScroll: true });

  const fire = (type: string, init?: any) =>
    element.dispatchEvent(new (window as any).InputEvent?.(type, { bubbles: true, ...init }) || new Event(type, { bubbles: true }));

  // 1) ネイティブ <textarea>/<input>
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(element.__proto__, 'value')?.set; // React対策
    if (setter) setter.call(element, text); else (element as any).value = text;
    fire('input'); fire('change'); fire('blur'); element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    return;
  }

  // 2) ContentEditable（ProseMirror/Slate等）
  const isEditable = (element as any).isContentEditable || element.getAttribute('contenteditable') === 'true';
  if (isEditable) {
    // 2-1) Selection+insertText（うまく行けばこれが最も自然）
    try {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(element);
      sel?.addRange(range);
      document.execCommand('selectAll', false);
      const ok = document.execCommand('insertText', false, text);
      if (ok) { fire('input'); fire('change'); element.blur(); fire('focusout'); return; }
    } catch {}

    // 2-2) Pasteイベント（ProseMirrorはpasteハンドラを持つことが多い）
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const pasteEvt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true });
      element.dispatchEvent(pasteEvt);
      fire('input'); fire('change'); element.blur(); fire('focusout'); return;
    } catch {}

    // 2-3) 直接書き換え（innerText/ textContent）→ input/ change
    try {
      (element as HTMLElement).innerText = text; // textContent でもOK。innerTextの方がUIに近い
    } catch {
      (element as HTMLElement).textContent = text;
    }
    fire('input'); fire('change'); element.blur(); fire('focusout'); return;
  }

  // 3) 最終手段：子孫の .ProseMirror / textarea を探してそこに入れる
  const fallback = element.querySelector<HTMLElement>('.ProseMirror, textarea, input[type="text"]');
  if (fallback && fallback !== element) {
    setInputValue(fallback, text);
    return;
  }

  throw new Error('setInputValue: unsupported element');
}
```

**読み戻し確認（確定検証）** も厳密に：

```ts
async function confirmTextApplied(el: HTMLElement, expected: string, label: string) {
  const actual = (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)
    ? el.value
    : (el.textContent ?? '');

  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const ok = norm(actual).startsWith(norm(expected).slice(0, 24)); // “先頭一致”を強めに
  console.debug(`[confirm] ${label}`, { ok, actual: actual.slice(0,80), expected: expected.slice(0,80) });
  if (!ok) throw new Error(`${label}: readback mismatch`);
}
```

> これで「positive-set は出るが画面は空」に終止符を打てます。

---

# C. 「キャラクターを追加」ポータル/シャドウ越え & 待機

ドロップダウンが **React Portal** や **ShadowRoot** 内にレンダリングされるケースに備え、
**(1) クリック前スクロール**, **(2) クリック後に `role=menu|listbox` を MutationObserver で待機**, **(3) “最後に追加されたカード”を待機** を入れます。

```ts
// src/utils/multi-character-sequence.ts（抜粋・上書き推奨）
async function waitForMenu(maxMs = 1200): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('menu timeout')), maxMs);
    const pick = () => {
      // portal でも拾えるよう全DOM走査
      const cand = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"], [role="listbox"], [class*="menu"], [class*="popover"]'))
        .find(e => e.offsetParent !== null || e.getClientRects().length > 0);
      if (cand) { clearTimeout(t); obs.disconnect(); resolve(cand); }
    };
    const obs = new MutationObserver(pick);
    obs.observe(document.documentElement, { childList: true, subtree: true });
    pick();
  });
}

async function clickAddCharacterAndChoose(labelText: string) {
  const clickRobust = (el: HTMLElement) => {
    el.scrollIntoView({ block: 'center' });
    (el as HTMLElement).click(); // 必要なら PointerEvent 連打も
  };

  const addButton = (
    document.evaluate("//button[contains(normalize-space(),'キャラクターを追加')]", document, null, 9, null).singleNodeValue ||
    document.querySelector("[data-testid*='add-character' i], button[class*='add' i][class*='character' i], .add-character-button")
  ) as HTMLElement | null;

  if (!addButton) throw new Error('Add Character button not found');

  clickRobust(addButton);
  const menu = await waitForMenu();

  // メニュー項目の探索（日本語/英語）
  const option = Array.from(menu.querySelectorAll<HTMLElement>('button, [role="option"], li, div'))
    .find(n => (n.textContent ?? '').trim() === labelText);
  if (!option) throw new Error(`Menu option not found: ${labelText}`);

  clickRobust(option);
}
```

**“直後カード”の検出**（いちばん新しく増えたセクションを待つ）：

```ts
async function waitLastCharacterCard(maxMs = 1500): Promise<HTMLElement> {
  const initial = Array.from(document.querySelectorAll<HTMLElement>('[class*="character-card"], [data-testid*="character-card"]'));
  return new Promise((resolve, reject) => {
    const deadline = performance.now() + maxMs;
    const tick = () => {
      const now = Array.from(document.querySelectorAll<HTMLElement>('[class*="character-card"], [data-testid*="character-card"]'));
      if (now.length > initial.length) {
        resolve(now[now.length - 1]); return;
      }
      if (performance.now() > deadline) return reject(new Error('card timeout'));
      requestAnimationFrame(tick);
    };
    tick();
  });
}
```

**カード内の入力欄取得**は「**カード要素をスコープ**」に同じ`setInputValue`を再利用：

```ts
async function fillCharacterCard(card: HTMLElement, positive: string, negative?: string, weight?: number) {
  const pos = card.querySelector<HTMLElement>('.ProseMirror, textarea, [contenteditable="true"]');
  if (pos) { setInputValue(pos, positive); await confirmTextApplied(pos, positive, 'char-positive'); }

  if (negative != null) {
    const neg = card.querySelector<HTMLElement>('[placeholder*="Negative" i], .ProseMirror + * .ProseMirror, textarea');
    if (neg) { setInputValue(neg, negative); await confirmTextApplied(neg, negative, 'char-negative'); }
  }
  if (typeof weight === 'number') {
    const w = card.querySelector<HTMLInputElement>('input[type="number"], input[type="range"]');
    if (w) {
      const setter = Object.getOwnPropertyDescriptor(w.__proto__, 'value')?.set;
      if (setter) setter.call(w, String(weight)); else (w as any).value = String(weight);
      w.dispatchEvent(new Event('input', { bubbles: true })); w.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}
```

---

# D. 失敗点が見えるログを最短で仕込む

```ts
function diagKV(event: string, kv: Record<string, any>) {
  console.debug(`[DIAG] ${event}`, kv);
}

// 使用例
diagKV('prompt-input-found', { tag: promptInput.tagName, editable: (promptInput as any).isContentEditable === true });
try { await confirmTextApplied(promptInput, positivePrompt, 'positive'); diagKV('positive-confirm-ok', { len: positivePrompt.length }); }
catch (e) { diagKV('positive-confirm-failed', { error: String(e) }); }
```

---

# E. それでも入らない場合の最終手段（クリップボード貼付）

**ブラウザ権限が許せる場合**、ProseMirrorに強い“Paste駆動”を既定手段にできます。

```ts
async function pasteViaClipboard(el: HTMLElement, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    el.focus();
    const evt = new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true });
    document.dispatchEvent(evt);
  } catch { /* 失敗したら前述のDataTransfer pasteへ */ }
}
```

---

# F. 既知のハマりどころのチェックリスト

* [ ] **編集有効化トグル**：押下セレクタが狭いと「見た目フォーカスOK・内部readOnly」のまま。ラベル近傍から `button[role="switch"]` を辿る実装も併用。
* [ ] **自動スクロール**：`scrollIntoView({block:'center'})` を**必ず**呼ぶ。クリック前後に `await new Promise(r => setTimeout(r, 50))` で1フレーム待つ。
* [ ] **Reactのvalueセッタ**：`value` は **プロトタイプの setter を取得→call** で書く（上記コード済み）。
* [ ] **読取検証**：`confirmTextApplied()` を**毎回**。falseなら即ログ＆フォールバック。
* [ ] **Portal/Shadow**：メニュー待機は **document全体**をMutationObserver。
* [ ] **多言語**：日本語/英語のラベル文言/XPathを両方持つ。

---

必要なら、このまま **PR用の小さめ差分**（diff形式）に整えて出します。
まずは上記 B/C の実装を入れて、`positive` が「読戻しOK」になるか、`キャラクターを追加→カード入力` が通るか試してみてください。ログ（`positive-confirm-failed` など）が拾えれば、次の打ち手をさらに絞れます。
