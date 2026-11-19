import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { AI_BACKFILL_STATE, type AiBackfillStatus, type LinkResponse } from '@shelfmark/contracts';
import { MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { UiButtonHarness, UiCommandListHarness } from '@shelfmark/ui/testing';
import { of, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { BACKFILL_REMINDER_DISMISSED_STORAGE_KEY } from '../../../../core/auth/models/backfill-reminder-dismissed-storage-key.const';
import { USER_STORAGE_KEYS } from '../../../../core/auth/models/user-storage-keys.const';
import { AI_API } from '../../../ai/models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../../ai/models/ai-settings-default.const';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { FOLDERS_API } from '../../../links/models/folders-api.const';
import { LINKS_API } from '../../../links/models/links-api.const';
import { TAGS_API } from '../../../links/models/tags-api.const';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { BACKFILL_REMINDER_CONFIRM_MS } from '../../models/backfill-reminder-confirm-ms.const';
import { LinkOpener } from '../../services/link-opener.service';
import { SearchResultsComponent } from './search-results.component';

const WAIT = { timeout: 5000 } as const;
const IDLE: AiBackfillStatus = {
  state: AI_BACKFILL_STATE.Idle,
  eligible: 48,
  total: 0,
  done: 0,
  estimatedMinutes: 3,
};
const WORD: LinkResponse = {
  ...MOCK_LINKS[0],
  id: 'w1',
  title: 'Angular signals',
  url: 'https://angular.dev/signals',
  folderId: null,
  note: null,
  faviconUrl: null,
};

interface Options {
  backfill?: Partial<AiBackfillStatus>;
  meaningSearch?: boolean;
  enabled?: boolean;
  popup?: boolean;
  startFails?: boolean;
}

async function setup(options: Options = {}) {
  const ai = fakeAiApi(
    aiSettingsResponse({
      settings: {
        ...AI_SETTINGS_DEFAULT,
        enabled: options.enabled ?? true,
        meaningSearch: options.meaningSearch ?? true,
        ask: false,
      },
      backfill: { ...IDLE, ...options.backfill },
    }),
  );
  ai.startBackfill.mockImplementation(() =>
    options.startFails
      ? throwError(() => new Error('409'))
      : of({ ...IDLE, state: AI_BACKFILL_STATE.Running, total: 48 }),
  );
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      {
        provide: LINKS_API,
        useValue: { list: () => of({ items: [WORD], nextCursor: null, pinned: [] }) },
      },
      {
        provide: FOLDERS_API,
        useValue: { list: () => of({ items: [], counts: MOCK_LIBRARY_COUNTS }) },
      },
      { provide: TAGS_API, useValue: { list: () => of([]) } },
      { provide: AI_API, useValue: ai },
      { provide: LinkActionsService, useValue: { open: vi.fn() } },
      { provide: LinkOpener, useValue: { open: vi.fn() } },
    ],
  });
  await loadEnglish();
  await TestBed.inject(AiSettingsStore).load();
  const fixture = TestBed.createComponent(SearchResultsComponent);
  if (options.popup) {
    fixture.componentRef.setInput('popup', true);
  }
  document.body.append(fixture.nativeElement as HTMLElement);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const root = TestbedHarnessEnvironment.documentRootLoader(fixture);
  const list = await loader.getHarness(UiCommandListHarness);
  await list.setQuery('signals');
  return { ai, fixture, list, root, element: fixture.nativeElement as HTMLElement };
}

const REMINDER = 'AI hasn’t read 48 older links yet — search finds them less well.';

describe('SearchResultsComponent: the older-links reminder (hotfix 2.2.1)', () => {
  beforeEach(() => localStorage.removeItem(BACKFILL_REMINDER_DISMISSED_STORAGE_KEY));
  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem(BACKFILL_REMINDER_DISMISSED_STORAGE_KEY);
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.replaceChildren());
    document.querySelectorAll('app-search-results').forEach((node) => node.remove());
  });

  it('shows a row under the results, outside the listbox, without axe violations', async () => {
    const { list, element } = await setup();
    await vi.waitFor(async () => expect(await list.getNoteText()).toContain(REMINDER), WAIT);
    const options = await Promise.all((await list.getOptions()).map((o) => o.getText()));
    expect(options.join(' ')).not.toContain('older links');
    expect(element.querySelector('[role="listbox"] app-backfill-reminder')).toBeNull();
    expect(await axeViolations(element)).toEqual([]);
  });

  it('starts the backfill with Process, says so for a moment, then goes', async () => {
    const { ai, list, root } = await setup();
    await vi.waitFor(async () => expect(await list.getNoteText()).toContain(REMINDER), WAIT);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await (await root.getHarness(UiButtonHarness.with({ text: 'Process' }))).click();
    expect(ai.startBackfill).toHaveBeenCalledTimes(1);
    expect(await list.getNoteText()).toContain('Processing started');
    expect(await root.getAllHarnesses(UiButtonHarness.with({ text: 'Process' }))).toHaveLength(0);
    vi.advanceTimersByTime(BACKFILL_REMINDER_CONFIRM_MS);
    expect(await list.getNoteText()).toBe('');
  });

  it('keeps the row when the start is refused', async () => {
    const { ai, list, root } = await setup({ startFails: true });
    await vi.waitFor(async () => expect(await list.getNoteText()).toContain(REMINDER), WAIT);
    await (await root.getHarness(UiButtonHarness.with({ text: 'Process' }))).click();
    expect(ai.startBackfill).toHaveBeenCalledTimes(1);
    expect(await list.getNoteText()).toContain(REMINDER);
  });

  it('hides for good with ×, in a per-user storage key', async () => {
    const { list, root } = await setup();
    await vi.waitFor(async () => expect(await list.getNoteText()).toContain(REMINDER), WAIT);
    await (await root.getHarness(UiButtonHarness.with({ label: 'Hide' }))).click();
    expect(await list.getNoteText()).toBe('');
    expect(localStorage.getItem(BACKFILL_REMINDER_DISMISSED_STORAGE_KEY)).toBe('1');
    expect(USER_STORAGE_KEYS).toContain(BACKFILL_REMINDER_DISMISSED_STORAGE_KEY);
  });

  it('stays away when hidden before, search by meaning or AI is off, or a run goes or is done', async () => {
    const cases: Options[] = [
      { meaningSearch: false },
      { enabled: false },
      { backfill: { state: AI_BACKFILL_STATE.Running } },
      { backfill: { state: AI_BACKFILL_STATE.Done, eligible: 0 } },
      { backfill: { eligible: 0 } },
    ];
    for (const options of cases) {
      TestBed.resetTestingModule();
      const { list } = await setup(options);
      await vi.waitFor(async () => expect(await list.getOptions()).not.toHaveLength(0), WAIT);
      expect(await list.getNoteText()).not.toContain('older links');
    }
    TestBed.resetTestingModule();
    localStorage.setItem(BACKFILL_REMINDER_DISMISSED_STORAGE_KEY, '1');
    const { list } = await setup();
    await vi.waitFor(async () => expect(await list.getOptions()).not.toHaveLength(0), WAIT);
    expect(await list.getNoteText()).not.toContain('older links');
  });

  it('header panel: Tab in the field reaches the buttons, Esc hands focus back to the field', async () => {
    const { list, root, element } = await setup({ popup: true });
    await vi.waitFor(async () => expect(await list.getNoteText()).toContain(REMINDER), WAIT);
    const field = element.querySelector('input[role="combobox"]') as HTMLInputElement;
    field.focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    field.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    const process = await root.getHarness(UiButtonHarness.with({ text: 'Process' }));
    expect(await process.isFocused()).toBe(true);
    // Focus left the field for the panel: the panel stays open.
    expect(await list.isOpen()).toBe(true);
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(field);
    expect(await list.isOpen()).toBe(true);
  });
});
