import { runWhenIdle } from './run-when-idle';

describe('runWhenIdle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('uses requestIdleCallback when available', () => {
    const idle = vi.fn((task: () => void) => task());
    vi.stubGlobal('requestIdleCallback', idle);
    const task = vi.fn();
    runWhenIdle(task);
    expect(idle).toHaveBeenCalledOnce();
    expect(task).toHaveBeenCalledOnce();
  });

  it('falls back to a timer', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    const task = vi.fn();
    runWhenIdle(task);
    expect(task).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(task).toHaveBeenCalledOnce();
  });
});
