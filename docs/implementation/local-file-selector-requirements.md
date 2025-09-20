# ローカルファイル選択機能 要件定義

## 概要

NovelAI Auto Generatorにローカルプロンプトファイルを選択・読み込む機能を追加する。

## 機能要件

### REQ-LFS-001: ファイル選択UI
- **システムは** ユーザーがローカルプロンプトファイルを選択できるUI **を提供しなければならない**
- **入力**: ファイル選択ダイアログ
- **出力**: 選択されたファイルの内容
- **制約**: `.naiprompts` または `.json` ファイルのみ

### REQ-LFS-002: ファイル読み込み機能
- **システムは** 選択されたファイルを読み込み、内容を検証 **しなければならない**
- **入力**: ローカルファイル
- **出力**: 検証済みプロンプトデータ
- **制約**: ファイルサイズ10MB以下

### REQ-LFS-003: プロンプト合成機能
- **システムは** 共通プロンプトとプリセット固有プロンプトを合成 **しなければならない**
- **入力**: 共通プロンプト + プリセットプロンプト
- **出力**: 合成された最終プロンプト
- **制約**: 合成後の文字数制限（2000文字）

### REQ-LFS-004: エラーハンドリング
- **ファイル読み込みに失敗した場合**、システムは適切なエラーメッセージ **を表示しなければならない**
- **ファイル形式が不正な場合**、システムは詳細な検証エラー **を表示しなければならない**

## UI設計

### ファイル選択ボタン
```html
<div class="file-selector-group">
  <label for="promptFileSelect">プロンプトファイル:</label>
  <div class="file-input-wrapper">
    <input type="file" id="promptFileSelect" accept=".naiprompts,.json" />
    <button type="button" id="loadFileBtn">ファイルを読み込み</button>
  </div>
  <div id="fileStatus" class="file-status"></div>
</div>
```

### プロンプトセット選択
```html
<div class="preset-selector-group">
  <label for="presetSelect">プリセット:</label>
  <select id="presetSelect">
    <option value="">プリセットを選択してください</option>
  </select>
  <div id="presetPreview" class="preset-preview"></div>
</div>
```

## 実装詳細

### ファイル読み込み処理
```typescript
interface FileLoadResult {
  success: boolean;
  data?: PromptFileData;
  error?: string;
  warnings?: string[];
}

async function loadPromptFile(file: File): Promise<FileLoadResult> {
  try {
    // ファイルサイズチェック
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: 'ファイルサイズが大きすぎます（10MB以下）'
      };
    }

    // ファイル読み込み
    const content = await file.text();
    const data = JSON.parse(content);

    // バリデーション
    const validation = validatePromptFile(data);
    if (!validation.valid) {
      return {
        success: false,
        error: 'ファイル形式が不正です',
        warnings: validation.errors
      };
    }

    return {
      success: true,
      data: data,
      warnings: validation.warnings
    };
  } catch (error) {
    return {
      success: false,
      error: `ファイル読み込みエラー: ${error.message}`
    };
  }
}
```

### プロンプト合成処理
```typescript
function synthesizePrompt(
  commonBase: string,
  commonNegative: string,
  presetPositive: string,
  presetNegative: string
): { positive: string; negative: string } {
  const positive = [commonBase, presetPositive]
    .filter(p => p && p.trim())
    .join(', ');
    
  const negative = [commonNegative, presetNegative]
    .filter(p => p && p.trim())
    .join(', ');

  return { positive, negative };
}
```

## エラーハンドリング

### ファイル関連エラー
- ファイルが存在しない
- ファイルサイズ超過
- ファイル形式が不正
- JSON解析エラー

### バリデーションエラー
- 必須フィールド不足
- 文字数制限超過
- 値の範囲外
- 重複ID

### ユーザー通知
```typescript
function showFileError(error: string, details?: string[]) {
  const statusElement = document.getElementById('fileStatus');
  statusElement.innerHTML = `
    <div class="error-message">
      <strong>エラー:</strong> ${error}
      ${details ? `<ul>${details.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
    </div>
  `;
  statusElement.className = 'file-status error';
}
```

## セキュリティ考慮事項

### ファイルアクセス制限
- 拡張機能の権限でローカルファイルアクセス
- ファイル内容のサニタイゼーション
- 悪意のあるJSONの検出

### データ保護
- 読み込まれたファイル内容の一時保存
- セッション終了時のデータクリア
- 機密情報の漏洩防止

## テスト要件

### 正常系テスト
- 有効なプロンプトファイルの読み込み
- プロンプト合成の正常動作
- UI操作の正常動作

### 異常系テスト
- 無効なファイル形式
- ファイルサイズ超過
- ネットワークエラー
- 権限エラー

### エッジケーステスト
- 空のファイル
- 巨大なプロンプト
- 特殊文字を含むファイル名
- 同時ファイル選択

## 実装優先度

1. **最優先**: 基本的なファイル選択・読み込み機能
2. **高優先度**: プロンプト合成機能
3. **中優先度**: エラーハンドリング強化
4. **低優先度**: 高度なUI機能（プレビュー、編集等）

## 完了条件

- [ ] ファイル選択UIの実装
- [ ] プロンプトファイル読み込み機能
- [ ] プロンプト合成機能
- [ ] エラーハンドリング
- [ ] 既存機能との統合
- [ ] テストケースの実装
- [ ] ドキュメントの更新
