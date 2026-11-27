import { HttpErrorResponse } from '@angular/common/http';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal, type Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { ASK_PERIOD, type AskEvent, type LinkResponse } from '@shelfmark/contracts';
import { DialogService, UiDialogRef, type ConfirmDialogConfig } from '@shelfmark/ui';
import { UiButtonHarness, UiStreamingAnswerHarness } from '@shelfmark/ui/testing';
import { firstValueFrom, Subject } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { FoldersStore } from '../../../../stores/folders.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { AI_API } from '../../models/ai-api.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskInbox } from '../../services/ask-inbox.service';
import { AskDrawerComponent } from './ask-drawer.component';

const ALLOWANCE = { questionsLeft: 11, period: ASK_PERIOD.Day, resetsOn: '2026-11-19' };
const LINK = {
  id: 'l1',
  url: 'https://www.seriouseats.com/ramen',
  title: 'Weeknight ramen',
  faviconUrl: null,
  folderId: null,
  tags: [],
} as unknown as LinkResponse;

async function setup(extra: Provider[] = []) {
  const api = fakeAiApi(aiSettingsResponse());
  const stream = new Subject<AskEvent>();
  api.ask.mockReturnValue(stream);
  const actions = { open: vi.fn(), remind: vi.fn(), addLink: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AI_API, useValue: api },
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: LinkActionsService, useValue: actions },
      {
        provide: FoldersStore,
        useValue: {
          load: vi.fn(),
          entities: signal([
            { id: 'f1', name: 'Recipes', linkCount: 9 },
            { id: 'f2', name: 'Clothes', linkCount: 3 },
          ]),
          counts: signal({ all: 17, unsorted: 5, favorites: 2 }),
        },
      },
      { provide: UserSettingsStore, useValue: { openInNewTab: signal(true) } },
      ...extra,
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  await TestBed.inject(AiSettingsStore).load();
  const fixture = TestBed.createComponent(AskDrawerComponent);
  await fixture.whenStable();
  return { api, stream, actions, fixture, loader: TestbedHarnessEnvironment.loader(fixture) };
}

describe('AskDrawerComponent', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('starts with what Ask can do, examples from the largest folders and the fine line', async () => {
    const { fixture, api } = await setup();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('h2')?.textContent?.trim()).toBe('Ask your shelf');
    expect(host.textContent).toContain('answered from the 17 links you saved');
    expect(host.textContent).toContain('12 questions left today');
    expect(host.textContent).toContain('Answers are written by AI and can be wrong');
    expect(
      [...host.querySelectorAll('.ui-ask-starters__title')].map((title) =>
        title.textContent?.trim(),
      ),
    ).toEqual(['Find', 'Count and compare', 'Summarise', 'Plan and pick']);
    const starters = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.ui-ask-starters__question'),
    );
    expect(starters.filter((starter) => /Clothes/u.test(starter.textContent ?? ''))).toHaveLength(
      1,
    );
    expect(await axeViolations(host)).toEqual([]);
    starters.find((starter) => /about Recipes/u.test(starter.textContent ?? ''))?.click();
    expect(api.ask).toHaveBeenCalledWith('What did I save about Recipes?', []);
  });

  it('streams the answer, shows sources, and a citation highlights its tile', async () => {
    const { fixture, loader, stream } = await setup();
    TestBed.inject(AskInbox).put('Which ramen recipes did I save?');
    await fixture.whenStable();
    const answer = await loader.getHarness(UiStreamingAnswerHarness);
    expect(await answer.getQuestion()).toBe('Which ramen recipes did I save?');
    expect(await answer.isStreaming()).toBe(true);
    expect(await loader.getHarness(UiButtonHarness.with({ text: 'Stop' }))).toBeTruthy();

    stream.next({ type: 'meta', allowance: ALLOWANCE });
    stream.next({ type: 'text', text: 'The quickest is the weeknight ramen ' });
    stream.next({ type: 'cite', n: 1 });
    stream.next({ type: 'cite', n: 2 });
    stream.next({ type: 'text', text: '.' });
    stream.next({
      type: 'done',
      sources: [{ n: 1, link: LINK }],
      notFound: false,
      truncated: false,
      allowance: ALLOWANCE,
      turn: { question: '', answer: '', links: [] },
      depth: 'quick',
      conversationId: null,
    });
    stream.complete();
    await fixture.whenStable();

    expect(await answer.isStreaming()).toBe(false);
    expect(await answer.getDisclaimer()).toBeNull();
    expect(await answer.getCitationLabels()).toEqual(['Source 1', 'Source 2']);
    expect(await answer.isCitationDisabled(1)).toBe(true);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Sources from your shelf');
    expect(host.textContent).toContain('11 questions left today');
    await answer.clickCitation(0);
    await fixture.whenStable();
    expect(
      host.querySelector(
        '#ask-1-source-1 .ui-list-item--selected, #ask-1-source-1 [aria-current="true"]',
      ),
    ).not.toBeNull();
    expect(await axeViolations(host)).toEqual([]);
  });

  it('shows the status while tools run, the finished step, cards with "Show all", and asks for a follow-up after', async () => {
    const { fixture, loader, stream } = await setup();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    TestBed.inject(AskInbox).put('find ramen');
    await fixture.whenStable();
    const answer = await loader.getHarness(UiStreamingAnswerHarness);
    stream.next({ type: 'meta', allowance: ALLOWANCE });
    stream.next({ type: 'activity', activity: 'search', phase: 'start', found: null });
    await fixture.whenStable();
    expect(await answer.getStatus()).toBe('Searching your links…');
    stream.next({ type: 'activity', activity: 'search', phase: 'end', found: 9 });
    stream.next({ type: 'text', text: 'I found 9 links about ramen. ' });
    stream.next({
      type: 'links',
      items: [{ n: 1, link: LINK }],
      total: 9,
      search: { q: 'ramen', folderId: null, tags: [], kind: null, favorite: false },
    });
    await fixture.whenStable();
    expect(await answer.getStatus()).toBeNull();
    expect(await answer.getSteps()).toEqual(['Searched your links · 9 found']);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('#ask-1-source-1')?.textContent).toContain('Weeknight ramen');
    stream.next({
      type: 'done',
      sources: [{ n: 1, link: LINK }],
      notFound: false,
      truncated: false,
      allowance: ALLOWANCE,
      turn: {
        question: 'find ramen',
        answer: 'I found 9 links about ramen. ',
        links: [{ n: 1, id: 'l1' }],
      },
      depth: 'quick',
      // Stored on the server: New conversation asks nothing.
      conversationId: '0192f3a4-5b6c-7d8e-9f01-23456789abcd',
    });
    stream.complete();
    await fixture.whenStable();
    // The card is not listed again under "Sources from your shelf".
    expect(host.textContent).not.toContain('Sources from your shelf');
    expect(host.querySelector('textarea')?.getAttribute('placeholder')).toBe('Ask a follow-up');
    expect(
      await loader.getHarness(UiButtonHarness.with({ name: 'More actions for “Weeknight ramen”' })),
    ).toBeTruthy();
    expect(await axeViolations(host)).toEqual([]);
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Show all 9 in search' }))).click();
    expect(navigate).toHaveBeenCalledWith(['/', 'links'], { queryParams: { q: 'ramen' } });
    await (await loader.getHarness(UiButtonHarness.with({ name: 'New conversation' }))).click();
    await fixture.whenStable();
    expect(host.textContent).toContain('Count and compare');
  });

  it('drops a question handed over while another streams, and clears the inbox on close', async () => {
    const { fixture, stream, api } = await setup();
    const inbox = TestBed.inject(AskInbox);
    inbox.put('Which ramen recipes did I save?');
    await fixture.whenStable();
    inbox.put('Compare the two coats I liked');
    await fixture.whenStable();
    expect(inbox.pending()).toBeNull();
    stream.next({
      type: 'done',
      sources: [],
      notFound: true,
      truncated: false,
      allowance: ALLOWANCE,
      turn: { question: '', answer: '', links: [] },
      depth: 'quick',
      conversationId: null,
    });
    stream.complete();
    await fixture.whenStable();
    expect(api.ask).toHaveBeenCalledTimes(1);
    inbox.put('ramen recipes again');
    fixture.destroy();
    expect(inbox.pending()).toBeNull();
  });

  it('keeps citations enabled after Stop, when no done arrived', async () => {
    const { fixture, loader, stream } = await setup();
    TestBed.inject(AskInbox).put('Which ramen recipes did I save?');
    await fixture.whenStable();
    stream.next({ type: 'text', text: 'The weeknight ramen ' });
    stream.next({ type: 'cite', n: 1 });
    await fixture.whenStable();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Stop' }))).click();
    await fixture.whenStable();
    const answer = await loader.getHarness(UiStreamingAnswerHarness);
    expect(await answer.isStreaming()).toBe(false);
    expect(await answer.isCitationDisabled(0)).toBe(false);
  });

  it('shows the rate-limit line with Try again for a 429', async () => {
    const { fixture, loader, stream } = await setup();
    TestBed.inject(AskInbox).put('Which ramen recipes did I save?');
    await fixture.whenStable();
    stream.error(new HttpErrorResponse({ status: 429 }));
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Too many questions in a short time.');
    expect(await loader.getHarness(UiButtonHarness.with({ text: 'Try again' }))).toBeTruthy();
  });

  it('shows the limit line, then the limit row with Open search in place of the composer', async () => {
    const { fixture, loader, stream } = await setup();
    TestBed.inject(AskInbox).put('Compare the two coats I liked');
    await fixture.whenStable();
    stream.next({
      type: 'error',
      reason: 'quota',
      counted: false,
      allowance: { ...ALLOWANCE, questionsLeft: 0 },
    });
    stream.complete();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('You’ve used today’s questions.');
    expect(host.querySelector('textarea')).toBeNull();
    await (await loader.getHarness(UiButtonHarness.with({ name: 'New conversation' }))).click();
    await fixture.whenStable();
    expect(host.querySelector('.ui-notice--quiet')?.textContent).toContain(
      'You’ve used today’s questions.',
    );
    expect(await loader.getHarness(UiButtonHarness.with({ text: 'Open search' }))).toBeTruthy();
    expect(host.querySelector('.ui-ask-starters__card')).toBeNull();
  });

  it('offers Try again for a failed question and Search for one the links do not answer', async () => {
    const { fixture, loader, stream, api } = await setup();
    TestBed.inject(AskInbox).put('ramen ai-fail');
    await fixture.whenStable();
    stream.next({ type: 'error', reason: 'unavailable', counted: false, allowance: ALLOWANCE });
    stream.complete();
    await fixture.whenStable();
    const retry = await loader.getHarness(UiButtonHarness.with({ text: 'Try again' }));
    const second = new Subject<AskEvent>();
    api.ask.mockReturnValue(second);
    await retry.click();
    expect(api.ask).toHaveBeenCalledTimes(2);
    second.next({
      type: 'done',
      sources: [],
      notFound: true,
      truncated: false,
      allowance: ALLOWANCE,
      turn: { question: '', answer: '', links: [] },
      depth: 'quick',
      conversationId: null,
    });
    second.complete();
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await (
      await loader.getHarness(UiButtonHarness.with({ text: 'Search “ramen ai-fail”' }))
    ).click();
    expect(navigate).toHaveBeenCalledWith(['/links'], { queryParams: { q: 'ramen ai-fail' } });
  });

  it('quotes a long question short in "Search “…”" (no sideways scroll) and searches the whole of it', async () => {
    const { fixture, loader, stream } = await setup();
    const question =
      'which of my links explain decorators and how they work in Angular 22 in detail';
    TestBed.inject(AskInbox).put(question);
    await fixture.whenStable();
    stream.next({
      type: 'done',
      sources: [],
      notFound: true,
      truncated: false,
      allowance: ALLOWANCE,
      turn: { question, answer: '', links: [] },
      depth: 'quick',
      conversationId: null,
    });
    stream.complete();
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const search = await loader.getHarness(
      UiButtonHarness.with({ text: 'Search “which of my links explain decorators…”' }),
    );
    await search.click();
    expect(navigate).toHaveBeenCalledWith(['/links'], { queryParams: { q: question } });
  });

  describe('leave guard (Ask history)', () => {
    const done = (conversationId: string | null): AskEvent => ({
      type: 'done',
      sources: [],
      notFound: false,
      truncated: false,
      allowance: ALLOWANCE,
      turn: { question: 'find ramen', answer: 'Two links.', links: [] },
      depth: 'quick',
      conversationId,
    });
    const ID = '0192f3a4-5b6c-7d8e-9f01-23456789abcd';

    async function guarded(answer: boolean) {
      let guard: (() => boolean | Promise<boolean>) | null = null;
      const ref = {
        setCloseGuard: vi.fn((next: typeof guard) => {
          guard = next;
        }),
        close: vi.fn(),
        locked: () => false,
        leaving: signal(false),
      };
      const dialogs = {
        confirm: vi.fn<(config: ConfirmDialogConfig) => Promise<boolean>>(async () => answer),
      };
      const context = await setup([
        { provide: UiDialogRef, useValue: ref },
        { provide: DialogService, useValue: dialogs },
      ]);
      const ask = async (event: AskEvent | null) => {
        context.fixture.componentInstance['store'].ask('find ramen');
        if (event !== null) context.stream.next(event);
        await context.fixture.whenStable();
      };
      return { ...context, ref, dialogs, ask, guard: () => guard };
    }

    it('closes without asking while everything is stored or nothing was asked', async () => {
      const { guard, dialogs, ask } = await guarded(false);
      expect(await guard()?.()).toBe(true);
      await ask(done(ID));
      expect(await guard()?.()).toBe(true);
      expect(dialogs.confirm).not.toHaveBeenCalled();
    });

    it('asks before closing while an answer streams: Stay keeps it open', async () => {
      const { guard, dialogs, ask } = await guarded(false);
      await ask(null);
      expect(await guard()?.()).toBe(false);
      expect(dialogs.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Leave this conversation?',
          confirmLabel: 'Leave',
          cancelLabel: 'Stay',
          focusCancel: true,
        }),
      );
      expect(dialogs.confirm.mock.calls[0]?.[0]).not.toHaveProperty('destructive');
    });

    it('asks before New conversation when the answer was not stored; Leave starts over', async () => {
      const { dialogs, ask, fixture, loader } = await guarded(true);
      await ask(done(null));
      await (await loader.getHarness(UiButtonHarness.with({ name: 'New conversation' }))).click();
      await fixture.whenStable();
      expect(dialogs.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('isn’t saved') }),
      );
      expect(fixture.componentInstance['store'].entries()).toEqual([]);
    });

    it('opens the full page with the stored conversation', async () => {
      const navigate = vi.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);
      const { ref, ask, fixture, loader, dialogs } = await guarded(true);
      await ask(done(ID));
      await (await loader.getHarness(UiButtonHarness.with({ name: 'Open full page' }))).click();
      await fixture.whenStable();
      expect(dialogs.confirm).not.toHaveBeenCalled();
      expect(ref.close).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/', 'ask'], { queryParams: { c: ID } });
    });

    it('lets the browser ask on tab close only while something is not stored', async () => {
      const { ask } = await guarded(true);
      const unload = () => {
        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      };
      expect(unload()).toBe(false);
      await ask(null);
      expect(unload()).toBe(true);
    });
  });
});
