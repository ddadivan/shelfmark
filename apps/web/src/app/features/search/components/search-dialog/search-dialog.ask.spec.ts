import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MOCK_LIBRARY_COUNTS } from '@shelfmark/contracts/testing';
import type { AskEvent } from '@shelfmark/contracts';
import { UiDialogRef } from '@shelfmark/ui';
import { UiCommandListHarness, UiStreamingAnswerHarness } from '@shelfmark/ui/testing';
import { of, Subject } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { AI_API } from '../../../ai/models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../../ai/models/ai-settings-default.const';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { AskPanelService } from '../../../ai/services/ask-panel.service';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { FOLDERS_API } from '../../../links/models/folders-api.const';
import { LINKS_API } from '../../../links/models/links-api.const';
import { TAGS_API } from '../../../links/models/tags-api.const';
import { LinkOpener } from '../../services/link-opener.service';
import { SearchDialogComponent } from './search-dialog.component';

const WAIT = { timeout: 5000 } as const;

async function setup(compact: boolean, ask = true) {
  const ai = fakeAiApi(
    aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT, enabled: true, ask } }),
  );
  const stream = new Subject<AskEvent>();
  ai.ask.mockReturnValue(stream);
  const ref = { close: vi.fn(), locked: () => false };
  const panel = { open: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      {
        provide: LINKS_API,
        useValue: { list: () => of({ items: [], nextCursor: null, pinned: [] }) },
      },
      {
        provide: FOLDERS_API,
        useValue: { list: () => of({ items: [], counts: MOCK_LIBRARY_COUNTS }) },
      },
      { provide: TAGS_API, useValue: { list: () => of([]) } },
      { provide: AI_API, useValue: ai },
      { provide: UiDialogRef, useValue: ref },
      { provide: AskPanelService, useValue: panel },
      { provide: LinkActionsService, useValue: { open: vi.fn(), addLink: vi.fn() } },
      { provide: LinkOpener, useValue: { open: vi.fn() } },
      { provide: UserSettingsStore, useValue: { openInNewTab: signal(true) } },
      {
        provide: ViewportService,
        useValue: { compact: signal(compact), wide: signal(false), phone: signal(compact) },
      },
    ],
  });
  await loadEnglish();
  await TestBed.inject(AiSettingsStore).load();
  const fixture = TestBed.createComponent(SearchDialogComponent);
  await fixture.whenStable();
  return {
    ai,
    ref,
    panel,
    fixture,
    loader: TestbedHarnessEnvironment.loader(fixture),
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('SearchDialogComponent with Ask (AI-4)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.replaceChildren());
  });

  it('switches to Ask with the Search · Ask segment in the mobile shell', async () => {
    const { element, fixture } = await setup(true);
    const radios = element.querySelectorAll<HTMLInputElement>('ui-segmented-control input');
    expect(radios).toHaveLength(2);
    radios[1]?.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('What do you want to find out?');
    expect(element.textContent).toContain('Answers use only your links.');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('hands the query to the Ask segment from "Ask your shelf about this"', async () => {
    const { ai, loader, fixture } = await setup(true);
    const list = await loader.getHarness(UiCommandListHarness);
    await list.setQuery('ramen recipes');
    await vi.waitFor(async () => {
      expect(await (await list.getOptions()).at(-1)?.getText()).toContain(
        'Ask your shelf about this',
      );
    }, WAIT);
    await (await list.getOptions()).at(-1)?.click();
    await fixture.whenStable();
    expect(ai.ask).toHaveBeenCalledWith('ramen recipes');
    const answer = await loader.getHarness(UiStreamingAnswerHarness);
    expect(await answer.getQuestion()).toBe('ramen recipes');
  });

  it('closes and opens the Ask panel with a header; no segment', async () => {
    const { element, loader, ref, panel } = await setup(false);
    expect(element.querySelector('ui-segmented-control')).toBeNull();
    const list = await loader.getHarness(UiCommandListHarness);
    await list.setQuery('ramen recipes');
    await vi.waitFor(async () => {
      expect(await (await list.getOptions()).at(-1)?.getText()).toContain(
        'Ask your shelf: “ramen recipes”',
      );
    }, WAIT);
    await (await list.getOptions()).at(-1)?.click();
    expect(ref.close).toHaveBeenCalled();
    expect(panel.open).toHaveBeenCalledWith('ramen recipes');
  });

  it('renders nothing of Ask while Ask is off', async () => {
    const { element, loader } = await setup(true, false);
    expect(element.querySelector('ui-segmented-control')).toBeNull();
    const list = await loader.getHarness(UiCommandListHarness);
    await list.setQuery('ramen recipes');
    await new Promise((resolve) => setTimeout(resolve, 400));
    for (const option of await list.getOptions()) {
      expect(await option.getText()).not.toContain('Ask your shelf');
    }
  });
});
