import os, re, time, json, base64, random, pathlib, argparse, sys
from typing import Optional, Tuple

import yaml
from selenium import webdriver
from selenium.webdriver import ChromeOptions
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ====== 基本設定 ======
NOVELAI_IMAGE_URL = "https://novelai.net/image"
ROOT_DIR = pathlib.Path(__file__).resolve().parent
OUTPUT_DIR = ROOT_DIR / "output"
PROFILE_DIR = ROOT_DIR / "chrome-profile"  # ← ログイン保持用の専用プロファイル

MAX_WAIT_UI = 30
MAX_WAIT_GEN = 180

RETRY_MAX = 6
BASE_BACKOFF = 2.0

# ====== ユーティリティ ======
def with_wait(driver):
    return WebDriverWait(driver, MAX_WAIT_UI)

def find_first(driver_or_elem, locators):
    for by, sel in locators:
        try:
            els = driver_or_elem.find_elements(by, sel)
            if els:
                return els[0]
        except Exception:
            pass
    return None

def safe_click(driver, element):
    actions = ActionChains(driver)
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", element)
    actions.move_to_element(element).pause(0.05).click().perform()

def js_set_value_and_fire(driver, element, value: str):
    driver.execute_script("""
const el = arguments[0];
const val = arguments[1];
el.focus();
if ('value' in el) el.value = val;
else if (el.isContentEditable) el.textContent = val;
el.dispatchEvent(new Event('input', {bubbles:true}));
el.dispatchEvent(new Event('change', {bubbles:true}));
el.blur();
""", element, value)

# ====== ドライバ構築 ======

def build_driver() -> webdriver.Chrome:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    opts = ChromeOptions()
    opts.add_argument(f"--user-data-dir={PROFILE_DIR}")
    opts.add_argument("--profile-directory=Default")
    prefs = {
        "download.default_directory": str(OUTPUT_DIR),
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safebrowsing.enabled": True
    }
    opts.add_experimental_option("prefs", prefs)

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)
    driver.set_window_size(1300, 950)
    return driver

def ensure_logged_in(driver):
    driver.get(NOVELAI_IMAGE_URL)
    try:
        with_wait(driver).until(EC.any_of(
            EC.presence_of_element_located((By.XPATH, "//*[contains(normalize-space(),'プロンプト')]")),
            EC.presence_of_element_located((By.XPATH, "//button[contains(.,'Generate') or contains(.,'生成')]"))
        ))
        return True
    except Exception:
        print("🔐 NovelAIにログインしてください（このタブで）。画像生成UIが表示されるまで待機します。")
        with_wait(driver).until(EC.presence_of_element_located((
            By.XPATH, "//*[contains(normalize-space(),'プロンプト') or contains(.,'Image Generation')]"
        )))
        return True

# ====== 入力系 ======
def set_prompts(driver, positive: str, negative: str):
    pos = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'プロンプト')]/following::textarea[1]"),
        (By.XPATH, "//*[contains(normalize-space(),'プロンプト')]/following::*[@contenteditable='true'][1]"),
        (By.XPATH, "//textarea[contains(@placeholder,'Positive') or contains(@aria-label,'Positive')]"),
        (By.XPATH, "//textarea[@rows and not(@readonly)]"),
    ])
    if not pos:
        raise RuntimeError("Positive prompt field not found")
    try:
        pos.clear(); pos.send_keys(positive)
    except Exception:
        js_set_value_and_fire(driver, pos, positive)

    neg = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'除外したい要素')]/following::textarea[1]"),
        (By.XPATH, "(//textarea[@rows and not(@readonly)])[last()]"),
        (By.XPATH, "//textarea[contains(@placeholder,'Negative') or contains(@aria-label,'Negative')]"),
    ])
    if neg:
        try:
            neg.clear(); neg.send_keys(negative)
        except Exception:
            js_set_value_and_fire(driver, neg, negative)

def select_model(driver, name_contains: str):
    btn = find_first(driver, [
        (By.XPATH, "//button[contains(.,'Model') or contains(.,'モデル')]"),
        (By.XPATH, "//*[contains(.,'NAI Diffusion') and contains(.,'V')]//button | //*[contains(.,'NAI Diffusion') and contains(.,'V')]"),
    ])
    if btn:
        safe_click(driver, btn); time.sleep(0.2)
    opt = find_first(driver, [
        (By.XPATH, f"//div//span[contains(.,\"{name_contains}\")]/ancestor::button"),
        (By.XPATH, f"//li[contains(.,\"{name_contains}\")]"),
        (By.XPATH, f"//button[contains(.,\"{name_contains}\")]"),
    ])
    if not opt:
        return  # 既に選択済みとみなす
    safe_click(driver, opt); time.sleep(0.2)

def set_sampler_steps_size_scale(driver, sampler_text: str, steps: int, width: int, height: int, scale: float):
    samp_open = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'サンプラー')]//button|//button[contains(.,'サンプラー')]"),
        (By.XPATH, "//button[contains(.,'Sampler')]"),
    ])
    if samp_open:
        safe_click(driver, samp_open); time.sleep(0.2)
        cand = find_first(driver, [
            (By.XPATH, f"//li[contains(.,'{sampler_text}')]"),
            (By.XPATH, f"//button[contains(.,'{sampler_text}')]"),
            (By.XPATH, f"//*[@role='option' and contains(.,'{sampler_text}')]"),
        ])
        if cand: safe_click(driver, cand); time.sleep(0.2)

    steps_input = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'ステップ')]/following::input[@type='number'][1]"),
        (By.XPATH, "//input[@type='number' and (contains(@name,'steps') or contains(@aria-label,'Steps'))]"),
    ])
    if steps_input:
        steps_input.clear(); steps_input.send_keys(str(steps))
        driver.execute_script("arguments[0].dispatchEvent(new Event('change', {bubbles:true}));", steps_input)

    scale_input = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'正確度')]/following::input[@type='number'][1]"),
        (By.XPATH, "//input[@type='number' and (contains(@name,'scale') or contains(@aria-label,'Scale') or contains(@aria-label,'CFG'))]"),
    ])
    if scale_input:
        scale_input.clear(); scale_input.send_keys(str(scale))
        driver.execute_script("arguments[0].dispatchEvent(new Event('change', {bubbles:true}));", scale_input)

    w_input = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'幅') or contains(@aria-label,'Width')]/following::input[@type='number'][1]"),
        (By.XPATH, "//input[@type='number' and (contains(@name,'width') or contains(@aria-label,'Width'))]"),
    ])
    h_input = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'高さ') or contains(@aria-label,'Height')]/following::input[@type='number'][1]"),
        (By.XPATH, "//input[@type='number' and (contains(@name,'height') or contains(@aria-label,'Height'))]"),
    ])
    if w_input and h_input:
        for el, val in ((w_input, width), (h_input, height)):
            el.clear(); el.send_keys(str(val))
            driver.execute_script("arguments[0].dispatchEvent(new Event('change', {bubbles:true}));", el)

def set_quality_tag_toggle(driver, enable: bool):
    row = find_first(driver, [(By.XPATH, "//*[contains(normalize-space(),'品質タグ有効')]")])
    if not row: return
    toggle = find_first(driver, [
        (By.XPATH, "//*[contains(normalize-space(),'品質タグ有効')]/following::button[1]"),
        (By.XPATH, "//*[contains(normalize-space(),'品質タグ有効')]/ancestor::*[1]//button[1]"),
    ])
    if not toggle: return
    state = (toggle.get_attribute("aria-pressed")
             or toggle.get_attribute("aria-checked")
             or toggle.get_attribute("data-state") or "").lower()
    is_on = state in ("true","checked","on") or "is-active" in (toggle.get_attribute("class") or "")
    if enable != is_on:
        safe_click(driver, toggle); time.sleep(0.15)

# ====== キャラクター追加 ======
def click_add_character_and_choose(driver, gender_text: str):
    add_btn = find_first(driver, [
        (By.XPATH, "//button[contains(normalize-space(),'キャラクターを追加')]"),
        (By.XPATH, "//button[.//span[contains(.,'キャラクター') and contains(.,'追加')]]"),
    ])
    if not add_btn:
        raise RuntimeError("『＋ キャラクターを追加』ボタンが見つかりません")
    safe_click(driver, add_btn); time.sleep(0.15)

    opt = find_first(driver, [
        (By.XPATH, f"//div[contains(@role,'menu') or @role='listbox' or contains(@class,'popover') or contains(@class,'menu')]//button[normalize-space()='{gender_text}']"),
        (By.XPATH, f"//*[self::li or self::button or self::div][normalize-space()='{gender_text}']"),
    ])
    if not opt:
        raise RuntimeError(f"性別メニューの項目が見つかりません: {gender_text}")
    safe_click(driver, opt); time.sleep(0.25)

def _last_character_card(driver):
    cards = driver.find_elements(
        By.XPATH,
        "(//*[contains(normalize-space(),'キャラクタープロンプト')]/following::*[self::section or self::div]"
        "[.//*[contains(normalize-space(),'キャラクター') or contains(@class,'character')]] )"
    )
    return cards[-1] if cards else None

def fill_character_card(driver, card, *, positive=None, negative=None, weight=None):
    if positive is not None:
        pos_area = find_first(card, [
            (By.XPATH, ".//*[contains(normalize-space(),'プロンプト')]/following::textarea[1]"),
            (By.XPATH, ".//textarea"),
            (By.XPATH, ".//*[@contenteditable='true']"),
        ])
        if pos_area:
            try:
                pos_area.clear(); pos_area.send_keys(positive)
            except Exception:
                js_set_value_and_fire(driver, pos_area, positive)

    if negative is not None:
        neg_area = find_first(card, [
            (By.XPATH, ".//*[contains(normalize-space(),'除外したい要素')]/following::textarea[1]"),
            (By.XPATH, "(.//textarea)[last()]"),
        ])
        if neg_area:
            try:
                neg_area.clear(); neg_area.send_keys(negative)
            except Exception:
                js_set_value_and_fire(driver, neg_area, negative)

    if weight is not None:
        num = find_first(card, [
            (By.XPATH, ".//*[contains(normalize-space(),'強度') or contains(translate(., 'WEIGHT','weight'),'weight')]/following::input[@type='number'][1]"),
            (By.XPATH, ".//input[@type='number' and (contains(@name,'weight') or contains(@aria-label,'weight') or contains(@aria-label,'強度'))]"),
        ])
        if num:
            num.clear(); num.send_keys(str(weight))
            driver.execute_script("arguments[0].dispatchEvent(new Event('change',{bubbles:true}));", num)
        else:
            slider = find_first(card, [(By.XPATH, ".//input[@type='range']")])
            if slider:
                driver.execute_script("""
const s=arguments[0], v=arguments[1];
s.value = v;
s.dispatchEvent(new Event('input',{bubbles:true}));
s.dispatchEvent(new Event('change',{bubbles:true}));
""", slider, float(weight))

def add_character(driver, *, gender: str, positive: str, negative: str = "", weight: float | None = None):
    section = find_first(driver, [(By.XPATH, "//*[contains(normalize-space(),'キャラクタープロンプト')]")])
    if section:
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", section)
    click_add_character_and_choose(driver, gender)
    card = _last_character_card(driver)
    if not card:
        raise RuntimeError("追加したキャラカードが見つかりません")
    fill_character_card(driver, card, positive=positive, negative=negative, weight=weight)
    time.sleep(0.2)

def add_characters(driver, characters):
    if not characters: return
    for ch in characters:
        add_character(
            driver,
            gender = ch.get("gender","その他"),
            positive = ch.get("positive",""),
            negative = ch.get("negative",""),
            weight   = ch.get("weight"),
        )

# ====== 生成 & 保存 ======
def click_generate(driver):
    btn = find_first(driver, [
        (By.XPATH, "//button[contains(.,'1枚のみ生成') and not(@disabled)]"),
        (By.XPATH, "//button[contains(.,'生成') and not(@disabled)]"),
        (By.XPATH, "//button[contains(.,'Generate') and not(@disabled)]"),
    ])
    if not btn:
        raise RuntimeError("Generate button not found")
    safe_click(driver, btn)

def wait_for_any_result(driver, timeout: int = MAX_WAIT_GEN) -> Tuple[Optional[int], Optional[bytes], Optional[str]]:
    start = time.time()
    while time.time() - start < timeout:
        try:
            _ = WebDriverWait(driver, 1).until(EC.presence_of_element_located((
                By.XPATH, "//img[contains(@src,'data:image') or contains(@src,'blob:') or contains(@src,'/thumbnail')]"
            )))
            return 200, None, None
        except Exception:
            time.sleep(1.0)
    return None, None, None

def save_blob_or_screenshot(driver, outdir: pathlib.Path) -> str:
    outdir.mkdir(parents=True, exist_ok=True)
    img = find_first(driver, [(By.XPATH, "//img[starts-with(@src,'data:image')]")])
    if img:
        src = img.get_attribute("src")
        if src.startswith("data:image"):
            head, b64 = src.split(",", 1)
            data = base64.b64decode(b64)
            p = outdir / f"novelai_{int(time.time())}_{random.randint(1000,9999)}.png"
            p.write_bytes(data)
            return str(p)
    p = outdir / f"novelai_{int(time.time())}_{random.randint(1000,9999)}.png"
    driver.save_screenshot(str(p))
    return str(p)

def run_one_job(driver, *, positive, negative, model_text, sampler, steps, width, height, scale, outdir: pathlib.Path):
    set_prompts(driver, positive, negative)
    if model_text: select_model(driver, model_text)
    set_sampler_steps_size_scale(driver, sampler, steps, width, height, scale)
    click_generate(driver)
    status, body, mime = wait_for_any_result(driver, timeout=MAX_WAIT_GEN)
    if status == 200:
        path = save_blob_or_screenshot(driver, outdir)
        return {"ok": True, "path": path, "status": status}
    return {"ok": False, "status": status}

def run_with_retry(driver, job_kwargs):
    backoff = BASE_BACKOFF
    for i in range(1, RETRY_MAX+1):
        res = run_one_job(driver, **job_kwargs)
        if res["ok"]:
            return res
        status = res.get("status")
        print(f"[Attempt {i}] status={status}")
        if status in (429, 500, None):
            sleep_s = backoff + random.uniform(0, 0.5)
            print(f"Retrying in {sleep_s:.1f}s ...")
            time.sleep(sleep_s)
            backoff = min(backoff * 2, 64.0)
            continue
        return res
    return {"ok": False, "status": "max-retries"}

# ====== config.md 読み込み & 実行 ======
def load_config_md(path: str) -> dict:
    p = pathlib.Path(path)
    text = p.read_text(encoding="utf-8")
    m = re.search(r"```yaml\s*(.+?)\s*```", text, flags=re.DOTALL|re.IGNORECASE)
    if m: return yaml.safe_load(m.group(1)) or {}
    m2 = re.search(r"^---\s*(.+?)\s*---", text, flags=re.DOTALL|re.IGNORECASE|re.MULTILINE)
    if m2: return yaml.safe_load(m2.group(1)) or {}
    return yaml.safe_load(text) or {}

def run_from_config(driver, cfg: dict, outdir: pathlib.Path):
    pos = (cfg.get("prompt") or {}).get("positive", "")
    neg = (cfg.get("prompt") or {}).get("negative", "")
    set_prompts(driver, pos, neg)

    model_text = (cfg.get("model") or {}).get("text", "")
    if model_text: select_model(driver, model_text)

    sampler = cfg.get("sampler", "Euler Ancestral")
    pr = cfg.get("params") or {}
    steps  = int(pr.get("steps", 28))
    width  = int(pr.get("width", 832))
    height = int(pr.get("height", 1216))
    scale  = float(pr.get("scale", 7.0))
    set_sampler_steps_size_scale(driver, sampler, steps, width, height, scale)

    if "quality_tag" in pr:
        set_quality_tag_toggle(driver, bool(pr["quality_tag"]))

    chars = cfg.get("characters") or []
    if chars:
        add_characters(driver, chars)

    job_kwargs = dict(
        positive=pos, negative=neg,
        model_text=model_text or "",
        sampler=sampler, steps=steps, width=width, height=height, scale=scale,
        outdir=outdir,
    )
    return run_with_retry(driver, job_kwargs)

def main():
    import argparse
    ap = argparse.ArgumentParser(description="NovelAI Selenium runner (Markdown config)")
    ap.add_argument("--config", required=True, help="Markdown config path (e.g. D:\\novelai_selenium\\config.md)")
    ap.add_argument("--out", default=str(OUTPUT_DIR), help="Output dir")
    args = ap.parse_args()

    driver = build_driver()
    try:
        ensure_logged_in(driver)
        cfg = load_config_md(args.config)
        if not cfg:
            print("設定が空です。--config の YAML ブロックを確認してください。", file=sys.stderr)
            sys.exit(2)
        res = run_from_config(driver, cfg, pathlib.Path(args.out))
        print(res)
    finally:
        pass  # driver.quit() は必要なら有効化

if __name__ == "__main__":
    main()
