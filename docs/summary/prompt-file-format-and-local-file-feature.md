# プロンプトファイル仕様とローカルファイル機能 検討まとめ

## 📋 検討概要

NovelAI Auto Generatorのプロンプト管理機能について、現在の実装状況を調査し、改善提案を行った。

## 🔍 現在の実装状況

### プロンプトファイル管理
- **現在の方式**: 固定ファイル `config/prompts.json` のみ
- **フォーマット**: 単純な配列形式
- **制限事項**:
  - 共通プロンプトとキャラクター固有プロンプトの組み合わせ不可
  - ユーザーが独自ファイルを指定できない
  - ローカルファイル選択機能なし
  - ファイルアップロード機能なし

### 現在のプロンプト構造
```json
[
  {
    "name": "アニメ風キャラクター",
    "prompt": "anime girl, masterpiece, best quality, detailed face, beautiful eyes, flowing hair",
    "negative": "low quality, blurry, bad anatomy, deformed",
    "parameters": {
      "steps": 32,
      "cfgScale": 8,
      "sampler": "euler_a"
    }
  }
]
```

## 💡 改善提案

### 1. 標準化されたプロンプトファイルフォーマット

#### 新フォーマットの特徴
- **共通プロンプト + キャラクター固有プロンプト**の組み合わせ対応
- **メタデータ**（作成者、説明、タグ等）の追加
- **バージョン管理**と**バリデーション機能**
- **プロンプト合成機能**

#### 新フォーマット例
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
    "negative": "lowres, bad anatomy, bad hands, text, error"
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
    }
  ]
}
```

### 2. ローカルファイル選択機能

#### 機能概要
- **ファイル選択UI**: `.naiprompts` または `.json` ファイルの選択
- **プロンプト合成**: 共通プロンプト + プリセット固有プロンプトの自動合成
- **エラーハンドリング**: 詳細な検証とエラー表示
- **既存形式との互換性**: 現在の `config/prompts.json` 形式もサポート

#### プロンプト合成ルール
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

## 📁 作成したドキュメント

### 1. プロンプトファイル仕様書
**ファイル**: `docs/spec/prompt-file-format.md`
- 標準化されたプロンプトファイルフォーマットの詳細仕様
- フィールド定義、バリデーションルール、エラーハンドリング
- 既存形式との互換性情報
- 実装計画

### 2. ローカルファイル選択機能要件定義
**ファイル**: `docs/implementation/local-file-selector-requirements.md`
- ローカルファイル選択機能の詳細要件
- UI設計、実装詳細、エラーハンドリング
- セキュリティ考慮事項、テスト要件
- 実装優先度と完了条件

## 🎯 実装提案

### 新タスク案
1. **TASK-100**: ローカルファイル選択機能
   - ファイル選択UIの実装
   - プロンプトファイル読み込み機能
   - 基本的なエラーハンドリング

2. **TASK-101**: プロンプト合成機能
   - 共通プロンプト + プリセット固有プロンプトの合成
   - 合成結果のプレビュー機能
   - 合成ルールのカスタマイズ

3. **TASK-102**: 新フォーマット対応
   - 新フォーマットのバリデーション機能
   - 既存形式との互換性確保
   - メタデータ管理機能

### 実装優先度
1. **最優先**: 基本的なファイル選択・読み込み機能
2. **高優先度**: プロンプト合成機能
3. **中優先度**: エラーハンドリング強化
4. **低優先度**: 高度なUI機能（プレビュー、編集等）

## 🔧 技術的考慮事項

### セキュリティ
- ファイルアクセス制限（拡張機能の権限）
- ファイル内容のサニタイゼーション
- 悪意のあるJSONの検出
- 機密情報の漏洩防止

### パフォーマンス
- ファイルサイズ制限（10MB以下）
- 大容量ファイルの効率的な処理
- メモリ使用量の最適化

### ユーザビリティ
- 直感的なファイル選択UI
- 詳細なエラーメッセージ
- プロンプト合成結果のプレビュー
- 既存ワークフローとの統合

## 📊 期待される効果

### ユーザー体験の向上
- **柔軟性**: ユーザー独自のプロンプトセットの使用
- **効率性**: 共通プロンプトの再利用による入力時間短縮
- **管理性**: プロンプトセットの整理と分類

### 開発効率の向上
- **標準化**: 統一されたプロンプトファイル形式
- **拡張性**: 将来的な機能追加の容易さ
- **保守性**: 明確な仕様に基づく実装

## 🚀 次のステップ

1. **要件の詳細化**: ユーザーからの具体的なニーズの確認
2. **実装計画の策定**: タスクの優先順位とスケジュールの決定
3. **プロトタイプの作成**: 基本的な機能の動作確認
4. **段階的な実装**: 優先度に基づく機能の順次実装

## 📝 まとめ

現在のNovelAI Auto Generatorは固定のプロンプトファイルのみをサポートしているが、ローカルファイル選択機能とプロンプト合成機能を追加することで、ユーザーの柔軟性と効率性を大幅に向上させることができる。提案した新フォーマットは既存の実装との互換性を保ちながら、より高度なプロンプト管理機能を提供する。

---

**作成日**: 2025-01-27  
**作成者**: AI Assistant  
**関連ドキュメント**: 
- `docs/spec/prompt-file-format.md`
- `docs/implementation/local-file-selector-requirements.md`
