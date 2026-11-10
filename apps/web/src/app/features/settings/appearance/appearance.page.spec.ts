import { axeViolations } from '../../../../testing/axe';
import { THEME_PREFERENCE } from '../../../core/theme/models/theme-preference.const';
import { THEME_STORAGE_KEY } from '../../../core/theme/models/theme-storage-key.const';
import { setupSettingsPage } from '../../../../testing/settings-page-testbed';
import AppearancePage from './appearance.page';

function radio(root: HTMLElement, label: string): HTMLInputElement {
  const found = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
    (input) => input.closest('label')?.textContent?.includes(label),
  );
  if (!found) {
    throw new Error(`No radio "${label}"`);
  }
  return found;
}

const setup = () => setupSettingsPage(AppearancePage, 'appearance');

describe('AppearancePage', () => {
  afterEach(() => localStorage.removeItem(THEME_STORAGE_KEY));

  it('shows the theme and the language, and nothing that does not exist yet', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('Appearance');
    expect(root.textContent).toContain('More languages are coming');
    expect(root.textContent).toContain('English');
    expect(root.textContent).not.toMatch(/custom|folder colou?rs/i);
  });

  it('applies and persists the theme choice, and shows the current one', async () => {
    const { root, theme, harness } = await setup();

    expect(radio(root, 'System').checked).toBe(true);

    radio(root, 'Dark').click();
    await harness.fixture.whenStable();

    expect(theme.preference()).toBe(THEME_PREFERENCE.Dark);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(THEME_PREFERENCE.Dark);
    expect(radio(root, 'Dark').checked).toBe(true);
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
