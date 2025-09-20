// popup/popup.js

async function loadPrompts() {
  const select = document.getElementById('promptSelect');
  select.innerHTML = '';
  try {
    const url = chrome.runtime.getURL('config/prompts.json');
    const res = await fetch(url);
    const prompts = await res.json();
    prompts.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = p.name || p.id;
      select.appendChild(opt);
    });
    return prompts;
  } catch (e) {
    console.error('Failed to load prompts:', e);
    return [];
  }
}

function updateProgress(current, total) {
  const progress = document.getElementById('progress');
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  progress.classList.remove('hidden');
  const pct = total ? Math.min(100, Math.round((current / total) * 100)) : 0;
  fill.style.width = pct + '%';
  text.textContent = `${current}/${total}`;
}

function listenProgress() {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'GENERATION_PROGRESS') {
      updateProgress(msg.current, msg.total);
    }
    if (msg?.type === 'GENERATION_COMPLETE') {
      updateProgress(1, 1);
    }
    if (msg?.type === 'GENERATION_ERROR') {
      console.error('Generation error:', msg.error);
    }
  });
}

(async function init() {
  const prompts = await loadPrompts();
  listenProgress();

  document.getElementById('startBtn').addEventListener('click', async () => {
    const idx = Number(document.getElementById('promptSelect').value || 0);
    const imageCount = Number(document.getElementById('imageCount').value || 1);
    const selectedPrompt = prompts[idx];

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, {
      type: 'START_GENERATION',
      prompt: selectedPrompt,
      count: imageCount
    });
  });
})();
