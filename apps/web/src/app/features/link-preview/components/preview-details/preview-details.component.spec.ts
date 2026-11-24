import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FolderResponse, LinkResponse } from '@shelfmark/contracts';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../../testing/axe';
import { PREVIEW_STUB_LINK } from '../../../../../testing/link-preview-stub';
import { createLinkActionsStub } from '../../../../../testing/preview-reader-stub';
import { FoldersStore } from '../../../../stores/folders.store';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { LinkInlineEditService } from '../../services/link-inline-edit.service';
import { PreviewDetailsComponent } from './preview-details.component';

const FOLDER = { id: 'f-1', name: 'Angular', colour: 'amber', icon: 'folder' } as FolderResponse;

async function setup(link: Partial<LinkResponse> = {}) {
  const actions = createLinkActionsStub();
  const edits = {
    saveTitle: vi.fn(() => Promise.resolve(false)),
    saveNote: vi.fn(() => Promise.resolve(true)),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LinkActionsService, useValue: actions },
      { provide: LinkInlineEditService, useValue: edits },
      { provide: FoldersStore, useValue: { entityMap: signal({ [FOLDER.id]: FOLDER }) } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(PreviewDetailsComponent);
  const current: LinkResponse = {
    ...PREVIEW_STUB_LINK,
    folderId: FOLDER.id,
    tags: ['docs', 'angular'],
    note: 'Start here',
    summary: 'A short tour',
    summarySource: 'ai',
    remindAt: null,
    lastOpenedAt: null,
    ...link,
  };
  fixture.componentRef.setInput('link', current);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  return {
    fixture,
    element,
    actions,
    edits,
    current,
    loader: TestbedHarnessEnvironment.loader(fixture),
  };
}

describe('PreviewDetailsComponent', () => {
  it('shows the fields of the link', async () => {
    const { element } = await setup();
    const text = element.textContent ?? '';
    expect(element.querySelector('aside')?.getAttribute('aria-label')).toBe('Details');
    expect(text).toContain('Angular');
    expect(text).toContain('docs');
    expect(text).toContain('A short tour');
    expect(text).toContain('https://www.angular.dev/overview');
    expect(element.querySelectorAll('textarea')[0]?.value).toBe('Angular overview');
    expect(element.querySelectorAll('textarea')[1]?.value).toBe('Start here');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('saves the title and note on blur and puts back a title that was not saved', async () => {
    const { element, edits, current, fixture } = await setup();
    const [title, note] = Array.from(element.querySelectorAll('textarea'));
    if (!title || !note) {
      throw new Error('fields missing');
    }
    title.value = '';
    title.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    title.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(edits.saveTitle).toHaveBeenCalledWith(current, '');
    expect(title.value).toBe('Angular overview');
    note.value = 'New note';
    note.dispatchEvent(new Event('input'));
    note.dispatchEvent(new Event('blur'));
    expect(edits.saveNote).toHaveBeenCalledWith(current, 'New note');
  });

  it('moves, adds tags and reminds through the link actions', async () => {
    const { loader, actions, current } = await setup();
    await (
      await loader.getHarness(UiButtonHarness.with({ name: /Move to another folder/ }))
    ).click();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Add tag' }))).click();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Remind me…' }))).click();
    expect(actions.move).toHaveBeenCalledWith(current);
    expect(actions.edit).toHaveBeenCalledWith(current);
    expect(actions.remind).toHaveBeenCalledWith(current);
  });

  it('shows Unsorted, the reminder time and the last open', async () => {
    const { element } = await setup({
      folderId: null,
      remindAt: '2030-01-02T09:00:00.000Z',
      lastOpenedAt: new Date().toISOString(),
      summary: null,
    });
    const text = element.textContent ?? '';
    expect(text).toContain('Unsorted');
    expect(text).not.toContain('Remind me…');
    expect(text).toContain('opened');
    expect(text).not.toContain('Summary');
  });
});
