・ｿ# Green繝輔ぉ繝ｼ繧ｺ螳溯｣・ file-name-template-sanitization

## 螳溯｣・ｦりｦ・

- 逶ｮ逧・ Red繝・せ繝医〒隕∵ｱゅ＆繧後◆邱丞粋髢｢謨ｰ `generateSanitizedFileName` 繧呈怙蟆城剞縺ｧ螳溯｣・＠縲√ユ繧ｹ繝医ｒ騾壹☆
- 譁ｹ驥・ 譌｢蟄倥・ `generateFileName`・亥ｱ暮幕・峨→ `sanitizeFileName`・医し繝九ち繧､繧ｺ・峨ｒ蜷域・

## 霑ｽ蜉螳溯｣・

蟇ｾ雎｡: `src/utils/fileNameTemplate.ts`

```ts
export function generateSanitizedFileName(
  template: string,
  context: FileNameTemplateContext,
  options?: FileNameSanitizeOptions
): string {
  const name = generateFileName(template, context);
  return sanitizeFileName(name, options);
}
```

## 蟇ｾ蠢懊ユ繧ｹ繝・

- 繝輔ぃ繧､繝ｫ: `src/utils/fileNameTemplate.red.test.ts`
- 繧ｱ繝ｼ繧ｹ:
  - 繝・Φ繝励Ξ繝ｼ繝亥ｱ暮幕+繧ｵ繝九ち繧､繧ｺ+諡｡蠑ｵ蟄蝉ｿ晄戟繧定｡後≧邱丞粋髢｢謨ｰ
  - 螻暮幕蠕後′遨ｺ縺ｫ遲峨＠縺・ｴ蜷医↓ "untitled" 繧定ｿ斐☆

## 繝・せ繝亥ｮ溯｡・

- 繧ｳ繝槭Φ繝・ `npm test` 縺ｾ縺溘・ `npx vitest run`

## 諠ｳ螳夂ｵ先棡

- 縺吶∋縺ｦ縺ｮ隧ｲ蠖薙ユ繧ｹ繝医′謌仙粥
- 譌｢蟄倥ユ繧ｹ繝医∈蜑ｯ菴懃畑縺ｪ縺・

## 繝｡繝｢

- 霑ｽ蜉縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧・怙驕ｩ蛹悶・Refactor繝輔ぉ繝ｼ繧ｺ縺ｧ讀懆ｨ・
