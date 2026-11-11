import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SHARE_TOKEN_PATTERN } from '@shelfmark/contracts';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import { AuthStore } from '../../../core/auth/auth.store';
import { axeViolations } from '../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { MockSharesApi } from '../mock/mock-shares.api';
import { MOCK_SHARES_STORAGE_KEY } from '../models/mock-shares-storage-key.const';
import type { ShareFolderDialogData } from '../models/share-folder-dialog-data.interface';
import { SHARES_API } from '../models/shares-api.const';
import { ShareFolderDialogComponent } from './share-folder-dialog.component';

const FOLDER = MOCK_FOLDERS[0];

async function open(data: Partial<ShareFolderDialogData> = {}) {
  localStorage.removeItem(MOCK_SHARES_STORAGE_KEY);
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: SHARES_API, useClass: MockSharesApi },
      { provide: AuthStore, useValue: { user: signal({ name: 'Ada', isDemo: false }) } },
    ],
  });
  await loadEnglish();
  const ref = TestBed.inject(DialogService).open<
    ShareFolderDialogComponent,
    void,
    ShareFolderDialogData
  >(ShareFolderDialogComponent, {
    data: { folder: FOLDER, linkCount: 15, isDemo: false, ...data },
  });
  await until(() => expect(dialog()).not.toBeNull());
  return ref;
}

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cdk-dialog-container');
}

function q<T extends Element>(selector: string): T | null {
  return dialog()?.querySelector<T>(selector) ?? null;
}

function switchNamed(name: string): HTMLButtonElement | null {
  return q<HTMLButtonElement>(`button[role="switch"][aria-label="${name}"]`);
}

function buttonNamed(label: string): HTMLButtonElement | undefined {
  return [...(dialog()?.querySelectorAll('button') ?? [])].find(
    (button) => button.textContent?.trim() === label,
  );
}

async function until(check: () => void): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.tick();
      check();
    },
    { timeout: 3000 },
  );
}

describe('ShareFolderDialogComponent', () => {
  afterEach(() => {
    localStorage.removeItem(MOCK_SHARES_STORAGE_KEY);
    vi.unstubAllGlobals();
    document.querySelectorAll('.cdk-overlay-container > *').forEach((node) => {
      node.remove();
    });
  });

  it('turns the public link on, shows it and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    await open();

    expect(dialog()?.textContent).toContain('Share “Reading”');
    expect(dialog()?.textContent).toContain('15 links, subfolders included');
    await until(() =>
      expect(switchNamed('Public link')?.getAttribute('aria-checked')).toBe('false'),
    );

    switchNamed('Public link')?.click();
    await until(() => expect(q<HTMLInputElement>('input[readonly]')).not.toBeNull());
    const field = q<HTMLInputElement>('input[readonly]');
    const token = field?.value.split('/c/')[1] ?? '';
    expect(token).toMatch(SHARE_TOKEN_PATTERN);
    expect(switchNamed('Show my notes')?.getAttribute('aria-checked')).toBe('false');

    buttonNamed('Copy link')?.click();
    await until(() => expect(writeText).toHaveBeenCalledWith(field?.value));
    expect(await axeViolations(dialog() as HTMLElement)).toEqual([]);
    vi.unstubAllGlobals();
  });

  it('selects the link and explains when the clipboard is refused', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    await open();
    await until(() => expect(switchNamed('Public link')).not.toBeNull());
    switchNamed('Public link')?.click();
    await until(() => expect(buttonNamed('Copy link')).toBeDefined());

    buttonNamed('Copy link')?.click();
    await until(() => expect(dialog()?.textContent).toContain('The link is selected'));
    const field = q<HTMLInputElement>('input[readonly]');
    expect(document.activeElement).toBe(field);
    expect(field?.selectionEnd).toBe(field?.value.length);
    vi.unstubAllGlobals();
  });

  it('turns notes on and resets the link after a confirmation', async () => {
    await open();
    await until(() => expect(switchNamed('Public link')).not.toBeNull());
    switchNamed('Public link')?.click();
    await until(() => expect(switchNamed('Show my notes')).not.toBeNull());
    const before = q<HTMLInputElement>('input[readonly]')?.value;

    switchNamed('Show my notes')?.click();
    await until(() =>
      expect(switchNamed('Show my notes')?.getAttribute('aria-checked')).toBe('true'),
    );

    // The switch flips at once; the change is saved when the controls are enabled again.
    await until(() => expect(buttonNamed('Reset')?.disabled).toBe(false));
    buttonNamed('Reset')?.click();
    await until(() => expect(document.body.textContent).toContain('Reset the public link?'));
    const confirm = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Reset link',
    );
    confirm?.click();
    await until(() => expect(q<HTMLInputElement>('input[readonly]')?.value).not.toBe(before));
  });

  it('turns the link off again', async () => {
    await open();
    await until(() => expect(switchNamed('Public link')).not.toBeNull());
    switchNamed('Public link')?.click();
    await until(() => expect(q('input[readonly]')).not.toBeNull());
    switchNamed('Public link')?.click();
    await until(() => expect(q('input[readonly]')).toBeNull());
    expect(switchNamed('Public link')?.getAttribute('aria-checked')).toBe('false');
  });

  it('explains that demo accounts cannot share, without a switch', async () => {
    await open({ isDemo: true });
    expect(dialog()?.textContent).toContain("Demo accounts can't share folders");
    expect(switchNamed('Public link')).toBeNull();
  });
});
