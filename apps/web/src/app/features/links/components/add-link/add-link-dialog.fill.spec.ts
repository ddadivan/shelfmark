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
import { firstValueFrom, of, Subject } from 'rxjs';
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
  return {
    id: 'job-1',
    status: AI_JOB_STATUS.Done,
    reason: null,
    suggestions,
    summary: null,
    title: null,
  };
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
  it('applies the folder and all the tags, new ones too', async () => {
    const ai = withDraft([FOLDER, ANGULAR, SIGNALS, NEW_TAG]);
    const { loader, links, result } = await setup(ai);
    await typeUrl(URL);
    const fill = await vi.waitFor(() => loader.getHarness(UiButtonHarness.with({ text: FILL })));
    // The tinted AI button first in the footer, Cancel and Create link after it (AiTags 12); the
    // save hint steps aside while it shows.
    const footer = [
      ...(root()?.querySelectorAll(
        '[slot="footer"]:not(.add-link__confirm), .add-link__confirm > *',
      ) ?? []),
    ];
    expect(footer.map((el) => el.textContent?.trim())).toEqual([FILL, 'Cancel', 'Create link']);
    expect(root()?.querySelector('app-add-link-ai-fill button')?.classList).toContain(
      'ui-button--ai',
    );
    await fill.click();

    const select = await loader.getHarness(UiSelectHarness.with({ label: 'Folder' }));
    await until(async () => expect(await select.getValueText()).toContain(MOCK_NAME.FolderAngular));
    const tags = await loader.getHarness(UiTagInputHarness);
    expect(await tags.getTags()).toEqual(['angular', 'signals', 'state-management']);
    // The dashed chips of tags that are in the field now are gone.
    expect(
      await loader.getAllHarnesses(UiSuggestionHarness.with({ label: 'state management' })),
    ).toHaveLength(0);
    expect(root()?.querySelector('.add-link-ai-fill__live[aria-live="polite"]')?.textContent).toBe(
      'Filled in with AI’s suggestions',
    );
    // Ordinary values: no "Moved by AI" mark.
    expect(root()?.textContent).not.toContain('Moved by AI');

    await (await loader.getHarness(UiButtonHarness.with({ text: 'Create link' }))).click();
    await result;
    expect(links.create.mock.calls[0]?.[0]).toMatchObject({
      folderId: MOCK_ID.FolderAngular,
      tags: ['angular', 'signals', 'state-management'],
    });
  });

  it('takes back what it filled when another address is pasted, keeping what the user added (#510)', async () => {
    const ai = withDraft([FOLDER, ANGULAR, SIGNALS]);
    const { loader } = await setup(ai);
    await typeUrl(URL);
    const fill = await vi.waitFor(() => loader.getHarness(UiButtonHarness.with({ text: FILL })));
    await fill.click();
    const tags = await loader.getHarness(UiTagInputHarness);
    await until(async () => expect(await tags.getTags()).toEqual(['angular', 'signals']));
    await tags.addTag('mine');
    ai.createDraft.mockReturnValue(of(job([])));

    await typeUrl('https://example.org/another-page');

    await until(async () => expect(await tags.getTags()).toEqual(['mine']));
    const select = await loader.getHarness(UiSelectHarness.with({ label: 'Folder' }));
    expect(await select.getValueText()).not.toContain(MOCK_NAME.FolderAngular);
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

  it('shows while AI is on, inactive (aria-disabled, focusable) until a link is pasted', async () => {
    const ai = withDraft([ANGULAR]);
    const { loader } = await setup(ai);
    const button = (): HTMLButtonElement | null =>
      root()?.querySelector<HTMLButtonElement>('app-add-link-ai-fill button') ?? null;
    await vi.waitFor(() => loader.getHarness(UiButtonHarness.with({ text: FILL })));
    expect(button()?.getAttribute('aria-disabled')).toBe('true');
    expect(button()?.disabled).toBe(false);
    expect(root()?.textContent).toContain('Paste a link first');
    button()?.click();
    const tags = await loader.getHarness(UiTagInputHarness);
    expect(await tags.getTags()).toEqual([]);

    await typeUrl(URL);
    await until(() => expect(button()?.getAttribute('aria-disabled')).toBeNull());
  });

  it('waits for a running draft: locks Link, Folder, Tags and Summary, then fills and unlocks; title and note stay free', async () => {
    const ai = fakeAiApi();
    const arrival = new Subject<AiJobResponse>();
    ai.createDraft.mockReturnValue(arrival);
    const { loader, links, result } = await setup(ai);
    await typeUrl(URL);
    const fill = await vi.waitFor(() => loader.getHarness(UiButtonHarness.with({ text: FILL })));
    await fill.click();

    const busyButton = await loader.getHarness(UiButtonHarness.with({ text: /Filling/ }));
    expect(await busyButton.isLoading()).toBe(true);
    const field = (selector: string): HTMLInputElement | null =>
      root()?.querySelector<HTMLInputElement>(selector) ?? null;
    expect(field('input[type="url"]')?.disabled).toBe(true);
    expect(root()?.querySelector('.add-link__fields')?.getAttribute('aria-busy')).toBe('true');
    const create = await loader.getHarness(UiButtonHarness.with({ text: 'Create link' }));
    expect(await create.isDisabled()).toBe(true);
    // Title and note stay editable.
    const free = [...(root()?.querySelectorAll<HTMLInputElement>('input, textarea') ?? [])].filter(
      (el) => !el.disabled,
    );
    expect(free.length).toBeGreaterThanOrEqual(2);

    arrival.next({
      ...job([FOLDER, ANGULAR, NEW_TAG]),
      summary: 'A short AI summary.',
      title: 'A cleaner title',
    });
    arrival.complete();
    await until(() => expect(field('input[type="url"]')?.disabled).toBe(false));
    const tags = await loader.getHarness(UiTagInputHarness);
    expect(await tags.getTags()).toEqual(['angular', 'state-management']);
    const summary = root()?.querySelector<HTMLTextAreaElement>('app-summary-field textarea');
    expect(summary?.value).toBe('A short AI summary.');
    expect(root()?.querySelector('app-summary-field')?.textContent).toContain('Written by AI');
    expect(root()?.querySelector<HTMLInputElement>('input[type="text"]')?.value).not.toBe('');

    await (await loader.getHarness(UiButtonHarness.with({ text: 'Create link' }))).click();
    await result;
    // AI's own summary is the draft's: the request carries the cleaned title, not the summary.
    expect(links.create.mock.calls[0]?.[0]).toMatchObject({ title: 'A cleaner title' });
    expect(links.create.mock.calls[0]?.[0]).not.toHaveProperty('summary');
  });

  it('never replaces a title the user edited and sends an edited summary as theirs', async () => {
    const ai = withDraft([ANGULAR]);
    ai.createDraft.mockReturnValue(
      of({ ...job([ANGULAR]), summary: 'AI summary.', title: 'AI title' }),
    );
    const { loader, links, result } = await setup(ai);
    await typeUrl(URL);
    await vi.waitFor(() => loader.getHarness(UiButtonHarness.with({ text: FILL })));
    const title = (): HTMLInputElement | null =>
      root()?.querySelector<HTMLInputElement>('input[type="text"]') ?? null;
    const own = title();
    if (own) {
      own.value = 'My own title';
      own.dispatchEvent(new Event('input'));
    }
    TestBed.tick();
    await (await loader.getHarness(UiButtonHarness.with({ text: FILL }))).click();
    await until(() => expect(root()?.querySelector('app-summary-field textarea')).not.toBeNull());
    expect(title()?.value).toBe('My own title');
    const summary = root()?.querySelector<HTMLTextAreaElement>('app-summary-field textarea');
    if (summary) {
      summary.value = 'My words.';
      summary.dispatchEvent(new Event('input'));
    }
    TestBed.tick();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Create link' }))).click();
    await result;
    expect(links.create.mock.calls[0]?.[0]).toMatchObject({
      title: 'My own title',
      summary: 'My words.',
    });
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

  it('Edit link: Delete is icon-only while Fill shows, and Cancel with Save stay one group (#512)', async () => {
    const ai = fakeAiApi();
    const link: LinkResponse = { ...MOCK_LINKS[0], summary: null, summarySource: null, tags: [] };
    ai.getLinkAi.mockReturnValue(of(linkState({ suggestions: [ANGULAR] })));
    const { loader } = await setup(ai, { link });
    await vi.waitFor(() => loader.getHarness(UiButtonHarness.with({ text: FILL })));
    const remove = root()?.querySelector<HTMLElement>('.add-link__delete button');
    expect(remove?.getAttribute('aria-label')).toBe('Delete');
    expect(remove?.textContent?.trim()).toBe('');
    const group = root()?.querySelector('.add-link__confirm');
    expect([...(group?.children ?? [])].map((el) => el.textContent?.trim())).toEqual([
      'Cancel',
      'Save changes',
    ]);
  });

  it('Edit link: Delete keeps its label while AI is off (#512)', async () => {
    const ai = fakeAiApi(aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT } }));
    const link: LinkResponse = { ...MOCK_LINKS[0], tags: [] };
    await setup(ai, { link });
    const remove = root()?.querySelector<HTMLElement>('.add-link__delete button');
    expect(remove?.textContent?.trim()).toBe('Delete');
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
