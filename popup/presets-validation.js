// Popup presets validation and loading
(function () {
  async function loadAllowedSamplers() {
    const url = chrome.runtime.getURL('config/samplers.json');
    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const list = Array.isArray(json.allowedSamplers) ? json.allowedSamplers : [];
    return new Set(list.filter((x) => typeof x === 'string'));
  }

  function validatePresets(data, allowedSamplers) {
    const issues = [];
    if (!Array.isArray(data)) {
      return {
        ok: false,
        issues: [{ path: '', message: 'トップレベルは配列である必要があります' }],
      };
    }
    const seen = new Set();
    data.forEach((p, i) => {
      const base = `[${i}]`;
      if (typeof p !== 'object' || p == null) {
        issues.push({ path: base, message: 'オブジェクトである必要があります' });
        return;
      }
      const name = String(p.name ?? '').trim();
      if (name.length === 0) issues.push({ path: `${base}.name`, message: 'name は必須です' });
      if (name.length > 100) issues.push({ path: `${base}.name`, message: 'name は100文字以下' });
      if (seen.has(name))
        issues.push({ path: `${base}.name`, message: 'name は一意である必要があります' });
      if (name) seen.add(name);

      // Accept either single prompt or multi-character schema
      const hasCharacters = Array.isArray(p.characters) && p.characters.length > 0;
      const prompt = p.prompt;
      if (!hasCharacters) {
        const promptStr = String(prompt ?? '').trim();
        if (promptStr.length < 5)
          issues.push({ path: `${base}.prompt`, message: 'prompt は5文字以上' });
        if (promptStr.length > 2000)
          issues.push({ path: `${base}.prompt`, message: 'prompt は2000文字以下' });
      } else {
        p.characters.forEach((ch, ci) => {
          const cbase = `${base}.characters[${ci}]`;
          if (!ch || typeof ch !== 'object') {
            issues.push({ path: cbase, message: 'キャラクターはオブジェクトである必要があります' });
            return;
          }
          const pos = String(ch.positive ?? '').trim();
          if (pos.length < 1) issues.push({ path: `${cbase}.positive`, message: 'positive は必須です' });
          const neg = String(ch.negative ?? '').trim();
          if (neg.length > 2000) issues.push({ path: `${cbase}.negative`, message: 'negative は2000文字以下' });
        });
      }

      const negative = String(p.negative ?? '').trim();
      if (negative.length > 2000)
        issues.push({ path: `${base}.negative`, message: 'negative は2000文字以下' });

      const params = p.parameters;
      if (typeof params !== 'object' || params == null) {
        issues.push({ path: `${base}.parameters`, message: 'parameters は必須です' });
      } else {
        const steps = params.steps;
        const cfgScale = params.cfgScale;
        const sampler = params.sampler;
        if (typeof steps !== 'number' || !Number.isInteger(steps) || steps < 1 || steps > 100) {
          issues.push({ path: `${base}.parameters.steps`, message: 'steps は1..100の整数' });
        }
        if (
          typeof cfgScale !== 'number' ||
          !Number.isFinite(cfgScale) ||
          cfgScale < 1 ||
          cfgScale > 30
        ) {
          issues.push({ path: `${base}.parameters.cfgScale`, message: 'cfgScale は1..30の数値' });
        }
        if (typeof sampler !== 'string' || !allowedSamplers.has(sampler)) {
          issues.push({
            path: `${base}.parameters.sampler`,
            message: `sampler '${sampler}' は許可されていません`,
          });
        }
      }
    });
    return issues.length ? { ok: false, issues } : { ok: true, value: data };
  }

  async function loadPresetsIntoPopup() {
    try {
      const allowed = await loadAllowedSamplers();
      const url = chrome.runtime.getURL('config/prompts.json');
      const resp = await fetch(url, { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const result = validatePresets(data, allowed);
      if (!result.ok) {
        const lines = result.issues.map((i) => `${i.path}: ${i.message}`);
        const message = `設定ファイルに不正があります:\n\n${lines.join('\n')}`;
        console.error(message);
        // addLog function not available in this context
        alert(message);
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const promptSelect = document.getElementById('promptSelect');
        const generateButton = document.getElementById('generateButton');
        if (indicator) indicator.style.background = '#dc3545';
        if (statusText) statusText.textContent = '設定エラー';
        if (promptSelect)
          promptSelect.innerHTML = '<option value="">設定エラー（修正してください）</option>';
        if (generateButton) generateButton.disabled = true;
        return;
      }

      // Read last selection from storage
      const last = await chrome.storage.local.get(['last_selected_preset']);
      const lastValue = last?.last_selected_preset || '';

      // Populate select
      const presets = result.value;
      const promptSelect = document.getElementById('promptSelect');
      if (!promptSelect) return;
      promptSelect.innerHTML = '<option value="">�v�����v�g��I�����Ă�������</option>';
      presets.forEach((preset) => {
        const option = document.createElement('option');
        option.value = JSON.stringify({
          name: preset.name,
          prompt: preset.prompt,
          characters: preset.characters,
          selectorProfile: preset.selectorProfile,
          parameters: preset.parameters,
        });
        option.textContent = preset.name;
        promptSelect.appendChild(option);
      });

      // Restore previous selection if exists
      if (lastValue) {
        const exists = Array.from(promptSelect.options).some((opt) => opt.value === lastValue);
        if (exists) {
          promptSelect.value = lastValue;
        }
      }
      // addLog function not available in this context
      const generateButton = document.getElementById('generateButton');
      if (generateButton) generateButton.disabled = false;
    } catch (e) {
      console.error('Failed to load prompts into popup:', e);
      // addLog function not available in this context
      alert(
        '設定の読み込みに失敗しました。拡張機能を再読込するか、config/prompts.json を確認してください。'
      );
      const generateButton = document.getElementById('generateButton');
      if (generateButton) generateButton.disabled = true;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Run after popup.js initialized; replace placeholder options with validated presets
    loadPresetsIntoPopup();

    // Persist selection changes
    const promptSelect = document.getElementById('promptSelect');
    if (promptSelect) {
      promptSelect.addEventListener('change', async () => {
        try {
          await chrome.storage.local.set({ last_selected_preset: promptSelect.value });
        } catch (err) {
          console.warn('Failed to persist selection', err);
        }
      });
    }
  });
})();
