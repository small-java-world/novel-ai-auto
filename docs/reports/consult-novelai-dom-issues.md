## NovelAI DOM適用不具合の徹底比較相談メモ（現行実装 vs selenium_runner.py）

### 症状
- メインのポジティブプロンプトがセットできない
- 「キャラクターを追加」が動かない（カード作成や入力が入らない）

本メモでは、拡張の現行 `content.ts` / マルチキャラクター処理 と、実績のある `selenium_runner.py` を並べて、実装差分と疑わしいポイントを具体的なコード抜粋付きで整理します。

---

## 1) ポジティブプロンプト設定の比較

### 現行実装（content.ts）
主処理は `handleApplyPrompt()` → `resolvePromptInput()` → `setInputValue()` の流れ。

```515:577:src/content.ts
async function handleApplyPrompt(
  message: ApplyPromptMessage,
  _sendResponse: (_response: unknown) => void
): Promise<void> {
  try {
    // ...
    const promptInput = await resolvePromptInput();
    diag('prompt-input-found', {
      tag: promptInput.tagName,
      editable: (promptInput as any).isContentEditable === true,
    });
    console.log(
      'Resolved prompt matches first textarea:',
      promptInput === document.querySelector('textarea')
    );

    const positivePrompt =
      typeof (message as any).prompt === 'string'
        ? ((message as any).prompt as string)
        : ((message as any).prompt?.positive ?? '');
    const negativePrompt =
      typeof (message as any).prompt === 'object' && (message as any).prompt !== null
        ? (message as any).prompt.negative
        : undefined;

    try {
      diag('apply-payload', {
        charMeta: (message as any)?.charMeta || null,
        selectorProfile: (message as any)?.selectorProfile || null,
        posLen: (positivePrompt || '').length,
        negLen: (negativePrompt || '').toString().length,
      });
    } catch {}

    setInputValue(promptInput, positivePrompt);
    diag('positive-set', { length: positivePrompt?.length ?? 0 });
    // ...
```

要素解決はセレクタ構成 + Selenium互換のXPathフォールバックを使用：

```760:785:src/content.ts
async function resolvePromptInput(): Promise<HTMLElement> {
  const element = await resolveElement('prompt-input');
  if (element) {
    return element;
  }

  // Selenium-style fallback strategy with multiple selectors
  const fallbackSelectors = [
    // From Selenium: Japanese UI selectors
    "//*[contains(normalize-space(),'プロンプト')]/following::textarea[1]",
    "//*[contains(normalize-space(),'プロンプト')]/following::*[@contenteditable='true'][1]",
    "//textarea[contains(@placeholder,'Positive') or contains(@aria-label,'Positive')]",
    "//textarea[@rows and not(@readonly)]"
  ];
  // ... document.evaluate で探索
}
```

入力はエディタ種別に応じてイベント発火まで行う：

```1132:1187:src/content.ts
function setInputValue(element: HTMLElement, value: string): void {
  const normalised = typeof value === 'string' ? value : String(value ?? '');
  element.focus();
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.value = '';
    element.value = normalised;
    if (element instanceof HTMLTextAreaElement) {
      element.textContent = normalised;
    }
    element.defaultValue = normalised;
    element.setAttribute('value', normalised);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
    return;
  }
  const isEditable =
    (element as any).isContentEditable === true ||
    element.getAttribute('contenteditable') === 'true';
  if (isEditable) {
    try {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.addRange(range);
        const inserted = document.execCommand('insertText', false, normalised);
        if (!inserted) {
          element.textContent = normalised;
        }
      } else {
        element.textContent = normalised;
      }
    } catch {
      element.textContent = normalised;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
    element.dispatchEvent(new Event('focusout', { bubbles: true } as any));
    return;
  }
}
```

### Selenium実装（selenium_runner.py）

```94:118:selenium_runner.py
def set_prompts(driver, positive: str, negative: str):
    pos = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'プロンプト')]/following::textarea[1]"),
        (By.XPATH, "//*[contains(normalize-space(),'プロンプト')]/following::*[@contenteditable='true'][1]"),
        (By.XPATH, "//textarea[contains(@placeholder,'Positive') or contains(@aria-label,'Positive')]"),
        (By.XPATH, "//textarea[@rows and not(@readonly)]"),
    ])
    if not pos:
        raise RuntimeError("Positive prompt field not found")
    try:
        pos.clear(); pos.send_keys(positive)
    except Exception:
        js_set_value_and_fire(driver, pos, positive)

    neg = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'除外したい要素')]/following::textarea[1]"),
        (By.XPATH, "(//textarea[@rows and not(@readonly)])[last()]"),
        (By.XPATH, "//textarea[contains(@placeholder,'Negative') or contains(@aria-label,'Negative')]"),
    ])
    if neg:
        try:
            neg.clear(); neg.send_keys(negative)
        except Exception:
            js_set_value_and_fire(driver, neg, negative)
```

### 差分と疑いポイント
- 現行はまず `config/dom-selectors.json` のプロファイル経由で `prompt-input` を解決。UI更新でこのプロファイルがマッチしない場合、XPathフォールバックに落ちるが、そこで拾えていない可能性。
- `setInputValue` は ProseMirror/Slate を想定して `execCommand('insertText')` を使うが、サイト側のエディタ実装変更で無効な可能性。Seleniumでは `send_keys` → 失敗時 `js_set_value_and_fire` で確実に input/change を送っている。
- 「編集有効化トグル」クリックは現行に実装済みだが、検出セレクタが狭い可能性（`button.sc-4f026a5f-2.iaNkyw`）。

---

## 2) ネガティブ/関連エディタ検出の比較

現行は多段ストラテジーでネガティブを探索・設定：

```813:993:src/content.ts
async function applyNegativePrompt(value: string | undefined): Promise<void> {
  const text = (value ?? '').toString();
  // Strategy 0: .ProseMirror 群から文脈で負側を推定 → スクロールして setInputValue
  // Strategy 1: resolveNegativePromptInput()（Selenium由来のXPath混在）
  // Strategy 2: data-negative やクラス名で候補列挙
  // Strategy 3: textarea 属性で negative を推定
  // Strategy 4: ProseMirror の2個目以降を総当り
  // ... 成功時に diag('negative-after-set', { strategy, ... }) を送信
}
```

Seleniumはプロンプトと同様のXPathでシンプルに取得しており、UIラベル（日/英）に強い：

```108:118:selenium_runner.py
    neg = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'除外したい要素')]/following::textarea[1]"),
        (By.XPATH, "(//textarea[@rows and not(@readonly)])[last()]"),
        (By.XPATH, "//textarea[contains(@placeholder,'Negative') or contains(@aria-label,'Negative')]"),
    ])
    if neg:
        try:
            neg.clear(); neg.send_keys(negative)
        except Exception:
            js_set_value_and_fire(driver, neg, negative)
```

### 差分と疑いポイント
- 現行のストラテジーは豊富だが「最終的に実際の編集対象要素に届かない」ケースがあると、見かけ上は成功ログでもテキストが入っていない可能性。成功/不一致の read-back 確認は入っているが、`expectedText.includes(actual.slice(0,20))` の判定が甘い可能性。

---

## 3) キャラクター追加フローの比較

### Selenium 実装

```193:271:selenium_runner.py
def click_add_character_and_choose(driver, gender_text: str):
    add_btn = find_first(driver, [
        (By.XPATH, "//button[contains(normalize-space(),'キャラクターを追加')]"),
        (By.XPATH, "//button[.//span[contains(.,'キャラクター') and contains(.,'追加')]]"),
    ])
    if not add_btn:
        raise RuntimeError("『＋ キャラクターを追加』ボタンが見つかりません")
    safe_click(driver, add_btn); time.sleep(0.15)

    opt = find_first(driver, [
        (By.XPATH, f"//div[contains(@role,'menu') or @role='listbox' or contains(@class,'popover') or contains(@class,'menu')]//button[normalize-space()='{gender_text}']"),
        (By.XPATH, f"//*[self::li or self::button or self::div][normalize-space()='{gender_text}']"),
    ])
    if not opt:
        raise RuntimeError(f"性別メニューの項目が見つかりません: {gender_text}")
    safe_click(driver, opt); time.sleep(0.25)

def fill_character_card(driver, card, *, positive=None, negative=None, weight=None):
    if positive is not None:
        pos_area = find_first(card, [
            (By.XPATH, ".//*[contains(normalize-space(),'プロンプト')]/following::textarea[1]"),
            (By.XPATH, ".//textarea"),
            (By.XPATH, ".//*[@contenteditable='true']"),
        ])
        if pos_area:
            try:
                pos_area.clear(); pos_area.send_keys(positive)
            except Exception:
                js_set_value_and_fire(driver, pos_area, positive)
    # negative/weight も同様に設定

def add_character(driver, *, gender: str, positive: str, negative: str = "", weight: float | None = None):
    section = find_first(driver, [(By.XPATH, "//*[contains(normalize-space(),'キャラクタープロンプト')]")])
    if section:
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", section)
    click_add_character_and_choose(driver, gender)
    card = _last_character_card(driver)
    if not card:
        raise RuntimeError("追加したキャラカードが見つかりません")
    fill_character_card(driver, card, positive=positive, negative=negative, weight=weight)
    time.sleep(0.2)
```

### 現行のマルチキャラクター処理（TypeScript）

追加ボタン探索とカード入力は TS 側に相当実装あり：

```337:426:src/utils/multi-character-sequence.ts
// Selenium equivalent: click_add_character_and_choose
  const addButtonSelectors = [
    "//button[contains(normalize-space(),'キャラクターを追加')]",
    "//button[.//span[contains(.,'キャラクター') and contains(.,'追加')]]",
    "//button[contains(.,'キャラクター') and contains(.,'追加')]",
    "[data-testid*='add-character' i]",
    "button[class*='add' i][class*='character' i]",
    ".add-character-button"
  ];
  console.log('DEBUG: Searching for character add button with selectors:', addButtonSelectors);
  // ... 実検索 & エラー時 throw
```

```476:539:src/utils/multi-character-sequence.ts
private async fillCharacterCard(positive: string, negative?: string, weight?: number): Promise<void> {
  // ...
  // positive 入力欄候補を複数 CSS で探索（textarea/ProseMirror/contenteditable）
  // negative も同様に nth-of-type 系や属性ヒントで探索
  if (positiveArea) {
    this.setCardInputValue(positiveArea, positive);
  }
  if (negativeArea) {
    this.setCardInputValue(negativeArea, negative);
  }
  // weight があれば number/range を設定
}
```

### 差分と疑いポイント
- TS 側は XPath も使うが、実際の `querySelector` ベース探索が多く、UIクラス名変更や Shadow/Portal 配下でヒットしない可能性。
- Selenium は「クリックの前にスクロール＋小待機」「クリックを ActionChains 相当で確実化」している。TS 側にも `clickElementRobustly` はあるが、キャラ追加経路で確実に使えているか/待機が十分か要確認。

---

## 4) 重要な相違点（要修正候補）
- セレクタプロファイル依存度が高く、UI更新で `prompt-input` が解決不能に落ちる。Selenium 直輸入の XPath 群を最初から併用するべき。
- `setInputValue` の ProseMirror/Slate への書き込みが、NovelAIの最新エディタ実装で無効の可能性。Selenium の `js_set_value_and_fire` と同様に `textContent` 書き込み＋`input/change`をより直接的に行うパスを追加検討。
- キャラ追加は「ボタン検出→クリック→メニュー選択→カード検出→フィールド入力」の各ステップで、スクロール・短い待機・再探索・厳密な失敗ログを強化する。

---

## 5) 具体的なログ／確認観点（相談したいポイント）

1. 現在のログに「positive-set」は出るが、直後の読み戻しで実テキストが空になるケースはあるか？そのとき `confirm-readback-...` の `contentMatch` は false になっているか。
2. `resolvePromptInput()` がフォールバックまで降りているか（`resolve-element-start` と `resolve-element-ok` の step）。降りているならどの XPath がヒットしているか。
3. 編集有効化トグル（`clickEnableButtonIfPresent`）のセレクタが現UIに合っているか。別のボタンが必要か。
4. キャラ追加時、`DEBUG: Searching for character add button` 後に実際にどのセレクタでヒットし、クリック後にメニュー項目が取れているか。取れないなら、ドロップダウンの `role=menu/listbox` 検出を Selenium 同等に広げる必要あり。
5. 追加直後のカード検出 `_last_character_card` 相当ロジックが現行にあるか。最近追加された DOM を MutationObserver で拾うほうが確実か。

---

## 6) 参考抜粋（Selenium 側の周辺実装）

サンプラ/ステップ/サイズ/スケール設定：
```135:177:selenium_runner.py
def set_sampler_steps_size_scale(driver, sampler_text: str, steps: int, width: int, height: int, scale: float):
    samp_open = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'サンプラー')]//button|//button[contains(.,'サンプラー')]"),
        (By.XPATH, "//button[contains(.,'Sampler')]")
    ])
    if samp_open:
        safe_click(driver, samp_open); time.sleep(0.2)
        cand = find_first(driver, [
            (By.XPATH, f"//li[contains(.,'{sampler_text}')]"),
            (By.XPATH, f"//button[contains(.,'{sampler_text}')]"),
            (By.XPATH, f"//*[@role='option' and contains(.,'{sampler_text}')]"),
        ])
        if cand: safe_click(driver, cand); time.sleep(0.2)
    # steps/scale/width/height を各 input number に直接 set + change 発火
```

品質タグトグル：
```178:192:selenium_runner.py
def set_quality_tag_toggle(driver, enable: bool):
    row = find_first(driver, [(By.XPATH, "//*[contains(normalize-space(),'品質タグ有効')]")])
    if not row: return
    toggle = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'品質タグ有効')]/following::button[1]"),
        (By.XPATH, "//*[contains(normalize-space(),'品質タグ有効')]/ancestor::*[1]//button[1]")
    ])
    # aria-* / data-state を見て状態判定し、差分あればクリック
```

---

## 7) 提案する修正方針（短期）
- `resolvePromptInput()` のフォールバック順を「Selenium XPath → プロファイルセレクタ併用」にし、評価ログに「ヒットした具体的セレクタ/XPath」を出す。
- `setInputValue()` に、ProseMirror検出時の代替経路として「element.textContent = 値 → input/change → blur → focusout」に加え、`compositionstart/compositionend` など IME イベントを追加試験。
- キャラ追加ハンドラで：
  - クリック前に `scrollIntoView + 50ms 待機` を必ず行う。
  - メニュー開閉後は `role='menu'|'listbox'|class*='popover'` スコープに限定して項目探索。
  - カード検出は「最後に追加されたセクション」を `MutationObserver` で待機（最大 1s）。

---

## 8) 相談したい追加情報（ログ/画面）
- 最新失敗ログ（`GENERATION_DIAGNOSTICS`）：`prompt-input-found`, `positive-set`, `confirm-readback-...`, `negative-after-set` の有無と内容。
- キャラ追加時の `DEBUG: ...` ラインと、失敗時に投げている例外メッセージ全文。
- 可能なら、該当画面の DOM スナップショット（`outerHTML` 断片）か、UIのラベル/ボタン文言のスクショ。

---

このメモをベースに、該当箇所のロギング強化とセレクタ/入力方式の見直しを突き合わせて進めたいです。必要なら、ここに追記していきます。


