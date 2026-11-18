import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import {
  AI_JOB_STATUS,
  LINK_KIND,
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  SUMMARY_SOURCE,
  type AiJobResponse,
  type AiSettingsResponse,
  type LinkAiState,
  type LinkPreviewResponse,
  type LinkResponse,
  type LinkSuggestion,
} from '@shelfmark/contracts';
import { MOCK_ID, MOCK_LINKS, MOCK_NAME } from '@shelfmark/contracts/testing';
import {
  UiButtonHarness,
  UiSelectHarness,
  UiSuggestionHarness,
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
const FILL = 'Fill in with AI';

const PREVIEW: LinkPreviewResponse = {
  preview: {
    kind: LINK_KIND.Article,
    url: URL,
    title: 'Signals in practice',
    description: null,
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

const FOLDER = suggestion('s-folder', SUGGESTION_KIND.Folder, null, MOCK_ID.FolderAngular);
const ANGULAR = suggestion('s-angular', SUGGESTION_KIND.Tag, 'angular');
const SIGNALS = suggestion('s-signals', SUGGESTION_KIND.Tag, 'signals');
const NEW_TAG = suggestion('s-new', SUGGESTION_KIND.NewTag, 'state management');

function job(suggestions: LinkSuggestion[]): AiJobResponse {
  return { id: 'job-1', status: AI_JOB_STATUS.Done, reason: null, suggestions, summary: null };
}

function linkState(state: Partial<LinkAiState>): LinkAiState {
  return {
    aiStatus: AI_JOB_STATUS.Done,
    reason: null,
    summary: null,
    summarySource: null,
    suggestions: [],
    autoApplied: null,
    ...state,
  };
}

interface FakeLinksApi extends Pick<LinksApi, 'preview' | 'create' | 'update'> {
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

async function setup(ai: FakeAiApi, data: AddLinkData = {}) {
  const links = linksApi();
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

function withDraft(suggestions: LinkSuggestion[], settings?: AiSettingsResponse): FakeAiApi {
  const ai = fakeAiApi(settings);
  ai.createDraft.mockReturnValue(of(job(suggestions)));
  return ai;
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.replaceChildren());
});

describe('AddLinkDialogComponent: Fill in with AI (F1c)', () => {
  it('applies the folder and the existing tags; the new tag stays a chip', async () => {
    const ai = withDraft([FOLDER, ANGULAR, SIGNALS, NEW_TAG]);
    const { loader, links, result } = await setup(ai);
    await typeUrl(URL);
    const fill = await vi.waitFor(() => loader.getHarness(UiButtonHarness.with({ text: FILL })));
    // A footer action, right before the primary button (F1c, AiTags 12).
    const footer = [...(root()?.querySelectorAll('[slot="footer"]') ?? [])];
    const fillAt = footer.findIndex((el) => el.tagName === 'APP-ADD-LINK-AI-FILL');
    expect(fillAt).toBeGreaterThan(-1);
    expect(footer[fillAt + 1]?.textContent?.trim()).toBe('Create link');
    await fill.click();

    const select = await loader.getHarness(UiSelectHarness.with({ label: 'Folder' }));
    await until(async () => expect(await select.getValueText()).toContain(MOCK_NAME.FolderAngular));
    const tags = await loader.getHarness(UiTagInputHarness);
    expect(await tags.getTags()).toEqual(['angular', 'signals']);
    expect(
      await loader.getAllHarnesses(UiSuggestionHarness.with({ label: 'state management' })),
    ).toHaveLength(1);
    expect(await loader.getAllHarnesses(UiButtonHarness.with({ text: FILL }))).toEqual([]);
    expect(root()?.querySelector('.add-link-ai-fill__live')?.textContent).toBe(
      'Filled in with AI’s suggestions',
    );
    // Ordinary values: no "Moved by AI" mark.
    expect(root()?.textContent).not.toContain('Moved by AI');

    await (await loader.getHarness(UiButtonHarness.with({ text: 'Create link' }))).click();
    await result;
    expect(links.create.mock.calls[0]?.[0]).toMatchObject({
      folderId: MOCK_ID.FolderAngular,
      tags: ['angular', 'signals'],
    });
  });

  it('never replaces a folder already chosen and only adds tags', async () => {
    const ai = withDraft([FOLDER, ANGULAR]);
    const { loader } = await setup(ai, { folderId: MOCK_ID.FolderReading });
    await typeUrl(URL);
    const fill = await vi.waitFor(() => loader.getHarness(UiButtonHarness.with({ text: FILL })));
    await fill.click();
    const tags = await loader.getHarness(UiTagInputHarness);
    await until(async () => expect(await tags.getTags()).toEqual(['angular']));
    const select = await loader.getHarness(UiSelectHarness.with({ label: 'Folder' }));
    expect(await select.getValueText()).toContain(MOCK_NAME.FolderReading);
    // The folder chip stays as "Also fits".
    expect(root()?.querySelector('ui-suggestion-row')?.textContent).toContain('Also fits');
  });

  it('runs from Alt+Shift+F inside the dialog', async () => {
    const ai = withDraft([ANGULAR]);
    const { loader } = await setup(ai);
    await typeUrl(URL);
    await vi.waitFor(() => loader.getHarness(UiButtonHarness.with({ text: FILL })));
    root()
      ?.querySelector('form')
      ?.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyF', altKey: true, shiftKey: true, bubbles: true }),
      );
    const tags = await loader.getHarness(UiTagInputHarness);
    await until(async () => expect(await tags.getTags()).toEqual(['angular']));
  });

  it('is hidden with only a new tag or a folder under a chosen one', async () => {
    const ai = withDraft([FOLDER, NEW_TAG]);
    const { loader } = await setup(ai, { folderId: MOCK_ID.FolderReading });
    await typeUrl(URL);
    await vi.waitFor(() =>
      loader.getHarness(UiSuggestionHarness.with({ label: 'state management' })),
    );
    expect(await loader.getAllHarnesses(UiButtonHarness.with({ text: FILL }))).toEqual([]);
  });

  it('is hidden while AI is off', async () => {
    const ai = withDraft(
      [FOLDER, ANGULAR],
      aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT } }),
    );
    const { loader, links } = await setup(ai);
    await typeUrl(URL);
    await until(() => expect(links.preview).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await loader.getAllHarnesses(UiButtonHarness.with({ text: FILL }))).toEqual([]);
  });

  it('Edit link: puts a newly written AI summary into the empty field without sending it', async () => {
    const ai = fakeAiApi();
    const link: LinkResponse = { ...MOCK_LINKS[0], summary: null, summarySource: null, tags: [] };
    ai.getLinkAi.mockReturnValue(
      of(
        linkState({
          summary: 'Five patterns for SignalStore.',
          summarySource: SUMMARY_SOURCE.Ai,
          suggestions: [ANGULAR],
        }),
      ),
    );
    const { loader, links, result } = await setup(ai, { link });
    const fill = await vi.waitFor(() => loader.getHarness(UiButtonHarness.with({ text: FILL })));
    await fill.click();
    const field = (): string =>
      root()?.querySelector<HTMLTextAreaElement>('app-summary-field textarea')?.value ?? '';
    await until(() => expect(field()).toBe('Five patterns for SignalStore.'));
    expect(root()?.querySelector('app-summary-field')?.textContent).toContain('Written by AI');

    await (await loader.getHarness(UiButtonHarness.with({ text: 'Save changes' }))).click();
    await result;
    expect(links.update).toHaveBeenCalledWith(link.id, { tags: ['angular'] });
  });
});
