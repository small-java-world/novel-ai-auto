了解。NovelAI の画像生成ページ（/image）で、メインのプロンプト／除外要素（Undesired Content）や「キャラクタープロンプト」欄を **自動操作するために使える DOM セレクタ** を、公開されているユーザースクリプト・拡張の実装から拾い上げて整理しました。下記は**実在コードに基づくセレクタ**なので、そのまま `querySelector` で当たります（ただし UI は随時変わり得るので後述の堅牢化も推奨）。

# 使えるセレクタ（実例）

* メインのプロンプト入力ボックス
  `.prompt-input-box-prompt`（直下に ProseMirror エディタが入ります） ([greasyfork.org][1])

* 除外したい要素（Negative / Undesired Content）
  `.prompt-input-box-undesired-content` ([greasyfork.org][2])

* （スクリプトによっては）別名でのベース／ネガティブ欄
  `.prompt-input-box-base-prompt` / `.prompt-input-box-negative-prompt`（存在すれば） ([greasyfork.org][3])

* キャラクタープロンプト（複数の繰り返し欄）
  `[class*="character-prompt-input"]`（部分一致で拾う実装が確認できます） ([greasyfork.org][3])

* プロンプト欄の実エディタ（内容を書き込む先）
  `.ProseMirror`（各入力ボックスの内部に存在） ([greasyfork.org][1])

* サジェスト領域（置換時に除外したい領域として使われています）
  `.image-prompt-suggestions` ([greasyfork.org][2])

> 上記クラス名は、NovelAI 画像ページを対象にした GreasyFork のユーザースクリプトや拡張が実際に利用しているものです（例：翻訳スクリプト／強化ツール／重量調整系）。該当コード断片は各リンク先の「Code」内で確認できます。 ([greasyfork.org][2])

# 具体的な取り回し（最小コード例）

**1) 欄の特定 → ProseMirror エディタに文字列を反映**

```js
// メインプロンプト
const mainBox = document.querySelector('.prompt-input-box-prompt');
const mainEditor = mainBox?.querySelector('.ProseMirror');

// 除外（Negative）
const negBox = document.querySelector('.prompt-input-box-undesired-content');
const negEditor = negBox?.querySelector('.ProseMirror');

// キャラプロンプト（複数）
const charEditors = Array.from(document.querySelectorAll('[class*="character-prompt-input"] .ProseMirror'));

// ProseMirror へ入力（テキスト置換）
function setProseMirrorText(editor, text) {
  if (!editor) return;
  editor.focus();
  // 全選択→入力に近い操作（単純 textContent 書き換えだけだと反映しないことがある）
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand('insertText', false, text);
  editor.dispatchEvent(new InputEvent('input', {bubbles: true}));
  editor.blur();
}

// 使用例
setProseMirrorText(mainEditor, 'masterpiece, best quality, ...');
setProseMirrorText(negEditor, 'lowres, bad hands, ...');
// 先頭キャラ欄に入れる
setProseMirrorText(charEditors[0], '1girl, silver hair, ...');
```

※ `.ProseMirror` はリッチエディタのため、**単純に `textContent=` では状態が更新されない**ことがあります。上のように `execCommand('insertText')` と `input` イベントを投げる方が堅いです（実運用のユーザースクリプトでも ProseMirror を直接触っています）。 ([greasyfork.org][1])

# 生成ボタンなど（補足の見つけ方）

公開スクリプトでは生成ボタンを固定クラスで取っていない例が多いです。**テキスト（"Generate"）や aria 属性で走査**するのが安全です。

```js
// ラベル一致でボタンを拾う（多言語想定で includes に）
const genBtn = Array.from(document.querySelectorAll('button'))
  .find(b => /generate/i.test(b.textContent || ''));
// or: role/aria-label を使ったロバスト探索
```

# 変更へ強い実装のコツ（実運用で定番）

* **ラベルや placeholder から近傍探索**
  例えば「Undesired Content」ラベルの `span` を見つけ、`closest()` で親に上り、配下の `.ProseMirror` を取る（UI 変更に強い）。実際にラベル文字列からスライダー等を逆引きする実装が公開されています。 ([greasyfork.org][1])

* **MutationObserver で初期レンダリング完了を待つ**
  React/Next で遅れて挿入されるため、`document.body` に `childList:true, subtree:true` で張って、要素が現れたら処理する方式が多数派です。 ([greasyfork.org][1])

* **compiled クラス（難読化クラス名）に依存しない**
  難読化されたクラスはリリースで変わりやすいので、\**意味のあるクラス（上記の prompt-input-* 系）**や**構造・スタイルヒューリスティクス\*\*で辿る例が推奨されています。 ([greasyfork.org][1])

# 参考になった実コード（確認済み）

* 「NovelAI 画像ページ向け翻訳」スクリプト
  `.prompt-input-box-prompt`、`.prompt-input-box-undesired-content`、`.image-prompt-suggestions` を除外／監視に使用。MutationObserver で DOM 変化監視。 ([greasyfork.org][2])

* 「NovelAI Image Generator Enhancements」
  `.prompt-input-box-prompt` を基準に UI ボタンを差し込み、`.ProseMirror` の段落を走査してプロンプトテキストを加工。ラベルからの上り探索も採用。 ([greasyfork.org][1])

* 「NovelAI 快捷（重量調整）系スクリプト」
  `.prompt-input-box-base-prompt` / `.prompt-input-box-negative-prompt` / `.prompt-input-box-undesired-content` / `[class*="character-prompt-input"]` などを **OR で包括的に対応**。 ([greasyfork.org][3])

* 「NovelAI Wildcard Extension（Chrome 拡張）」
  画像ページに独自のプロンプト UI を重ねる拡張。プロンプト UI 拡張の先行例として把握しておくと良いです。 ([Chromeウェブストア][4])

---

必要なら、上のセレクタを使って **Chrome 拡張（Manifest v3 + Content Script）** の最小テンプレ（`MutationObserver` 付き）まで一気に書き起こします。どの操作（メイン／ネガ／キャラ欄のどれをどう埋めるか、保存 JSON 形式、UI 追加の要不要）を決めてくれれば、その仕様に合わせて実装例を出します。

[1]: https://greasyfork.org/en/scripts/535979-novelai-image-generator-enhancements/code "NovelAI Image Generator Enhancements - Source code"
[2]: https://greasyfork.org/en/scripts/485444-novelai%E5%9B%BE%E5%83%8F%E7%94%9F%E6%88%90%E6%B1%89%E5%8C%96/code "NovelAI图像生成汉化 - Source code"
[3]: https://greasyfork.org/en/scripts/539015-novelai-%E5%BF%AB%E6%8D%B7%E9%94%AE%E6%9D%83%E9%87%8D%E8%B0%83%E6%95%B4/code?utm_source=chatgpt.com "NovelAI 快捷键权重调整- Source code"
[4]: https://chromewebstore.google.com/detail/novelai-wildcard-extensio/dngepaimfmeobhmakaihhdafcjmlbgjh?hl=en&utm_source=chatgpt.com "Novelai Wildcard Extension - Chrome Web Store"


いい質問。**結論：固定クラス名は公開情報では拾えません**が、NovelAI公式ドキュメントで「各画像の下に Download ボタン」「History最下部に Download ZIP」が明記されています。なので、**ラベル／aria属性ベース**で確実に拾う実装が安全です。([docs.novelai.net][1])

## 取れる場所

* **各画像の個別DL**：「画像の下にある Download ボタン」。（公式記載）([docs.novelai.net][1])
* **一括DL**：「History タブの一番下にある Download ZIP」。([docs.novelai.net][2])

## セレクタ実装（壊れにくい版）

```js
// 1) 個別画像の「Download」ボタン（多言語対応：英語UI前提＋aria/タイトル回収）
function findPerImageDownloadButtons(root=document){
  const btns = Array.from(root.querySelectorAll('button, [role="button"], a'));
  return btns.filter(b => {
    const t = (b.textContent || '').trim().toLowerCase();
    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
    const title = (b.getAttribute('title') || '').toLowerCase();
    return /download/.test(t) || /download/.test(aria) || /download/.test(title);
  });
}
// 使い方：該当ボタンをクリック
findPerImageDownloadButtons().forEach(b => console.debug('DL btn:', b));

// 2) 履歴の「Download ZIP」ボタン
function findDownloadZipButton(){
  const candidates = Array.from(document.querySelectorAll('button, [role="button"], a'));
  return candidates.find(b => /download\s*zip/i.test((b.textContent||'') + ' ' + (b.getAttribute('aria-label')||'')));
}
// 例：クリック
const zipBtn = findDownloadZipButton();
if (zipBtn) zipBtn.click();
```

### 画像カードから“近傍探索”する場合（より精密）

```js
// 画像カード（<img> もしくは canvas）を起点に“同じカード内の Download を取得”
function findDownloadForImage(imgEl){
  const card = imgEl.closest('[class*="card"], [class*="history"], [class*="image"]') || imgEl.parentElement;
  if (!card) return null;
  return findPerImageDownloadButtons(card)[0] || null;
}
```

### 初期レンダリング待ち（React対策）

```js
const mo = new MutationObserver(() => {
  const found = findPerImageDownloadButtons();
  if (found.length) {
    console.log('DL buttons ready', found.length);
    mo.disconnect();
  }
});
mo.observe(document.body, {subtree:true, childList:true});
```

## トラブル時の注意

最近「Save/Download が反応しない」報告が出ています。**Chromeのサイト別“自動ダウンロード”ブロック**で止まる事があるので、`chrome://settings/content/automaticDownloads` で `novelai.net` を許可して解消する例が共有されています。([Reddit][3])

---

必要なら、この発見ロジックを**Manifest v3 の content\_script**に落として、

* 画像生成完了→対象画像のDLを自動クリック
* 一定枚数で `Download ZIP` を押す
  というフローまで組みます。仕様（いつ押すか／どれだけ待つか）を教えてくれれば、そのままビルド可能な最小拡張子一式を書きます。

[1]: https://docs.novelai.net/en/image/tutorial-imgintro/?utm_source=chatgpt.com "Tutorial: Intro to Image Generation"
[2]: https://docs.novelai.net/en/image/history/?utm_source=chatgpt.com "History"
[3]: https://www.reddit.com/r/NovelAi/comments/1n0mq8t/novelai_stopped_auto_downloading_images_now_it/?utm_source=chatgpt.com "NovelAI stopped auto downloading images. Now it only ..."
