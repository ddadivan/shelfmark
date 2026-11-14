import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { setTabState, stubReducedMotion } from '../../../../testing/mock-intersection-observer';
import { LandingMotionService } from './landing-motion.service';

describe('LandingMotionService', () => {
  beforeEach(() => stubReducedMotion(false));

  afterEach(() => {
    setTabState(true);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('follows the tab visibility', () => {
    const service = TestBed.inject(LandingMotionService);

    setTabState(false);
    expect(service.tabVisible()).toBe(false);
    setTabState(true);
    expect(service.tabVisible()).toBe(true);
  });

  it('removes its listeners when the injector is destroyed (the page is left)', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    TestBed.inject(LandingMotionService);

    TestBed.resetTestingModule();

    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
