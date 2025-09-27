うん、ログの切り口いいです。結論から：**原因は Negative 対象の誤特定＋即 throw でフロー停止**。ここを“外さない特定”と“投げずにフォールバックして進める”に変えれば止まりません。要点と即当てパッチをまとめます。

---

# 何が起きてる？

* Positive は正常にセット＆読戻し OK。
* Negative は **Positive 側 `.ProseMirror` を掴んで**書こうとして失敗 → `readback mismatch` を **throw** → 以降停止（ユーザー体感「Positiveにフォーカスしたまま止まる」）。

---

# 最小修正（安全・即効）

## 1) Negative の“絶対に外さない”特定アルゴリズム

優先順位で厳格化し、**Positive 範囲を除外**します。さらに **同一要素参照で set→confirm** を徹底。

```ts
// A. Negative を厳格に1要素へ
function findNegativeEditorStrict(): HTMLElement | null {
  const EXCLUDE_POS = (el: Element) =>
    el.closest('.prompt-input-box-プロンプト, .prompt-input-box-prompt, [data-positive="true"]');

  // 1) 専用コンテナ直下（最優先）
  const containers = [
    '.prompt-input-box-undesired-content',
    '.prompt-input-box-negative-prompt',
    '[data-negative="true"]',
  ];
  for (const c of containers) {
    const scope = document.querySelector<HTMLElement>(c);
    if (scope) {
      const ed = scope.querySelector<HTMLElement>('.ProseMirror, textarea');
      if (ed && !EXCLUDE_POS(ed)) return ed;
    }
  }

  // 2) 属性ヒント（aria/placeholder）
  const attr = document.querySelector<HTMLElement>(
    '[aria-label*="Undesired" i], [aria-label*="Negative" i], ' +
    'textarea[placeholder*="Undesired" i], textarea[placeholder*="Negative" i]'
  );
  if (attr && !EXCLUDE_POS(attr)) return attr;

  // 3) ラベル近傍（JP/EN）: 「除外したい要素 / Undesired / Negative」
  const label = Array.from(document.querySelectorAll<HTMLElement>('label,span,div,p'))
    .find(n => /(除外したい要素|Undesired|Negative)/i.test(n.textContent || ''));
  if (label) {
    // ラベルの最近傍セクション→子孫 editor
    const sec = label.closest('[class], section, div') ?? label.parentElement ?? document.body;
    const eds = Array.from(sec.querySelectorAll<HTMLElement>('.ProseMirror, textarea'))
      .filter(e => !EXCLUDE_POS(e));
    if (eds.length) return eds[0];
    // 近接距離スコア（視覚的に一番近い editor）
    const L = label.getBoundingClientRect();
    let best: {el: HTMLElement; d: number} | null = null;
    for (const e of document.querySelectorAll<HTMLElement>('.ProseMirror, textarea')) {
      if (EXCLUDE_POS(e)) continue;
      const R = e.getBoundingClientRect();
      const dy = Math.max(0, R.top - L.bottom);   // ラベルの下側付近を優先
      const dx = Math.abs((R.left + R.right)/2 - (L.left + L.right)/2);
      const d = dy*2 + dx; // 縦を重み付け
      if (!best || d < best.d) best = { el: e, d };
    }
    if (best) return best.el;
  }
  return null;
}
```

## 2) 失敗しても**投げない**（段階フォールバック＆継続）

* `set → confirm` が合わなければ **別戦略に移行**（throwしない）。
* 全戦略×でも **警告ログだけ出して継続**（生成に進む／止めるは設定化）。

```ts
async function applyNegativePromptSafe(text: string) {
  const strategies: Array<() => Promise<HTMLElement | null>> = [
    async () => findNegativeEditorStrict(),
    async () => document.querySelector<HTMLElement>('.ProseMirror, textarea'), // 最終どこか1つ
  ];
  for (let i=0; i<strategies.length; i++) {
    const target = await strategies[i]();
    if (!target) { console.debug('neg: strategy', i, 'no target'); continue; }
    console.debug('negative-target-picked', { path: domPath(target), cls: target.className });
    try {
      await writeToEditor(target, text);               // 既存の強入力（insertText→paste→innerText）
      await confirmAppliedWithProof(target, text, 'negative'); // 同一要素で読戻し
      console.debug('negative-confirm-ok');
      return true;
    } catch (e) {
      console.warn('neg strategy failed', i, e);
    }
  }
  console.warn('negative: all strategies failed — continue without negative');
  return false; // 続行
}
```

> これで **誤特定→throw→停止** ルートを排除します。実際に“Positive側を掴んで停止”していたログの直撃対策です。

## 3) “同じ要素を読んでいる”証拠ログを必ず出す

（あなたのログ整備方針を強化）

```ts
function domPath(el: Element): string { /* 既出の実装でOK */ }

async function confirmAppliedWithProof(el: HTMLElement, expect: string, tag: string) {
  const actual = (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) ? el.value : (el.textContent ?? '');
  const ok = (actual ?? '').replace(/\s+/g,' ').trim()
    .startsWith(String(expect).replace(/\s+/g,' ').trim().slice(0,24));
  console.debug('confirm-proof', {
    tag, ok, path: domPath(el), cls: el.className,
    sample: (actual || '').slice(0, 120),
    attrs: el.getAttributeNames().reduce((m,k)=> (m[k]=el.getAttribute(k)!, m), {} as Record<string,string>)
  });
  if (!ok) throw new Error(`${tag}: readback mismatch`);
}
```

---

# ベストプラクティス回答（あなたの Q1–Q3）

## Q1. JP UIで Negative を最も安定して特定する追加セレクタ/構造は？

* **スコープ先行**: `.prompt-input-box-undesired-content`（最有力。存在すれば即採用）
* **属性先行**: `[aria-label*="Undesired" i]`, `[aria-label*="Negative" i]`, `textarea[placeholder*="Undesired" i]`, `textarea[placeholder*="Negative" i]`
* **ラベル近傍**: テキストに `(除外したい要素|Undesired|Negative)` を含むノードを起点に、**祖先→子孫**へ `.ProseMirror, textarea` を探索
* **明示除外**: 祖先に `.prompt-input-box-プロンプト, .prompt-input-box-prompt` を持つ要素は**候補から除外**
* **近接スコア**: ラベル矩形(L)とエディタ矩形(R)で `d = 2*max(0,R.top-L.bottom) + |centerX差|` を最小化するものを採用（視覚的に“ラベルの直下”を優先）

> この順番で誤爆がほぼ消えます。実ログの“Positive側を掴んだ”ケースに対しては**明示除外**が効きます。

## Q2. 生成フローを止めない設計：Negative未設定の扱いは？

* **推奨**: 既定は **警告ログのみで続行**（`continue without negative`）。
* UI/設定に **“Negative必須にする” トグル**を用意し、ON時だけ中断（再試行→手動確認向け）。
* ログは `neg-missing: true` を 1行出せば十分。後段の品質分析で追える。

> 実運用では“Negativeが無い＝致命的”ではないので、既定続行が UX 的に安全です。

## Q3. ProseMirror への確実な適用手順（順序）

1. **scrollIntoView & focus**（UIの遅延描画に備える）
2. **全選択→delete**（既存内容クリア）
3. **Paste 駆動（ClipboardEvent）**

   * `DataTransfer.setData('text/plain', text)` → `dispatchEvent(new ClipboardEvent('paste', { clipboardData }))`
4. **`input` → `change` → `blur` → `focusout`** を順次発火（React/ProseMirror両対応）
5. **次フレーム待ち**（`await new Promise(r=>requestAnimationFrame(()=>setTimeout(r, 0)))`）
6. **読戻し確認**（先頭一致 or 完全一致。プレ/サフィックスが自動付与されるUIなら先頭一致が無難）

> `insertText` は通れば最速、失敗時は **paste を既定**に。あなたの既存ホットフィックス（insert→paste→innerText）順は適切です。

---

# 仕上げチェックリスト

* [ ] `findNegativeEditorStrict()` を導入（Positive 祖先の**明示除外**を忘れずに）
* [ ] `applyNegativePromptSafe()` で **非throw** に変更、全戦略×でも継続
* [ ] `confirm-proof` ログを **必ず同じ要素**で出す
* [ ] ダウンロード完了待ちは `chrome.downloads` で（別件ですがここが次の詰まりやすい所）

このパッチで **「メインPositiveは入る／Negativeも入るか、入らなくても止まらない」** に改善できます。さらにログ（`negative-target-picked` と `confirm-proof`）が揃えば、もし UI 側に個別癖があってもすぐ追加ルールで潰せます。
