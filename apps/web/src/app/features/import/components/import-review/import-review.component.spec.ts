import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MOCK_FOLDERS, MOCK_ID, MOCK_NAME } from '@shelfmark/contracts/testing';
import type { AiUsage } from '@shelfmark/contracts';
import { UiSelectHarness } from '@shelfmark/ui/testing';
import { of } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { FoldersStore } from '../../../../stores/folders.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { IMPORT_FOLDERS_MODE } from '../../models/import-folders-mode.const';
import { IMPORT_API } from '../../models/import-api.const';
import { IMPORT_NEW_FOLDER } from '../../models/import-new-folder.const';
import { ImportFlowService } from '../../services/import-flow.service';
import { ImportRunService } from '../../services/import-run.service';
import { ImportReviewComponent } from './import-review.component';

const BOOKMARKS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
<DT><H3>Dev</H3>
<DL><p>
<DT><A HREF="https://a.example/">A</A>
<DT><A HREF="https://b.example/">B</A>
</DL><p>
<DT><A HREF="https://a.example/">A again</A>
<DT><A HREF="https://c.example/">C</A>
</DL><p>`;

const FLAT = `<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p><DT><A HREF="https://x.example/">X</A></DL><p>`;

async function setup(saved: number[] = [3], text = BOOKMARKS, room = 10_000) {
  const ai = {
    load: vi.fn(async () => undefined),
    isOn: signal(false),
    providerUnavailable: signal(false),
    usage: signal<AiUsage | null>(null),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: IMPORT_API, useValue: { check: vi.fn(() => of({ saved, room })) } },
      { provide: AiSettingsStore, useValue: ai },
      { provide: ImportRunService, useValue: { running: signal(false), start: vi.fn() } },
      {
        provide: FoldersStore,
        useValue: {
          entities: signal([...MOCK_FOLDERS]),
          entityMap: signal({}),
          load: vi.fn(async () => undefined),
        },
      },
      { provide: UserSettingsStore, useValue: { shownColour: (colour: string) => colour } },
      ImportFlowService,
    ],
  });
  await loadEnglish();
  const flow = TestBed.inject(ImportFlowService);
  await flow.chooseFile(new File([text], 'bookmarks.html'));
  const fixture = TestBed.createComponent(ImportReviewComponent);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const root = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { flow, ai, fixture, loader, root, settle };
}

function checkbox(root: HTMLElement, text: string): HTMLInputElement {
  const label = Array.from(root.querySelectorAll('label')).find((item) =>
    item.textContent?.includes(text),
  );
  const input = label?.querySelector('input[type="checkbox"]');
  if (!input) {
    throw new Error(`No checkbox "${text}"`);
  }
  return input as HTMLInputElement;
}

function radio(root: HTMLElement, text: string): HTMLInputElement {
  const label = Array.from(root.querySelectorAll('label')).find((item) =>
    item.textContent?.includes(text),
  );
  const input = label?.querySelector('input[type="radio"]');
  if (!input) {
    throw new Error(`No radio "${text}"`);
  }
  return input as HTMLInputElement;
}

/** The text of every radio card (title and description). */
function radios(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('input[type="radio"]')).map(
    (item) => item.closest('label')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  );
}

describe('ImportReviewComponent', () => {
  it('shows the numbers of the file with their labels', async () => {
    const { root } = await setup();
    const stats = Array.from(root.querySelectorAll('dl > div')).map((row) => [
      row.querySelector('dt')?.textContent?.trim(),
      row.querySelector('dd')?.textContent?.trim(),
    ]);

    expect(stats).toEqual([
      ['links', '4'],
      ['folder', '1'],
      ['already on your shelf', '1'],
    ]);
  });

  it('shows "New folder" as the choice of "Put them into" and lists the existing folders', async () => {
    const { loader } = await setup();
    const select = await loader.getHarness(UiSelectHarness);

    expect(await select.getLabel()).toBe('Put them into');
    expect(await select.getValueText()).toBe('New folder “Imported bookmarks”');
    await select.open();
    const names = await Promise.all((await select.getOptions()).map((option) => option.getText()));
    expect(names).toContain('New folder “Imported bookmarks”');
    expect(names).toContain(MOCK_NAME.FolderReading);
    await select.close();
  });

  it('sets the target to the folder that is chosen', async () => {
    const { loader, flow, settle } = await setup();
    const select = await loader.getHarness(UiSelectHarness);

    await select.chooseOption({ text: MOCK_NAME.FolderReading });
    await settle();

    expect(flow.target()).toBe(MOCK_ID.FolderReading);
    expect(flow.target()).not.toBe(IMPORT_NEW_FOLDER);
  });

  it('offers the duplicates checkbox with the count and toggles skipDuplicates', async () => {
    const { root, flow, settle } = await setup();
    const box = checkbox(root, 'Skip the 2 duplicates');
    expect(box.checked).toBe(true);

    box.click();
    await settle();

    expect(flow.skipDuplicates()).toBe(false);
    expect(checkbox(root, 'Skip the 2 duplicates').checked).toBe(false);
  });

  it('hides the duplicates checkbox when there are no duplicates', async () => {
    const { root } = await setup([], FLAT);

    expect(root.textContent).not.toContain('Skip the');
  });

  it('offers "As in the file" and "No folders" and sets the choice that is picked', async () => {
    const { root, flow, settle } = await setup();

    expect(radios(root)).toHaveLength(2);
    expect(radios(root)[0]).toContain('As in the file');
    expect(radio(root, 'As in the file').checked).toBe(true);
    expect(root.textContent).toContain('1 browser folder');
    expect(root.textContent).toContain('Everything in one list in “Imported bookmarks”');

    radio(root, 'No folders').click();
    await settle();

    expect(flow.foldersMode()).toBe(IMPORT_FOLDERS_MODE.None);
    expect(radio(root, 'No folders').checked).toBe(true);
  });

  it('leaves out "As in the file" when the file has no folders', async () => {
    const { root } = await setup([], FLAT);

    expect(radios(root)).toHaveLength(1);
    expect(radios(root)[0]).toContain('No folders');
  });

  it('offers AI with its cost while AI is on and the allowance has room', async () => {
    const { root, ai, flow, settle } = await setup([], FLAT);
    ai.isOn.set(true);
    ai.usage.set({
      linksUsed: 0,
      linksLimit: 100,
      resetsOn: '2026-12-01',
      backfillUsed: 100,
      backfillLimit: 5000,
    });
    await settle();

    expect(radios(root)).toHaveLength(2);
    expect(radios(root)[0]).toContain('Let AI sort them by topic');
    expect(root.textContent).toContain('Uses 1 of 4,900 runs for existing links.');
    radio(root, 'Let AI sort them by topic').click();
    await settle();
    expect(flow.foldersMode()).toBe(IMPORT_FOLDERS_MODE.Ai);
  });

  it('says how many links fit the limit, and that there is no room at all', async () => {
    const some = await setup([], BOOKMARKS, 2);
    expect(some.root.textContent).toContain(
      'Only 2 more links fit your limit, so just the first 2 are imported.',
    );
    TestBed.resetTestingModule();

    const none = await setup([], BOOKMARKS, 0);
    expect(none.root.textContent).toContain('Your shelf has no room for more links.');
  });

  it('says there is nothing to import when every link is a duplicate', async () => {
    const { root } = await setup([0, 1, 2, 3]);

    expect(root.textContent).toContain('Every link in this file is already on your shelf.');
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
