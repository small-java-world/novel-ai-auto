import { beforeEach, describe, expect, it, vi } from "vitest";

const downloadLoggerMock = vi.hoisted(() => ({
  logSuccess: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("./download-logger", () => ({
  DownloadLogger: downloadLoggerMock,
}));

import { PermissionManager } from "./permission-manager";

const chromeMock = globalThis.chrome as any;

if (!chromeMock.permissions) {
  chromeMock.permissions = {
    contains: vi.fn(),
    request: vi.fn(),
  };
}

const permissionsMock = chromeMock.permissions;
const storageGet = chromeMock.storage.local.get as any;
const storageSet = chromeMock.storage.local.set as any;

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockResolvedValue({ permissionPending: false });
  storageSet.mockResolvedValue(undefined);
});

describe("PermissionManager.checkPermissionStatus", () => {
  it("returns proceed when permission is already granted", async () => {
    permissionsMock.contains.mockResolvedValue(true);

    const result = await PermissionManager.checkPermissionStatus();

    expect(result.hasPermission).toBe(true);
    expect(result.nextAction).toBe("proceed");
  });

  it("signals pending state when flag is set", async () => {
    permissionsMock.contains.mockResolvedValue(false);
    storageGet.mockResolvedValue({ permissionPending: true });

    const result = await PermissionManager.checkPermissionStatus();

    expect(result.nextAction).toBe("request");
    expect(result.isPending).toBe(true);
  });

  it("logs error and aborts when permission check fails", async () => {
    permissionsMock.contains.mockRejectedValue(new Error("api failure"));

    const result = await PermissionManager.checkPermissionStatus();

    expect(downloadLoggerMock.logError).toHaveBeenCalledWith(
      "permission_check",
      expect.stringContaining("api failure"),
    );
    expect(result.nextAction).toBe("abort");
    expect(result.hasPermission).toBe(false);
    expect(result.message.length).toBeGreaterThan(0);
  });
});

describe("PermissionManager.requestPermission", () => {
  it("grants permission and clears pending flag", async () => {
    permissionsMock.contains.mockResolvedValue(false);
    permissionsMock.request.mockResolvedValue(true);

    const result = await PermissionManager.requestPermission();

    expect(storageSet).toHaveBeenCalledWith({ permissionPending: true });
    expect(downloadLoggerMock.logSuccess).toHaveBeenCalledWith(
      "permission_request_start",
      expect.any(String),
    );
    expect(result.userResponse).toBe("granted");
  });

  it("returns denied state when user rejects", async () => {
    permissionsMock.contains.mockResolvedValue(false);
    permissionsMock.request.mockResolvedValue(false);

    const result = await PermissionManager.requestPermission();

    expect(downloadLoggerMock.logError).toHaveBeenCalledWith(
      "permission_denied",
      expect.any(String),
    );
    expect(result.userResponse).toBe("denied");
  });

  it("captures errors from Chrome permissions API", async () => {
    permissionsMock.contains.mockResolvedValue(false);
    permissionsMock.request.mockRejectedValue(new Error("boom"));

    const result = await PermissionManager.requestPermission();

    expect(downloadLoggerMock.logError).toHaveBeenCalledWith(
      "permission_request_error",
      expect.stringContaining("boom"),
    );
    expect(storageSet).toHaveBeenCalledWith({ permissionPending: false });
    expect(result.userResponse).toBe("error");
  });
});

describe("PermissionManager auxiliaries", () => {
  it("resets permission state and logs success", async () => {
    await PermissionManager.resetPermissionState();

    expect(storageSet).toHaveBeenCalledWith({ permissionPending: false });
    expect(downloadLoggerMock.logSuccess).toHaveBeenCalledWith(
      "permission_reset",
      expect.any(String),
    );
  });

  it("surfaces setPermissionPendingFlag errors", async () => {
    storageSet.mockRejectedValueOnce(new Error("write-failure"));

    await expect((PermissionManager as any).setPermissionPendingFlag(true)).rejects.toThrow("write-failure");
  });

  it("provides current permission state", async () => {
    permissionsMock.contains.mockResolvedValue(true);
    storageGet.mockResolvedValue({ permissionPending: true });

    const result = await PermissionManager.getCurrentState();

    expect(result).toEqual({ hasPermission: true, isPending: true });
  });

  it("falls back to safe defaults when state retrieval fails", async () => {
    permissionsMock.contains.mockRejectedValue(new Error("fail"));

    const result = await PermissionManager.getCurrentState();
    expect(result).toEqual({ hasPermission: false, isPending: false });
  });

  it("derives next action for each state combination", () => {
    expect((PermissionManager as any).determineNextAction(true, false).nextAction).toBe("proceed");
    expect((PermissionManager as any).determineNextAction(false, true).nextAction).toBe("request");
    expect((PermissionManager as any).determineNextAction(false, false).nextAction).toBe("request");
  });
});
