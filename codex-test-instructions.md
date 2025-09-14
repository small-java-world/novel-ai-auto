# Codex CLI カスタムスラッシュコマンド テスト手順

## 設定完了状況
✅ ホームディレクトリに`.codex/prompts/`を作成
✅ Tsumikiコマンドファイルを配置:
- kairo-requirements.md
- kairo-design.md  
- kairo-tasks.md
- tdd-red.md

## テスト手順

### 1. Codex CLI起動
```bash
codex
```

### 2. カスタムコマンドのテスト
以下のコマンドを順番にテストしてください：

#### 要件定義のテスト
```
/kairo-requirements NovelAI Chrome Extension
```

#### 設計文書のテスト
```
/kairo-design NovelAI Chrome Extension
```

#### タスク分割のテスト
```
/kairo-tasks NovelAI Chrome Extension
```

#### TDD Redのテスト
```
/tdd-red NovelAI Generator
```

## 期待される動作
- 各コマンドが認識される
- 対応するTsumikiの機能が実行される
- 適切なドキュメントが生成される

## トラブルシューティング

### コマンドが認識されない場合
1. ファイルパスを確認: `~/.codex/prompts/`
2. ファイル名が正しいか確認
3. Codex CLIを再起動

### エラーが発生する場合
1. Codex CLIのバージョンを確認: `codex --version`
2. ログを確認
3. 必要に応じてファイルの内容を修正

## 成功時の次のステップ
1. 残りのTsumikiコマンドを追加
2. プロジェクト固有のカスタマイズ
3. 開発フローの確立
