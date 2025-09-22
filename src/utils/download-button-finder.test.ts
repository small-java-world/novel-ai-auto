import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  findPerImageDownloadButtons,
  findDownloadZipButton,
  findDownloadForImage,
  clickDownloadButton,
  clickAllDownloadButtons,
  shouldCheckDownloadSettings,
  getDownloadSettingsMessage
} from './download-button-finder';

// DOM セットアップ用のヘルパー
function createMockButton(type: 'button' | 'link' | 'role', text: string, attributes: Record<string, string> = {}): HTMLElement {
  let element: HTMLElement;

  if (type === 'button') {
    element = document.createElement('button');
  } else if (type === 'link') {
    element = document.createElement('a');
  } else {
    element = document.createElement('div');
    element.setAttribute('role', 'button');
  }

  element.textContent = text;
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
}

describe('NovelAI ダウンロードボタン検索', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('findPerImageDownloadButtons', () => {
    it('textContentに"download"を含むボタンを見つける', () => {
      const downloadBtn = createMockButton('button', 'Download Image');
      const normalBtn = createMockButton('button', 'Generate');

      document.body.appendChild(downloadBtn);
      document.body.appendChild(normalBtn);

      const result = findPerImageDownloadButtons();
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(downloadBtn);
    });

    it('aria-labelに"download"を含むボタンを見つける', () => {
      const downloadBtn = createMockButton('button', 'DL', { 'aria-label': 'Download this image' });
      const normalBtn = createMockButton('button', 'Save', { 'aria-label': 'Save settings' });

      document.body.appendChild(downloadBtn);
      document.body.appendChild(normalBtn);

      const result = findPerImageDownloadButtons();
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(downloadBtn);
    });

    it('titleに"download"を含むリンクを見つける', () => {
      const downloadLink = createMockButton('link', '⬇', { title: 'Download image' });
      const normalLink = createMockButton('link', 'Link', { title: 'External link' });

      document.body.appendChild(downloadLink);
      document.body.appendChild(normalLink);

      const result = findPerImageDownloadButtons();
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(downloadLink);
    });

    it('role="button"の要素も検索対象に含める', () => {
      const roleButton = createMockButton('role', 'download now');

      document.body.appendChild(roleButton);

      const result = findPerImageDownloadButtons();
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(roleButton);
    });

    it('大文字小文字を区別しない検索', () => {
      const downloadBtn1 = createMockButton('button', 'DOWNLOAD');
      const downloadBtn2 = createMockButton('button', 'Download');
      const downloadBtn3 = createMockButton('button', 'download');

      document.body.appendChild(downloadBtn1);
      document.body.appendChild(downloadBtn2);
      document.body.appendChild(downloadBtn3);

      const result = findPerImageDownloadButtons();
      expect(result).toHaveLength(3);
    });
  });

  describe('findDownloadZipButton', () => {
    it('"Download ZIP"を含むボタンを見つける', () => {
      const zipBtn = createMockButton('button', 'Download ZIP');
      const normalBtn = createMockButton('button', 'Download');

      document.body.appendChild(zipBtn);
      document.body.appendChild(normalBtn);

      const result = findDownloadZipButton();
      expect(result).toBe(zipBtn);
    });

    it('aria-labelで"Download ZIP"を見つける', () => {
      const zipBtn = createMockButton('button', 'ZIP', { 'aria-label': 'Download ZIP archive' });

      document.body.appendChild(zipBtn);

      const result = findDownloadZipButton();
      expect(result).toBe(zipBtn);
    });

    it('該当するボタンがない場合はnullを返す', () => {
      const normalBtn = createMockButton('button', 'Download');
      document.body.appendChild(normalBtn);

      const result = findDownloadZipButton();
      expect(result).toBeNull();
    });
  });

  describe('findDownloadForImage', () => {
    it('画像カード内のダウンロードボタンを見つける', () => {
      const card = document.createElement('div');
      card.className = 'image-card';

      const img = document.createElement('img');
      const downloadBtn = createMockButton('button', 'Download');

      card.appendChild(img);
      card.appendChild(downloadBtn);
      document.body.appendChild(card);

      const result = findDownloadForImage(img);
      expect(result).toBe(downloadBtn);
    });

    it('親要素にカードがない場合の処理', () => {
      const img = document.createElement('img');
      const downloadBtn = createMockButton('button', 'Download');

      const parent = document.createElement('div');
      parent.appendChild(img);
      parent.appendChild(downloadBtn);
      document.body.appendChild(parent);

      const result = findDownloadForImage(img);
      expect(result).toBe(downloadBtn);
    });

    it('ダウンロードボタンが見つからない場合はnullを返す', () => {
      const img = document.createElement('img');
      document.body.appendChild(img);

      const result = findDownloadForImage(img);
      expect(result).toBeNull();
    });
  });

  describe('clickDownloadButton', () => {
    it('HTMLButtonElementをクリックできる', () => {
      const button = document.createElement('button');
      const clickSpy = vi.spyOn(button, 'click');

      const result = clickDownloadButton(button);

      expect(result).toBe(true);
      expect(clickSpy).toHaveBeenCalledOnce();
    });

    it('HTMLAnchorElementをクリックできる', () => {
      const link = document.createElement('a');
      const clickSpy = vi.spyOn(link, 'click');

      const result = clickDownloadButton(link);

      expect(result).toBe(true);
      expect(clickSpy).toHaveBeenCalledOnce();
    });

    it('role="button"要素にMouseEventを発火する', () => {
      const div = document.createElement('div');
      div.setAttribute('role', 'button');
      const eventSpy = vi.spyOn(div, 'dispatchEvent');

      const result = clickDownloadButton(div);

      expect(result).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'click',
          bubbles: true,
          cancelable: true
        })
      );
    });

    it('サポートされていない要素の場合はfalseを返す', () => {
      const span = document.createElement('span');

      const result = clickDownloadButton(span);

      expect(result).toBe(false);
    });
  });

  describe('clickAllDownloadButtons', () => {
    it('全てのダウンロードボタンをクリックする', async () => {
      const btn1 = createMockButton('button', 'Download 1');
      const btn2 = createMockButton('button', 'Download 2');
      const btn3 = createMockButton('button', 'Normal');

      document.body.appendChild(btn1);
      document.body.appendChild(btn2);
      document.body.appendChild(btn3);

      const spy1 = vi.spyOn(btn1, 'click');
      const spy2 = vi.spyOn(btn2, 'click');
      const spy3 = vi.spyOn(btn3, 'click');

      const result = await clickAllDownloadButtons(0); // 遅延なし

      expect(result).toBe(2); // ダウンロードボタンのみ
      expect(spy1).toHaveBeenCalledOnce();
      expect(spy2).toHaveBeenCalledOnce();
      expect(spy3).not.toHaveBeenCalled();
    });
  });

  describe('shouldCheckDownloadSettings', () => {
    it('Chrome拡張環境以外ではfalseを返す', () => {
      // @ts-ignore
      global.chrome = undefined;

      const result = shouldCheckDownloadSettings();
      expect(result).toBe(false);
    });

    it('NovelAI以外のドメインではfalseを返す', () => {
      // @ts-ignore
      global.chrome = { runtime: {} };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = { hostname: 'example.com' };

      const result = shouldCheckDownloadSettings();
      expect(result).toBe(false);
    });

    it('NovelAIドメインのChrome拡張環境ではtrueを返す', () => {
      // @ts-ignore
      global.chrome = { runtime: {} };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = { hostname: 'novelai.net' };

      const result = shouldCheckDownloadSettings();
      expect(result).toBe(true);
    });
  });

  describe('getDownloadSettingsMessage', () => {
    it('設定確認メッセージを返す', () => {
      const message = getDownloadSettingsMessage();
      expect(message).toContain('chrome://settings/content/automaticDownloads');
      expect(message).toContain('novelai.net');
    });
  });
});