import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AUTH_API } from '../../../../core/auth/auth-api.token';
import { setActiveLang } from '../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { USER_SETTINGS_API } from '../../../settings/models/user-settings-api.const';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingFooterComponent } from './landing-footer.component';

describe('LandingFooterComponent', () => {
  const settingsApi = { get: vi.fn(), update: vi.fn(() => of({})) };

  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: USER_SETTINGS_API, useValue: settingsApi },
        { provide: AUTH_API, useValue: { getSession: () => Promise.resolve(null) } },
      ],
    }),
  );

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    setActiveLang('en');
    localStorage.clear();
  });

  it('offers every language in its own name, the active one pressed', async () => {
    const fixture = await createTranslated(LandingFooterComponent);
    const group = (fixture.nativeElement as HTMLElement).querySelector('[role="group"]');
    const buttons = Array.from(group?.querySelectorAll('button') ?? []);

    expect(group?.getAttribute('aria-label')).toBe('Language');
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      'English',
      'Français',
      'Deutsch',
      'Italiano',
      'Español',
      'Português',
    ]);
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(buttons[2]?.closest('[lang]')?.getAttribute('lang')).toBe('de');
  });

  it('keeps a guest choice in this browser only', async () => {
    const fixture = await createTranslated(LandingFooterComponent);
    const german = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent?.trim() === 'Deutsch');

    german?.click();

    expect(TestBed.inject(LocaleService).settings().language).toBe('de');
    expect(settingsApi.update).not.toHaveBeenCalled();
  });

  it('renders the copyright and an external GitHub link', async () => {
    const fixture = await createTranslated(LandingFooterComponent);
    const root = fixture.nativeElement as HTMLElement;
    const link = root.querySelector<HTMLAnchorElement>('a[target="_blank"]');

    expect(root.querySelector('footer')?.textContent).toContain('© 2026 Shelfmark');
    expect(link?.getAttribute('href')).toBe('https://github.com/ddadivan/shelfmark');
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toContain('noopener');
  });

  it('links to the privacy policy inside the app', async () => {
    const fixture = await createTranslated(LandingFooterComponent);
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/privacy"]');

    expect(link?.textContent?.trim()).toBe('Privacy');
    expect(link?.getAttribute('target')).toBeNull();
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingFooterComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
