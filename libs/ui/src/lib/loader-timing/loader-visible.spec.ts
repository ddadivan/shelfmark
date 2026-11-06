import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loaderVisible } from './loader-visible';
import type { LoaderTimingOptions } from './models/loader-timing-options.interface';

function setup(options?: LoaderTimingOptions) {
  const busy = signal(false);
  const visible = loaderVisible(busy, { injector: TestBed.inject(Injector), ...options });
  const set = (value: boolean): void => {
    busy.set(value);
    TestBed.tick();
  };
  return { busy, visible, set };
}

describe('loaderVisible', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is hidden at rest', () => {
    const { visible } = setup();
    TestBed.tick();
    expect(visible()).toBe(false);
  });

  it('shows only after 300 ms of waiting', () => {
    const { visible, set } = setup();
    set(true);
    vi.advanceTimersByTime(299);
    expect(visible()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(visible()).toBe(true);
  });

  it('never shows for a response faster than 300 ms', () => {
    const { visible, set } = setup();
    set(true);
    vi.advanceTimersByTime(150);
    set(false);
    vi.advanceTimersByTime(1000);
    expect(visible()).toBe(false);
  });

  it('stays at least 400 ms once shown', () => {
    const { visible, set } = setup();
    set(true);
    vi.advanceTimersByTime(300);
    expect(visible()).toBe(true);
    vi.advanceTimersByTime(100);
    set(false);
    vi.advanceTimersByTime(299);
    expect(visible()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(visible()).toBe(false);
  });

  it('hides at once when the loader has been visible for longer than 400 ms', () => {
    const { visible, set } = setup();
    set(true);
    vi.advanceTimersByTime(300 + 600);
    set(false);
    vi.advanceTimersByTime(0);
    expect(visible()).toBe(false);
  });

  it('keeps the loader when busy restarts during the hold', () => {
    const { visible, set } = setup();
    set(true);
    vi.advanceTimersByTime(300);
    set(false);
    vi.advanceTimersByTime(100);
    set(true);
    vi.advanceTimersByTime(1000);
    expect(visible()).toBe(true);
    set(false);
    vi.advanceTimersByTime(0);
    expect(visible()).toBe(false);
  });

  it('takes custom delay and minimum time', () => {
    const { visible, set } = setup({ delay: 50, minVisible: 100 });
    set(true);
    vi.advanceTimersByTime(50);
    expect(visible()).toBe(true);
    set(false);
    vi.advanceTimersByTime(99);
    expect(visible()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(visible()).toBe(false);
  });

  it('clears its timers when the injector is destroyed', () => {
    const { visible, set } = setup();
    set(true);
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(1000);
    expect(visible()).toBe(false);
  });
});
