・ｿ# TDD髢狗匱繝｡繝｢: file-name-template-sanitization

## 讎りｦ・

- 讖溯・蜷・ File Name Template & Sanitization・育ｷ丞粋髢｢謨ｰ・・- 髢狗匱髢句ｧ・ 2025-09-15
- 迴ｾ蝨ｨ縺ｮ繝輔ぉ繝ｼ繧ｺ: 螳御ｺ・

## 髢｢騾｣繝輔ぃ繧､繝ｫ

- 隕∽ｻｶ螳夂ｾｩ: `doc/implementation/file-name-template-sanitization-requirements.md`
- 繝・せ繝医こ繝ｼ繧ｹ螳夂ｾｩ: `doc/implementation/file-name-template-sanitization-testcases.md`
- 螳溯｣・ヵ繧｡繧､繝ｫ: `src/utils/fileNameTemplate.ts`
- 繝・せ繝医ヵ繧｡繧､繝ｫ: `src/utils/fileNameTemplate.red.test.ts`

## Red繝輔ぉ繝ｼ繧ｺ・亥､ｱ謨励☆繧九ユ繧ｹ繝井ｽ懈・・・

### 菴懈・譌･譎・

2025-09-15

### 繝・せ繝医こ繝ｼ繧ｹ

- 繝・Φ繝励Ξ繝ｼ繝亥ｱ暮幕+繧ｵ繝九ち繧､繧ｺ+諡｡蠑ｵ蟄蝉ｿ晄戟繧定｡後≧邱丞粋髢｢謨ｰ
- 繝・Φ繝励Ξ繝ｼ繝亥ｱ暮幕蠕後′遨ｺ縺ｫ遲峨＠縺・ｴ蜷医・ "untitled" 繧定ｿ斐☆・育ｷ丞粋髢｢謨ｰ・・

### 繝・せ繝医さ繝ｼ繝・

`src/utils/fileNameTemplate.red.test.ts` 繧貞盾辣ｧ

### 譛溷ｾ・＆繧後ｋ螟ｱ謨・

- `generateSanitizedFileName` 縺梧悴螳溯｣・譛ｪ繧ｨ繧ｯ繧ｹ繝昴・繝医・縺溘ａ縲√ン繝ｫ繝・螳溯｡梧凾縺ｫ螟ｱ謨・

### 谺｡縺ｮ繝輔ぉ繝ｼ繧ｺ縺ｸ縺ｮ隕∵ｱゆｺ矩・

- `generateSanitizedFileName(template, context, options)` 繧・`fileNameTemplate.ts` 縺ｫ螳溯｣・ - 謇矩・ `generateFileName` 竊・`sanitizeFileName` 縺ｮ蜷域・
  - 莉墓ｧ・ 譌｢蟄倥し繝九ち繧､繧ｺ莉墓ｧ假ｼ育ｦ∵ｭ｢譁・ｭ礼ｽｮ謠帙∝・髮・∵忰蟆ｾ繝峨ャ繝・遨ｺ逋ｽ髯､蜴ｻ縲∵僑蠑ｵ蟄蝉ｿ晄戟縲［axLength驕ｩ逕ｨ縲’allback驕ｩ逕ｨ・峨↓貅匁侠

## Green繝輔ぉ繝ｼ繧ｺ・域怙蟆丞ｮ溯｣・ｼ・

### 螳溯｣・律譎・

2025-09-15

### 螳溯｣・婿驥・

- 蟆上＆縺・`generateFileName` 縺ｨ `sanitizeFileName` 繧貞腰邏泌粋謌舌☆繧区怙菴朱剞縺ｮ髢｢謨ｰ繧定ｿｽ蜉

### 螳溯｣・さ繝ｼ繝・

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

### 繝・せ繝育ｵ先棡

- 螳溯｡梧悴遒ｺ隱搾ｼ・ask繝・・繝ｫ/`npm test` 縺ｧ遒ｺ隱堺ｺ亥ｮ夲ｼ・

### 隱ｲ鬘後・謾ｹ蝟・せ

- 繧ｪ繝励す繝ｧ繝ｳ縺ｮ繝・ヵ繧ｩ繝ｫ繝亥叙繧雁屓縺暦ｼ・sanitizeFileName` 蛛ｴ縺ｸ蟋碑ｭｲ・・

## Refactor繝輔ぉ繝ｼ繧ｺ・亥刀雉ｪ謾ｹ蝟・ｼ・

### 繝ｪ繝輔ぃ繧ｯ繧ｿ譌･譎・

2025-09-15

### 謾ｹ蝟・・螳ｹ

- 蜀・Κ蝙・`NormalizedSanitizeConfig` 繧貞ｰ主・縺・any 繧呈賜髯､・亥梛螳牙・諤ｧ蜷台ｸ奇ｼ・- 髢｢謨ｰ繧ｳ繝｡繝ｳ繝医ｒ陬懆ｶｳ縺怜ｽｹ蜑ｲ繧呈・遒ｺ蛹・

### 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝ｬ繝薙Η繝ｼ

- 蜈･蜉帑ｸ企剞/陦晉ｪ∬ｧ｣豎ｺ荳企剞縺ｮ邯ｭ謖√ｒ遒ｺ隱搾ｼ・oS蟇ｾ遲厄ｼ・

### 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ繝ｬ繝薙Η繝ｼ

- 譁・ｭ怜・襍ｰ譟ｻ蝗樊焚縺ｯ荳螳壹〒 O(n)縲∝撫鬘後↑縺・

### 譛邨ゅさ繝ｼ繝・

- `src/utils/fileNameTemplate.ts` 縺ｫ蜿肴丐貂医∩

### 蜩∬ｳｪ隧穂ｾ｡

- 濶ｯ螂ｽ・亥梛螳牙・諤ｧ/蜿ｯ隱ｭ諤ｧ縺梧隼蝟・∵嫌蜍穂ｸ榊､会ｼ・

---

# file-name-template-sanitization TDD髢狗匱螳御ｺ・ｨ倬鹸

## 遒ｺ隱阪☆縺ｹ縺阪ラ繧ｭ繝･繝｡繝ｳ繝・

- `doc/implementation/file-name-template-sanitization-testcases.md`
- `docs/implements/TASK-011/file-name-template-sanitization-red-phase.md`
- `docs/implements/TASK-011/file-name-template-sanitization-green-phase.md`
- `docs/implements/TASK-011/file-name-template-sanitization-refactor-phase.md`

## 識 譛邨らｵ先棡 (2025-09-15)

- 螳溯｣・紫: 83% (15/18 繝・せ繝医こ繝ｼ繧ｹ逶ｸ蠖・
- 蜩∬ｳｪ蛻､螳・ 隕∵隼蝟・ｼ郁ｿｽ蜉縺ｧ3莉ｶ縺ｮ繝・せ繝医ｒ謗ｨ螂ｨ・・- TODO譖ｴ譁ｰ: 霑ｽ蜉繝・せ繝医・螳溯｣・ち繧ｹ繧ｯ繧定ｿｽ險・

## 譛ｪ螳溯｣・ユ繧ｹ繝茨ｼ域耳螂ｨ霑ｽ蜉・・1) forbiddenChars/replacement 縺ｮ繧ｫ繧ｹ繧ｿ繝槭う繧ｺ蜿肴丐・域ｭ｣蟶ｸ邉ｻ・・2) 縺｡繧・≧縺ｩ maxLength 縺ｮ蝣ｴ蜷医↓蛻・ｊ隧ｰ繧√↑縺・ｼ亥｢・阜蛟､・・3) 諡｡蠑ｵ蟄宣聞縺碁明蛟､雜・℃縺ｮ蝣ｴ蜷医・諡｡蠑ｵ蟄宣撼菫晄戟繝ｫ繝ｼ繝茨ｼ亥｢・阜蛟､・・4) idx=0 縺ｮ蝣ｴ蜷医↓1縺ｸ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ・亥｢・阜蛟､・俄ｻ蜆ｪ蜈亥ｺｦ: 荳ｭ・井ｻ墓ｧ伜粋諢剰ｦ・ｼ・

## 驥崎ｦ√↑謚陦灘ｭｦ鄙・- 譌｢蟄倥Θ繝ｼ繝・ぅ繝ｪ繝・ぅ縺ｮ邏皮ｲ句粋謌舌〒邱丞粋髢｢謨ｰ繧呈怙蟆丞ｮ溯｣・- any髯､蜴ｻ縺ｮ縺溘ａ縺ｮ蜀・Κ蝙句ｰ主・縺ｧ蝙句ｮ牙・諤ｧ縺ｨ蜿ｯ隱ｭ諤ｧ縺悟髄荳・

## 豕ｨ諢冗せ

- `idx=0` 縺ｮ謇ｱ縺・・莉墓ｧ倡｢ｺ隱阪′譛帙∪縺励＞・育樟陦後・ 0 竊・1・・

## 譛邨らｵ先棡 (2025-09-15)

- 螳溯｣・紫: 100% (霑ｽ蜉4莉ｶ繧貞性繧∝・繝・せ繝医こ繝ｼ繧ｹ蜷域ｼ)
- 蜩∬ｳｪ蛻､螳・ 蜷域ｼ
- TODO譖ｴ譁ｰ: 隧ｲ蠖薙ち繧ｹ繧ｯ繧貞ｮ御ｺ・↓譖ｴ譁ｰ・・erify縺ｾ縺ｧ螳御ｺ・ｼ・
