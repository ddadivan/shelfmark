import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootAwareLoader } from './boot-aware-loader';
import { BootHandover } from './boot-handover.service';

@Component({ selector: 'app-probe', template: '' })
class ProbeComponent {
  readonly busy = signal(true);
  readonly visible = bootAwareLoader(this.busy);
}

describe('BootHandover', () => {
  let skeleton: HTMLElement | undefined;

  const setUp = (withSkeleton: boolean): Router => {
    if (withSkeleton) {
      skeleton = document.createElement('div');
      skeleton.setAttribute('data-app-skeleton', '');
      document.body.append(skeleton);
    }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'demo', children: [] },
          { path: 'one', children: [] },
          { path: 'two', children: [] },
        ]),
      ],
    });
    return TestBed.inject(Router);
  };

  afterEach(() => skeleton?.remove());

  describe('with the app skeleton up at start', () => {
    let router: Router;
    beforeEach(() => {
      router = setUp(true);
    });

    it('is active until the first navigation away from the landing page', async () => {
      const handover = TestBed.inject(BootHandover);
      expect(handover.active()).toBe(true);
      await router.navigateByUrl('/one');
      expect(handover.active()).toBe(true);
      await router.navigateByUrl('/two');
      expect(handover.active()).toBe(false);
    });

    it('does not count the demo start, which only forwards', async () => {
      const handover = TestBed.inject(BootHandover);
      await router.navigateByUrl('/demo');
      await router.navigateByUrl('/one');
      expect(handover.active()).toBe(true);
      await router.navigateByUrl('/two');
      expect(handover.active()).toBe(false);
    });

    it('shows the loader at once while active, and keeps the delay afterwards', async () => {
      const fixture = TestBed.createComponent(ProbeComponent);
      await router.navigateByUrl('/one');
      TestBed.tick();
      expect(fixture.componentInstance.visible()).toBe(true);
      await router.navigateByUrl('/two');
      expect(fixture.componentInstance.visible()).toBe(false);
    });
  });

  it('is never active without the app skeleton', async () => {
    const router = setUp(false);
    const handover = TestBed.inject(BootHandover);
    await router.navigateByUrl('/one');
    expect(handover.active()).toBe(false);
    const fixture = TestBed.createComponent(ProbeComponent);
    expect(fixture.componentInstance.visible()).toBe(false);
  });
});
