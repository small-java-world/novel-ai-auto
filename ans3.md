ログ＆現行コード、しっかり読みました。要点だけ素早く直せるようにまとめます。

# いま起きていること（事実）

* **ポジ/ネガ適用は通っています**（read-back一致まで確認OK）。
* **生成→保存も完了**していますが、**DLボタン検出は0件**になり、**自前の`<a download>`フォールバック**で保存しています。
* **マルチキャラは “1件で打ち切り”** 仕様になっており、**残り2件が SKIPPED** になっています（`count===1` 分岐）。

# すぐ効くピンポイント修正

## 1) マルチキャラが1人で止まる問題

**原因**：`background.ts` の最終インデックス計算が `count===1` のとき1件だけに制限。
**修正方針**：「UIの count=1 でも “キャラ全員を1回ずつ”」モードを許容。

```diff
--- a/src/background.ts
+++ b/src/background.ts
@@
- const lastIndex = baseParams.count === 1 ? Math.min(1, composite.characters.length) : composite.characters.length;
+ // 政策切替: count===1 でも「全キャラを1回ずつ」を既定に
+ const processAllCharacters = true; // TODO: UIトグルに昇格
+ const lastIndex = processAllCharacters
+   ? composite.characters.length
+   : (baseParams.count === 1 ? Math.min(1, composite.characters.length) : composite.characters.length);
```

> まずは既定を「全キャラ」に倒して、後でポップアップ設定に“1キャラのみ/全キャラ”トグルを出すのが手早いです。

---

## 2) ダウンロードボタンが見つからずフォールバックになる件

**原因**：per-image「Download」ボタンが **Shadow DOM / Portal** 配下にあり、現行の探索が**シャドウ再帰**をしていないため 0 件になりがち。
**修正方針**：共通ユーティリティ `queryAllDeep()` を噛ませた **シャドウ再帰探索 + Portal優先探索** に置換。候補0→即フォールバックではなく、**再探索ステップ**を追加。

```diff
--- a/src/content.ts
+++ b/src/content.ts
@@
- function findPerImageDownloadButtons(root=document){
-   const btns = Array.from(root.querySelectorAll('button, [role="button"], a'));
-   return btns.filter(b => {
+ // ShadowRoot/Portal を横断してボタンを探す
+ function queryAllDeep(selectors: string[], roots: (Document|ShadowRoot|HTMLElement)[] = [document]): HTMLElement[] {
+   const out: HTMLElement[] = [];
+   const nextRoots: (ShadowRoot|HTMLElement)[] = [];
+   for (const r of roots) {
+     for (const sel of selectors) {
+       out.push(...Array.from((r as ParentNode).querySelectorAll<HTMLElement>(sel)));
+     }
+     // shadow 再帰
+     (r as ParentNode).querySelectorAll<HTMLElement>('*').forEach(el => { if ((el as any).shadowRoot) nextRoots.push((el as any).shadowRoot); });
+   }
+   return nextRoots.length ? [...out, ...queryAllDeep(selectors, nextRoots)] : out;
+ }
+
+ function findPerImageDownloadButtonsDeep(scope?: HTMLElement){
+   const roots: (Document|ShadowRoot|HTMLElement)[] = [document];
+   if (scope) roots.unshift(scope);
+   const btns = queryAllDeep(['button','[role="button"]','a'], roots);
+   return btns.filter(b => {
      const t = (b.textContent || '').trim().toLowerCase();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      const title = (b.getAttribute('title') || '').toLowerCase();
      return /download/.test(t) || /download/.test(aria) || /download/.test(title);
    });
  }
@@
- const candidates = findPerImageDownloadButtons(cardOrDoc);
+ // 1st pass: 通常DOM
+ let candidates = findPerImageDownloadButtonsDeep(cardOrDoc);
  if (!candidates.length) {
-   diag('download-button-not-found-simple');
-   // 最終フォールバック（data/blob直DL）...
+   // 2nd pass: Portal/dialog 内を優先探索
+   const portals = queryAllDeep(['[role="dialog"]','[class*="portal"]','[class*="popover"]']);
+   for (const p of portals) {
+     candidates = findPerImageDownloadButtonsDeep(p);
+     if (candidates.length) break;
+   }
+ }
+ if (!candidates.length) {
+   diag('download-button-not-found-simple');
+   // …ここで初めてフォールバック（data/blob直DL）
```

**保存名の一貫化**（現状 filename 空のケースあり → 名付けテンプレ導入）：

```diff
- a.download = `novelai_${Date.now()}.png`;
+ const base = (currentCharacterName || 'novelai');
+ const ts = new Date().toISOString().replace(/[:.]/g,'-');
+ a.download = `${base}_${ts}.png`;
```

> これで「ボタン押下に見える挙動」をまず狙い、それでも0件ならフォールバック。ログにも“どの経路で押せたか”が残ります。

---

## 3) 生成1回あたりのファンネル整理（安定化の小技）

* **クリック前**は必ず `scrollIntoView({block:'center'})` → `await waitNextFrame()`（`setTimeout 50ms`程度）を入れる。
* **読戻し厳格化**は既に入っており有効（先頭一致→不一致なら例外）。**失敗ログ**に `z-index / visible / DOMPath / innerText head` を載せるのは継続。

---

# 作業のおすすめ順

1. **マルチキャラ分岐**の1行修正（上の`background.ts`差分）。
2. **DLボタン探索のシャドウ対応**（`queryAllDeep`導入＋再探索）。
3. （任意）**フォールバック保存名の統一**。

この3点で、体感との差（「キャラが足りない」「ダウンロードが押せてないように見える」）はかなり解消されます。さらにポップアップUIに「全キャラ処理」トグルを出すなら、その仕様に合わせて `processAllCharacters` を外出しにしましょう。

必要なら、このまま **完全なPR用diff** 形式に整えて出します。
