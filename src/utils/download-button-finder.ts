/**
 * NovelAI ダウンロードボタン検索ユーティリティ
 * noveldata.mdの情報に基づく実装
 */

/**
 * 個別画像のダウンロードボタンを検索する関数
 * 複数の検出方法を組み合わせた堅牢な実装
 * @param root - 検索対象のルート要素（デフォルトはdocument）
 * @returns 見つかったダウンロードボタンの配列
 */
export function findPerImageDownloadButtons(root: Document | Element = document): HTMLElement[] {
  // 過検出回避: クッキー同意/外部モーダル風のみ除外（画像ビューアのダイアログは許可）
  const scope = root instanceof Document ? root.body : root;
  const blockedCtx = '.osano, [class*="consent" i]';
  const container = (scope.closest(blockedCtx) ? null : scope) || scope;

  // Shadow/Portal を跨いで探索するヘルパー
  function queryAllDeep(selectors: string[], roots: (Document | ShadowRoot | Element)[] = [document]): HTMLElement[] {
    const out: HTMLElement[] = [];
    const nextRoots: (ShadowRoot | Element)[] = [];
    for (const r of roots) {
      const parent = (r as any).shadowRoot ? (r as any).shadowRoot as ShadowRoot : (r as ParentNode);
      for (const sel of selectors) {
        try {
          out.push(...Array.from((parent as ParentNode).querySelectorAll<HTMLElement>(sel)));
        } catch {}
      }
      try {
        (parent as ParentNode).querySelectorAll<HTMLElement>('*').forEach((el) => {
          const sr = (el as any).shadowRoot as ShadowRoot | undefined;
          if (sr) nextRoots.push(sr);
        });
      } catch {}
    }
    return nextRoots.length ? [...out, ...queryAllDeep(selectors, nextRoots)] : out;
  }

  // 直接候補（深い探索）
  const btns = queryAllDeep(['button', '[role="button"]', 'a', '[data-testid]'], [container]);

  // 子孫に save/download 系のヒントを持つ要素から親のクリック要素に昇格（深い探索）
  const hintSelectors = [
    '[title*="save" i]', '[aria-label*="save" i]', '[title*="download" i]', '[aria-label*="download" i]',
    '[data-testid*="save" i]', '[data-testid*="download" i]', 'img[src*="save" i]', 'img[alt*="save" i]',
    'svg[aria-label*="save" i]', 'use[href*="save" i]'
  ];
  const descendantHints = queryAllDeep(hintSelectors, [container]);
  const wrappedFromHints: HTMLElement[] = [];
  for (const el of descendantHints) {
    const clickable = (el.closest('button, [role="button"], a') as HTMLElement) || el;
    if (clickable) wrappedFromHints.push(clickable);
  }

  const pool = Array.from(new Set<HTMLElement>([...btns, ...wrappedFromHints]));

  return pool.filter((b) => {
    // 非表示/ゼロサイズは除外
    const r = b.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;

    // ブロック文脈除外
    if (b.closest(blockedCtx)) return false;

    const t = (b.textContent || '').trim().toLowerCase();
    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
    const title = (b.getAttribute('title') || '').toLowerCase();
    const testid = (b.getAttribute('data-testid') || '').toLowerCase();
    const className = (b.className || '').toString().toLowerCase();

    // 厳格: save/download/保存 の語義ベースのみ（ZIP/一括は除外）
    const zipLike = /(zip|archive|一括|まとめて)/i;
    const hasSemantic = (
      (/(download|save|保存)/i.test(t) && !zipLike.test(t)) ||
      (/(download|save|保存)/i.test(aria) && !zipLike.test(aria)) ||
      (/(download|save|保存)/i.test(title) && !zipLike.test(title)) ||
      (/(download|save)/i.test(testid) && !zipLike.test(testid))
    );

    // a[download] は強いシグナル
    const isAnchorDownload = b.tagName === 'A' && (b as HTMLAnchorElement).hasAttribute('download');

    // クラスヒューリスティック（UIマイナー変更に強くする）
    const classHeuristic = /(download|save)/i.test(className) || /(sc-883533e0-1|sc-4f026a5f-2)/.test(className);

    // 汎用SVGのみは不採用（誤検出の原因）
    const isGenericSvgOnly = !hasSemantic && !isAnchorDownload && !classHeuristic;

    return (hasSemantic || isAnchorDownload || classHeuristic) && !isGenericSvgOnly;
  });
}

/**
 * 履歴の「Download ZIP」ボタンを検索する関数
 * noveldata.mdの仕様に基づく実装
 * @returns 見つかったDownload ZIPボタン、または null
 */
export function findDownloadZipButton(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll('button, [role="button"], a')) as HTMLElement[];
  return candidates.find(b => /download\s*zip/i.test((b.textContent||'') + ' ' + (b.getAttribute('aria-label')||''))) || null;
}

/**
 * 画像要素から同じカード内のダウンロードボタンを検索する関数
 * noveldata.mdの仕様に基づく実装（近傍探索）
 * @param imgElement - 対象の画像要素
 * @returns 見つかったダウンロードボタン、または null
 */
export function findDownloadForImage(imgElement: HTMLElement): HTMLElement | null {
  const card = imgElement.closest('[class*="card"], [class*="history"], [class*="image"]') || imgElement.parentElement;
  if (!card) return null;
  return findPerImageDownloadButtons(card)[0] || null;
}

/**
 * ダウンロードボタンの出現を監視する関数
 * noveldata.mdの仕様に基づく実装（React対策）
 * @param callback - ボタンが見つかった時に呼び出されるコールバック
 * @param timeout - タイムアウト時間（ミリ秒、デフォルト10秒）
 * @returns MutationObserver インスタンス（手動で disconnect する場合）
 */
export function waitForDownloadButtons(
  callback: (buttons: HTMLElement[]) => void,
  timeout: number = 10000
): MutationObserver {
  const mo = new MutationObserver(() => {
    const found = findPerImageDownloadButtons();
    if (found.length) {
      console.log('DL buttons ready', found.length);
      callback(found);
      mo.disconnect();
    }
  });
  mo.observe(document.body, {subtree:true, childList:true});

  // タイムアウト設定
  setTimeout(() => mo.disconnect(), timeout);
  return mo;
}

/**
 * ダウンロードボタンをクリックする関数
 * @param button - クリック対象のボタン要素
 * @returns クリック成功の可否
 */
export function clickDownloadButton(button: HTMLElement): boolean {
  try {
    // NovelAI用の強化されたクリック処理
    const events = [
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }),
      new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }),
      new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
    ];

    // フォーカスを設定
    if (button.focus) {
      button.focus();
    }

    // 複数のイベントを順次実行
    events.forEach(event => {
      button.dispatchEvent(event);
    });

    // ネイティブクリックも実行
    if (button instanceof HTMLButtonElement || button instanceof HTMLAnchorElement) {
      setTimeout(() => button.click(), 100);
    }

    return true;
  } catch (error) {
    console.error('Download button click failed:', error);
    return false;
  }
}

/**
 * 全ての個別画像ダウンロードボタンを順次クリックする関数
 * @param delay - 各クリック間の遅延時間（ミリ秒、デフォルト1秒）
 * @returns クリックに成功したボタン数
 */
export async function clickAllDownloadButtons(delay: number = 1000): Promise<number> {
  const buttons = findPerImageDownloadButtons();
  let successCount = 0;

  for (const button of buttons) {
    if (clickDownloadButton(button)) {
      successCount++;
    }

    // 次のクリックまで遅延
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return successCount;
}

/**
 * Chrome拡張のセキュリティ設定チェック用の関数
 * noveldata.mdで言及されているダウンロードブロック問題に対応
 * @returns ダウンロード設定の確認が必要かどうか
 */
export function shouldCheckDownloadSettings(): boolean {
  // Chrome拡張環境でのみ有効
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    return false;
  }

  // NovelAI ドメインでのみ有効
  return window.location.hostname.includes('novelai.net');
}

/**
 * ダウンロード設定確認用のヘルパーメッセージ
 * noveldata.mdで言及されているトラブル対策
 */
export function getDownloadSettingsMessage(): string {
  return 'ダウンロードが機能しない場合は、Chromeのサイト別"自動ダウンロード"ブロックが原因の可能性があります。\n' +
         'chrome://settings/content/automaticDownloads で novelai.net を許可してください。';
}