import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProgressDomManager } from "./progress-dom-manager";

describe("ProgressDomManager", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="progress-container" role="progressbar" aria-valuemin="0" aria-valuemax="100">
        <div id="progress-bar" style="width:0%"></div>
      </div>
      <div id="remaining-count"></div>
      <div id="eta-display"></div>
      <div id="status-wrapper" aria-live="polite">
        <span id="status-text"></span>
      </div>
      <div id="log-container"></div>
      <button id="cancel-button"></button>
    `;
  });

  it("updates the progress bar and ARIA state", () => {
    const manager = new ProgressDomManager();
    manager.updateProgressBar(3, 5);

    const bar = document.getElementById("progress-bar")!;
    expect(bar.style.width).toBe("60%");

    const container = bar.parentElement!;
    expect(container.getAttribute("aria-valuenow")).toBe("60");
    expect(container.getAttribute("aria-valuetext")).toContain("5");
  });

  it("falls back when totals are missing", () => {
    const manager = new ProgressDomManager();
    manager.updateProgressBar(null, 0);
    expect(document.getElementById("progress-bar")!.style.width).toBe("0%");
  });

  it("updates remaining count display", () => {
    const manager = new ProgressDomManager();
    manager.updateRemainingCount(1, 5);
    expect(document.getElementById("remaining-count")!.textContent).toContain("4");

    manager.updateRemainingCount(4, 5);
    expect(document.getElementById("remaining-count")!.textContent).toContain("0");
  });

  it("formats ETA values and handles nulls", () => {
    const manager = new ProgressDomManager();
    const etaDisplay = document.getElementById("eta-display")!;

    manager.updateEtaDisplay(null);
    expect(etaDisplay.textContent).toBeDefined();

    manager.updateEtaDisplay(45);
    expect(etaDisplay.textContent).toContain("45");
  });

  it("updates status text and toggles aria-live priority", () => {
    const manager = new ProgressDomManager();
    const statusWrapper = document.getElementById("status-wrapper")!;

    manager.updateStatusText("通常進捗");
    expect(statusWrapper.getAttribute("aria-live")).toBe("polite");

    manager.updateStatusText("エラーが発生しました");
    expect(statusWrapper.getAttribute("aria-live")).toBe("assertive");
  });

  it("supports completion helpers and cancel button controls", () => {
    const manager = new ProgressDomManager();
    manager.setProgressBarComplete();
    expect(document.getElementById("progress-bar")!.style.width).toBe("100%");

    manager.hideCancelButton();
    expect((document.getElementById("cancel-button") as HTMLButtonElement).style.display).toBe("none");

    manager.disableCancelButton();
    expect((document.getElementById("cancel-button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("displays total time in minutes and seconds", () => {
    const manager = new ProgressDomManager();
    const earlier = Date.now() - 65000;

    manager.displayTotalTime(earlier);

    expect(document.getElementById("eta-display")!.textContent).toContain("1");
  });

  it("wires cancel button click handler and exposes reconnect button", () => {
    const manager = new ProgressDomManager();
    const handler = vi.fn();

    manager.setupCancelButton(handler);
    document.getElementById("cancel-button")!.dispatchEvent(new Event("click"));
    expect(handler).toHaveBeenCalledTimes(1);

    manager.updateStatusText("通信断");
    manager.showReconnectButton();
    expect(document.getElementById("reconnect-button")).not.toBeNull();
  });

  it("reports initialization state based on DOM availability", () => {
    const manager = new ProgressDomManager();
    expect(manager.isInitialized()).toBe(true);
  });
});
