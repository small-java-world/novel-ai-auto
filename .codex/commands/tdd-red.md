# tdd-red

## 目的
テスト駆動開発（TDD）の「Red」フェーズを実行する。実装する機能のテストケースを先に作成し、テストが失敗することを確認する。

## 前提条件
- 実装する機能が明確に定義されている
- テストフレームワークが設定されている
- `tests/` ディレクトリが存在する（なければ作成）

## 実行内容

1. **テストケース設計**
   - 実装する機能のテストケースを設計
   - 正常系、異常系、境界値のテストケースを定義
   - テストデータの準備

2. **テストコード実装**
   - テストフレームワークに従ってテストコードを実装
   - アサーション（期待値）を明確に定義
   - テストの可読性を確保

3. **テスト実行**
   - テストを実行して失敗することを確認
   - エラーメッセージを確認
   - テストが適切に設計されていることを検証

4. **ファイルの作成**
   - `tests/{機能名}-test.js` として保存
   - テストコードを適切に構造化

## 出力フォーマット例

```javascript
// tests/novelai-generator-test.js
const { NovelAIGenerator } = require('../src/novelai-generator');
const { DOMHelper } = require('../src/utils/dom-helper');

describe('NovelAI Generator', () => {
  let generator;
  let mockDOM;

  beforeEach(() => {
    // テスト前のセットアップ
    generator = new NovelAIGenerator();
    mockDOM = new DOMHelper();
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    generator = null;
    mockDOM = null;
  });

  describe('プロンプト設定', () => {
    test('正のプロンプトが設定できること', () => {
      // Arrange
      const positivePrompt = '1girl, solo, beautiful';
      
      // Act
      generator.setPositivePrompt(positivePrompt);
      
      // Assert
      expect(generator.getPositivePrompt()).toBe(positivePrompt);
    });

    test('負のプロンプトが設定できること', () => {
      // Arrange
      const negativePrompt = 'lowres, bad anatomy';
      
      // Act
      generator.setNegativePrompt(negativePrompt);
      
      // Assert
      expect(generator.getNegativePrompt()).toBe(negativePrompt);
    });

    test('空のプロンプトはエラーになること', () => {
      // Arrange
      const emptyPrompt = '';
      
      // Act & Assert
      expect(() => {
        generator.setPositivePrompt(emptyPrompt);
      }).toThrow('プロンプトは空にできません');
    });
  });

  describe('画像生成', () => {
    test('単一画像の生成ができること', async () => {
      // Arrange
      const prompt = '1girl, solo, beautiful';
      generator.setPositivePrompt(prompt);
      
      // Act
      const result = await generator.generateSingleImage();
      
      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.imageUrl).toBeDefined();
    });

    test('複数画像の生成ができること', async () => {
      // Arrange
      const prompt = '1girl, solo, beautiful';
      const count = 3;
      generator.setPositivePrompt(prompt);
      
      // Act
      const results = await generator.generateMultipleImages(count);
      
      // Assert
      expect(results).toHaveLength(count);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.imageUrl).toBeDefined();
      });
    });

    test('生成失敗時にエラーが返されること', async () => {
      // Arrange
      const invalidPrompt = null;
      generator.setPositivePrompt(invalidPrompt);
      
      // Act & Assert
      await expect(generator.generateSingleImage()).rejects.toThrow('無効なプロンプトです');
    });
  });

  describe('設定値の適用', () => {
    test('ステップ数が設定できること', () => {
      // Arrange
      const steps = 28;
      
      // Act
      generator.setSteps(steps);
      
      // Assert
      expect(generator.getSteps()).toBe(steps);
    });

    test('スケール値が設定できること', () => {
      // Arrange
      const scale = 5.0;
      
      // Act
      generator.setScale(scale);
      
      // Assert
      expect(generator.getScale()).toBe(scale);
    });

    test('無効なステップ数はエラーになること', () => {
      // Arrange
      const invalidSteps = -1;
      
      // Act & Assert
      expect(() => {
        generator.setSteps(invalidSteps);
      }).toThrow('ステップ数は1以上である必要があります');
    });
  });

  describe('DOM操作', () => {
    test('プロンプト入力フィールドが見つかること', async () => {
      // Arrange
      const mockElement = document.createElement('textarea');
      mockElement.placeholder = 'Enter prompt';
      document.body.appendChild(mockElement);
      
      // Act
      const element = await mockDOM.waitForElement('textarea[placeholder*="prompt"]');
      
      // Assert
      expect(element).toBeDefined();
      expect(element.tagName).toBe('TEXTAREA');
      
      // Cleanup
      document.body.removeChild(mockElement);
    });

    test('生成ボタンがクリックできること', async () => {
      // Arrange
      const mockButton = document.createElement('button');
      mockButton.textContent = 'Generate';
      mockButton.addEventListener('click', () => {
        mockButton.clicked = true;
      });
      document.body.appendChild(mockButton);
      
      // Act
      await mockDOM.clickElement('button:has-text("Generate")');
      
      // Assert
      expect(mockButton.clicked).toBe(true);
      
      // Cleanup
      document.body.removeChild(mockButton);
    });
  });

  describe('エラーハンドリング', () => {
    test('ネットワークエラー時のリトライが動作すること', async () => {
      // Arrange
      let attemptCount = 0;
      const originalFetch = window.fetch;
      window.fetch = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });
      
      // Act
      const result = await generator.generateWithRetry();
      
      // Assert
      expect(attemptCount).toBe(3);
      expect(result.success).toBe(true);
      
      // Cleanup
      window.fetch = originalFetch;
    });
  });
});
```

## 実行後の確認
- 作成したテストファイルのパスを表示
- テストケースの数を報告
- テスト実行結果（失敗）を表示
- 次のステップ（Green）の準備状況を確認
