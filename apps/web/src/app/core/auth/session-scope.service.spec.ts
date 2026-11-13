import { THEME_STORAGE_KEY } from '../theme/models/theme-storage-key.const';
import { EMOJI_RECENT_STORAGE_KEY } from './models/emoji-recent-storage-key.const';
import { TestBed } from '@angular/core/testing';
import { SessionScope } from './session-scope.service';

describe('SessionScope', () => {
  it('runs every registered handler on end, again on each end', () => {
    const scope = TestBed.inject(SessionScope);
    const a = vi.fn();
    const b = vi.fn();
    scope.onEnd(a);
    scope.onEnd(b);

    scope.end();
    scope.end();

    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('keeps going when a handler throws', () => {
    const scope = TestBed.inject(SessionScope);
    const after = vi.fn();
    scope.onEnd(() => {
      throw new Error('boom');
    });
    scope.onEnd(after);

    expect(() => scope.end()).not.toThrow();
    expect(after).toHaveBeenCalled();
  });

  it('stops calling a handler that was removed', () => {
    const scope = TestBed.inject(SessionScope);
    const handler = vi.fn();

    scope.onEnd(handler)();
    scope.end();

    expect(handler).not.toHaveBeenCalled();
  });

  it('runs every flusher on flush and waits for all of them', async () => {
    const scope = TestBed.inject(SessionScope);
    let done = false;
    const slow = vi.fn(async () => {
      await Promise.resolve();
      done = true;
    });
    const quick = vi.fn(() => Promise.resolve());
    scope.beforeEnd(slow);
    scope.beforeEnd(quick);

    await scope.flush();

    expect(quick).toHaveBeenCalledTimes(1);
    expect(done).toBe(true);
  });

  it('rejects a flush when a flusher fails and skips a removed flusher', async () => {
    const scope = TestBed.inject(SessionScope);
    const removed = vi.fn(() => Promise.resolve());
    scope.beforeEnd(removed)();
    scope.beforeEnd(() => Promise.reject(new Error('boom')));

    await expect(scope.flush()).rejects.toThrow('boom');
    expect(removed).not.toHaveBeenCalled();
  });

  it('removes the per-user keys from localStorage on end, even with blocked storage (#363)', () => {
    localStorage.setItem(EMOJI_RECENT_STORAGE_KEY, '["🍕"]');
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const scope = TestBed.inject(SessionScope);
    scope.end();
    expect(localStorage.getItem(EMOJI_RECENT_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => scope.end()).not.toThrow();
    vi.restoreAllMocks();
    localStorage.clear();
  });
});
