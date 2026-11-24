import { HttpErrorResponse } from '@angular/common/http';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import {
  ASK_DEPTH,
  ASK_PERIOD,
  type AskConversationListResponse,
  type AskConversationResponse,
  type AskEvent,
} from '@shelfmark/contracts';
import { DialogService, ToastService, type ConfirmDialogConfig } from '@shelfmark/ui';
import { UiButtonHarness, UiStreamingAnswerHarness } from '@shelfmark/ui/testing';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { PushedPage } from '../../../../core/layout/pushed-page.service';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { FoldersStore } from '../../../../stores/folders.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { AI_API } from '../../models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../models/ai-settings-default.const';
import { ASK_HISTORY_API } from '../../models/ask-history-api.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskHistorySheet } from '../../services/ask-history-sheet.service';
import { AskHistoryStore } from '../../services/ask-history.store';
import { AskInbox } from '../../services/ask-inbox.service';
import { askLeaveGuard } from './ask-leave.guard';
import AskPage from './ask.page';

const ALLOWANCE = { questionsLeft: 11, period: ASK_PERIOD.Day, resetsOn: '2026-11-19' };
const STORED_ID = '0192f3a4-5b6c-7d8e-9f01-23456789abcd';
const NEW_ID = '0192f3a4-5b6c-7d8e-9f01-23456789ffff';
const now = new Date().toISOString();

const LIST: AskConversationListResponse = {
  items: [
    { id: STORED_ID, title: 'Coats I saved in autumn', turns: 1, createdAt: now, updatedAt: now },
    {
      id: NEW_ID,
      title: 'Summarise my Design folder',
      turns: 1,
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    },
  ],
  nextCursor: null,
};

const CONVERSATION: AskConversationResponse = {
  id: STORED_ID,
  title: 'Coats I saved in autumn',
  createdAt: now,
  updatedAt: now,
  turns: [
    {
      turn: { question: 'Coats I saved in autumn', answer: 'You saved two coats.', links: [] },
      sources: [],
      cards: [],
      steps: [{ activity: 'search', found: 2 }],
      notFound: false,
      truncated: false,
      depth: ASK_DEPTH.Quick,
      createdAt: now,
    },
  ],
};

function done(conversationId: string | null): AskEvent {
  return {
    type: 'done',
    sources: [],
    notFound: false,
    truncated: false,
    allowance: ALLOWANCE,
    turn: { question: 'Which ramen recipes did I save?', answer: 'Two.', links: [] },
    depth: 'quick',
    conversationId,
  };
}

async function setup({
  compact = true,
  ask = true,
  url = '/ask',
  leave = true,
  getFails = false,
} = {}) {
  const api = fakeAiApi(
    aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT, enabled: true, ask } }),
  );
  const stream = new Subject<AskEvent>();
  api.ask.mockReturnValue(stream);
  const history = {
    list: vi.fn(() => of(LIST)),
    get: vi.fn(() =>
      getFails ? throwError(() => new HttpErrorResponse({ status: 404 })) : of(CONVERSATION),
    ),
    remove: vi.fn(() => of(undefined)),
    clear: vi.fn(() => of({ deleted: 2 })),
  };
  const dialogs = { confirm: vi.fn(async (_config: ConfirmDialogConfig) => leave) };
  const toasts = { show: vi.fn() };
  const sheet = { open: vi.fn(async () => STORED_ID) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'library', children: [] },
        { path: 'links', children: [] },
        { path: 'ask', component: AskPage, canDeactivate: [askLeaveGuard] },
      ]),
      { provide: AI_API, useValue: api },
      { provide: ASK_HISTORY_API, useValue: history },
      { provide: DialogService, useValue: dialogs },
      { provide: ToastService, useValue: toasts },
      { provide: AskHistorySheet, useValue: sheet },
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      {
        provide: LinkActionsService,
        useValue: { open: vi.fn(), remind: vi.fn(), addLink: vi.fn() },
      },
      {
        provide: FoldersStore,
        useValue: {
          load: vi.fn(),
          entities: signal([]),
          counts: signal({ all: 17, unsorted: 0, favorites: 0 }),
        },
      },
      { provide: UserSettingsStore, useValue: { openInNewTab: signal(true) } },
      {
        provide: ViewportService,
        useValue: { compact: signal(compact), phone: signal(compact), wide: signal(false) },
      },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  await TestBed.inject(AiSettingsStore).load();
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await harness.fixture.whenStable();
  const router = TestBed.inject(Router);
  const host = harness.routeNativeElement;
  return {
    api,
    stream,
    history,
    dialogs,
    toasts,
    sheet,
    harness,
    router,
    host: host ?? document.createElement('div'),
    loader: TestbedHarnessEnvironment.loader(harness.fixture),
    settle: () => harness.fixture.whenStable(),
  };
}

describe('AskPage (#499, Ask history)', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('starts as a tab page: the hidden title, the spark, one example per kind, Conversations and the composer', async () => {
    const { host, api } = await setup();
    expect(host.querySelector('h1')?.textContent?.trim()).toBe('Ask your shelf');
    expect(
      host.querySelector('.ask-conversation__spark ui-icon use')?.getAttribute('href'),
    ).toMatch(/-spark$/);
    expect(host.textContent).toContain('Ask anything about your 17 links.');
    // The fine line is left out on a phone (Shelf hides it below 40em).
    expect(host.querySelector('.ask-composer__footer')).toBeNull();
    expect(host.querySelector('.ask-page__bar app-ask-composer')).not.toBeNull();
    expect(host.querySelector('[aria-label="Conversations"]')).not.toBeNull();
    expect(host.querySelector('app-ask-history-list')).toBeNull();
    const pills = host.querySelectorAll<HTMLButtonElement>('.ui-ask-starters__pill');
    expect(pills.length).toBe(4);
    expect(TestBed.inject(PushedPage).active()).toBe(false);
    expect(await axeViolations(host)).toEqual([]);
    pills[1].click();
    expect(api.ask).toHaveBeenCalledWith('How many links do I have, by folder?', []);
  });

  it('pushes the conversation over the tab; Back asks while it streams and Stay keeps it', async () => {
    const { host, loader, api, dialogs, settle } = await setup({ leave: false });
    TestBed.inject(AskInbox).put('Which ramen recipes did I save?');
    await settle();
    expect(api.ask).toHaveBeenCalledWith('Which ramen recipes did I save?', []);
    expect(host.querySelector('h1')?.textContent?.trim()).toBe('Which ramen recipes did I save?');
    expect(TestBed.inject(PushedPage).active()).toBe(true);
    await (await loader.getHarness(UiButtonHarness.with({ name: 'Back' }))).click();
    await settle();
    expect(dialogs.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Leave this conversation?',
        message: expect.stringContaining('still being written'),
        cancelLabel: 'Stay',
        confirmLabel: 'Leave',
        focusCancel: true,
      }),
    );
    expect(await loader.getAllHarnesses(UiStreamingAnswerHarness)).toHaveLength(1);
  });

  it('Back starts over without asking once the answer is stored, and the URL names it meanwhile', async () => {
    const { loader, stream, dialogs, router, settle } = await setup();
    TestBed.inject(AskInbox).put('Which ramen recipes did I save?');
    await settle();
    stream.next(done(NEW_ID));
    stream.complete();
    await settle();
    await vi.waitFor(() => expect(router.url).toBe(`/ask?c=${NEW_ID}`));
    await (await loader.getHarness(UiButtonHarness.with({ name: 'Back' }))).click();
    await settle();
    expect(dialogs.confirm).not.toHaveBeenCalled();
    expect(await loader.getAllHarnesses(UiStreamingAnswerHarness)).toEqual([]);
    expect(router.url).toBe('/ask');
    expect(TestBed.inject(PushedPage).active()).toBe(false);
  });

  it('asks before New conversation when the answer was not stored (history off); Leave starts over', async () => {
    const { loader, stream, dialogs, settle } = await setup();
    TestBed.inject(AskInbox).put('Which ramen recipes did I save?');
    await settle();
    stream.next(done(null));
    await settle();
    await (await loader.getHarness(UiButtonHarness.with({ name: 'New conversation' }))).click();
    await settle();
    expect(dialogs.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('isn’t saved') }),
    );
    expect(await loader.getAllHarnesses(UiStreamingAnswerHarness)).toEqual([]);
  });

  it('asks before a route leaves the page while something is not stored; Stay keeps the URL', async () => {
    const stay = await setup({ leave: false });
    TestBed.inject(AskInbox).put('Which ramen recipes did I save?');
    await stay.settle();
    expect(await stay.router.navigateByUrl('/library')).toBe(false);
    expect(stay.router.url).toBe('/ask');
    expect(stay.dialogs.confirm).toHaveBeenCalledTimes(1);
  });

  it('leaves by route at once when nothing is unsaved, and after Leave otherwise', async () => {
    const quiet = await setup();
    expect(await quiet.router.navigateByUrl('/library')).toBe(true);
    expect(quiet.dialogs.confirm).not.toHaveBeenCalled();
    TestBed.resetTestingModule();
    const leaving = await setup({ leave: true });
    TestBed.inject(AskInbox).put('Which ramen recipes did I save?');
    await leaving.settle();
    expect(await leaving.router.navigateByUrl('/library')).toBe(true);
    expect(leaving.dialogs.confirm).toHaveBeenCalledTimes(1);
  });

  it('is no longer pushed once it leaves', async () => {
    const { settle, router } = await setup();
    TestBed.inject(AskInbox).put('Which ramen recipes did I save?');
    await settle();
    await router.navigateByUrl('/library');
    expect(TestBed.inject(PushedPage).active()).toBe(false);
  });

  it('shows the conversation list beside the chat from the desktop width', async () => {
    const { host, history, settle } = await setup({ compact: false });
    await settle();
    expect(history.list).toHaveBeenCalled();
    const list = host.querySelector('app-ask-history-list');
    expect(list).not.toBeNull();
    expect(list?.textContent).toContain('Today');
    expect(list?.textContent).toContain('Earlier');
    expect(list?.textContent).toContain('Coats I saved in autumn');
    expect(list?.textContent).toContain('Kept on your account for 30 days.');
    // The full start (what it can do), not the phone's compact one.
    expect(host.querySelector('.ui-ask-starters__pill')).toBeNull();
    expect(host.querySelector('[aria-label="Conversations"] [role="list"]')).not.toBeNull();
    expect(await axeViolations(host)).toEqual([]);
  });

  it('opens a stored conversation from the list and continues it with its id', async () => {
    const { host, history, api, router, settle, loader } = await setup({ compact: false });
    await settle();
    host.querySelector<HTMLAnchorElement>('ui-conversation-row a')?.click();
    await settle();
    await vi.waitFor(() => expect(router.url).toBe(`/ask?c=${STORED_ID}`));
    expect(history.get).toHaveBeenCalledWith(STORED_ID);
    await settle();
    const answers = await loader.getAllHarnesses(UiStreamingAnswerHarness);
    expect(answers).toHaveLength(1);
    expect(await answers[0]?.getQuestion()).toBe('Coats I saved in autumn');
    expect(host.querySelector('[aria-current="page"]')?.textContent).toContain(
      'Coats I saved in autumn',
    );
    TestBed.inject(AskInbox).put('and the cheaper one?');
    await settle();
    expect(api.ask).toHaveBeenCalledWith(
      'and the cheaper one?',
      [CONVERSATION.turns[0]?.turn],
      STORED_ID,
    );
  });

  it('opens ?c=<id> on load; a conversation that cannot be read toasts and drops ?c', async () => {
    const opened = await setup({ url: `/ask?c=${STORED_ID}` });
    await opened.settle();
    expect(opened.history.get).toHaveBeenCalledWith(STORED_ID);
    TestBed.resetTestingModule();
    const failed = await setup({ url: `/ask?c=${STORED_ID}`, getFails: true });
    await failed.settle();
    await vi.waitFor(() => expect(failed.router.url).toBe('/ask'));
    expect(failed.toasts.show).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'This conversation couldn’t be opened.' }),
    );
  });

  it('starts over when the open conversation is deleted from the list', async () => {
    const { host, settle, router, loader } = await setup({
      compact: false,
      url: `/ask?c=${STORED_ID}`,
    });
    await settle();
    expect(await loader.getAllHarnesses(UiStreamingAnswerHarness)).toHaveLength(1);
    host
      .querySelector<HTMLElement>('[aria-current="page"]')
      ?.closest('ui-conversation-row')
      ?.querySelector<HTMLButtonElement>('[aria-label="Delete conversation"]')
      ?.click();
    await settle();
    await vi.waitFor(() => expect(router.url).toBe('/ask'));
    expect(await loader.getAllHarnesses(UiStreamingAnswerHarness)).toEqual([]);
    expect(
      TestBed.inject(AskHistoryStore)
        .items()
        .map((item) => item.id),
    ).toEqual([NEW_ID]);
  });

  it('opens the phone Conversations sheet and the chosen conversation', async () => {
    const { loader, sheet, history, settle } = await setup();
    await (await loader.getHarness(UiButtonHarness.with({ name: 'Conversations' }))).click();
    await settle();
    expect(sheet.open).toHaveBeenCalledWith(null, expect.any(Function));
    await vi.waitFor(() => expect(history.get).toHaveBeenCalledWith(STORED_ID));
  });

  it('lets the browser ask on tab close only while something is not stored', async () => {
    const { settle } = await setup();
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(unload()).toBe(false);
    TestBed.inject(AskInbox).put('Which ramen recipes did I save?');
    await settle();
    expect(unload()).toBe(true);
  });

  it('renders nothing and leaves for Library while Ask is off', async () => {
    const { harness, router } = await setup({ ask: false });
    expect(harness.fixture.nativeElement.querySelector('.ask-page')).toBeNull();
    await vi.waitFor(() => expect(router.url).toBe('/library'));
  });
});
