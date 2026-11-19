import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideRouter } from '@angular/router';
import {
  ASK_PERIOD,
  LINK_KIND,
  LINK_SORT_FIELD,
  SAVED_VIEW_SCOPE,
  SORT_ORDER,
  VIEW_DRAFT_FIELD,
  VIEW_DRAFT_OUTCOME,
  type ViewDraftResponse,
} from '@shelfmark/contracts';
import { UiButtonHarness, UiSelectHarness, UiTagInputHarness } from '@shelfmark/ui/testing';
import { of, throwError } from 'rxjs';
import { aiSettingsResponse, fakeAiApi, type FakeAiApi } from '../../../../../testing/fake-ai-api';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { mockHttpError } from '../../../../core/api/mock-http-error';
import { SavedViewsStore } from '../../../../stores/saved-views.store';
import { AI_API } from '../../../ai/models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../../ai/models/ai-settings-default.const';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { MockFoldersApi } from '../../../links/mock/mock-folders.api';
import { MockLinksApi } from '../../../links/mock/mock-links.api';
import { MockTagsApi } from '../../../links/mock/mock-tags.api';
import { FOLDERS_API } from '../../../links/models/folders-api.const';
import { LINKS_API } from '../../../links/models/links-api.const';
import { LINKS_SCOPE } from '../../../links/models/links-scope.const';
import { TAGS_API } from '../../../links/models/tags-api.const';
import { MockSavedViewsApi } from '../../mock/mock-saved-views.api';
import { SAVED_VIEWS_API } from '../../models/saved-views-api.const';
import { SavedViewActionsService } from '../../services/saved-view-actions.service';

@Component({
  selector: 'app-test-root',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class RootComponent {}

const DRAFT: ViewDraftResponse = {
  outcome: VIEW_DRAFT_OUTCOME.Done,
  allowance: { questionsLeft: 11, period: ASK_PERIOD.Day, resetsOn: '2026-11-20' },
  draft: {
    query: {
      scope: SAVED_VIEW_SCOPE.All,
      folderId: null,
      tags: ['docs'],
      kind: LINK_KIND.Video,
      sort: LINK_SORT_FIELD.CreatedAt,
      order: SORT_ORDER.Desc,
      q: '',
    },
    set: [VIEW_DRAFT_FIELD.Kind, VIEW_DRAFT_FIELD.Tags],
    name: 'Video docs',
    note: 'Views cannot filter by what you watched.',
    dropped: ['extra'],
  },
};

async function setup(ai: FakeAiApi | null) {
  const api = ai ?? fakeAiApi(aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT } }));
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([]),
      { provide: SAVED_VIEWS_API, useClass: MockSavedViewsApi },
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      { provide: AI_API, useValue: api },
    ],
  });
  await loadEnglish();
  await TestBed.inject(AiSettingsStore).load();
  const store = TestBed.inject(SavedViewsStore);
  await store.load();
  const done = TestBed.inject(SavedViewActionsService).saveCurrent({
    scope: LINKS_SCOPE.All,
    kind: LINK_KIND.Article,
  });
  const loader = TestbedHarnessEnvironment.documentRootLoader(
    TestBed.createComponent(RootComponent),
  );
  await until(() => {
    expect(root()).not.toBeNull();
  });
  return { api, store, done, loader };
}

function root(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cdk-dialog-container');
}

async function until(check: () => void | Promise<void>): Promise<void> {
  await vi.waitFor(
    async () => {
      TestBed.tick();
      await check();
    },
    { timeout: 4000 },
  );
}

function text(): string {
  return root()?.textContent ?? '';
}

function typeInto(selector: string, value: string): void {
  const field = root()?.querySelector<HTMLInputElement>(selector);
  if (!field) {
    throw new Error(`no field ${selector}`);
  }
  field.value = value;
  field.dispatchEvent(new Event('input'));
  field.dispatchEvent(new Event('blur'));
  TestBed.tick();
}

const PHRASE = 'input[placeholder^="videos about"]';
const NAME = 'input[placeholder="To read"]';

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container > *').forEach((node) => {
    node.remove();
  });
});

describe('NewViewDialogComponent without AI', () => {
  it('starts on the feed filter with no phrase field and counts what it would list', async () => {
    const { loader } = await setup(null);
    expect(root()?.querySelector(PHRASE)).toBeNull();
    expect(text()).toContain('Start from the filter');
    const type = root()?.querySelector<HTMLInputElement>('input[type="radio"]:checked');
    expect(type?.parentElement?.textContent).toContain('Articles');
    await until(() => {
      expect(text()).toMatch(/Found \d+ links?/u);
      expect(root()?.querySelectorAll('.nv__link').length).toBeGreaterThan(0);
    });
    const where = await loader.getHarness(UiSelectHarness.with({ label: 'Where' }));
    await where.chooseOption({ text: /Favorites/u });
    expect(await where.getValueText()).toContain('Favorites');
  });

  it('keeps Save on for an empty view and saves rows and name', async () => {
    const { loader, store, done } = await setup(null);
    const tags = await loader.getHarness(UiTagInputHarness.with({ label: 'Tags' }));
    await until(async () => {
      await tags.addTag('docs');
      expect(await tags.getTags()).toEqual(['docs']);
    });
    typeInto('input[placeholder^="Words in"]', 'zzzznothing');
    await until(() => {
      expect(text()).toContain('Found 0 links');
    });
    const save = await loader.getHarness(UiButtonHarness.with({ text: 'Save view' }));
    expect(await save.isDisabled()).toBe(false);
    typeInto(NAME, 'Empty one');
    await save.click();
    expect(await done).toBe(store.items().at(-1)?.id);
    expect(store.items().at(-1)).toMatchObject({
      name: 'Empty one',
      query: { tags: ['docs'], q: 'zzzznothing', kind: LINK_KIND.Article },
    });
  });

  it('asks for a name before saving and refuses a tag that is not the user’s', async () => {
    const { loader } = await setup(null);
    const save = await loader.getHarness(UiButtonHarness.with({ text: 'Save view' }));
    await save.click();
    await until(() => {
      expect(text()).toContain('Enter a name');
    });
    const tags = await loader.getHarness(UiTagInputHarness.with({ label: 'Tags' }));
    await tags.addTag('not-a-tag');
    await until(() => {
      expect(text()).toContain('is not one of your tags');
    });
  });
});

describe('NewViewDialogComponent with AI', () => {
  function aiOn(draft: ViewDraftResponse = DRAFT): FakeAiApi {
    const ai = fakeAiApi();
    ai.draftView.mockReturnValue(of(draft));
    return ai;
  }

  it('shows the phrase first with ideas, and Compose waits for a long enough phrase', async () => {
    const { loader, api } = await setup(aiOn());
    expect(root()?.querySelector(PHRASE)).not.toBeNull();
    expect(root()?.querySelector('ui-select')).toBeNull();
    await until(() => {
      expect(root()?.querySelectorAll('.nv__idea')).toHaveLength(3);
    });
    const compose = await loader.getHarness(UiButtonHarness.with({ text: 'Compose' }));
    await compose.click();
    expect(api.draftView).not.toHaveBeenCalled();
    typeInto(PHRASE, 'ab');
    await compose.click();
    expect(api.draftView).not.toHaveBeenCalled();
  });

  it('an idea fills the phrase', async () => {
    await setup(aiOn());
    await until(() => {
      expect(root()?.querySelector('.nv__idea')).not.toBeNull();
    });
    root()?.querySelector<HTMLButtonElement>('.nv__idea button')?.click();
    await until(() => {
      expect(root()?.querySelector<HTMLInputElement>(PHRASE)?.value).toMatch(/^Links about /u);
    });
  });

  it('fills the rows from the draft with sparks, names the view and drops a spark on change', async () => {
    const { loader, api } = await setup(aiOn());
    typeInto(PHRASE, 'videos about docs');
    const compose = await loader.getHarness(UiButtonHarness.with({ text: 'Compose' }));
    await compose.click();
    await until(() => {
      expect(root()?.querySelector(NAME)).not.toBeNull();
    });
    expect(api.draftView).toHaveBeenCalledWith('videos about docs');
    expect(root()?.querySelector<HTMLInputElement>(NAME)?.value).toBe('Video docs');
    expect(text()).toContain('Views cannot filter by what you watched.');
    expect(text()).toContain('Left out: extra');
    expect(root()?.querySelectorAll('.nv__row-spark')).toHaveLength(2);
    expect(
      root()?.querySelector('.nv__row-spark')?.getAttribute('aria-label') ??
        root()?.querySelector('.nv__row-spark')?.getAttribute('title'),
    ).toBe('Generated by AI, may be inaccurate');
    const tags = await loader.getHarness(UiTagInputHarness.with({ label: 'Tags' }));
    expect(await tags.getTags()).toEqual(['docs']);
    await tags.removeTag('docs');
    await until(() => {
      expect(root()?.querySelectorAll('.nv__row-spark')).toHaveLength(1);
    });
  });

  it('"Change" goes back to the phrase; a typed name is kept by the next draft', async () => {
    const { loader } = await setup(aiOn());
    typeInto(PHRASE, 'videos about docs');
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Compose' }))).click();
    await until(() => {
      expect(root()?.querySelector(NAME)).not.toBeNull();
    });
    typeInto(NAME, 'Mine');
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Change' }))).click();
    await until(() => {
      expect(root()?.querySelector(PHRASE)).not.toBeNull();
    });
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Compose' }))).click();
    await until(() => {
      expect(root()?.querySelector<HTMLInputElement>(NAME)?.value).toBe('Mine');
    });
  });

  it('shows the limit line for quota and a plain line when unavailable, never a toast', async () => {
    const quota: ViewDraftResponse = {
      outcome: VIEW_DRAFT_OUTCOME.Quota,
      draft: null,
      allowance: { questionsLeft: 0, period: ASK_PERIOD.Day, resetsOn: '2026-11-20' },
    };
    const { loader, api } = await setup(aiOn(quota));
    typeInto(PHRASE, 'videos about docs');
    const compose = await loader.getHarness(UiButtonHarness.with({ text: 'Compose' }));
    await compose.click();
    await until(() => {
      expect(text()).toContain('You’ve used today’s questions');
    });
    expect(root()?.querySelector('ui-select')).toBeNull();
    api.draftView.mockReturnValue(throwError(() => mockHttpError(500)));
    await compose.click();
    await until(() => {
      expect(text()).toContain('Couldn’t compose a view right now');
    });
    expect(document.querySelector('ui-toast')).toBeNull();
  });

  it('"save the current filter" skips the phrase and shows the rows', async () => {
    await setup(aiOn());
    const skip = [...(root()?.querySelectorAll('button') ?? [])].find((button) =>
      button.textContent?.includes('save the current filter'),
    );
    skip?.click();
    await until(() => {
      expect(root()?.querySelector('ui-select')).not.toBeNull();
    });
    expect(root()?.querySelector(PHRASE)).toBeNull();
  });
});
