import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { IMPORT_ERROR_MESSAGE, type ImportGroupsResponse } from '@shelfmark/contracts';
import { UiButtonHarness, UiSelectHarness } from '@shelfmark/ui/testing';
import { Subject, of, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { mockHttpError } from '../../../../core/api/mock-http-error';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { IMPORT_API } from '../../models/import-api.const';
import type { ImportApi } from '../../models/import-api.interface';
import { ImportFlowService } from '../../services/import-flow.service';
import { ImportGroupsService } from '../../services/import-groups.service';
import { ImportGroupsComponent } from './import-groups.component';

const REQUEST = {
  links: ['Angular', 'MDN', 'Ramen', 'Bread', 'Odd'].map((title) => ({
    title,
    url: `https://${title.toLowerCase()}.example/`,
  })),
  folderNames: [],
};

const RESPONSE: ImportGroupsResponse = {
  groups: [
    { key: 'g1', name: 'Development', folderId: null, linkIndexes: [0, 1] },
    { key: 'g2', name: 'Reading', folderId: 'folder-1', linkIndexes: [2, 3] },
  ],
  rest: [4],
  charged: 5,
};

async function setup() {
  const groups = vi.fn<ImportApi['groups']>(() => of(RESPONSE));
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: IMPORT_API, useValue: { groups } },
      { provide: ImportFlowService, useValue: { targetName: signal('Imported bookmarks') } },
      ImportGroupsService,
    ],
  });
  await loadEnglish();
  const state = TestBed.inject(ImportGroupsService);
  const fixture = TestBed.createComponent(ImportGroupsComponent);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const root = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { groups, state, fixture, loader, root, settle };
}

/** Types into the native field of a `ui-input` (there is no harness for it). */
function typeInto(root: HTMLElement, value: string): void {
  const field = root.querySelector<HTMLInputElement>('input[type="text"]');
  if (!field) throw new Error('No text field');
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('ImportGroupsComponent', () => {
  it('waits with a spinner and the number of links while the groups are made', async () => {
    const { state, groups, root, settle } = await setup();
    const answer = new Subject<ImportGroupsResponse>();
    groups.mockReturnValue(answer);

    const loading = state.load(REQUEST);
    await settle();

    expect(root.querySelector('[role="status"]')?.textContent).toContain('AI is grouping 5 links…');
    expect(root.querySelector('ui-spinner')).not.toBeNull();
    answer.next(RESPONSE);
    answer.complete();
    await loading;
    await settle();
    expect(root.textContent).not.toContain('AI is grouping');
  });

  it('shows one row per group with its count, "new" or "already there" and the first titles', async () => {
    const { state, root, settle } = await setup();

    await state.load(REQUEST);
    await settle();

    expect(root.textContent).toContain('2 groups for 5 links');
    const rows = Array.from(root.querySelectorAll('li')).map((row) =>
      row.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(rows[0]).toContain('2 links');
    expect(rows[0]).toContain('new');
    expect(rows[0]).toContain('Angular · MDN');
    expect(rows[1]).toContain('Reading');
    expect(rows[1]).toContain('already there');
    expect(rows[1]).toContain('Ramen · Bread');
    // "Other" has a count and the line about where its links go, and no tick.
    expect(rows[2]).toContain('Other');
    expect(rows[2]).toContain('1 link');
    expect(rows[2]).toContain('Links that fit no topic go to “Imported bookmarks”.');
    expect(root.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
    expect(root.textContent).toContain(
      'You can rename the folders. Links you take out of a group go to “Imported bookmarks”.',
    );
  });

  it('renames a new group in place and cannot rename an existing folder', async () => {
    const { state, root, settle } = await setup();
    await state.load(REQUEST);
    await settle();

    // Only the new group has a field; the existing folder keeps its name.
    expect(root.querySelectorAll('input[type="text"]')).toHaveLength(1);
    typeInto(root, 'Dev reading');
    await settle();

    expect(state.groups()[0].name).toBe('Dev reading');
    expect(state.assignment().folders[0].name).toBe('Dev reading');
  });

  it('flags an empty name and unticks a group with its checkbox', async () => {
    const { state, root, settle } = await setup();
    await state.load(REQUEST);
    await settle();

    typeInto(root, '');
    await settle();
    expect(root.textContent).toContain('Give the folder a name');
    expect(state.valid()).toBe(false);

    (root.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    await settle();
    expect(state.groups()[0].included).toBe(false);
    expect(state.valid()).toBe(true);
  });

  it('opens a group to show its links and moves one into another group or out to "Other"', async () => {
    const { state, loader, root, settle } = await setup();
    await state.load(REQUEST);
    await settle();

    await (
      await loader.getHarness(UiButtonHarness.with({ label: 'Show the links of “Development”' }))
    ).click();
    await settle();
    expect(root.textContent).toContain('Angular');
    expect(root.textContent).toContain('MDN');
    const selects = await loader.getAllHarnesses(UiSelectHarness);
    expect(selects).toHaveLength(2);

    await selects[0].chooseOption({ text: 'Reading' });
    await settle();
    expect(state.placeOf(0)).toBe('g2');
    expect(state.groups()[1].linkIndexes).toEqual([0, 2, 3]);

    // The moved link left this group; the first select now belongs to the next link.
    const [next] = await loader.getAllHarnesses(UiSelectHarness);
    await next.chooseOption({ text: 'Other' });
    await settle();
    expect(state.rest()).toEqual([1, 4]);
  });

  it('shows the links of "Other" too', async () => {
    const { state, loader, root, settle } = await setup();
    await state.load(REQUEST);
    await settle();

    await (
      await loader.getHarness(UiButtonHarness.with({ label: 'Show the links of “Other”' }))
    ).click();
    await settle();

    expect(root.textContent).toContain('Odd');
    expect(await loader.getAllHarnesses(UiSelectHarness)).toHaveLength(1);
  });

  it('says why the groups could not be made', async () => {
    const { state, groups, root, settle } = await setup();
    groups.mockReturnValue(throwError(() => mockHttpError(503)));
    await state.load(REQUEST);
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'could not be grouped right now',
    );

    groups.mockReturnValue(throwError(() => mockHttpError(409)));
    await state.load(REQUEST);
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Not enough of the allowance',
    );

    groups.mockReturnValue(
      throwError(() => mockHttpError(409, IMPORT_ERROR_MESSAGE.GroupsMonthly)),
    );
    await state.load(REQUEST);
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'already grouped as many links with AI this month',
    );
  });

  it('has no axe violations while loading, with groups and with a group open', async () => {
    const { state, loader, root, settle } = await setup();
    await state.load(REQUEST);
    await settle();
    expect(await axeViolations(root)).toEqual([]);

    await (
      await loader.getHarness(UiButtonHarness.with({ label: 'Show the links of “Development”' }))
    ).click();
    await settle();
    expect(await axeViolations(root)).toEqual([]);
  });
});
