# TASK-032 繝ｪ繝医Λ繧､繧ｨ繝ｳ繧ｸ繝ｳ Green繝｡繝｢

## 螳溯｣・婿驥・- 譌｢蟄倥ユ繧ｹ繝・`src/utils/retry-engine.test.ts` 繧帝壹☆縺溘ａ縺ｮ譛蟆丞ｮ溯｣・・- 謖・焚繝舌ャ繧ｯ繧ｪ繝包ｼ・aseDelay, factor・峨→荳企剞蛻ｶ蠕｡・・axRetries, cancel・峨ｒ謠蝉ｾ帙・- 驕・ｻｶ螳溯｡後・ `setTimeout`縲∝⊃繧ｿ繧､繝槭・・・itest・峨〒讀懆ｨｼ蜿ｯ閭ｽ縺ｫ縲・- `executeWithRetry` 縺ｯ Promise 繝√ぉ繝ｼ繝ｳ縺ｧ螟ｱ謨励ｒ蜊ｳ譎よ黒謐峨＠縲∵悴蜃ｦ逅・拠蜷ｦ繧呈椛豁｢縲・
## 螳溯｣・さ繝ｼ繝会ｼ域栢邊具ｼ・- `src/utils/retry-engine.ts` 繧貞盾辣ｧ縲・  - calculateDelay/shouldRetry/executeWithDelay/recordFailure/getCurrentAttempts/reset/cancel/executeWithRetry
  - 繧ｳ繝｡繝ｳ繝医〒縲梧ｩ溯・讎りｦ・螳溯｣・婿驥・繝・せ繝亥ｯｾ蠢・菫｡鬆ｼ諤ｧ繝ｬ繝吶Ν縲阪ｒ譏守､ｺ縲・
## 繝・せ繝育ｵ先棡
- 螳溯｡・ `npm run test:unit`
- 讖溯・繝・せ繝医・蜈ｨ縺ｦ謌仙粥・・8 passed・峨・- 繝ｩ繝ｳ蠕後↓ Vitest 縺・`Unhandled Rejection` 繧・莉ｶ讀懷・縲・  - 蟇ｾ蠢・ `executeWithRetry` 繧・then(success, failure) 讒区・縺ｫ螟画峩縺励√＆繧峨↓繝・せ繝育腸蠅・剞螳壹・辟｡隕悶ワ繝ｳ繝峨Λ繧呈圻螳夊ｿｽ蜉縲・
## 隱ｲ鬘後・謾ｹ蝟・せ
- 繝・せ繝医ワ繝ｼ繝阪せ蛛ｴ縺ｮ譛ｪ蜃ｦ逅・拠蜷ｦ讀懷・縺ｮ螳牙ｮ壼喧・医Δ繝・け/險ｭ螳壹・隕狗峩縺暦ｼ峨・- 繧ｰ繝ｭ繝ｼ繝舌Ν `unhandledRejection` 繝上Φ繝峨Λ縺ｮ謦､蜴ｻ・域悽逡ｪ荳崎ｦ・ｼ峨・- 繝ｪ繝医Λ繧､譁ｹ驥晢ｼ医ず繝・ち繝ｼ蟆主・繧・怙螟ｧ驕・ｻｶ荳企剞縺ｪ縺ｩ・画僑蠑ｵ縺ｮ菴吝慍縲・- 險ｭ螳壼､繝舌Μ繝・・繧ｷ繝ｧ繝ｳ縺ｨ蝙九・蜴ｳ蟇・喧縲・
## 谺｡繝輔ぉ繝ｼ繧ｺTODO・・efactor・・- 譛ｪ蜃ｦ逅・拠蜷ｦ縺ｮ譬ｹ豐ｻ蟇ｾ蠢・- 繧ｳ繝ｼ繝牙・蜑ｲ縺ｨ蜿ｯ隱ｭ諤ｧ蜷台ｸ・- 霑ｽ蜉縺ｮ蠅・阜蛟､繝・せ繝亥・螳・

## Refactor 追記（2025-09-15）
- executeWithRetry を await/try-catch ベースに単純化（機能同等）
- グローバルの `unhandledRejection` 抑止を test/setup.ts から撤去
- 実装側での恒久対策（同期接続）で未処理拒否を回避
- テストは全てグリーン、Unhandled Errors=0 を確認