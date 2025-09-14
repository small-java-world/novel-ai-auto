-- NovelAI Auto Generator 論理データモデル（外部DBは使用しない）
-- 備考: 本拡張は chrome.storage を用いるため、本SQLは概念スキーマの説明目的。

-- 設定(Settings)
-- fields: default_seed INT|"random", default_count INT, file_name_template TEXT,
--         retry_max_attempts INT, retry_base_delay_ms INT, retry_factor REAL,
--         accessibility_high_contrast BOOL, accessibility_keyboard_only BOOL
CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    default_seed TEXT NOT NULL,
    default_count INTEGER NOT NULL,
    file_name_template TEXT NOT NULL,
    retry_max_attempts INTEGER NOT NULL,
    retry_base_delay_ms INTEGER NOT NULL,
    retry_factor REAL NOT NULL,
    accessibility_high_contrast INTEGER DEFAULT 0,
    accessibility_keyboard_only INTEGER DEFAULT 0
);

-- プロンプトプリセット
CREATE TABLE presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    negative TEXT,
    params JSON -- steps/sampler/cfgScale/width/height/seed/count
);

-- ジョブ履歴/状態
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL, -- ISO 8601
    preset_id TEXT,
    prompt TEXT NOT NULL,
    negative TEXT,
    params JSON NOT NULL,
    status TEXT NOT NULL, -- pending/running/waiting/completed/failed/canceled
    progress JSON,        -- {current,total,message,etaSeconds}
    error JSON,           -- {code,message,details}
    FOREIGN KEY (preset_id) REFERENCES presets(id)
);

-- ログ（リングバッファ相当）
CREATE TABLE logs (
    ts TEXT NOT NULL,
    level TEXT NOT NULL, -- info/warn/error
    message TEXT NOT NULL
);

-- インデックス戦略（概念）
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_logs_ts ON logs(ts);

