import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { SignInDriftComponent } from './sign-in-drift.component';

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader })],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const fixture = TestBed.createComponent(SignInDriftComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('SignInDriftComponent', () => {
  it('is decorative: hidden from assistive technology with nothing focusable', async () => {
    const root = await setup();

    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
  });

  it('renders the four translated example links, each with a landing ring', async () => {
    const root = await setup();
    const text = root.textContent ?? '';

    expect(root.querySelectorAll('.sd-card')).toHaveLength(4);
    expect(root.querySelectorAll('.sd-ring')).toHaveLength(4);
    expect(text).toContain('youtube.com');
    expect(text).toContain('Signal Forms in 20 minutes');
    expect(text).toContain('NestJS for frontend developers');
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
