import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { axeViolations } from '../../../../../testing/axe';
import {
  MockIntersectionObserver,
  stubReducedMotion,
} from '../../../../../testing/mock-intersection-observer';
import { LandingHeroPreviewComponent } from './landing-hero-preview.component';

const titleOf = (root: HTMLElement) => root.querySelector('.preview__title')?.textContent?.trim();
const shown = (root: HTMLElement) =>
  Array.from(
    root.querySelectorAll('.preview__card:not(.preview__card--hidden) .preview__name'),
  ).map((name) => name.textContent?.trim());
const toastShown = (root: HTMLElement) =>
  root.querySelector('.preview__toast')?.classList.contains('preview__toast--shown');

describe('LandingHeroPreviewComponent', () => {
  beforeEach(() => stubReducedMotion(false));

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function create(reduced = false) {
    stubReducedMotion(reduced);
    MockIntersectionObserver.install();
    // The translations load with real timers; the component's own timers are then fake.
    await TestBed.configureTestingModule({
      imports: [LandingHeroPreviewComponent],
      providers: [provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader })],
    }).compileComponents();
    await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(LandingHeroPreviewComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const advance = (ms: number) => {
      vi.advanceTimersByTime(ms);
      fixture.detectChanges();
    };
    const see = () => {
      MockIntersectionObserver.triggerAll(true);
      fixture.detectChanges();
    };
    return { fixture, root, advance, see };
  }

  it('is one named picture of the app: sidebar, All links with its tabs, six cards and a toast', async () => {
    const { root } = await create();
    const picture = root.querySelector('.preview');

    expect(picture?.getAttribute('role')).toBe('img');
    expect(picture?.getAttribute('aria-label')).toContain('Saved to Watch later');
    expect(root.textContent).toContain('+ Add link');
    expect(titleOf(root)).toBe('All links');
    expect(root.querySelectorAll('.preview__tab')).toHaveLength(3);
    expect(shown(root)).toHaveLength(6);
    expect(root.querySelector('.preview__toast')?.textContent).toContain('Undo');
    expect(root.querySelector('a[href], button')).toBeNull();
    for (const image of Array.from(root.querySelectorAll('img'))) {
      expect(image.getAttribute('src')).toMatch(/^\/media\/landing\/.+\.webp$/);
      expect(image.getAttribute('alt')).toBe('');
    }
  });

  it('slides the toast in after the cards landed', async () => {
    const { root, advance } = await create();
    expect(toastShown(root)).toBe(false);

    advance(1500);
    expect(toastShown(root)).toBe(true);
  });

  it('cycles All, Videos, Shopping, Favorites and Watch later every 3.6 s while in view', async () => {
    const { root, advance, see } = await create();
    see();
    advance(1500);
    expect(toastShown(root)).toBe(true);

    // The frame changes after the 260 ms fade (jsdom has no View Transitions).
    advance(2100 + 260);
    expect(titleOf(root)).toBe('All links');
    expect(shown(root)).toEqual([
      'Optimistic Nihilism',
      'Angular in 100 Seconds',
      'But what is a neural network?',
    ]);
    expect(toastShown(root)).toBe(false);

    advance(3600);
    expect(titleOf(root)).toBe('Shopping');
    expect(shown(root)).toEqual(['Tree Runners', 'The Ojai Jacket']);
    expect(root.querySelector('.preview__tabs--off')).not.toBeNull();

    advance(3600);
    expect(titleOf(root)).toBe('Favorites');
    advance(3600);
    expect(titleOf(root)).toBe('Watch later');
    expect(shown(root)).toEqual(['Optimistic Nihilism']);

    advance(3600 + 700);
    expect(titleOf(root)).toBe('All links');
    expect(shown(root)).toHaveLength(6);
    expect(toastShown(root)).toBe(true);
  });

  it('pauses while out of view and while the tab is hidden', async () => {
    const { root, advance, see } = await create();
    advance(20_000);
    expect(titleOf(root)).toBe('All links');
    expect(shown(root)).toHaveLength(6);

    see();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    advance(0);
    advance(20_000);
    expect(shown(root)).toHaveLength(6);

    visibility.mockRestore();
    document.dispatchEvent(new Event('visibilitychange'));
  });

  it('picks the frame of a clicked row or tab and resumes the cycle 6 s later', async () => {
    const { root, advance, see } = await create();
    see();
    const rows = Array.from(root.querySelectorAll<HTMLElement>('.preview__row'));
    rows.find((row) => row.textContent?.includes('Favorites'))?.click();
    advance(260);

    expect(titleOf(root)).toBe('Favorites');
    advance(5000);
    expect(titleOf(root)).toBe('Favorites');

    // Resumed at 6 s; the next frame is one step (and the fade) later.
    advance(1000);
    advance(3600 + 260);
    expect(titleOf(root)).toBe('Watch later');

    root.querySelectorAll<HTMLElement>('.preview__tab')[1]?.click();
    advance(260);
    expect(titleOf(root)).toBe('All links');
    expect(shown(root)).toHaveLength(3);
  });

  it('stands still on All links with its toast under reduced motion', async () => {
    const { root, advance, see } = await create(true);
    see();

    expect(toastShown(root)).toBe(true);
    root.querySelectorAll<HTMLElement>('.preview__tab')[1]?.click();
    advance(20_000);
    expect(shown(root)).toHaveLength(6);
  });

  it('has no axe violations', async () => {
    const { fixture } = await create();
    vi.useRealTimers();

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
