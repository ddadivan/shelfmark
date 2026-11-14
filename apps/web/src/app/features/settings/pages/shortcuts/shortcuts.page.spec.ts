import { UI_STORAGE_KEY } from '../../../../stores/models/ui-storage-key.const';
import { UiStore } from '../../../../stores/ui.store';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../../../testing/axe';
import { SHORTCUT_GROUPS } from '../../../shortcuts/models/shortcut-groups.const';
import { setupSettingsPage } from '../../../../../testing/settings-page-testbed';
import ShortcutsPage from './shortcuts.page';

describe('ShortcutsPage', () => {
  beforeEach(() => localStorage.removeItem(UI_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(UI_STORAGE_KEY));

  it('opens the dialog from the "Open list" row', async () => {
    const { root } = await setupSettingsPage(ShortcutsPage, 'shortcuts');
    const open = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Open list'),
    );

    open?.click();
    await vi.waitFor(() => {
      expect(document.querySelector('.cdk-dialog-container h2')?.textContent).toContain(
        'Keyboard shortcuts',
      );
    });
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => e.replaceChildren());
  });

  it('lists every group of the shared shortcut list', async () => {
    const { root } = await setupSettingsPage(ShortcutsPage, 'shortcuts');
    const headings = Array.from(root.querySelectorAll('h2')).map((h) => h.textContent?.trim());

    expect(root.querySelector('h1')?.textContent).toContain('Keyboard shortcuts');
    expect(headings).toEqual([
      'Keyboard shortcuts',
      'Everywhere',
      'Saving and finding',
      'Selecting links',
      'In the folder list',
    ]);
    const count = SHORTCUT_GROUPS.reduce((sum, group) => sum + group.shortcuts.length, 0);
    expect(root.querySelectorAll('li')).toHaveLength(count);
    expect(root.querySelectorAll('kbd').length).toBeGreaterThan(count);
  });

  it('has a switch for single-key shortcuts, on by default, that applies at once', async () => {
    const { root } = await setupSettingsPage(ShortcutsPage, 'shortcuts');
    const toggle = root.querySelector<HTMLButtonElement>('button[role="switch"]');

    expect(toggle?.getAttribute('aria-label')).toBe('Use single-key shortcuts');
    expect(toggle?.getAttribute('aria-checked')).toBe('true');

    toggle?.click();
    await vi.waitFor(() => expect(toggle?.getAttribute('aria-checked')).toBe('false'));

    expect(TestBed.inject(UiStore).singleKeyShortcuts()).toBe(false);
    expect(JSON.parse(localStorage.getItem(UI_STORAGE_KEY) ?? '{}')).toMatchObject({
      singleKeyShortcuts: false,
    });
  });

  it('has no axe violations', async () => {
    const { root } = await setupSettingsPage(ShortcutsPage, 'shortcuts');

    expect(await axeViolations(root)).toEqual([]);
  });
});
