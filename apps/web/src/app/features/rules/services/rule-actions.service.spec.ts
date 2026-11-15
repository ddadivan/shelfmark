import { TestBed } from '@angular/core/testing';
import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_ID, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService, ToastService, TOAST_KIND } from '@shelfmark/ui';
import { of } from 'rxjs';
import { UndoToastService } from '../../../core/undo/undo-toast.service';
import type { UndoToastOptions } from '../../../core/undo/models/undo-toast-options.interface';
import { FoldersStore } from '../../../stores/folders.store';
import { RulesStore } from '../../../stores/rules.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { MockFoldersApi } from '../../links/mock/mock-folders.api';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockTagsApi } from '../../links/mock/mock-tags.api';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import { LINKS_API } from '../../links/models/links-api.const';
import type { LinksApi } from '../../links/models/links-api.interface';
import { TAGS_API } from '../../links/models/tags-api.const';
import { MockRulesApi } from '../mock/mock-rules.api';
import { RULES_API } from '../models/rules-api.const';
import { RuleActionsService } from './rule-actions.service';

const UNSORTED: LinkResponse = {
  ...MOCK_LINKS[0],
  id: 'yt-1',
  url: 'https://www.youtube.com/watch?v=1',
  folderId: null,
  tags: ['fun'],
};

async function setup() {
  const linksApi = {
    updateBatch: vi.fn<LinksApi['updateBatch']>((request) =>
      of({ updated: request.ids.length, links: [] }),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: RULES_API, useClass: MockRulesApi },
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      { provide: LINKS_API, useValue: linksApi },
    ],
  });
  await loadEnglish();
  const data = TestBed.inject(MockLibraryData);
  data.links = [UNSORTED, ...data.links.filter((link) => !link.url.includes('youtube.com'))];
  data.rules = [];
  const store = TestBed.inject(RulesStore);
  await Promise.all([store.load(), TestBed.inject(FoldersStore).load()]);
  const toasts = vi.spyOn(TestBed.inject(ToastService), 'show');
  return {
    actions: TestBed.inject(RuleActionsService),
    store,
    data,
    linksApi,
    toasts,
  };
}

function dialog(): HTMLElement {
  const element = document.querySelector<HTMLElement>('.cdk-dialog-container');
  if (!element) {
    throw new Error('no dialog open');
  }
  return element;
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

function button(label: string): HTMLButtonElement {
  const found = [...dialog().querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!found) {
    throw new Error(`no button ${label}`);
  }
  return found;
}

function domainField(): HTMLInputElement {
  const found = dialog().querySelector<HTMLInputElement>('ui-input input');
  if (!found) {
    throw new Error('no domain field');
  }
  return found;
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.replaceChildren());
});

describe('RuleActionsService', () => {
  it('adds a rule from a link: the domain prefilled, a folder chosen, a toast', async () => {
    const { actions, store, toasts } = await setup();
    const saved = actions.create('https://www.YouTube.com/watch?v=1');
    await until(() => expect(domainField().value).toBe('youtube.com'));
    expect(dialog().textContent).toContain('Add rule');

    button('Save rule').click();
    await until(() =>
      expect(dialog().textContent).toContain('Choose a folder or add at least one tag.'),
    );

    const angular = [...dialog().querySelectorAll<HTMLElement>('[role="option"]')].find((option) =>
      option.textContent?.includes('Angular'),
    );
    expect(angular).toBeDefined();
    angular?.click();
    button('Save rule').click();
    const rule = await saved;
    expect(rule).toMatchObject({ domain: 'youtube.com', folderId: MOCK_ID.FolderAngular });
    expect(store.items().map((item) => item.domain)).toEqual(['youtube.com']);
    expect(toasts).toHaveBeenCalledWith(
      expect.objectContaining({ kind: TOAST_KIND.Success, title: 'Rule added' }),
    );
  });

  it('shows a refused domain in the field and opens the existing rule for a known domain', async () => {
    const { actions, data } = await setup();
    data.rules = [
      {
        id: 'r1',
        domain: 'youtube.com',
        folderId: null,
        tags: ['video'],
        createdAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    await TestBed.inject(RulesStore).refresh();
    void actions.create('https://m.youtube.com/');
    await until(() => expect(domainField().value).toBe('m.youtube.com'));
    domainField().value = 'not a domain';
    domainField().dispatchEvent(new Event('input'));
    button('Save rule').click();
    await until(() => expect(dialog().textContent).toContain('Enter a domain such as youtube.com'));
    button('Cancel').click();

    void actions.create('https://www.youtube.com/watch');
    await until(() => expect(dialog().textContent).toContain('Edit rule'));
    expect(domainField().value).toBe('youtube.com');
  });

  it('deletes with Undo: hidden at once, back on Undo, deleted when the toast expires', async () => {
    const { actions, store, data } = await setup();
    data.rules = [
      {
        id: 'r1',
        domain: 'youtube.com',
        folderId: null,
        tags: ['video'],
        createdAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    await store.refresh();
    const undo = vi.spyOn(TestBed.inject(UndoToastService), 'show');
    const rule = store.items()[0];
    if (!rule) {
      throw new Error('no rule');
    }
    actions.delete(rule);
    expect(store.items()).toEqual([]);
    const options = undo.mock.calls[0]?.[0] as UndoToastOptions;
    options.onUndo();
    expect(store.items().map((item) => item.domain)).toEqual(['youtube.com']);

    actions.delete(rule);
    const second = undo.mock.calls[1]?.[0] as UndoToastOptions;
    second.onExpire();
    await until(() => expect(data.rules).toEqual([]));
  });

  it('applies a rule to the links in Unsorted after a confirm, and undoes it', async () => {
    const { actions, store, data, linksApi, toasts } = await setup();
    data.rules = [
      {
        id: 'r1',
        domain: 'youtube.com',
        folderId: MOCK_ID.FolderAngular,
        tags: ['video', 'fun'],
        createdAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    await store.refresh();
    const confirm = vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(true);
    const rule = store.items()[0];
    if (!rule) {
      throw new Error('no rule');
    }
    await actions.applyToExisting(rule);
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Apply the rule for youtube.com?',
        confirmLabel: 'Apply to 1 link',
      }),
    );
    expect(linksApi.updateBatch).toHaveBeenCalledWith({
      ids: ['yt-1'],
      folderId: MOCK_ID.FolderAngular,
      addTags: ['video', 'fun'],
    });
    const done = toasts.mock.calls.find((call) => call[0].title === 'Rule applied to 1 link')?.[0];
    done?.action?.run();
    await until(() =>
      expect(linksApi.updateBatch).toHaveBeenLastCalledWith({
        ids: ['yt-1'],
        folderId: null,
        removeTags: ['video'],
      }),
    );
  });

  it('says so when no link in Unsorted matches, and does not ask', async () => {
    const { actions, store, data, toasts } = await setup();
    data.rules = [
      {
        id: 'r1',
        domain: 'vimeo.com',
        folderId: null,
        tags: ['video'],
        createdAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    await store.refresh();
    const confirm = vi.spyOn(TestBed.inject(DialogService), 'confirm');
    const rule = store.items()[0];
    if (rule) {
      await actions.applyToExisting(rule);
    }
    expect(confirm).not.toHaveBeenCalled();
    expect(toasts).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: TOAST_KIND.Info,
        title: 'No links from vimeo.com in Unsorted',
      }),
    );
  });
});
