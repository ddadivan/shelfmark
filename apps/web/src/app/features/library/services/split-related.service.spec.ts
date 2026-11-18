import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  AI_SEARCH_STATE,
  type AiSearchStatus,
  type LinkResponse,
  type RelatedLinksResponse,
} from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_ID, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of, throwError } from 'rxjs';
import { fakeAiApi } from '../../../../testing/fake-ai-api';
import { FoldersStore } from '../../../stores/folders.store';
import { AI_API } from '../../ai/models/ai-api.const';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { LibraryFilterService } from './library-filter.service';
import { SplitRelatedService } from './split-related.service';
import { SplitViewService } from './split-view.service';

const READY: AiSearchStatus = { state: AI_SEARCH_STATE.Ready, ready: 10, total: 10 };

function related(folderIds: (string | null)[]): RelatedLinksResponse {
  return {
    status: READY,
    items: folderIds.map((folderId, index) => {
      const link: LinkResponse = { ...MOCK_LINKS[0], id: `r${index}`, folderId };
      return { link, why: [] };
    }),
  };
}

function setup(answer: () => ReturnType<ReturnType<typeof fakeAiApi>['related']>) {
  const ai = fakeAiApi();
  ai.related.mockImplementation(answer);
  const relatedParam = signal<unknown>(undefined);
  const open = signal(true);
  const rightTarget = signal<string | null | undefined>(undefined);
  const wide = signal(true);
  const meaningReady = signal(true);
  const entityMap = Object.fromEntries(MOCK_FOLDERS.map((folder) => [folder.id, folder]));
  TestBed.configureTestingModule({
    providers: [
      SplitRelatedService,
      { provide: AI_API, useValue: ai },
      { provide: LibraryFilterService, useValue: { relatedParam } },
      {
        provide: SplitViewService,
        useValue: { open, rightTarget, canOpen: wide, rightRecent: computed(() => [null]) },
      },
      { provide: FoldersStore, useValue: { entityMap: () => entityMap } },
      { provide: AiSettingsStore, useValue: { meaningReady } },
    ],
  });
  return {
    ai,
    service: TestBed.inject(SplitRelatedService),
    relatedParam,
    rightTarget,
    wide,
    meaningReady,
  };
}

async function settle(): Promise<void> {
  TestBed.tick();
  await Promise.resolve();
  TestBed.tick();
}

describe('SplitRelatedService', () => {
  it('offers "Show related" only while search by meaning is ready and the split can open', () => {
    const { service, wide, meaningReady } = setup(() => of(related([])));
    expect(service.available()).toBe(true);
    wide.set(false);
    expect(service.available()).toBe(false);
    wide.set(true);
    meaningReady.set(false);
    expect(service.available()).toBe(false);
  });

  it('puts the distinct folders of up to ten related links first, as "Related folders"', async () => {
    const A = MOCK_ID.FolderAngular;
    const B = MOCK_ID.FolderReading;
    const { ai, service, relatedParam } = setup(() => of(related([A, null, A, 'gone', B])));
    expect(service.pickerIds()).toEqual([null]);
    expect(service.pickerLabelKey()).toBe('links.move.recent');

    relatedParam.set('link-1');
    await settle();
    expect(ai.related).toHaveBeenCalledWith('link-1', 10);
    expect(service.pickerIds()).toEqual([A, null, B]);
    expect(service.pickerLabelKey()).toBe('ai.related.folders');
  });

  it('keeps the recent folders once a folder is chosen, while not ready, or on a failure', async () => {
    const ok = setup(() => of(related([MOCK_ID.FolderAngular])));
    ok.relatedParam.set('link-1');
    await settle();
    ok.rightTarget.set(MOCK_ID.FolderAngular);
    expect(ok.service.pickerIds()).toEqual([null]);
    ok.rightTarget.set(undefined);
    ok.meaningReady.set(false);
    expect(ok.service.pickerIds()).toEqual([null]);
    TestBed.resetTestingModule();

    const failed = setup(() => throwError(() => new Error('down')));
    failed.relatedParam.set('link-1');
    await settle();
    expect(failed.service.pickerIds()).toEqual([null]);
    expect(failed.service.pickerLabelKey()).toBe('links.move.recent');
  });
});
