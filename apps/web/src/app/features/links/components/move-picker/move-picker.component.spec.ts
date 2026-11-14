import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { FOLDER_COLOUR, type FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_ID } from '@shelfmark/contracts/testing';
import { UI_DIALOG_DATA, UiDialogRef } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { FoldersStore } from '../../../../stores/folders.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { axeViolations } from '../../../../../testing/axe';
import type { MovePickerData } from '../../models/move-picker-data.interface';
import { MovePickerComponent } from './move-picker.component';

async function setup(
  data: Partial<MovePickerData> = {},
  folders: readonly FolderResponse[] = MOCK_FOLDERS,
) {
  const submit = vi.fn<MovePickerData['submit']>();
  const ref = { close: vi.fn(), locked: () => false };
  await TestBed.configureTestingModule({
    imports: [MovePickerComponent],
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: UiDialogRef, useValue: ref },
      { provide: FoldersStore, useValue: { entities: signal(folders) } },
      {
        provide: UserSettingsStore,
        useValue: { shownColour: (colour: string) => colour },
      },
      {
        provide: UI_DIALOG_DATA,
        useValue: { heading: 'Move “Wool coat”', currentIds: [], submit, ...data },
      },
    ],
  }).compileComponents();
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const fixture: ComponentFixture<MovePickerComponent> =
    TestBed.createComponent(MovePickerComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const options = () => Array.from(root.querySelectorAll<HTMLElement>('[role="option"]'));
  const names = () => options().map((o) => o.querySelector('.ui-picker-list__label')?.textContent);
  return { fixture, root, submit, ref, options, names };
}

describe('MovePickerComponent', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('titles the sheet and lists Unsorted and the nested folders by their translated names', async () => {
    const { root, names } = await setup();
    expect(root.querySelector('h2')?.textContent).toBe('Move “Wool coat”');
    expect(names()[0]).toBe('Unsorted');
    expect(names()).toEqual(['Unsorted', 'Reading', 'Angular']);
    expect(root.querySelector('[role="listbox"]')?.getAttribute('aria-label')).toBe('Folders');
    expect(root.querySelector('input')?.getAttribute('aria-label')).toBe('Search folders');
  });

  it('marks the current folder and does not move for it', async () => {
    const { fixture, options, submit, ref } = await setup({ currentIds: [MOCK_ID.FolderReading] });
    const current = options().find((o) => o.textContent.includes('Current folder'));
    expect(current?.getAttribute('aria-disabled')).toBe('true');
    current?.click();
    await fixture.whenStable();
    expect(submit).not.toHaveBeenCalled();
    expect(ref.close).not.toHaveBeenCalled();
  });

  it('moves at once and closes when a folder is chosen', async () => {
    const { fixture, options, submit, ref } = await setup({ currentIds: [null] });
    options()
      .find((o) => o.textContent.includes('Angular'))
      ?.click();
    await fixture.whenStable();
    expect(submit).toHaveBeenCalledWith(MOCK_ID.FolderAngular);
    expect(ref.close).toHaveBeenCalledWith(true);
  });

  it('moves to Unsorted with null', async () => {
    const { fixture, options, submit } = await setup({ currentIds: [MOCK_ID.FolderReading] });
    options()[0]?.click();
    await fixture.whenStable();
    expect(submit).toHaveBeenCalledWith(null);
  });

  it('shows the folder colours of the sidebar', async () => {
    const { root } = await setup({}, [{ ...MOCK_FOLDERS[0], colour: FOLDER_COLOUR.Plum }]);
    expect(root.querySelector('ui-folder-icon')?.classList).toContain('ui-folder-icon--plum');
  });

  it('is axe clean', async () => {
    const { root } = await setup({ currentIds: [MOCK_ID.FolderReading] });
    expect(await axeViolations(root)).toEqual([]);
  });
});
