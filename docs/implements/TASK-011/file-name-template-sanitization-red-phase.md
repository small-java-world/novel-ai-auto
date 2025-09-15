・ｿ# Red繝輔ぉ繝ｼ繧ｺ險ｭ險・ file-name-template-sanitization

## 蟇ｾ雎｡繧ｿ繧ｹ繧ｯ

- Task ID: TASK-011
- Feature: file-name-template-sanitization・育ｷ丞粋髢｢謨ｰ・・

## 蟇ｾ雎｡繝・せ繝医こ繝ｼ繧ｹ・・ed・・

1. 繝・Φ繝励Ξ繝ｼ繝亥ｱ暮幕+繧ｵ繝九ち繧､繧ｺ+諡｡蠑ｵ蟄蝉ｿ晄戟繧定｡後≧邱丞粋髢｢謨ｰ
2. 繝・Φ繝励Ξ繝ｼ繝亥ｱ暮幕蠕後′遨ｺ縺ｫ遲峨＠縺・ｴ蜷医・ "untitled" 繧定ｿ斐☆・育ｷ丞粋髢｢謨ｰ・・

## 螟ｱ謨励＆縺帙ｋ縺溘ａ縺ｮ險ｭ險・

- 縺ｾ縺蟄伜惠縺励↑縺・`generateSanitizedFileName(template, context, options)` 繧偵ユ繧ｹ繝医°繧牙他縺ｳ蜃ｺ縺吶・- 譛溷ｾ・虚菴懶ｼ亥粋謌撰ｼ・
  - `generateFileName(template, context)` 縺ｧ螻暮幕
  - `sanitizeFileName(name, options)` 縺ｧ繧ｵ繝九ち繧､繧ｺ
  - `applyFallbackIfEmpty` 縺ｨ ext 菫晄戟縲［axLength縲∫ｦ∵ｭ｢譁・ｭ礼ｽｮ謠帙・蜃晞寔繝ｻ譛ｫ蟆ｾ繝峨ャ繝・遨ｺ逋ｽ髯､蜴ｻ繧呈ｺ縺溘☆

## 譛溷ｾ・＆繧後ｋ螟ｱ謨怜・螳ｹ

- TypeError / Import error: `generateSanitizedFileName` 縺梧悴螳溯｣・・縺溘ａ繝薙Ν繝・螳溯｡後お繝ｩ繝ｼ
- 繧ゅ＠縺上・ ReferenceError: 繧ｨ繧ｯ繧ｹ繝昴・繝域悴螳夂ｾｩ

## 螳溯｣・婿驥晢ｼ・reen莠亥相・・

```ts
// src/utils/fileNameTemplate.ts
export function generateSanitizedFileName(
  template: string,
  context: FileNameTemplateContext,
  options?: FileNameSanitizeOptions
): string {
  const name = generateFileName(template, context);
  return sanitizeFileName(name, options);
}
```

譛蟆城剞縺ｯ荳願ｨ倥〒蜊∝・・域里蟄倥Θ繝ｼ繝・ぅ繝ｪ繝・ぅ繧貞粋謌撰ｼ峨・
