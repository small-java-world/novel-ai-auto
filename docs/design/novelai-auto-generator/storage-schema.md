# NovelAI Auto Generator ストレージスキーマ（chrome.storage 前提）

このドキュメントは、外部DBやSQLを用いずに、Chrome 拡張の `chrome.storage`（`local`/`sync`）を用いて保持するデータの「キー構造」と「型」を明確化するための設計資料です。

前提
- 物理的なDBは存在しない（SQLは使用しない）。
- 型の正は `docs/design/novelai-auto-generator/interfaces.ts`（TypeScript 型定義）がソース・オブ・トゥルース。
- `storage.local` を既定とし、ユーザー同期が望ましい軽量設定のみ `storage.sync` を検討可能。

ストレージスコープ方針
- `chrome.storage.local`: 既定。ジョブ・ログ・大きめの設定情報を保持。
- `chrome.storage.sync`: 軽量設定（ユーザー環境間で共有したい設定）のみ任意で利用。

キー構造（トップレベル）
```text
storage.local
└─ novelaiAutoGenerator: StorageModel
   ├─ settings: Settings
   ├─ presets: PromptPreset[]
   ├─ jobs: Record<UUID, GenerationJob>
   └─ logs: Array<{ ts: Timestamp; level: "info"|"warn"|"error"; msg: string }>
```

JSON 例（storage.local の単一キー `novelaiAutoGenerator`）
```json
{
  "novelaiAutoGenerator": {
    "settings": {
      "defaultSeed": "random",
      "defaultCount": 3,
      "fileNameTemplate": "{date}_{prompt}_{seed}_{idx}",
      "retry": { "maxAttempts": 5, "baseDelayMs": 500, "factor": 2.0 },
      "accessibility": { "highContrast": false, "keyboardOnly": false }
    },
    "presets": [
      {
        "id": "basic",
        "name": "Basic",
        "prompt": "masterpiece, best quality",
        "negative": "lowres, bad hands",
        "params": { "steps": 28, "cfgScale": 7 }
      }
    ],
    "jobs": {
      "c3c9...-uuid": {
        "id": "c3c9...-uuid",
        "createdAt": "2024-09-14T12:34:56.000Z",
        "prompt": "...",
        "params": { "count": 3, "seed": "random" },
        "status": "running",
        "progress": { "current": 1, "total": 3, "etaSeconds": 20 }
      }
    },
    "logs": [
      { "ts": "2024-09-14T12:35:00.000Z", "level": "info", "msg": "started" }
    ]
  }
}
```

バリデーション/制約（概念）
- jobs のキーは UUID。値は GenerationJob。
- logs は時系列追記。サイズ上限（例: 500件）でリングバッファ運用（古いものから削除）。
- presets.id は一意。`params` は `GenerationParams` の部分型。
- settings.retry は最大試行回数・遅延・倍率の安全上限を設ける（例: 10/5000/4.0）。

インデックス/検索戦略（概念）
- `chrome.storage` は RDB のようなインデックスを持たないため、必要最小限のキーを構造化して保持し、検索はメモリ上で実施。
- 頻用クエリ（例: ステータス別ジョブ件数）は、必要であれば派生情報を別キー（例: `stats`）にキャッシュして書き戻しで整合。

セキュリティ/サイズ配慮
- 個人情報・外部送信なし。拡張内のみで完結。
- 画像データは保存しない（ダウンロードは `chrome.downloads` に委譲）。
- 大きな文字列（長大プロンプト）は presets に保持せず、必要に応じて外部ファイル化（将来検討）。

関連ドキュメント
- 型定義: `docs/design/novelai-auto-generator/interfaces.ts`
- アーキテクチャ: `docs/design/novelai-auto-generator/architecture.md`
- データフロー: `docs/design/novelai-auto-generator/dataflow.md`

