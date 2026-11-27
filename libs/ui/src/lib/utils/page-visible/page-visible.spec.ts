import { DOCUMENT } from '@angular/common';
import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { pageVisible } from './page-visible';

describe('pageVisible', () => {
  it('follows visibilitychange and removes its listener on destroy', () => {
    const doc = TestBed.inject(DOCUMENT);
    let state: DocumentVisibilityState = 'visible';
    vi.spyOn(doc, 'visibilityState', 'get').mockImplementation(() => state);
    const remove = vi.spyOn(doc, 'removeEventListener');
    const visible = runInInjectionContext(TestBed.inject(Injector), () => pageVisible());
    expect(visible()).toBe(true);
    state = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(visible()).toBe(false);
    state = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(visible()).toBe(true);
    TestBed.resetTestingModule();
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('starts hidden when the page is hidden', () => {
    const doc = TestBed.inject(DOCUMENT);
    vi.spyOn(doc, 'visibilityState', 'get').mockReturnValue('hidden');
    expect(runInInjectionContext(TestBed.inject(Injector), () => pageVisible())()).toBe(false);
  });
});
