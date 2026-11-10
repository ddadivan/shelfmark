import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { axeViolations } from '../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { SettingsNavComponent } from './settings-nav.component';

async function setup(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'links', children: [] },
        { path: 'settings/:section', component: SettingsNavComponent },
      ]),
      provideTranslocoForTest(),
    ],
  });
  await loadEnglish();
  const harness = await RouterTestingHarness.create(url);
  return { harness, root: harness.routeNativeElement as HTMLElement };
}

describe('SettingsNavComponent', () => {
  it('has a row for each section that exists, in the settings nav', async () => {
    const { root } = await setup('/settings/account');
    const rows = Array.from(root.querySelectorAll('nav a.settings-nav__row'));

    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Settings');
    expect(rows.map((row) => row.textContent?.trim())).toEqual([
      'Account',
      'Appearance',
      'Export',
      'Privacy and data',
    ]);
    expect(rows.map((row) => row.getAttribute('href'))).toEqual([
      '/settings/account',
      '/settings/appearance',
      '/settings/import-export',
      '/settings/privacy',
    ]);
  });

  it('marks the open page', async () => {
    const { root } = await setup('/settings/appearance');
    const current = root.querySelectorAll('[aria-current="page"]');

    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toContain('Appearance');
  });

  it('goes back to the links', async () => {
    const { root, harness } = await setup('/settings/account');

    root.querySelector<HTMLElement>('a[href="/links"]')?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/links');
  });

  it('shows the version and has no axe violations', async () => {
    const { root } = await setup('/settings/account');

    expect(root.textContent).toContain('Shelfmark v1.0');
    expect(await axeViolations(root)).toEqual([]);
  });
});
