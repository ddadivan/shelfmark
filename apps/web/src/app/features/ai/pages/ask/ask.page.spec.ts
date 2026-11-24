import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import type { AskEvent } from '@shelfmark/contracts';
import { UiButtonHarness, UiStreamingAnswerHarness } from '@shelfmark/ui/testing';
import { firstValueFrom, Subject } from 'rxjs';
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
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskInbox } from '../../services/ask-inbox.service';
import { AskPanelService } from '../../services/ask-panel.service';
import AskPage from './ask.page';

async function setup({ compact = true, ask = true } = {}) {
  const api = fakeAiApi(
    aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT, enabled: true, ask } }),
  );
  const stream = new Subject<AskEvent>();
  api.ask.mockReturnValue(stream);
  const panel = { open: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'library', children: [] },
        { path: 'links', children: [] },
        { path: 'ask', component: AskPage },
      ]),
      { provide: AI_API, useValue: api },
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
      { provide: AskPanelService, useValue: panel },
      {
        provide: ViewportService,
        useValue: { compact: signal(compact), phone: signal(compact), wide: signal(false) },
      },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  await TestBed.inject(AiSettingsStore).load();
  const fixture = TestBed.createComponent(AskPage);
  await fixture.whenStable();
  return { api, stream, panel, fixture, loader: TestbedHarnessEnvironment.loader(fixture) };
}

describe('AskPage (#499)', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('starts as a tab page: the hidden title, the spark, one example per kind and the composer', async () => {
    const { fixture, api } = await setup();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('h1')?.textContent?.trim()).toBe('Ask your shelf');
    expect(
      host.querySelector('.ask-conversation__spark ui-icon use')?.getAttribute('href'),
    ).toMatch(/-spark$/);
    expect(host.textContent).toContain('Ask anything about your 17 links.');
    // The fine line is left out on a phone (Shelf hides it below 40em).
    expect(host.querySelector('.ask-composer__footer')).toBeNull();
    expect(host.querySelector('.ask-page__bar app-ask-composer')).not.toBeNull();
    const pills = host.querySelectorAll<HTMLButtonElement>('.ui-ask-starters__pill');
    expect(pills.length).toBe(4);
    expect(TestBed.inject(PushedPage).active()).toBe(false);
    expect(await axeViolations(host)).toEqual([]);
    pills[1].click();
    expect(api.ask).toHaveBeenCalledWith('How many links do I have, by folder?', []);
  });

  it('pushes the conversation over the tab with Back and the question as the title', async () => {
    const { fixture, loader, api } = await setup();
    TestBed.inject(AskInbox).put('Which ramen recipes did I save?');
    await fixture.whenStable();
    expect(api.ask).toHaveBeenCalledWith('Which ramen recipes did I save?', []);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('h1')?.textContent?.trim()).toBe('Which ramen recipes did I save?');
    expect(TestBed.inject(PushedPage).active()).toBe(true);
    const answer = await loader.getHarness(UiStreamingAnswerHarness);
    expect(await answer.getQuestion()).toBe('Which ramen recipes did I save?');
    await (await loader.getHarness(UiButtonHarness.with({ name: 'Back' }))).click();
    await fixture.whenStable();
    expect(await loader.getAllHarnesses(UiStreamingAnswerHarness)).toEqual([]);
    expect(TestBed.inject(PushedPage).active()).toBe(false);
  });

  it('is no longer pushed once it leaves', async () => {
    const { fixture } = await setup();
    TestBed.inject(AskInbox).put('Which ramen recipes did I save?');
    await fixture.whenStable();
    fixture.destroy();
    expect(TestBed.inject(PushedPage).active()).toBe(false);
  });

  it('hands over to the Ask panel from the desktop width', async () => {
    const { panel } = await setup({ compact: false });
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/links'));
    expect(panel.open).toHaveBeenCalled();
  });

  it('renders nothing and leaves for Library while Ask is off', async () => {
    const { fixture } = await setup({ ask: false });
    expect((fixture.nativeElement as HTMLElement).querySelector('.ask-page')).toBeNull();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/library'));
  });
});
