# NovelAI Auto Generator プロンプトファイル仕様

## 概要

NovelAI Auto Generatorで使用するプロンプトファイルの標準フォーマットを定義する。

## ファイル形式

### 基本構造
```json
{
  "version": "1.0",
  "metadata": {
    "name": "カスタムプロンプトセット",
    "description": "ユーザー定義のプロンプトコレクション",
    "author": "ユーザー名",
    "created": "2025-01-27T00:00:00Z",
    "tags": ["anime", "fantasy", "character"]
  },
  "commonPrompts": {
    "base": "masterpiece, best quality, highres, detailed",
    "negative": "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, cropped, worst quality, low quality"
  },
  "presets": [
    {
      "id": "anime_girl_1",
      "name": "アニメ少女A",
      "description": "基本的なアニメ風少女キャラクター",
      "positive": "1girl, anime style, beautiful eyes, flowing hair, school uniform",
      "negative": "realistic, 3d, deformed, bad anatomy",
      "parameters": {
        "steps": 28,
        "cfgScale": 7,
        "sampler": "euler_a",
        "resolution": "512x768"
      },
      "tags": ["anime", "girl", "school"]
    },
    {
      "id": "fantasy_knight",
      "name": "ファンタジー騎士",
      "description": "中世ファンタジー風の騎士キャラクター",
      "positive": "princess knight costume, medieval armor, flowing cape, castle courtyard, fantasy",
      "negative": "modern clothes, casual wear, realistic",
      "parameters": {
        "steps": 32,
        "cfgScale": 8,
        "sampler": "dpm_2m",
        "resolution": "768x512"
      },
      "tags": ["fantasy", "knight", "medieval"]
    }
  ]
}
```

## フィールド仕様

### ルートレベル
- **version**: ファイル形式のバージョン（必須）
- **metadata**: ファイルのメタデータ（必須）
- **commonPrompts**: 共通プロンプト（オプション）
- **presets**: プリセット配列（必須）

### metadata
- **name**: プロンプトセット名（必須、1-100文字）
- **description**: 説明文（オプション、0-500文字）
- **author**: 作成者名（オプション、0-50文字）
- **created**: 作成日時（ISO 8601形式、オプション）
- **tags**: タグ配列（オプション）

### commonPrompts
- **base**: 基本プロンプト（オプション、0-2000文字）
- **negative**: 共通ネガティブプロンプト（オプション、0-2000文字）

### presets配列の各要素
- **id**: プリセットID（必須、1-50文字、英数字とアンダースコアのみ）
- **name**: 表示名（必須、1-100文字）
- **description**: 説明文（オプション、0-300文字）
- **positive**: ポジティブプロンプト（必須、1-2000文字）
- **negative**: ネガティブプロンプト（オプション、0-2000文字）
- **parameters**: 生成パラメータ（オプション）
- **tags**: タグ配列（オプション）

### parameters
- **steps**: ステップ数（1-100、デフォルト28）
- **cfgScale**: CFGスケール（1-20、デフォルト7）
- **sampler**: サンプラー名（文字列、デフォルト"euler_a"）
- **resolution**: 解像度（文字列、デフォルト"512x768"）

## プロンプト合成ルール

### 合成順序
1. **commonPrompts.base** + **preset.positive**
2. **commonPrompts.negative** + **preset.negative**

### 合成例
```json
// 共通プロンプト
"commonPrompts": {
  "base": "masterpiece, best quality, highres",
  "negative": "lowres, bad anatomy, bad hands"
}

// プリセット
"positive": "1girl, anime style, beautiful eyes",
"negative": "realistic, 3d, deformed"

// 合成結果
最終ポジティブ: "masterpiece, best quality, highres, 1girl, anime style, beautiful eyes"
最終ネガティブ: "lowres, bad anatomy, bad hands, realistic, 3d, deformed"
```

## ファイル拡張子

- **推奨**: `.naiprompts` (NovelAI Prompts)
- **代替**: `.json` (標準JSON形式)

## バリデーションルール

### 必須フィールド
- version, metadata.name, presets配列
- 各presetのid, name, positive

### 文字数制限
- name: 1-100文字
- description: 0-500文字
- positive: 1-2000文字
- negative: 0-2000文字

### 値の制限
- steps: 1-100の整数
- cfgScale: 1-20の数値
- id: 英数字とアンダースコアのみ

## エラーハンドリング

### ファイル読み込みエラー
- ファイルが存在しない
- JSON形式が不正
- 必須フィールドが不足
- 値が制限範囲外

### エラーメッセージ例
```json
{
  "error": "VALIDATION_ERROR",
  "message": "プロンプトファイルの検証に失敗しました",
  "details": [
    {
      "field": "presets[0].positive",
      "message": "ポジティブプロンプトは必須です"
    },
    {
      "field": "presets[1].parameters.steps",
      "message": "ステップ数は1-100の範囲で指定してください"
    }
  ]
}
```

## 互換性

### 既存形式との互換性
現在の`config/prompts.json`形式は以下のように変換可能：

```json
// 既存形式
[
  {
    "name": "アニメ風キャラクター",
    "prompt": "anime girl, masterpiece, best quality",
    "negative": "low quality, blurry",
    "parameters": {
      "steps": 32,
      "cfgScale": 8,
      "sampler": "euler_a"
    }
  }
]

// 新形式への変換
{
  "version": "1.0",
  "metadata": {
    "name": "既存プロンプトセット",
    "description": "既存形式から変換"
  },
  "presets": [
    {
      "id": "anime_character",
      "name": "アニメ風キャラクター",
      "positive": "anime girl, masterpiece, best quality",
      "negative": "low quality, blurry",
      "parameters": {
        "steps": 32,
        "cfgScale": 8,
        "sampler": "euler_a"
      }
    }
  ]
}
```

## 実装計画

### Phase 1: 基本ファイル読み込み
1. ローカルファイル選択機能の実装
2. 新形式のバリデーション機能
3. 既存形式との互換性確保

### Phase 2: プロンプト合成機能
1. 共通プロンプト + プリセットの合成
2. UI上での合成結果プレビュー
3. 合成ルールのカスタマイズ

### Phase 3: 高度な機能
1. タグベースのフィルタリング
2. プロンプトセットの管理機能
3. インポート/エクスポート機能
