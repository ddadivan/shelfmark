import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MOCK_LIBRARY_COUNTS } from '@shelfmark/contracts/testing';
import type { AskEvent } from '@shelfmark/contracts';
import { UiDialogRef } from '@shelfmark/ui';
import { UiCommandListHarness } from '@shelfmark/ui/testing';
import { of, Subject } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { AI_API } from '../../../ai/models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../../ai/models/ai-settings-default.const';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { AskInbox } from '../../../ai/services/ask-inbox.service';
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
  const router = { navigateByUrl: vi.fn(() => Promise.resolve(true)) };
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
      { provide: Router, useValue: router },
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
    router,
    fixture,
    loader: TestbedHarnessEnvironment.loader(fixture),
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('SearchDialogComponent with Ask (AI-4, #499)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.replaceChildren());
  });

  it('hands the query to the full-screen Ask page in the mobile shell; no segment', async () => {
    const { element, loader, ref, panel, router } = await setup(true);
    expect(element.querySelector('ui-segmented-control')).toBeNull();
    const list = await loader.getHarness(UiCommandListHarness);
    await list.setQuery('ramen recipes');
    await vi.waitFor(async () => {
      expect(await (await list.getOptions()).at(-1)?.getText()).toContain(
        'Ask your shelf about this',
      );
    }, WAIT);
    await (await list.getOptions()).at(-1)?.click();
    await vi.waitFor(() => expect(router.navigateByUrl).toHaveBeenCalledWith('/ask'), WAIT);
    expect(ref.close).toHaveBeenCalled();
    expect(panel.open).not.toHaveBeenCalled();
    expect(TestBed.inject(AskInbox).pending()).toBe('ramen recipes');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('closes and opens the Ask panel with a header', async () => {
    const { loader, ref, panel } = await setup(false);
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
    const { loader } = await setup(true, false);
    const list = await loader.getHarness(UiCommandListHarness);
    await list.setQuery('ramen recipes');
    await new Promise((resolve) => setTimeout(resolve, 400));
    for (const option of await list.getOptions()) {
      expect(await option.getText()).not.toContain('Ask your shelf');
    }
  });
});
