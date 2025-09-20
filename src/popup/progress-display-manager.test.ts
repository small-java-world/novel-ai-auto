import { describe, it, expect, beforeEach, vi } from 'vitest';

interface DomMock {
  updateProgressBar: ReturnType<typeof vi.fn>;
  updateRemainingCount: ReturnType<typeof vi.fn>;
  updateEtaDisplay: ReturnType<typeof vi.fn>;
  updateStatusText: ReturnType<typeof vi.fn>;
  setProgressBarComplete: ReturnType<typeof vi.fn>;
  hideCancelButton: ReturnType<typeof vi.fn>;
  displayTotalTime: ReturnType<typeof vi.fn>;
  disableCancelButton: ReturnType<typeof vi.fn>;
  showReconnectButton: ReturnType<typeof vi.fn>;
  setupCancelButton: (cb: () => void) => void;
  cancelHandler?: () => void;
}

interface StateMock {
  validateMessage: ReturnType<typeof vi.fn>;
  updateLastMessageTime: ReturnType<typeof vi.fn>;
  isCommunicationTimedOut: ReturnType<typeof vi.fn>;
  shouldIgnoreCompletionMessage: ReturnType<typeof vi.fn>;
  getStatusText: ReturnType<typeof vi.fn>;
  setCurrentJobId: ReturnType<typeof vi.fn>;
  setStartTime: ReturnType<typeof vi.fn>;
  getCurrentJobId: ReturnType<typeof vi.fn>;
  getStartTime: ReturnType<typeof vi.fn>;
  setCancelledState: ReturnType<typeof vi.fn>;
  isCancelledState: ReturnType<typeof vi.fn>;
  setTimeoutCallback: ReturnType<typeof vi.fn>;
  behavior: {
    validateMessage: boolean;
    timedOut: boolean;
    ignoreCompleted: boolean;
    cancelled: boolean;
    statusText: string;
    currentJobId: string;
    startTime: number;
    timeoutCallback?: () => void;
  };
}

interface LogMock {
  addLogEntries: ReturnType<typeof vi.fn>;
}

interface KeyboardMock {
  updateElementAccessibility: ReturnType<typeof vi.fn>;
  focusElement: ReturnType<typeof vi.fn>;
}

const domInstances: DomMock[] = [];
const stateInstances: StateMock[] = [];
const logInstances: LogMock[] = [];
const keyboardInstances: KeyboardMock[] = [];

vi.mock('./progress-dom-manager', () => ({
  ProgressDomManager: vi.fn(() => {
    const instance: DomMock = {
      updateProgressBar: vi.fn(),
      updateRemainingCount: vi.fn(),
      updateEtaDisplay: vi.fn(),
      updateStatusText: vi.fn(),
      setProgressBarComplete: vi.fn(),
      hideCancelButton: vi.fn(),
      displayTotalTime: vi.fn(),
      disableCancelButton: vi.fn(),
      showReconnectButton: vi.fn(),
      setupCancelButton(cb: () => void) {
        instance.cancelHandler = cb;
      },
    };
    domInstances.push(instance);
    return instance;
  }),
}));

vi.mock('./progress-state-manager', () => ({
  ProgressStateManager: vi.fn(() => {
    const behavior = {
      validateMessage: true,
      timedOut: false,
      ignoreCompleted: false,
      cancelled: false,
      statusText: '進捗中',
      currentJobId: 'job-0',
      startTime: 0,
      timeoutCallback: undefined as (() => void) | undefined,
    };

    const instance: StateMock = {
      behavior,
      validateMessage: vi.fn(() => behavior.validateMessage),
      updateLastMessageTime: vi.fn(),
      isCommunicationTimedOut: vi.fn(() => behavior.timedOut),
      shouldIgnoreCompletionMessage: vi.fn((status: string) => behavior.ignoreCompleted && status === 'completed'),
      getStatusText: vi.fn(() => behavior.statusText),
      setCurrentJobId: vi.fn((id: string) => {
        behavior.currentJobId = id;
      }),
      setStartTime: vi.fn((time: number) => {
        behavior.startTime = time;
      }),
      getCurrentJobId: vi.fn(() => behavior.currentJobId),
      getStartTime: vi.fn(() => behavior.startTime),
      setCancelledState: vi.fn(() => {
        behavior.cancelled = true;
      }),
      isCancelledState: vi.fn(() => behavior.cancelled),
      setTimeoutCallback: vi.fn((cb: () => void) => {
        behavior.timeoutCallback = cb;
      }),
    };
    stateInstances.push(instance);
    return instance;
  }),
}));

vi.mock('./progress-log-manager', () => ({
  ProgressLogManager: vi.fn(() => {
    const instance: LogMock = {
      addLogEntries: vi.fn(),
    };
    logInstances.push(instance);
    return instance;
  }),
}));

vi.mock('./keyboard-navigation', () => ({
  KeyboardNavigationManager: vi.fn(() => {
    const instance: KeyboardMock = {
      updateElementAccessibility: vi.fn(),
      focusElement: vi.fn(),
    };
    keyboardInstances.push(instance);
    return instance;
  }),
}));

import { ProgressDisplayManager } from './progress-display-manager';

const createManager = () => {
  const manager = new ProgressDisplayManager();
  const dom = domInstances.at(-1)!;
  const state = stateInstances.at(-1)!;
  const log = logInstances.at(-1)!;
  const keyboard = keyboardInstances.at(-1)!;
  return { manager, dom, state, log, keyboard };
};

describe('ProgressDisplayManager', () => {
  beforeEach(() => {
    domInstances.length = 0;
    stateInstances.length = 0;
    logInstances.length = 0;
    keyboardInstances.length = 0;
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="status-text"></div>';
  });

  it('falls back when progress message is invalid', () => {
    const { manager, dom, state } = createManager();
    state.behavior.validateMessage = false;

    manager.updateProgress({ type: 'PROGRESS_UPDATE' } as any);

    expect(dom.updateStatusText).toHaveBeenCalledWith(expect.any(String));
    expect(dom.updateProgressBar).not.toHaveBeenCalled();
  });

  it('shows reconnect prompt when communication times out', () => {
    const { manager, dom, state } = createManager();
    state.behavior.validateMessage = true;
    state.behavior.timedOut = true;

    manager.updateProgress({ type: 'PROGRESS_UPDATE', status: 'waiting' } as any);

    expect(dom.showReconnectButton).toHaveBeenCalledTimes(1);
    expect(dom.updateStatusText).toHaveBeenCalled();
  });

  it('ignores completion when state is cancelled', () => {
    const { manager, dom, state } = createManager();
    state.behavior.validateMessage = true;
    state.behavior.ignoreCompleted = true;
    state.behavior.cancelled = true;

    manager.updateProgress({ type: 'PROGRESS_UPDATE', status: 'completed' } as any);

    expect(dom.setProgressBarComplete).not.toHaveBeenCalled();
    expect(dom.hideCancelButton).not.toHaveBeenCalled();
  });

  it('updates UI when progress completes successfully', () => {
    const { manager, dom, state, keyboard } = createManager();
    state.behavior.validateMessage = true;
    state.behavior.statusText = '完了状態';
    state.behavior.startTime = 1234;

    manager.updateProgress({
      type: 'PROGRESS_UPDATE',
      status: 'completed',
      currentIndex: 5,
      totalCount: 5,
      eta: 0,
    });

    expect(dom.updateProgressBar).toHaveBeenCalledWith(5, 5);
    expect(dom.setProgressBarComplete).toHaveBeenCalled();
    expect(dom.displayTotalTime).toHaveBeenCalledWith(1234);
    expect(keyboard.focusElement).toHaveBeenCalledWith('generateButton');
  });

  it('passes through state setters and log calls', () => {
    const { manager, state, log } = createManager();

    manager.setCurrentJobId('job-42');
    manager.setStartTime(999);
    manager.addLogEntries([] as any);

    expect(state.setCurrentJobId).toHaveBeenCalledWith('job-42');
    expect(state.setStartTime).toHaveBeenCalledWith(999);
    expect(log.addLogEntries).toHaveBeenCalled();
  });

  it('invokes cancel flow when button callback fires', () => {
    const { state, dom } = createManager();
    state.behavior.validateMessage = true;
    state.behavior.currentJobId = 'job-cancel';
    state.behavior.cancelled = false;

    dom.cancelHandler?.();

    expect(state.setCancelledState).toHaveBeenCalled();
    expect(dom.updateStatusText).toHaveBeenCalledWith(expect.stringContaining('キャンセル'));
    expect(dom.disableCancelButton).toHaveBeenCalled();
    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'CANCEL_JOB',
      jobId: 'job-cancel',
      reason: 'user_requested',
    });
  });

  it('skips cancel flow when already cancelled', () => {
    const { state, dom } = createManager();
    state.behavior.cancelled = true;

    dom.cancelHandler?.();

    expect(state.setCancelledState).not.toHaveBeenCalled();
  });

  it('applies timeout callback wiring from state manager', () => {
    const { state, dom } = createManager();
    expect(state.behavior.timeoutCallback).toBeDefined();

    state.behavior.timeoutCallback?.();

    expect(dom.updateStatusText).toHaveBeenCalled();
    expect(dom.showReconnectButton).toHaveBeenCalled();
  });
});
