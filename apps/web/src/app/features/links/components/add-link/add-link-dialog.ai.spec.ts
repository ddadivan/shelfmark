import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import {
  AI_APPLIED_PART,
  AI_JOB_REASON,
  AI_JOB_STATUS,
  LINK_KIND,
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  SUMMARY_SOURCE,
  type AiJobResponse,
  type AiSettingsResponse,
  type LinkPreviewResponse,
  type LinkResponse,
  type LinkSuggestion,
} from '@shelfmark/contracts';
import { MOCK_ID, MOCK_LINKS, MOCK_NAME } from '@shelfmark/contracts/testing';
import {
  UiButtonHarness,
  UiSelectHarness,
  UiSuggestionHarness,
  UiSuggestionRowHarness,
  UiTagInputHarness,
} from '@shelfmark/ui/testing';
import { firstValueFrom, of } from 'rxjs';
import { aiSettingsResponse, fakeAiApi, type FakeAiApi } from '../../../../../testing/fake-ai-api';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { AI_API } from '../../../ai/models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../../ai/models/ai-settings-default.const';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { FOLDERS_API } from '../../models/folders-api.const';
import type { LinksApi } from '../../models/links-api.interface';
import { LINKS_API } from '../../models/links-api.const';
import { TAGS_API } from '../../models/tags-api.const';
import { MockFoldersApi } from '../../mock/mock-folders.api';
import { MockTagsApi } from '../../mock/mock-tags.api';
import type { AddLinkData } from '../../models/add-link-data.interface';
import { AddLinkDialogService } from '../../services/add-link-dialog.service';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class RootComponent {}

const URL = 'https://example.org/signals';

const PREVIEW: LinkPreviewResponse = {
  preview: {
    kind: LINK_KIND.Article,
    url: URL,
    title: 'Signals in practice',
    description: 'A guide.',
    imageUrl: null,
    faviconUrl: null,
  },
  duplicate: null,
  fetched: true,
};

function suggestion(
  id: string,
  kind: LinkSuggestion['kind'],
  name: string | null,
  folderId: string | null = null,
): LinkSuggestion {
  return { id, kind, state: SUGGESTION_STATE.Suggested, tagName: name, folderId };
}

const DONE: AiJobResponse = {
  id: 'job-1',
  status: AI_JOB_STATUS.Done,
  reason: null,
  suggestions: [
    suggestion('s-folder', SUGGESTION_KIND.Folder, null, MOCK_ID.FolderAngular),
    suggestion('s-angular', SUGGESTION_KIND.Tag, 'angular'),
    suggestion('s-signals', SUGGESTION_KIND.Tag, 'signals'),
    suggestion('s-new', SUGGESTION_KIND.NewTag, 'state management'),
  ],
  summary: null,
  title: null,
};

interface FakeLinksApi extends Pick<LinksApi, 'preview' | 'create' | 'update'> {
  preview: ReturnType<typeof vi.fn<LinksApi['preview']>>;
  create: ReturnType<typeof vi.fn<LinksApi['create']>>;
  update: ReturnType<typeof vi.fn<LinksApi['update']>>;
}

function linksApi(): FakeLinksApi {
  return {
    preview: vi.fn<LinksApi['preview']>(() => of(PREVIEW)),
    create: vi.fn<LinksApi['create']>((request) =>
      of<LinkResponse>({ ...MOCK_LINKS[0], url: request.url, title: request.title ?? '' }),
    ),
    update: vi.fn<LinksApi['update']>((id, request) =>
      of<LinkResponse>({ ...MOCK_LINKS[0], id, ...request }),
    ),
  };
}

async function setup(ai: FakeAiApi, data: AddLinkData = {}, links: FakeLinksApi = linksApi()) {
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: LINKS_API, useValue: links },
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      { provide: AI_API, useValue: ai },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  await TestBed.inject(AiSettingsStore).load();
  const result = TestBed.inject(AddLinkDialogService).open(data);
  const loader = TestbedHarnessEnvironment.documentRootLoader(
    TestBed.createComponent(RootComponent),
  );
  await vi.waitFor(() => {
    TestBed.tick();
    expect(root()).not.toBeNull();
  });
  return { result, loader, links };
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
    { timeout: 3000 },
  );
}

async function typeUrl(value: string): Promise<void> {
  const field = root()?.querySelector<HTMLInputElement>('input[type="url"]');
  if (!field) {
    throw new Error('no address field');
  }
  field.value = value;
  field.dispatchEvent(new Event('input'));
  TestBed.tick();
}

function withAi(job: AiJobResponse = DONE, settings?: AiSettingsResponse): FakeAiApi {
  const ai = fakeAiApi(settings);
  ai.createDraft.mockReturnValue(of(job));
  return ai;
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.replaceChildren());
});

describe('AddLinkDialogComponent with AI (#390)', () => {
  it('shows nothing and asks nothing while AI is off', async () => {
    const ai = withAi(DONE, aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT } }));
    const { loader, links } = await setup(ai);
    await typeUrl(URL);
    await until(() => expect(links.preview).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(ai.createDraft).not.toHaveBeenCalled();
    expect(await loader.getAllHarnesses(UiSuggestionRowHarness)).toEqual([]);
    expect(root()?.querySelector('ui-ai-line')).toBeNull();
  });

  it('asks for a draft once the preview is in and shows the folder and tag chips', async () => {
    const ai = withAi();
    const { loader } = await setup(ai);
    await typeUrl(URL);
    await until(async () => {
      expect(await loader.getAllHarnesses(UiSuggestionRowHarness)).toHaveLength(2);
    });
    expect(ai.createDraft).toHaveBeenCalledTimes(1);
    expect(ai.createDraft.mock.calls[0]?.[0]).toMatchObject({
      url: URL,
      title: 'Signals in practice',
      description: 'A guide.',
    });
    const folderRow = await loader.getHarness(
      UiSuggestionRowHarness.with({ ariaLabel: 'Suggested folder' }),
    );
    const [folder] = await folderRow.getSuggestions();
    expect(await folder?.getAriaLabel()).toBe(`Move to ${MOCK_NAME.FolderAngular}`);
    const tagsRow = await loader.getHarness(
      UiSuggestionRowHarness.with({ ariaLabel: 'Suggested tags' }),
    );
    expect(await tagsRow.hasAddAll()).toBe(true);
    const labels = await Promise.all(
      (await tagsRow.getSuggestions()).map((chip) => chip.getAriaLabel()),
    );
    expect(labels).toEqual([
      'Add tag angular',
      'Add tag signals',
      'Create and add tag state management, New',
    ]);
  });

  it('applies taken chips to the form and saves with the draft id', async () => {
    const ai = withAi();
    const { loader, links, result } = await setup(ai);
    await typeUrl(URL);
    const angular = await vi.waitFor(() =>
      loader.getHarness(UiSuggestionHarness.with({ label: 'angular' })),
    );
    await angular.accept();
    const tags = await loader.getHarness(UiTagInputHarness);
    await until(async () => expect(await tags.getTags()).toEqual(['angular']));
    const folder = await loader.getHarness(UiSuggestionHarness.with({ label: 'Angular' }));
    await folder.accept();
    const select = await loader.getHarness(UiSelectHarness.with({ label: 'Folder' }));
    await until(async () => expect(await select.getValueText()).toContain(MOCK_NAME.FolderAngular));
    expect(
      await loader.getAllHarnesses(UiSuggestionRowHarness.with({ ariaLabel: 'Suggested folder' })),
    ).toEqual([]);

    await (await loader.getHarness(UiButtonHarness.with({ text: 'Create link' }))).click();
    await result;
    const request = links.create.mock.calls[0]?.[0];
    expect(request?.aiDraftId).toBe(ai.createDraft.mock.calls[0]?.[0].draftId);
    expect(request?.folderId).toBe(MOCK_ID.FolderAngular);
    expect(request?.tags).toEqual(['angular']);
  });

  it('says "Also fits" when the dialog already has a folder', async () => {
    const ai = withAi({
      ...DONE,
      suggestions: [suggestion('s-folder', SUGGESTION_KIND.Folder, null, MOCK_ID.FolderAngular)],
    });
    const { loader } = await setup(ai, { folderId: MOCK_ID.FolderReading });
    await typeUrl(URL);
    await until(async () => {
      expect(await loader.getAllHarnesses(UiSuggestionRowHarness)).toHaveLength(1);
    });
    expect(root()?.querySelector('ui-suggestion-row')?.textContent).toContain('Also fits');
  });

  it('shows the limit line with a way to the AI settings', async () => {
    const ai = withAi({
      ...DONE,
      status: AI_JOB_STATUS.Skipped,
      reason: AI_JOB_REASON.Quota,
      suggestions: [],
    });
    const { loader } = await setup(ai);
    await typeUrl(URL);
    await until(() =>
      expect(root()?.querySelector('ui-ai-line')?.textContent).toContain(
        'Suggestions are paused until',
      ),
    );
    expect(await loader.getHarness(UiButtonHarness.with({ text: 'AI settings' }))).toBeTruthy();
    expect(await loader.getAllHarnesses(UiSuggestionRowHarness)).toEqual([]);
  });

  it('offers Try again once when suggestions are not available', async () => {
    const ai = withAi({
      ...DONE,
      status: AI_JOB_STATUS.Failed,
      reason: AI_JOB_REASON.Unavailable,
      suggestions: [],
    });
    const { loader } = await setup(ai);
    await typeUrl(URL);
    const retry = await vi.waitFor(() =>
      loader.getHarness(UiButtonHarness.with({ text: 'Try again' })),
    );
    expect(root()?.querySelector('ui-ai-line')?.textContent).toContain(
      'Suggestions aren’t available right now',
    );
    await retry.click();
    await until(() => expect(ai.createDraft).toHaveBeenCalledTimes(2));
    await until(async () =>
      expect(await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Try again' }))).toEqual([]),
    );
    expect(root()?.querySelector('ui-ai-line')).not.toBeNull();
  });

  it('Edit link: shows open suggestions and undoes "Moved by AI"', async () => {
    const ai = fakeAiApi();
    const link: LinkResponse = {
      ...MOCK_LINKS[0],
      folderId: MOCK_ID.FolderAngular,
      tags: ['angular'],
    };
    ai.getLinkAi.mockReturnValue(
      of({
        aiStatus: AI_JOB_STATUS.Done,
        reason: null,
        summary: null,
        summarySource: null,
        suggestions: [suggestion('s-perf', SUGGESTION_KIND.Tag, 'performance')],
        autoApplied: { folderId: MOCK_ID.FolderAngular, tags: [] },
      }),
    );
    ai.undoApply.mockReturnValue(of({ ...link, folderId: null }));
    const { loader } = await setup(ai, { link });
    await until(async () =>
      expect(
        await loader.getAllHarnesses(UiSuggestionHarness.with({ label: 'performance' })),
      ).toHaveLength(1),
    );
    expect(root()?.textContent).toContain('Moved by AI');
    await (await loader.getHarness(UiButtonHarness.with({ name: 'Undo the move by AI' }))).click();
    await until(() =>
      expect(ai.undoApply).toHaveBeenCalledWith(link.id, { part: AI_APPLIED_PART.Folder }),
    );
    const select = await loader.getHarness(UiSelectHarness.with({ label: 'Folder' }));
    await until(async () => expect(await select.getValueText()).toBe('Unsorted'));
    expect(root()?.textContent).not.toContain('Moved by AI');

    const perf = await loader.getHarness(UiSuggestionHarness.with({ label: 'performance' }));
    await perf.dismiss();
    expect(ai.dismissSuggestion).toHaveBeenCalledWith('s-perf');
  });
  it('Edit link: no related links any more, they live in the link preview (#572)', async () => {
    const ai = fakeAiApi();
    ai.getLinkAi.mockReturnValue(
      of({
        aiStatus: null,
        reason: null,
        summary: null,
        summarySource: null,
        suggestions: [],
        autoApplied: null,
      }),
    );
    await setup(ai, { link: MOCK_LINKS[0] });
    await until(() => expect(root()?.querySelector('ui-select')).not.toBeNull());
    expect(root()?.querySelector('app-related-links')).toBeNull();
    expect(ai.related).not.toHaveBeenCalled();
  });
});
