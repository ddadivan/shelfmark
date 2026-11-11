import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { ViewportService } from '../../../core/layout/viewport.service';
import { SignInDriftComponent } from './sign-in-drift.component';

async function setup(wide = true) {
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: ViewportService, useValue: { wideDesktop: signal(wide) } },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const fixture = TestBed.createComponent(SignInDriftComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('SignInDriftComponent', () => {
  it('is decorative: hidden from assistive technology and inert, nothing in it can take focus', async () => {
    const root = await setup();

    expect(root.getAttribute('aria-hidden')).toBe('true');
    // The library card has a title button of its own: `inert` on the root takes it out of the
    // tab order and of the accessibility tree, so no focusable element is reachable.
    expect(root.hasAttribute('inert')).toBe(true);
    for (const control of root.querySelectorAll('button, a, input, [tabindex]')) {
      expect(control.closest('[inert]'), control.outerHTML).not.toBeNull();
    }
    expect(root.querySelectorAll('a[href]')).toHaveLength(0);
  });

  it('draws ten library cards in two lanes and depth layers on a wide desktop, each with a landing ring', async () => {
    const root = await setup(true);
    const text = root.textContent ?? '';

    expect(root.querySelectorAll('.sd-card')).toHaveLength(10);
    expect(root.querySelectorAll('.sd-lane--start .sd-card')).toHaveLength(5);
    expect(root.querySelectorAll('.sd-lane--end .sd-card')).toHaveLength(5);
    expect(root.querySelectorAll('.sd-ring')).toHaveLength(10);
    expect(root.querySelectorAll('ui-card .ui-card__placeholder')).toHaveLength(10);
    expect(root.querySelectorAll('ui-card .ui-card__date').length).toBe(10);
    expect(root.querySelectorAll('ui-chip').length).toBeGreaterThanOrEqual(10);
    for (const layer of ['far', 'mid', 'near']) {
      expect(root.querySelectorAll(`.sd-card--${layer}`).length).toBeGreaterThan(0);
    }
    expect(text).toContain('youtube.com');
    expect(text).toContain('Signal Forms in 20 minutes');
    expect(text).toContain('NestJS for frontend developers');
  });

  it('draws six cards, three a side in one column, on a narrower desktop', async () => {
    const root = await setup(false);

    expect(root.querySelectorAll('.sd-card')).toHaveLength(6);
    expect(root.querySelectorAll('.sd-lane--start .sd-card')).toHaveLength(3);
    expect(root.querySelectorAll('.sd-lane--end .sd-card')).toHaveLength(3);
    expect(root.querySelectorAll('.sd-lane--narrow')).toHaveLength(2);
  });

  it('has no axe violations', async () => {
    const root = await setup();
    const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe('SignInDriftComponent pointer tilt', () => {
  const realMatchMedia = window.matchMedia;

  function stubMedia(matching: (query: string) => boolean) {
    const listeners: (() => void)[] = [];
    window.matchMedia = ((query: string) => ({
      matches: matching(query),
      media: query,
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
    return listeners;
  }

  afterEach(() => {
    window.matchMedia = realMatchMedia;
    vi.restoreAllMocks();
  });

  async function pointerSetup(matching: (query: string) => boolean) {
    stubMedia(matching);
    const add = vi.spyOn(document, 'addEventListener');
    const root = await setup();
    await new Promise((resolve) => setTimeout(resolve));
    return { root, add };
  }

  const hasMove = (add: { mock: { calls: unknown[][] } }) =>
    add.mock.calls.some(([type]) => type === 'pointermove');

  it('leans the cards toward the pointer with a mouse, once per frame', async () => {
    const { root, add } = await pointerSetup((q) => q.includes('hover'));

    expect(hasMove(add)).toBe(true);
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 5000, clientY: 0 }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const tilt = root.querySelector<HTMLElement>('.sd-tilt');

    expect(tilt?.style.getPropertyValue('--tx')).toBe('1.000');
  });

  it('adds no listener on touch or under reduced motion', async () => {
    const touch = await pointerSetup(() => false);
    expect(hasMove(touch.add)).toBe(false);
    TestBed.resetTestingModule();

    const reduced = await pointerSetup(() => true);
    expect(hasMove(reduced.add)).toBe(false);
  });

  it('removes the listener on destroy', async () => {
    stubMedia((q) => q.includes('hover'));
    const remove = vi.spyOn(document, 'removeEventListener');
    await setup();
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.resetTestingModule();

    expect(remove.mock.calls.some(([type]) => type === 'pointermove')).toBe(true);
  });
});
