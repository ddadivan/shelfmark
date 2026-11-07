import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../core/i18n/transloco.config';
import PrivacyPage from './privacy.page';
import { PROJECT_ISSUES_URL } from './models/project-issues-url.const';

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
      'Cookies',
      "What we don't do",
      'Where it lives',
      'Demo mode',
      'Your control',
      'Contact',
    ]);
  });

  it('shows the last updated date and renders no raw translation keys', async () => {
    const element = await render();

    expect(element.textContent).toContain('Last updated 7 November 2026');
    expect(element.textContent).not.toMatch(/privacy\.[a-z]+/);
  });

  it('links home and to the project issues', async () => {
    const element = await render();

    expect(element.querySelector('a[aria-label="Shelfmark home"]')?.getAttribute('href')).toBe('/');
    expect(element.querySelector(`a[href="${PROJECT_ISSUES_URL}"]`)?.getAttribute('rel')).toBe(
      'noopener noreferrer',
    );
  });

  it('has no axe violations', async () => {
    const element = await render();
    document.body.append(element);
    const results = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } });
    element.remove();

    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
