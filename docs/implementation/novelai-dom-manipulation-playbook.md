# NovelAI DOM操作実務プレイブック

## 概要

NovelAIを操作するChrome拡張のために、DOMや画面部品を"壊れにくく特定"する方法をまとめた実務向けプレイブックです。NovelAI固有のDOMは頻繁に変わる可能性があるため、**フレームワーク非依存の探索手法＋SPA対策＋Shadow DOM対策＋イベント発火の確実化**に寄せています。

## 0) まず押さえる拡張の前提（MV3）

* **content scripts** でページDOMにアクセス（isolated world）。静的登録 or クリック時注入（`chrome.scripting`）。([Chrome for Developers][1])
* **リモートコード禁止**：CDN等から任意コード読込み不可（審査NG）。([Chrome for Developers][2])
* **webRequestで"本文"は取れない**（ヘッダ中心）。本文が必要なら**ページ側にフックを注入**して`fetch/XHR`をラップ。([Chrome for Developers][3])

## 1) セレクタ戦略（壊れにくい順）

### 1.1 アクセシビリティ・セレクタ（最優先）
DevToolsの**Accessibility Tree**で**role / accessible name**を確認→`document.querySelector('[role="button"][aria-label="Generate"]')`のように取得。UIが変わっても**ラベルは比較的安定**。([Chrome for Developers][4])

* DevToolsの**Full Accessibility Tree**で名称を特定。([Chrome for Developers][4])

### 1.2 テキストと構造の組み合わせ
近年は**:has()がChromeで広く対応**。例：`section:has(> h2:contains("Prompt")) textarea`（実装時は`contains`はJS側で検索し、CSSでは`:has()`＋隣接関係で）。**親要素→子**の相対指定でクラス名変更に強い。([Can I Use][5])

### 1.3 ラベルとfor属性
`label[for="prompt"] + textarea` のように**ラベル連携**で特定。ARIAの**Accessible Name計算**の知識が役立つ（`aria-labelledby`, `aria-label`）。([W3C][6])

### 1.4 最後の手段：data属性 or 安定id
安定id/data-*がある場合のみ。**フレームワーク生成の難読クラス**は極力回避。

> 補助：DevTools **Recorder**でユーザーフローを記録→**セレクタ種別をカスタム**して、壊れにくい選択子を確認・抽出。([Chrome for Developers][7])

## 2) SPA（NovelAIはSPA的）の"画面遷移/再描画"検知

* **ヒストリーAPI**：`popstate`をリッスン。`pushState/replaceState`は自前ディスパッチでフック（`history.pushState=...; window.dispatchEvent(new Event("locationchange"))`）。([MDNウェブドキュメント][8])
* **MutationObserver**：大枠コンテナに`childList:true, subtree:true`で監視→**遅延して現れるフォームやボタンの出現**を検知。属性変化だけ拾う監視も可能。([MDNウェブドキュメント][9])
* **拡張側API**：必要に応じて `chrome.webNavigation` でナビゲーションイベントも受け取る。([Chrome for Developers][10])

## 3) Shadow DOM 対策

* **open Shadow DOM**：`element.shadowRoot` 経由で再帰走査（自作の**pierceQuery**関数）。([MDNウェブドキュメント][11])
* **closed Shadow DOM**：DOM直アクセス不可。

  * 代替：**ホスト要素にイベント**、**アクセシビリティ名でアクション**、**ネットワーク/状態フック**で迂回。
* Shadow DOMの基本と概念整理はMDN参照。([MDNウェブドキュメント][12])
* E2E系知見（PlaywrightのShadow DOM解説）も設計の参考に。([Testing Mavens][13])

## 4) "入力・クリック"を**サイト側にバレず**確実に反映させる

* **入力値反映**：`el.value=...` 後に **`input` + `change` をバブリングでdispatch**（ライブラリは`input`だけ拾うこと多い）。

  ```js
  el.focus();
  el.value = myText;
  el.dispatchEvent(new Event('input', {bubbles:true}));
  el.dispatchEvent(new Event('change', {bubbles:true}));
  ```

  参考：`input`/`change`の仕様と発火テクニック。([MDNウェブドキュメント][14])
* **クリック**：`element.click()`で動かない場合、`PointerEvent/MouseEvent`を`bubbles:true`で明示発火。**isTrustedは偽のまま**で、サイト側が判定すると弾かれる可能性あり（仕様上、拡張から`isTrusted:true`は作れません）。([Google Groups][15])
* **ファイル入力**：`<input type="file">`は値をスクリプトで直接セット不可。DataTransfer経由の**ドラッグ&ドロップ合成**などで対応。([DEV Community][16])

## 5) ネットワーク層フック（必要なら）

* **webRequest**では**レスポンス/リクエストの"本文"まで触れない**（ヘッダ中心）。([Chrome for Developers][3])
* 本文参照や差し替えが要る場合は、**ページコンテキストにスクリプトを注入**して

  * `window.fetch` をラップ
  * `XMLHttpRequest.prototype.send/open` をラップ
    する設計が定石。実装論考のまとまった記事あり。([rxliuli.com][17])

## 6) DevToolsでの"特定プロセス"ワークフロー

1. **Recorderで実操作を記録** → ステップごとの候補セレクタを確認・編集。([Chrome for Developers][18])
2. **Accessibility Pane**でボタン/入力の**Accessible Name**を取得（role＝button, textbox 等）。([Chrome for Developers][4])
3. **Elements**で該当ノードに**DOMブレークポイント**→動的に差し替わる箇所や**Mutationの原因**を特定。
4. **Performanceパネルの"CSS selector stats"** で、高コストセレクタの洗い出し（監視対象の最適化）。([Chrome for Developers][19])

## 7) NovelAI向け "あたり" の探索ポイント（名称ベース）

> 個別のDOM名は変動しやすいため、**"ラベル/文言"で探す**のが安全です。以下は**UI上の表示テキスト**を基準に走査する例。

* **「Prompt」テキストエリア**：`h2/h3/label`に**Prompt**が含まれる近傍の`textarea`。
* **「Undesired Content」テキストエリア**（ネガティブ）：同様に**Undesired**/ **Negative** 近傍の`textarea`。
* **「+ Add Character」ボタン**：ラベル一致の`[role=button]`。
* **「Generate」ボタン**：`[role=button][aria-label~="Generate"]` ないしテキスト一致。
* **（あれば）参照画像UI**：`"Character Reference"`, `"Style aware"` のラベルでチェック/入力を探索。

  > これらは**アクセシビリティ名**を基本に辿るのが頑丈です（多言語切替にも対応しやすい）。

## 8) サンプル実装フラグメント

### 8.1 セレクタ共通ヘルパ（Shadow DOM再帰探索）

```js
// 再帰的にshadowRootを跨いで最初の一致要素を返す
export function queryDeep(selector, root = document) {
  const light = Array.from(root.querySelectorAll(selector));
  if (light.length) return light[0];
  const walkers = Array.from(root.querySelectorAll('*'))
    .map(el => el.shadowRoot).filter(Boolean);
  for (const sr of walkers) {
    const found = queryDeep(selector, sr);
    if (found) return found;
  }
  return null;
}
```

（MDN: ShadowRoot/Shadow DOMの仕様に基づく）([MDNウェブドキュメント][11])

### 8.2 アクセシブル名ベース取得

```js
export function byRoleAndName(role, name, root = document) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const accName = el => el.getAttribute('aria-label') || el.innerText?.trim();
  while (walker.nextNode()) {
    const el = walker.currentNode;
    if (el.getAttribute && el.getAttribute('role') === role) {
      const label = accName(el) || '';
      if (label.toLowerCase().includes(name.toLowerCase())) return el;
    }
  }
  return null;
}
// 例: Generate ボタン
const genBtn = byRoleAndName('button', 'Generate');
```

（Accessible Nameの考え方はWAI-ARIA/MDNを参照）([W3C][20])

### 8.3 SPA遷移検知（pushStateフック＋popstate）

```js
(function(){
  const fire = ()=>window.dispatchEvent(new Event('locationchange'));
  const {pushState, replaceState} = history;
  history.pushState = function(...a){ const r=pushState.apply(this,a); fire(); return r; };
  history.replaceState = function(...a){ const r=replaceState.apply(this,a); fire(); return r; };
  window.addEventListener('popstate', fire);
})();
window.addEventListener('locationchange', () => {
  // 画面変化に応じて走査や監視を再セット
});
```

（History API & `popstate` 基本）([MDNウェブドキュメント][21])

### 8.4 遅延出現への対応（MutationObserver）

```js
export function waitFor(selector, {root=document, timeout=10000}={}) {
  return new Promise((resolve, reject) => {
    const el = queryDeep(selector, root);
    if (el) return resolve(el);
    const obs = new MutationObserver(() => {
      const el2 = queryDeep(selector, root);
      if (el2) { obs.disconnect(); resolve(el2); }
    });
    obs.observe(root, {subtree:true, childList:true});
    setTimeout(()=>{obs.disconnect(); reject(new Error('timeout'))}, timeout);
  });
}
```

（MutationObserverのAPI/使い方）([MDNウェブドキュメント][9])

### 8.5 入力反映＋イベント発火

```js
function setInput(el, text){
  el.focus();
  el.value = text;
  el.dispatchEvent(new Event('input', {bubbles:true}));
  el.dispatchEvent(new Event('change', {bubbles:true}));
}
```

（`input`/`change`の仕様と手動発火）([MDNウェブドキュメント][14])

## 9) テスト観点チェックリスト

* [ ] **言語切替**（英/日）でボタンやラベル文言が変わっても取れるか（→Accessible Nameに依存）。([Chrome for Developers][4])
* [ ] **Shadow DOM有無**に関わらず取得できるか（`queryDeep`で走査）。([MDNウェブドキュメント][11])
* [ ] **SPA遷移**でリスナーが**二重登録**されていないか（`locationchange`のdebounce）。([MDNウェブドキュメント][21])
* [ ] **イベントは`isTrusted`で弾かれていないか**（仕様上true化不可→UI側に別ルートが必要）。([Google Groups][15])
* [ ] **webRequestの限界**を把握（本文は不可）。必要なら**ページ注入でfetch/XHRをラップ**。([Chrome for Developers][3])
* [ ] **パフォーマンス**：広域`MutationObserver`の観測範囲を最小化。DevToolsで**CSS Selector Stats**を確認。([Chrome for Developers][19])
* [ ] **審査対応**：MV3の**リモートコード禁止**を順守。([Chrome for Developers][2])

## 10) まとめ（実装の芯）

* **「ラベル（Accessible Name）×構造（:hasなど）」** でセレクタを組む
* **Shadow DOMは再帰走査**、**SPAはHistory + MutationObserver**で追従
* **値反映は input → change を確実に発火**
* **ネットワーク本文が要るときはページ文脈でフック**
* **DevTools Recorder**で実フロー記録→壊れにくいセレクタに置換

この方針なら、NovelAI側のDOM変更・難読化・Shadow DOM・SPA再描画に**強い拡張**が作れます。

## 参考文献

[1]: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts "Content scripts | Chrome Extensions"
[2]: https://developer.chrome.com/docs/extensions/develop/migrate/improve-security "Improve extension security - Chrome for Developers"
[3]: https://developer.chrome.com/docs/extensions/reference/api/webRequest "chrome.webRequest | API - Chrome for Developers"
[4]: https://developer.chrome.com/blog/full-accessibility-tree "Full accessibility tree in Chrome DevTools | Blog"
[5]: https://caniuse.com/css-has ":has() CSS relational pseudo-class | Can I use... Support ..."
[6]: https://www.w3.org/TR/accname-1.2/ "Accessible Name and Description Computation 1.2"
[7]: https://developer.chrome.com/docs/devtools/recorder "Record, replay, and measure user flows | Chrome DevTools"
[8]: https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event "Window: popstate event - Web APIs | MDN - Mozilla"
[9]: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver "MutationObserver - Web APIs | MDN - Mozilla"
[10]: https://developer.chrome.com/docs/extensions/reference/api/webNavigation "chrome.webNavigation | API - Chrome for Developers"
[11]: https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot "ShadowRoot - Web APIs | MDN - Mozilla"
[12]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM "Using shadow DOM - Web APIs | MDN - Mozilla"
[13]: https://www.testingmavens.com/blogs/interacting-with-shadow-dom-the "Interacting with Shadow DOM - The Playwright way"
[14]: https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event "Element: input event - Web APIs - MDN - Mozilla"
[15]: https://groups.google.com/a/chromium.org/g/chromium-dev/c/94t2J_Jylyw "Add support for emitting isTrusted=true events from the ..."
[16]: https://dev.to/code_rabbi/programmatically-setting-file-inputs-in-javascript-2p7i "Programmatically Setting File Inputs in JavaScript"
[17]: https://rxliuli.com/blog/intercepting-network-requests-in-chrome-extensions/ "Intercepting Network Requests in Chrome Extensions"
[18]: https://developer.chrome.com/docs/devtools/recorder/overview "Recorder panel: Record and measure user flow"
[19]: https://developer.chrome.com/docs/devtools/performance/reference "Performance features reference | Chrome DevTools"
[20]: https://www.w3.org/TR/wai-aria-1.2/ "Accessible Rich Internet Applications (WAI-ARIA) 1.2"
[21]: https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API "Working with the History API - Web APIs | MDN - Mozilla"
