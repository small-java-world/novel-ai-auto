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
  // Prompt Synthesis elements
  commonPrompt: document.getElementById('commonPrompt'),
  commonNegative: document.getElementById('commonNegative'),
  synthesisRule: document.getElementById('synthesisRule'),
  customTemplate: document.getElementById('customTemplate'),
  customTemplateGroup: document.getElementById('customTemplateGroup'),
  previewPositive: document.getElementById('previewPositive'),
  previewNegative: document.getElementById('previewNegative'),
  positiveCount: document.getElementById('positiveCount'),
  negativeCount: document.getElementById('negativeCount'),
  totalCount: document.getElementById('totalCount'),
  synthesisWarnings: document.getElementById('synthesisWarnings'),
  previewButton: document.getElementById('previewButton'),
  applySynthesisButton: document.getElementById('applySynthesisButton'),
  // New Format Support elements
  formatSelect: document.getElementById('formatSelect'),
  fileUpload: document.getElementById('fileUpload'),
  metadataGroup: document.getElementById('metadataGroup'),
  metadataDisplay: document.getElementById('metadataDisplay'),
  loadFileButton: document.getElementById('loadFileButton'),
  convertFormatButton: document.getElementById('convertFormatButton'),
  exportFileButton: document.getElementById('exportFileButton'),
  formatStatus: document.getElementById('formatStatus'),
};

// State
let currentJob = null;
let isGenerating = false;
let promptSynthesizer = null;
let integrationManager = null;
let currentFile = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await initializePromptSynthesis();
  await initializeFormatSupport();
  setupEventListeners();
  updateUI();
  addLog('ポップアップが初期化されました');
});

/**
 * Initialize prompt synthesis functionality
 */
async function initializePromptSynthesis() {
  try {
    // Import PromptSynthesizer from the compiled JavaScript
    const { PromptSynthesizer } = await import('./prompt-synthesis.js');
    promptSynthesizer = new PromptSynthesizer();
    addLog('プロンプト合成機能が初期化されました');
  } catch (error) {
    console.error('プロンプト合成機能の初期化に失敗しました:', error);
    addLog('プロンプト合成機能の初期化に失敗しました');
  }
}

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

  // Prompt Synthesis event listeners
  if (elements.synthesisRule) {
    elements.synthesisRule.addEventListener('change', handleSynthesisRuleChange);
  }
  
  if (elements.commonPrompt) {
    elements.commonPrompt.addEventListener('input', debounce(updatePreview, 300));
  }
  
  if (elements.commonNegative) {
    elements.commonNegative.addEventListener('input', debounce(updatePreview, 300));
  }
  
  if (elements.customTemplate) {
    elements.customTemplate.addEventListener('input', debounce(updatePreview, 300));
  }
  
  if (elements.previewButton) {
    elements.previewButton.addEventListener('click', updatePreview);
  }
  
  if (elements.applySynthesisButton) {
    elements.applySynthesisButton.addEventListener('click', applySynthesisToNovelAI);
  }

  // New Format Support event listeners
  if (elements.formatSelect) {
    elements.formatSelect.addEventListener('change', handleFormatSelectChange);
  }
  
  if (elements.fileUpload) {
    elements.fileUpload.addEventListener('change', handleFileUpload);
  }
  
  if (elements.loadFileButton) {
    elements.loadFileButton.addEventListener('click', loadPromptFile);
  }
  
  if (elements.convertFormatButton) {
    elements.convertFormatButton.addEventListener('click', convertFileFormat);
  }
  
  if (elements.exportFileButton) {
    elements.exportFileButton.addEventListener('click', exportPromptFile);
  }

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

// ===== Prompt Synthesis Functions =====

/**
 * Handle synthesis rule change
 */
function handleSynthesisRuleChange() {
  const rule = elements.synthesisRule.value;
  const customGroup = elements.customTemplateGroup;
  
  if (rule === 'custom') {
    customGroup.style.display = 'block';
    customGroup.classList.add('show');
  } else {
    customGroup.style.display = 'none';
    customGroup.classList.remove('show');
  }
  
  updatePreview();
}

/**
 * Update preview with current synthesis settings
 */
async function updatePreview() {
  if (!promptSynthesizer) {
    console.warn('プロンプト合成機能が初期化されていません');
    return;
  }

  try {
    const commonPrompts = {
      base: elements.commonPrompt.value || '',
      negative: elements.commonNegative.value || ''
    };

    const presetData = {
      positive: elements.promptSelect.value || '',
      negative: '',
      parameters: {
        steps: 28,
        cfgScale: 7,
        sampler: 'k_euler',
        seed: parseInt(elements.seed.value) || -1,
        count: parseInt(elements.imageCount.value) || 1
      }
    };

    const ruleId = elements.synthesisRule.value || 'default';
    
    // Update custom template if using custom rule
    if (ruleId === 'custom' && elements.customTemplate.value) {
      // This would require extending the PromptSynthesizer to accept custom templates
      // For now, we'll use the default custom template
    }

    const result = promptSynthesizer.preview(commonPrompts, presetData, ruleId);

    // Update preview display
    elements.previewPositive.textContent = result.positive || '(空)';
    elements.previewNegative.textContent = result.negative || '(空)';
    elements.positiveCount.textContent = `${result.characterCount.positive}文字`;
    elements.negativeCount.textContent = `${result.characterCount.negative}文字`;
    elements.totalCount.textContent = `合計: ${result.characterCount.total}文字`;

    // Update warnings
    if (result.warnings && result.warnings.length > 0) {
      elements.synthesisWarnings.innerHTML = result.warnings
        .map(warning => `<div class="warning-item">⚠️ ${warning}</div>`)
        .join('');
    } else {
      elements.synthesisWarnings.innerHTML = '';
    }

    // Update character count colors based on limits
    const maxChars = 2000;
    if (result.characterCount.total > maxChars) {
      elements.totalCount.style.color = '#dc3545';
    } else if (result.characterCount.total > maxChars * 0.8) {
      elements.totalCount.style.color = '#ffc107';
    } else {
      elements.totalCount.style.color = '#28a745';
    }

  } catch (error) {
    console.error('プレビュー更新エラー:', error);
    elements.previewPositive.textContent = 'エラーが発生しました';
    elements.previewNegative.textContent = 'エラーが発生しました';
    elements.synthesisWarnings.innerHTML = `<div class="warning-item">❌ プレビュー更新エラー: ${error.message}</div>`;
  }
}

/**
 * Apply synthesis result to NovelAI
 */
async function applySynthesisToNovelAI() {
  if (!promptSynthesizer) {
    console.warn('プロンプト合成機能が初期化されていません');
    addLog('プロンプト合成機能が初期化されていません');
    return;
  }

  try {
    updateStatus('適用中...', 'processing');

    const commonPrompts = {
      base: elements.commonPrompt.value || '',
      negative: elements.commonNegative.value || ''
    };

    const presetData = {
      positive: elements.promptSelect.value || '',
      negative: '',
      parameters: {
        steps: 28,
        cfgScale: 7,
        sampler: 'k_euler',
        seed: parseInt(elements.seed.value) || -1,
        count: parseInt(elements.imageCount.value) || 1
      }
    };

    const ruleId = elements.synthesisRule.value || 'default';
    const result = promptSynthesizer.synthesize(commonPrompts, presetData, ruleId);

    // Apply to NovelAI
    const applicationResult = await promptSynthesizer.applyToNovelAI(result);

    if (applicationResult.success) {
      updateStatus('適用完了', 'success');
      addLog('プロンプトがNovelAIに適用されました');
    } else {
      updateStatus('適用失敗', 'error');
      addLog(`適用エラー: ${applicationResult.error}`);
    }

  } catch (error) {
    console.error('NovelAI適用エラー:', error);
    updateStatus('適用エラー', 'error');
    addLog(`適用エラー: ${error.message}`);
  }
}

/**
 * Debounce utility function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ===== New Format Support Functions =====

/**
 * Initialize new format support functionality
 */
async function initializeFormatSupport() {
  try {
    // Import IntegrationManager dynamically
    const { IntegrationManager } = await import('./integration-manager.js');
    integrationManager = new IntegrationManager();
    
    addLog('新フォーマット対応機能が初期化されました');
  } catch (error) {
    console.error('Format support initialization failed:', error);
    addLog('新フォーマット対応機能の初期化に失敗しました', 'error');
  }
}

/**
 * Handle format selection change
 */
function handleFormatSelectChange() {
  const selectedFormat = elements.formatSelect.value;
  updateFormatStatus(`選択された形式: ${selectedFormat}`, 'info');
  
  // Enable/disable buttons based on format selection
  if (selectedFormat === 'auto') {
    elements.convertFormatButton.disabled = true;
  } else {
    elements.convertFormatButton.disabled = false;
  }
}

/**
 * Handle file upload
 */
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    updateFormatStatus('JSONファイルを選択してください', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = JSON.parse(e.target.result);
      currentFile = content;
      updateFormatStatus('ファイルが読み込まれました', 'success');
      elements.loadFileButton.disabled = false;
    } catch (error) {
      updateFormatStatus('無効なJSONファイルです', 'error');
      console.error('File parsing error:', error);
    }
  };
  
  reader.readAsText(file);
}

/**
 * Load prompt file
 */
async function loadPromptFile() {
  if (!currentFile) {
    updateFormatStatus('ファイルを選択してください', 'warning');
    return;
  }

  try {
    updateFormatStatus('ファイルを読み込み中...', 'info');
    
    const selectedFormat = elements.formatSelect.value;
    const options = {
      autoConvert: selectedFormat === 'auto',
      loadMetadata: true,
      enableSynthesis: true,
      createBackup: false
    };

    let result;
    if (selectedFormat === 'v1.0' || (selectedFormat === 'auto' && currentFile.version)) {
      // v1.0 format
      result = await integrationManager.integrateV1File(currentFile, options);
    } else {
      // Legacy format
      result = await integrationManager.integrateLegacyFile(currentFile, options);
    }

    if (result.success) {
      updateFormatStatus('ファイルの読み込みが完了しました', 'success');
      displayMetadata(result.data.file.metadata);
      elements.exportFileButton.disabled = false;
      addLog(`ファイル読み込み完了: ${result.statistics.presetsProcessed}個のプリセット`);
    } else {
      updateFormatStatus(`読み込みエラー: ${result.error}`, 'error');
    }

  } catch (error) {
    console.error('File loading error:', error);
    updateFormatStatus(`読み込みエラー: ${error.message}`, 'error');
  }
}

/**
 * Convert file format
 */
async function convertFileFormat() {
  if (!currentFile) {
    updateFormatStatus('ファイルを選択してください', 'warning');
    return;
  }

  try {
    updateFormatStatus('形式変換中...', 'info');
    
    const selectedFormat = elements.formatSelect.value;
    const options = {
      autoConvert: true,
      loadMetadata: true,
      enableSynthesis: true,
      createBackup: true
    };

    let result;
    if (selectedFormat === 'v1.0') {
      // Convert to v1.0
      result = await integrationManager.integrateLegacyFile(currentFile, options);
    } else {
      // Convert to legacy
      result = await integrationManager.integrateV1File(currentFile, options);
    }

    if (result.success) {
      currentFile = result.data.file;
      updateFormatStatus('形式変換が完了しました', 'success');
      displayMetadata(result.data.file.metadata);
      elements.exportFileButton.disabled = false;
      addLog(`形式変換完了: ${result.statistics.formatConverted ? '変換済み' : '変換なし'}`);
    } else {
      updateFormatStatus(`変換エラー: ${result.error}`, 'error');
    }

  } catch (error) {
    console.error('Format conversion error:', error);
    updateFormatStatus(`変換エラー: ${error.message}`, 'error');
  }
}

/**
 * Export prompt file
 */
function exportPromptFile() {
  if (!currentFile) {
    updateFormatStatus('エクスポートするファイルがありません', 'warning');
    return;
  }

  try {
    const dataStr = JSON.stringify(currentFile, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompt-file-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    updateFormatStatus('ファイルがエクスポートされました', 'success');
    addLog('プロンプトファイルをエクスポートしました');
    
  } catch (error) {
    console.error('Export error:', error);
    updateFormatStatus(`エクスポートエラー: ${error.message}`, 'error');
  }
}

/**
 * Display metadata information
 */
function displayMetadata(metadata) {
  if (!metadata) return;

  const metadataHtml = `
    <div class="metadata-item">
      <span class="metadata-label">名前:</span>
      <span class="metadata-value">${metadata.name || '未設定'}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">説明:</span>
      <span class="metadata-value">${metadata.description || '未設定'}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">作者:</span>
      <span class="metadata-value">${metadata.author || '未設定'}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">作成日:</span>
      <span class="metadata-value">${metadata.created ? new Date(metadata.created).toLocaleDateString('ja-JP') : '未設定'}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">更新日:</span>
      <span class="metadata-value">${metadata.modified ? new Date(metadata.modified).toLocaleDateString('ja-JP') : '未設定'}</span>
    </div>
    ${metadata.tags && metadata.tags.length > 0 ? `
    <div class="metadata-item">
      <span class="metadata-label">タグ:</span>
      <div class="metadata-tags">
        ${metadata.tags.map(tag => `<span class="metadata-tag">${tag}</span>`).join('')}
      </div>
    </div>
    ` : ''}
  `;

  elements.metadataDisplay.innerHTML = metadataHtml;
  elements.metadataGroup.style.display = 'block';
}

/**
 * Update format status
 */
function updateFormatStatus(message, type = 'info') {
  elements.formatStatus.textContent = message;
  elements.formatStatus.className = `format-status ${type}`;
}

/**
 * Update status indicator
 */
function updateStatus(message, type = 'info') {
  elements.statusText.textContent = message;
  elements.statusIndicator.className = `status-indicator ${type}`;
}
