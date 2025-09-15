/**
 * Popup Script for NovelAI Auto Generator
 */

// DOM elements
const elements = {
  statusIndicator: document.getElementById('statusIndicator'),
  statusText: document.getElementById('statusText'),
  promptSelect: document.getElementById('promptSelect'),
  imageCount: document.getElementById('imageCount'),
  seed: document.getElementById('seed'),
  filenameTemplate: document.getElementById('filenameTemplate'),
  progressSection: document.getElementById('progressSection'),
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  etaText: document.getElementById('etaText'),
  generateButton: document.getElementById('generateButton'),
  cancelButton: document.getElementById('cancelButton'),
  logsContainer: document.getElementById('logsContainer'),
};

// State
let currentJob = null;
let isGenerating = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
  updateUI();
  addLog('ポップアップが初期化されました');
});

/**
 * Load settings from storage
 */
async function loadSettings() {
  // disabled: dummy presets removed. Real presets loaded via presets-validation.js
  return;
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const settings = {
      imageCount: parseInt(elements.imageCount.value) || 1,
      seed: parseInt(elements.seed.value) || -1,
      filenameTemplate: elements.filenameTemplate.value || '{date}_{prompt}_{seed}_{idx}',
    };

    await chrome.storage.local.set({ settings });
    addLog('設定を保存しました');
  } catch (error) {
    console.error('Failed to save settings:', error);
    addLog('設定の保存に失敗しました', 'error');
  }
}

/**
 * Load prompts from config file
 */

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Generate button
  elements.generateButton.addEventListener('click', startGeneration);

  // Cancel button
  elements.cancelButton.addEventListener('click', cancelGeneration);

  // Settings change handlers
  elements.imageCount.addEventListener('change', saveSettings);
  elements.seed.addEventListener('change', saveSettings);
  elements.filenameTemplate.addEventListener('change', saveSettings);

  // Listen for background script messages
  chrome.runtime.onMessage.addListener(handleMessage);
}

/**
 * Start generation process
 */
async function startGeneration() {
  try {
    const selectedPrompt = elements.promptSelect.value;
    if (!selectedPrompt) {
      addLog('プロンプトを選択してください', 'error');
      return;
    }

    const promptData = JSON.parse(selectedPrompt);
    const settings = {
      imageCount: parseInt(elements.imageCount.value) || 1,
      seed: parseInt(elements.seed.value) || -1,
      filenameTemplate: elements.filenameTemplate.value,
    };

    isGenerating = true;
    updateUI();
    addLog(`生成を開始します: ${promptData.name}`);

    // Send generation request to background script
    const response = await chrome.runtime.sendMessage({
      type: 'START_GENERATION',
      prompt: promptData.prompt,
      parameters: {
        seed: settings.seed,
        count: settings.imageCount,
      },
      settings,
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Failed to start generation:', error);
    addLog(`生成の開始に失敗しました: ${error.message}`, 'error');
    isGenerating = false;
    updateUI();
  }
}

/**
 * Cancel generation process
 */
async function cancelGeneration() {
  try {
    if (currentJob) {
      await chrome.runtime.sendMessage({
        type: 'CANCEL_JOB',
        jobId: currentJob.id,
      });
    }

    isGenerating = false;
    currentJob = null;
    updateUI();
    addLog('生成をキャンセルしました');
  } catch (error) {
    console.error('Failed to cancel generation:', error);
    addLog(`キャンセルに失敗しました: ${error.message}`, 'error');
  }
}

/**
 * Handle messages from background script
 */
function handleMessage(message, _sender, _sendResponse) {
  switch (message.type) {
    case 'GENERATION_PROGRESS':
      updateProgress(message.progress);
      break;
    case 'GENERATION_COMPLETE':
      handleGenerationComplete(message);
      break;
    case 'GENERATION_ERROR':
      handleGenerationError(message);
      break;
  }
}

/**
 * Update progress display
 */
function updateProgress(progress) {
  const { current, total, eta } = progress;

  elements.progressFill.style.width = `${(current / total) * 100}%`;
  elements.progressText.textContent = `${current} / ${total}`;

  if (eta) {
    elements.etaText.textContent = `残り時間: ${formatDuration(eta)}`;
  }
}

/**
 * Handle generation completion
 */
function handleGenerationComplete(message) {
  isGenerating = false;
  currentJob = null;
  updateUI();
  addLog(`生成が完了しました。${message.count}枚の画像をダウンロードしました`);
}

/**
 * Handle generation error
 */
function handleGenerationError(message) {
  isGenerating = false;
  currentJob = null;
  updateUI();
  addLog(`生成中にエラーが発生しました: ${message.error}`, 'error');
}

/**
 * Update UI based on current state
 */
function updateUI() {
  // Update status indicator
  if (isGenerating) {
    elements.statusIndicator.className = 'status-indicator generating';
    elements.statusText.textContent = '生成中...';
    elements.progressSection.style.display = 'block';
    elements.generateButton.style.display = 'none';
    elements.cancelButton.style.display = 'block';
  } else {
    elements.statusIndicator.className = 'status-indicator';
    elements.statusText.textContent = '待機中';
    elements.progressSection.style.display = 'none';
    elements.generateButton.style.display = 'block';
    elements.cancelButton.style.display = 'none';
  }

  // Enable/disable controls
  const controls = [
    elements.promptSelect,
    elements.imageCount,
    elements.seed,
    elements.filenameTemplate,
  ];
  controls.forEach((control) => {
    control.disabled = isGenerating;
  });
}

/**
 * Add log entry
 */
function addLog(message, type = 'info') {
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';

  const time = new Date().toLocaleTimeString('ja-JP', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  logEntry.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="log-message">${message}</span>
  `;

  if (type === 'error') {
    logEntry.style.color = '#dc3545';
  }

  elements.logsContainer.appendChild(logEntry);
  elements.logsContainer.scrollTop = elements.logsContainer.scrollHeight;

  // Keep only last 50 entries
  while (elements.logsContainer.children.length > 50) {
    elements.logsContainer.removeChild(elements.logsContainer.firstChild);
  }
}

/**
 * Format duration in seconds to human readable format
 */
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}時間${minutes}分`;
  }
}
