import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressLogManager } from './progress-log-manager';
import type { LogEntry } from '../types';

describe('ProgressLogManager', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="log-container"></div>';
  });

  it('initializes when container exists', () => {
    const manager = new ProgressLogManager();
    expect(manager.isInitialized()).toBe(true);
  });

  it('appends log entries in descending timestamp order', () => {
    const manager = new ProgressLogManager();
    const entries: LogEntry[] = [
      { id: '1', timestamp: 10, type: 'info', message: 'older' },
      { id: '2', timestamp: 20, type: 'warning', message: 'newer' },
    ];

    manager.addLogEntries(entries);

    const container = document.getElementById('log-container')!;
    expect(container.children).toHaveLength(2);
    expect(container.firstElementChild?.textContent).toBe('newer');
    expect(container.lastElementChild?.textContent).toBe('older');
  });

  it('enforces a maximum of five log entries', () => {
    const manager = new ProgressLogManager();
    const entries: LogEntry[] = Array.from({ length: 7 }, (_, index) => ({
      id: `${index}`,
      timestamp: index,
      type: 'info',
      message: `msg-${index}`,
    }));

    manager.addLogEntries(entries);

    const container = document.getElementById('log-container')!;
    expect(container.children).toHaveLength(5);
    expect(container.firstElementChild?.textContent).toBe('msg-6');
    expect(container.lastElementChild?.textContent).toBe('msg-2');
  });
});
