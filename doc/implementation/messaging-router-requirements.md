# TDD隕∽ｻｶ螳夂ｾｩ繝ｻ讖溯・莉墓ｧ假ｼ・essaging-router・・

譛ｬ繝峨く繝･繝｡繝ｳ繝医・縲ヾervice Worker 蜀・・繝｡繝・そ繝ｼ繧ｸ繝ｫ繝ｼ繝・ぅ繝ｳ繧ｰ・・essaging-router・画ｩ溯・縺ｫ髢｢縺吶ｋTDD逕ｨ隕∽ｻｶ螳夂ｾｩ縺ｧ縺吶ゅΜ繝昴ず繝医Μ蜀・・繝・せ繝医∝梛螳夂ｾｩ縲∝ｮ溯｣・・險ｭ險医Γ繝｢縺九ｉ謚ｽ蜃ｺ縺励※縺・∪縺吶・

## 莠句燕貅門ｙ・・tdd-load-context 逶ｸ蠖難ｼ・

- 蜿ら・繧ｽ繝ｼ繧ｹ: `src/messaging-router.test.ts`・医ユ繧ｹ繝井ｻ墓ｧ假ｼ・ `src/types.ts`・亥梛螳夂ｾｩ・・ `src/background.ts`・・W螳溯｣・ｼ・ `src/content.ts`・・S螳溯｣・ｼ・ `繝励Ο繧ｸ繧ｧ繧ｯ繝域ｦりｦ・md`・郁ｨｭ險域ｦりｦ・ｼ・ `doc/todo.md`・磯ｲ謐暦ｼ・- 蛯呵・ 譏守､ｺ逧・↑ EARS 譁・嶌・・equirements.md, dataflow.md, api-endpoints.md 遲会ｼ峨・譛ｪ讀懷・縲ゅユ繧ｹ繝郁ｨ倩ｿｰ蜀・・ REQ/NFR/EDGE ID 繧呈圻螳壼盾辣ｧ縺ｨ縺吶ｋ縲・

---

## 1. 讖溯・縺ｮ讎りｦ・ｼ・ARS隕∽ｻｶ螳夂ｾｩ譖ｸ繝ｻ險ｭ險域枚譖ｸ繝吶・繧ｹ・・

- 泯 菴輔ｒ縺吶ｋ讖溯・縺・ Service Worker 縺ｫ縺翫＞縺ｦ縲￣opup/Content Script/閭梧勹繧ｿ繧ｹ繧ｯ髢薙・繝｡繝・そ繝ｼ繧ｸ繧貞女逅・・讀懆ｨｼ縺励・←蛻・↑螳帛・縺ｸ霆｢騾√・繝悶Ο繝ｼ繝峨く繝｣繧ｹ繝医☆繧九Γ繝・そ繝ｼ繧ｸ繝ｫ繝ｼ繧ｿ縲４TART_GENERATION 竊・CS 縺ｸ縺ｮ APPLY_AND_GENERATE 讖区ｸ｡縺励￣ROGRESS_UPDATE 縺ｮ Popup 繝悶Ο繝ｼ繝峨く繝｣繧ｹ繝医！MAGE_READY 竊・DOWNLOAD_IMAGE 謖・､ｺ縲∵悴遏･繝｡繝・そ繝ｼ繧ｸ繧・ｸ肴ｭ｣payload縺ｮ諡貞凄縲√ム繧ｦ繝ｳ繝ｭ繝ｼ繝牙､ｱ謨玲凾縺ｮ謖・焚繝舌ャ繧ｯ繧ｪ繝募・隧ｦ陦後ｒ蜷ｫ繧縲・- 泯 縺ｩ縺ｮ繧医≧縺ｪ蝠城｡後ｒ隗｣豎ｺ縺吶ｋ縺・ 繝ｦ繝ｼ繧ｶ繝ｼ縺訓opup縺九ｉ逕ｻ蜒冗函謌舌ｒ謫堺ｽ懊＠縺滄圀縺ｫ縲ゞI/CS/SW髢薙・髱槫酔譛溘Γ繝・そ繝ｼ繧ｸ繧貞ｮ牙・繝ｻ遒ｺ螳溘↓莨晄成縺励・ｲ謐怜庄隕門喧縺ｨ閾ｪ蜍輔ム繧ｦ繝ｳ繝ｭ繝ｼ繝峨ｒ謌千ｫ九＆縺帙ｋ縲・- 泯 諠ｳ螳壹＆繧後ｋ繝ｦ繝ｼ繧ｶ繝ｼ: 逕ｻ蜒冗函謌舌ｒ閾ｪ蜍募喧縺励◆縺НovelAI繝ｦ繝ｼ繧ｶ繝ｼ・域僑蠑ｵ讖溯・蛻ｩ逕ｨ閠・ｼ峨・- 泯 繧ｷ繧ｹ繝・Β蜀・〒縺ｮ菴咲ｽｮ縺･縺・ Chrome MV3 縺ｮ Service Worker 螻､縺ｫ蟶ｸ鬧舌＠縲√Γ繝・そ繝ｼ繧ｸ繝上ヶ縺ｨ縺励※謖ｯ繧玖・縺・Ａbackground.ts`縺ｮ雋ｬ蜍吶ｒ蟆ら畑繝ｫ繝ｼ繧ｿ縺ｫ蛻・牡縺吶ｋ險ｭ險医・- 蜿ら・縺励◆EARS隕∽ｻｶ: REQ-101, REQ-104, REQ-006・医ユ繧ｹ繝亥・險倩ｿｰ縺ｫ蝓ｺ縺･縺擾ｼ・- 蜿ら・縺励◆險ｭ險域枚譖ｸ:`繝励Ο繧ｸ繧ｧ繧ｯ繝域ｦりｦ・md`・医い繝ｼ繧ｭ繝・け繝√Ε蝗ｳ縲￣hase 6: 繝｡繝・そ繝ｼ繧ｸ繝ｳ繧ｰ邨ｱ蜷茨ｼ・
  菫｡鬆ｼ諤ｧ繧ｳ繝｡繝ｳ繝・ 譏守､ｺ縺ｮEARS隕∽ｻｶ譖ｸ縺後↑縺・◆繧√√ユ繧ｹ繝郁ｨ倩ｿｰ縺ｨ讎ょｿｵ險ｭ險医°繧峨・謚ｽ蜃ｺ・芋沺｡・峨・

## 2. 蜈･蜉帙・蜃ｺ蜉帙・莉墓ｧ假ｼ・ARS讖溯・隕∽ｻｶ繝ｻTypeScript蝙句ｮ夂ｾｩ繝吶・繧ｹ・・

- 泙 蜈･蜉帙ヱ繝ｩ繝｡繝ｼ繧ｿ・井ｻ｣陦ｨ萓具ｼ・ - `START_GENERATION` payload: `{ job: { id: string, prompt: string, params?: object } }`・医ユ繧ｹ繝育罰譚･・・ - `PROGRESS_UPDATE` payload: `{ jobId: string, status: 'running'|'pending'|'completed'|'error', progress: { current: number, total: number, etaSeconds?: number } }`・医ユ繧ｹ繝育罰譚･・・ - `IMAGE_READY` payload: `{ jobId: string, url: string, index: number, fileName: string }`・医ユ繧ｹ繝育罰譚･・・ - 蝙句盾辣ｧ: `src/types.ts` 蜀・・ `StartGenerationMessage`, `ProgressUpdateMessage`, `DownloadImageMessage` 縺ｪ縺ｩ・育畑隱槭・蝓ｺ譛ｬ蠖｢・・
- 泯 蜃ｺ蜉帛､・井ｻ｣陦ｨ萓具ｼ・ - `APPLY_AND_GENERATE` 竊・CS 縺ｸ `{ type: 'APPLY_AND_GENERATE', payload: { job } }`
  - `PROGRESS_UPDATE` 竊・Popup 縺ｸ繝悶Ο繝ｼ繝峨く繝｣繧ｹ繝・`{ type: 'PROGRESS_UPDATE', payload }`
  - `DOWNLOAD_IMAGE` 竊・SW/Downloads `{ type: 'DOWNLOAD_IMAGE', payload: { url, fileName } }`
  - 繧ｨ繝ｩ繝ｼ: `{ type: 'ERROR', payload: { error: { code, message }, context? } }`・・ode萓・ `INVALID_PAYLOAD`, `UNKNOWN_MESSAGE`, `INVALID_URL`, `DOWNLOAD_FAILED`・・
- 泯 蜈･蜃ｺ蜉帙・髢｢菫よｧ
  - START_GENERATION 蜿礼炊 竊・NovelAI 繧ｿ繝也音螳・竊・CS縺ｸ APPLY_AND_GENERATE 繧呈ｩ区ｸ｡縺・ - CS/蜀・Κ縺九ｉ縺ｮ PROGRESS_UPDATE 蜿礼炊 竊・Popup縺ｸ蜊ｳ譎ゅヶ繝ｭ繝ｼ繝峨く繝｣繧ｹ繝・ - IMAGE_READY 蜿礼炊 竊・payload讀懆ｨｼ/繧ｵ繝九ち繧､繧ｺ 竊・DOWNLOAD_IMAGE 繧貞叉譎る∝・
  - DOWNLOAD_FAILED・・RROR・牙女逅・竊・繝舌ャ繧ｯ繧ｪ繝募・隧ｦ陦後ｒ繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｫ・井ｸ企剞縺ゅｊ・・
- 閥 繝・・繧ｿ繝輔Ο繝ｼ
  - 譏守､ｺ逧・↑ `dataflow.md` 荳榊惠縲ゆｸ願ｨ倬未菫よｧ繧剃ｻｮ縺ｮ繝・・繧ｿ繝輔Ο繝ｼ縺ｨ縺吶ｋ縲・
- 蜿ら・縺励◆EARS隕∽ｻｶ: REQ-006・域､懆ｨｼ・峨ヽEQ-101・医ち繝門宛蠕｡・峨ヽEQ-104・亥・隧ｦ陦鯉ｼ・- 蜿ら・縺励◆險ｭ險域枚譖ｸ: `src/types.ts` 縺ｮ蜷・Γ繝・そ繝ｼ繧ｸ/險ｭ螳壼梛・亥ｮ溷錐縺ｯ譌｢蟄倥→蟾ｮ逡ｰ縺ゅｊ・・
  菫｡鬆ｼ諤ｧ繧ｳ繝｡繝ｳ繝・ 蝙九・ `src/types.ts` 縺九ｉ・芋沺｢・峨ゅΝ繝ｼ繝・ぅ繝ｳ繧ｰ縺ｮ繝｡繝・そ繝ｼ繧ｸ蜷阪・隧ｳ邏ｰ縺ｯ繝・せ繝医°繧峨・謚ｽ蜃ｺ・芋沺｡・峨Ａdataflow.md` 譛ｪ讀懷・縺ｮ縺溘ａ荳驛ｨ莉ｮ鄂ｮ縺搾ｼ芋沐ｴ・峨・

## 3. 蛻ｶ邏・擅莉ｶ・・ARS髱樊ｩ溯・隕∽ｻｶ繝ｻ繧｢繝ｼ繧ｭ繝・け繝√Ε險ｭ險医・繝ｼ繧ｹ・・

- 泯 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ隕∽ｻｶ・・FR-002 諠ｳ螳夲ｼ・ - PROGRESS_UPDATE 縺ｨ IMAGE_READY 邨瑚ｷｯ縺ｯ繧ｿ繧､繝槭・繧堤畑縺・★蜊ｳ譎りｻ｢騾・ｼ育岼讓吶Ξ繧､繝・Φ繧ｷ < 200ms・・
- 泯 繧ｻ繧ｭ繝･繝ｪ繝・ぅ隕∽ｻｶ・・FR-103 諠ｳ螳夲ｼ・ - `IMAGE_READY.url` 縺ｯ `http/https` 縺ｮ縺ｿ險ｱ蜿ｯ・・javascript:`遲峨・諡貞凄,`INVALID_URL`・・  - `fileName` 縺ｯ128譁・ｭ嶺ｻ･蜀・∫ｦ∵ｭ｢譁・ｭ・`\\/:\*?"<>|` 繧帝勁蜴ｻ縺玲僑蠑ｵ蟄蝉ｿ晄戟

- 泯 莠呈鋤諤ｧ隕∽ｻｶ
  - Chrome Extension Manifest V3, `chrome.runtime`, `chrome.tabs`, `chrome.downloads`, `chrome.storage`

- 泯 繧｢繝ｼ繧ｭ繝・け繝√Ε蛻ｶ邏・ - 繝ｫ繝ｼ繝・ぅ繝ｳ繧ｰ縺ｯ SW 蜀・〒螳檎ｵ舌ゅち繝匁爾邏｢/繝輔か繝ｼ繧ｫ繧ｹ縺ｯ荳蜈・喧・・EQ-101・峨ゅヰ繝・け繧ｪ繝輔・ SW 繧ｿ繧､繝槭・縺ｧ邂｡逅・・
- 閥 繝・・繧ｿ繝吶・繧ｹ蛻ｶ邏・ - 蟆ら畑DB縺ｪ縺励Ａchrome.storage` 蛻ｩ逕ｨ・域里蟄倥さ繝ｼ繝画ｺ匁侠・峨・ARS荳翫・DB隕∽ｻｶ縺ｯ荳榊惠縲・
- 閥 API蛻ｶ邏・ｼ亥､夜Κ・・ - `api-endpoints.md` 荳榊惠縲・hrome API 縺ｫ髯仙ｮ壹・
- 蜿ら・縺励◆EARS隕∽ｻｶ: NFR-002, NFR-103, REQ-101, REQ-104・医ユ繧ｹ繝郁ｨ倩ｿｰ縺ｮID蜿ら・・・- 蜿ら・縺励◆險ｭ險域枚譖ｸ: `繝励Ο繧ｸ繧ｧ繧ｯ繝域ｦりｦ・md`・医い繝ｼ繧ｭ繝・け繝√Ε・峨～src/background.ts`・医ち繝・Download螳溯｣・ｼ・
  菫｡鬆ｼ諤ｧ繧ｳ繝｡繝ｳ繝・ 繝・せ繝医→譌｢蟄伜ｮ溯｣・°繧峨・謚ｽ蜃ｺ・芋沺｡・峨∵ｭ｣蠑蒐FR/REQ譁・嶌縺ｯ譛ｪ讀懷・・芋沐ｴ・峨・

## 4. 諠ｳ螳壹＆繧後ｋ菴ｿ逕ｨ萓具ｼ・DGE繧ｱ繝ｼ繧ｹ繝ｻ繝・・繧ｿ繝輔Ο繝ｼ繝吶・繧ｹ・・

- 泙 蝓ｺ譛ｬ繝代ち繝ｼ繝ｳ
  - Popup竊担W: `START_GENERATION(job)` 竊・SW竊辰S: `APPLY_AND_GENERATE(job)` 竊・CS縺ｧ驕ｩ逕ｨ/逕滓・ 竊・CS/SW竊単opup: `PROGRESS_UPDATE` 竊・CS/SW竊担W: `IMAGE_READY(url,fileName)` 竊・SW: `DOWNLOAD_IMAGE`

- 泯 繝・・繧ｿ繝輔Ο繝ｼ・育ｰ｡譏難ｼ・ - Runtime/Tabs 繝｡繝・そ繝ｼ繧ｸ繝ｳ繧ｰ縺ｮ繝上ヶ縺ｨ縺励※ SW 縺悟女逅・・讀懆ｨｼ竊貞・驟阪るｲ謐励・螳御ｺ・・ Popup 縺ｸ繝悶Ο繝ｼ繝峨く繝｣繧ｹ繝医・
- 泙 繧ｨ繝・ず繧ｱ繝ｼ繧ｹ・井ｾ具ｼ・ - `UNKNOWN` 繝｡繝・そ繝ｼ繧ｸ 竊・`ERROR(UNKNOWN_MESSAGE)` 繧単opup縺ｸ騾夂衍
  - `START_GENERATION` 縺ｮ蠢・・`job` 谺關ｽ 竊・`ERROR(INVALID_PAYLOAD)`
  - `IMAGE_READY` 縺ｮ `url` 谺關ｽ/荳肴ｭ｣ 竊・`ERROR(INVALID_PAYLOAD|INVALID_URL)`

- 泯 繧ｨ繝ｩ繝ｼ繧ｱ繝ｼ繧ｹ・亥・隧ｦ陦鯉ｼ・ - `DOWNLOAD_FAILED` 繧貞女逅・竊・500ms/1000ms/2000ms 縺ｮ謖・焚繝舌ャ繧ｯ繧ｪ繝輔〒譛螟ｧ3蝗槫・騾√∬ｶ・℃譎ゅ・ `ERROR(DOWNLOAD_FAILED)` 騾夂衍縺玲遠蛻・ｊ

- 蜿ら・縺励◆EARS隕∽ｻｶ: EDGE-104・亥・隧ｦ陦御ｸ企剞騾夂衍・・ 莉・EDGE邉ｻ縺ｯ繝・せ繝亥・繧ｳ繝｡繝ｳ繝亥盾辣ｧ
- 蜿ら・縺励◆險ｭ險域枚譖ｸ: ・医ョ繝ｼ繧ｿ繝輔Ο繝ｼ蝗ｳ荳榊惠縺ｫ縺､縺搾ｼ荏src/messaging-router.test.ts` 縺ｮ險倩ｿｰ繧呈ｺ匁侠縺ｨ縺吶ｋ

菫｡鬆ｼ諤ｧ繧ｳ繝｡繝ｳ繝・ 繝・せ繝医こ繝ｼ繧ｹ逕ｱ譚･・芋沺｢/泯・峨∵ｭ｣蠑・dataflow 蝗ｳ縺ｯ譛ｪ讀懷・・芋沐ｴ・峨・

## 5. EARS隕∽ｻｶ繝ｻ險ｭ險域枚譖ｸ縺ｨ縺ｮ蟇ｾ蠢憺未菫・

- 蜿ら・縺励◆繝ｦ繝ｼ繧ｶ繧ｹ繝医・繝ｪ繝ｼ: Popup 縺九ｉ縺ｮ逕ｻ蜒冗函謌先桃菴懊ｒ遒ｺ螳溘↓蜿肴丐縺励・ｲ謐・螳御ｺ・→菫晏ｭ倥ｒ閾ｪ蜍募喧縺励◆縺・ｼ・繝励Ο繧ｸ繧ｧ繧ｯ繝域ｦりｦ・md`・・- 蜿ら・縺励◆讖溯・隕∽ｻｶ: REQ-006・医Γ繝・そ繝ｼ繧ｸ讀懆ｨｼ・・ REQ-101・医ち繝門宛蠕｡・・ REQ-104・医ム繧ｦ繝ｳ繝ｭ繝ｼ繝牙・隧ｦ陦鯉ｼ・- 蜿ら・縺励◆髱樊ｩ溯・隕∽ｻｶ: NFR-002・医Ξ繧､繝・Φ繧ｷ/蜊ｳ譎よｧ・・ NFR-103・医し繝九ち繧､繧ｺ/螳牙・諤ｧ・・- 蜿ら・縺励◆Edge繧ｱ繝ｼ繧ｹ: EDGE-104・亥・隧ｦ陦御ｸ企剞謇灘・繧企夂衍・・ 譛ｪ遏･繝｡繝・そ繝ｼ繧ｸ繝ｻ荳肴ｭ｣payload・医ユ繧ｹ繝郁ｨ倩ｿｰ・・- 蜿ら・縺励◆蜿励￠蜈･繧悟渕貅・ `src/messaging-router.test.ts` 縺ｮ蜷・`test`/`expect` 譚｡莉ｶ
- 蜿ら・縺励◆險ｭ險域枚譖ｸ:
  - 繧｢繝ｼ繧ｭ繝・け繝√Ε: `繝励Ο繧ｸ繧ｧ繧ｯ繝域ｦりｦ・md`・医い繝ｼ繧ｭ繝・け繝√Ε讒区・/Phase 6・・ - 繝・・繧ｿ繝輔Ο繝ｼ: ・医↑縺暦ｼ俄・ 證ｫ螳壹〒譛ｬ譖ｸ2遶/4遶縺ｮ髢｢菫よｧ繧貞ｮ夂ｾｩ
  - 蝙句ｮ夂ｾｩ: `src/types.ts`
  - 繝・・繧ｿ繝吶・繧ｹ: ・医↑縺暦ｼ・ - API莉墓ｧ・ ・医↑縺・ Chrome API 貅匁侠・・

---

## 蜩∬ｳｪ蛻､螳夲ｼ域圻螳夲ｼ・

笞・・隕∵隼蝟・

- 隕∽ｻｶ縺ｮ譖匁乂縺・ 荳驛ｨ縺ゅｊ・域ｭ｣蠑拾ARS/NFR譁・嶌繝ｻdataflow蝗ｳ縺梧悴謨ｴ蛯呻ｼ・- 蜈･蜃ｺ蜉帛ｮ夂ｾｩ: 荳ｻ隕∫ｵ瑚ｷｯ縺ｯ譏守｢ｺ・医ユ繧ｹ繝・蝙九〒陬懷ｮ鯉ｼ峨□縺悟多蜷阪・荳雋ｫ諤ｧ縺ｫ謾ｹ蝟・ｽ吝慍
- 蛻ｶ邏・擅莉ｶ: 讎ゅ・譏守｢ｺ・医Ξ繧､繝・Φ繧ｷ縲√し繝九ち繧､繧ｺ縲∝・隧ｦ陦鯉ｼ峨′縲∵ｭ｣蠑終D/譛ｬ譁・′譛ｪ謨ｴ蛯・- 螳溯｣・庄閭ｽ諤ｧ: 遒ｺ螳滂ｼ医ユ繧ｹ繝医ラ繝ｪ繝悶Φ縺ｧ谿ｵ髫守噪縺ｫ蜿ｯ閭ｽ・・

## 谺｡縺ｮ繧ｹ繝・ャ繝・

谺｡縺ｮ縺雁匡繧√せ繝・ャ繝・ `/tdd-testcases` 縺ｧ繝・せ繝医こ繝ｼ繧ｹ縺ｮ豢励＞蜃ｺ縺励ｒ陦後＞縺ｾ縺吶・
