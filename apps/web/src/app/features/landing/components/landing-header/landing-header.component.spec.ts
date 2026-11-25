import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { THEME_PREFERENCE } from '@shelfmark/contracts';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ThemeService } from '../../../../core/theme/theme.service';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingHeaderComponent } from './landing-header.component';

const texts = (root: HTMLElement, selector: string) =>
  Array.from(root.querySelectorAll(selector)).map((node) => node.textContent?.trim());

describe('LandingHeaderComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('links to How it works, AI, What’s new, Help and Privacy, then Sign in and Start your shelf', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Page');
    expect(texts(root, 'nav a')).toEqual(['How it works', 'AI', 'What’s new', 'Help', 'Privacy']);
    expect(root.querySelector('nav a[href="#works"]')).not.toBeNull();
    expect(root.querySelector('nav a[href="#ai"]')).not.toBeNull();
    expect(root.querySelector('nav a[href="/changelog"]')).not.toBeNull();
    expect(root.querySelector('nav a[href="/help"]')).not.toBeNull();
    expect(root.querySelector('nav a[href="/privacy"]')).not.toBeNull();
    expect(texts(root, 'a[href="/sign-in"]')).toEqual(['Sign in', 'Start your shelf']);
    expect(root.querySelector('button[aria-label="Switch theme"]')).not.toBeNull();
  });

  it.each([
    ['#works', 'works'],
    ['#ai', 'ai'],
  ])('asks the page for %s instead of following the anchor', async (href, target) => {
    const fixture = await createTranslated(LandingHeaderComponent);
    const requested = vi.fn();
    fixture.componentInstance.sectionRequested.subscribe(requested);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    (fixture.nativeElement as HTMLElement).querySelector(`a[href="${href}"]`)?.dispatchEvent(click);

    expect(requested).toHaveBeenCalledWith(target);
    expect(click.defaultPrevented).toBe(true);
  });

  it.each([
    ['ctrl', { ctrlKey: true }],
    ['meta', { metaKey: true }],
    ['shift', { shiftKey: true }],
    ['middle button', { button: 1 }],
  ])('keeps the plain link for %s-click', async (_name, init) => {
    const fixture = await createTranslated(LandingHeaderComponent);
    const requested = vi.fn();
    fixture.componentInstance.sectionRequested.subscribe(requested);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });

    (fixture.nativeElement as HTMLElement).querySelector('a[href="#works"]')?.dispatchEvent(click);

    expect(requested).not.toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(false);
  });

  it('switches a guest’s theme in this browser only', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);
    const theme = TestBed.inject(ThemeService);
    const setPreference = vi.spyOn(theme, 'setPreference');
    const dark = theme.resolved() === 'dark';

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[aria-label="Switch theme"]')
      ?.click();

    expect(setPreference).toHaveBeenCalledWith(
      dark ? THEME_PREFERENCE.Light : THEME_PREFERENCE.Dark,
    );
  });

  it('offers only "Back to my shelf" to a signed-in person (/about) and saves the theme on the account', async () => {
    const setAppearance = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthStore,
          useValue: { user: signal({ id: 'u' }), isSignedIn: signal(true) },
        },
        { provide: UserSettingsStore, useValue: { setAppearance } },
      ],
    });
    const fixture = await createTranslated(LandingHeaderComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('a[href="/links"]')?.textContent).toContain('Back to my shelf');
    expect(root.querySelector('a[href="/sign-in"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('button[aria-label="Switch theme"]')?.click();
    expect(setAppearance).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
