import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../core/i18n/transloco.config';
import PrivacyPage from './privacy.page';
import { PRIVACY_LINKS } from './models/privacy-links.const';

async function render(): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [PrivacyPage],
    providers: [
      provideRouter([]),
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
    ],
  }).compileComponents();
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const fixture = TestBed.createComponent(PrivacyPage);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('PrivacyPage', () => {
  it('has one h1 followed by the section headings in order', async () => {
    const element = await render();

    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelector('h1')?.textContent).toBe('Privacy policy');
    const headings = [...element.querySelectorAll('h2')].map((h) => h.textContent);
    expect(headings).toEqual([
      'What we store',
      'Cookies and browser storage',
      "What we don't do",
      'Link previews',
      'Other services',
      'Where it lives',
      'How long we keep it',
      'Your control',
      'Security',
      'Children',
      'Changes to this policy',
      'Contact',
    ]);
  });

  it('shows the last updated date and renders no raw translation keys', async () => {
    const element = await render();

    expect(element.textContent).toContain('Last updated 13 November 2026');
    expect(element.textContent).not.toMatch(/\bprivacy\.[a-zA-Z.]+/);
  });

  it('says where the profile photo comes from and that the shelf numbers are not stored (#352)', async () => {
    const element = await render();

    expect(element.textContent).toContain('loaded directly from Google or GitHub');
    expect(element.textContent).toContain('No referrer is sent');
    expect(element.textContent).toContain('"Your shelf" numbers');
    expect(element.textContent).toContain('They are not stored and never shared.');
  });

  it('gives the repository as the contact and shows no email address', async () => {
    const element = await render();

    expect(element.textContent).toContain('open an issue in the GitHub repository');
    expect(element.textContent).not.toMatch(/\S+@\S+\.\S+/);
    expect(element.querySelector(`a[href="${PRIVACY_LINKS.Repository}"]`)).not.toBeNull();
  });

  it('links home and to the external pages', async () => {
    const element = await render();

    expect(element.querySelector('a[aria-label="Shelfmark, home"]')?.getAttribute('href')).toBe(
      '/',
    );
    for (const href of Object.values(PRIVACY_LINKS)) {
      expect(element.querySelector(`a[href="${href}"]`)?.getAttribute('rel')).toBe(
        'noopener noreferrer',
      );
    }
  });

  it('has no axe violations', async () => {
    const element = await render();
    document.body.append(element);
    const results = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } });
    element.remove();

    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
