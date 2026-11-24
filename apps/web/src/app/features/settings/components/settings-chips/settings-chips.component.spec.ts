import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { axeViolations } from '../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { SettingsChipsComponent } from './settings-chips.component';

async function setup(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'settings/:section', component: SettingsChipsComponent }]),
      provideTranslocoForTest(),
    ],
  });
  await loadEnglish();
  const harness = await RouterTestingHarness.create(url);
  return { harness, root: harness.routeNativeElement as HTMLElement };
}

describe('SettingsChipsComponent', () => {
  it('lists the sections with the short labels and marks the open one', async () => {
    const { root } = await setup('/settings/language');
    const chips = Array.from(root.querySelectorAll('nav a'));

    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Settings');
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual([
      'Account',
      'Appearance',
      'Library',
      'Notifications',
      'AI',
      'Language',
      'Your data',
      'Shortcuts',
      'Your feedback',
    ]);
    const current = chips.filter((chip) => chip.getAttribute('aria-current') === 'page');
    expect(current.map((chip) => chip.getAttribute('href'))).toEqual(['/settings/language']);
  });

  it('has no axe violations', async () => {
    const { root } = await setup('/settings/account');
    expect(await axeViolations(root)).toEqual([]);
  });
});
