// content.js
import { DOMHelper, SELECTORS } from './utils/dom-helper.js';

async function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function setPrompts(positive, negative) {
  const posInput = await DOMHelper.waitForElement(SELECTORS.positivePrompt);
  const negInput = await DOMHelper.waitForElement(SELECTORS.negativePrompt);
  DOMHelper.setInputValue(posInput, positive);
  DOMHelper.setInputValue(negInput, negative);
}

async function getLatestImage() {
  const img = await DOMHelper.waitForElement(SELECTORS.generatedImage);
  if (!img?.src) throw new Error('Generated image not found');

  if (img.src.startsWith('data:')) {
    return img.src;
  }
  if (img.src.startsWith('blob:')) {
    const response = await fetch(img.src);
    const blob = await response.blob();
    return await blobToDataURL(blob);
  }
  return img.src;
}

class GenerationMonitor {
  constructor() {
    this.observer = null;
  }

  async waitForCompletion(timeoutMs = 60000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const done = () => {
        this.observer?.disconnect();
        resolve(true);
      };

      this.observer = new MutationObserver(() => {
        // Heuristic: find new img nodes under a gallery area or any img with complete flag
        const imgs = Array.from(document.querySelectorAll('img'));
        const ready = imgs.some((i) => i.complete && i.naturalWidth > 0);
        if (ready) done();
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });

      const interval = setInterval(() => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          this.observer?.disconnect();
          reject(new Error('Generation timeout'));
        }
      }, 500);
    });
  }
}

async function saveGeneratedImage(index, characterName = 'default') {
  const imageUrl = await getLatestImage();
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'DOWNLOAD_IMAGE', imageUrl, characterName, index },
      (res) => resolve(res)
    );
  });
}

async function generateMultipleImages(count, characterName) {
  const monitor = new GenerationMonitor();

  for (let i = 0; i < count; i++) {
    const genButton = DOMHelper.findGenerateButton() || (await DOMHelper.waitForElement('button'));
    genButton?.click();

    await monitor.waitForCompletion();
    await saveGeneratedImage(i, characterName);

    chrome.runtime.sendMessage({ type: 'GENERATION_PROGRESS', current: i + 1, total: count });
  }
}

async function handleGenerationStart({ prompt, count }) {
  await setPrompts(prompt.positive, prompt.negative);
  await generateMultipleImages(Number(count) || 1, prompt.name || prompt.id || 'default');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request?.type === 'START_GENERATION') {
        await handleGenerationStart(request);
        chrome.runtime.sendMessage({ type: 'GENERATION_COMPLETE' });
        sendResponse({ ok: true });
      }
    } catch (error) {
      chrome.runtime.sendMessage({ type: 'GENERATION_ERROR', error: error?.message || String(error) });
      sendResponse({ ok: false, error: error?.message || String(error) });
    }
  })();
  return true;
});
