import { TestBed } from '@angular/core/testing';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { axeViolations } from '../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { SHORTCUT_GROUPS } from '../models/shortcut-groups.const';
import { ShortcutsDialogComponent } from './shortcuts-dialog.component';

async function open(): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
  await loadEnglish();
  void TestBed.inject(DialogService).open(ShortcutsDialogComponent, { size: DIALOG_SIZE.Md });
  await vi.waitFor(() => {
    TestBed.tick();
    expect(document.querySelector('.cdk-dialog-container li')).not.toBeNull();
  });
  return document.querySelector<HTMLElement>('.cdk-dialog-container') as HTMLElement;
}

describe('ShortcutsDialogComponent', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => e.replaceChildren());
  });

  it('names the dialog and lists every group with its shortcuts', async () => {
    const root = await open();
    const headings = Array.from(root.querySelectorAll('h3')).map((h) => h.textContent?.trim());

    expect(root.querySelector('h2')?.textContent).toContain('Keyboard shortcuts');
    expect(headings).toEqual(['Everywhere', 'Saving and finding', 'In the folder list']);
    const count = SHORTCUT_GROUPS.reduce((sum, group) => sum + group.shortcuts.length, 0);
    expect(root.querySelectorAll('li')).toHaveLength(count);
    expect(root.textContent).toContain('Press ? anywhere except in a text field.');
  });

  it('names each list by its group heading', async () => {
    const root = await open();

    for (const list of Array.from(root.querySelectorAll('ul'))) {
      const id = list.getAttribute('aria-labelledby') ?? '';
      expect(root.querySelector(`#${id}`)?.tagName).toBe('H3');
    }
  });

  it('has no axe violations', async () => {
    const root = await open();

    expect(await axeViolations(root)).toEqual([]);
  });
});
