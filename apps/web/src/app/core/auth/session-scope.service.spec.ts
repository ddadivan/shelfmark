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
});
