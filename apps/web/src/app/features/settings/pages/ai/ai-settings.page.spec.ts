import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import {
  ACCOUNT_PLAN,
  AI_BACKFILL_STATE,
  AI_FEATURE_MODE,
  AI_PROVIDER_STATUS,
  AI_TIER,
  type AiSettingsResponse,
  type UpdateAiSettingsRequest,
  AI_SEARCH_STATE,
  ASK_PERIOD,
} from '@shelfmark/contracts';
import { DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { of, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { fakeMcpApi } from '../../../../../testing/fake-mcp-api';
import { setupSettingsPage } from '../../../../../testing/settings-page-testbed';
import { LinksStore } from '../../../../stores/links.store';
import { AiIntroDialogComponent } from '../../../ai/components/ai-intro-dialog/ai-intro-dialog.component';
import { AI_API } from '../../../ai/models/ai-api.const';
import { MCP_API } from '../../../ai/connect/models/mcp-api.const';
import { AI_SETTINGS_DEFAULT } from '../../../ai/models/ai-settings-default.const';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import AiSettingsPage from './ai-settings.page';

function response(patch: Partial<AiSettingsResponse> = {}): AiSettingsResponse {
  return {
    settings: { ...AI_SETTINGS_DEFAULT },
    introSeen: false,
    entitlements: { plan: ACCOUNT_PLAN.Pro, aiTier: AI_TIER.AiPack },
    usage: {
      linksUsed: 38,
      linksLimit: 1000,
      resetsOn: '2026-12-01',
      backfillUsed: 0,
      backfillLimit: 5000,
    },
    providerStatus: AI_PROVIDER_STATUS.Ok,
    pendingJobs: 0,
    backfill: {
      state: AI_BACKFILL_STATE.Idle,
      eligible: 212,
      total: 0,
      done: 0,
      estimatedMinutes: 60,
    },
    search: { state: AI_SEARCH_STATE.Ready, ready: 10, total: 10 },
    ask: {
      available: true,
      allowance: { questionsLeft: 12, period: ASK_PERIOD.Day, resetsOn: '2026-11-19' },
    },
    ...patch,
  };
}

const ON = { settings: { ...AI_SETTINGS_DEFAULT, enabled: true }, introSeen: true };

async function setup(
  options: {
    initial?: AiSettingsResponse;
    failUpdate?: boolean;
    phone?: boolean;
    introResult?: 'turn-on' | 'not-now';
    confirm?: boolean;
  } = {},
) {
  let current = options.initial ?? response();
  const api = {
    getSettings: vi.fn(() => of(current)),
    updateSettings: vi.fn((change: UpdateAiSettingsRequest) => {
      if (options.failUpdate) {
        return throwError(() => new Error('down'));
      }
      current = {
        ...current,
        settings: { ...current.settings, ...change },
        introSeen: current.introSeen || change.enabled === true,
      };
      return of(current);
    }),
    startBackfill: vi.fn(() =>
      of({ ...current.backfill, state: AI_BACKFILL_STATE.Running, total: 212, done: 86 }),
    ),
    stopBackfill: vi.fn(() => of({ ...current.backfill, state: AI_BACKFILL_STATE.Stopped })),
    deleteData: vi.fn(() => of(undefined)),
    tick: vi.fn(() => of({ pendingJobs: 0, backfill: current.backfill })),
  };
  const confirm = vi.fn(() => Promise.resolve(options.confirm ?? true));
  const open = vi.fn(() => ({
    result:
      options.introResult === 'turn-on'
        ? TestBed.inject(AiSettingsStore)
            .update({ enabled: true })
            .then(() => true)
        : Promise.resolve(false),
  }));
  const toasts: Parameters<ToastService['show']>[0][] = [];
  const refresh = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: AI_API, useValue: api },
      { provide: MCP_API, useValue: fakeMcpApi() },
      { provide: DialogService, useValue: { confirm, open } },
      { provide: LinksStore, useValue: { refresh } },
      {
        provide: ToastService,
        useValue: { show: (toast: (typeof toasts)[number]) => toasts.push(toast) },
      },
    ],
  });
  const page = await setupSettingsPage(AiSettingsPage, 'ai', { phone: options.phone });
  await vi.waitFor(() => {
    page.harness.fixture.detectChanges();
    expect(page.root.querySelector('button[role="switch"]:not(:disabled)')).not.toBeNull();
  });
  const settle = async () => {
    await page.harness.fixture.whenStable();
    page.harness.fixture.detectChanges();
  };
  return { ...page, api, confirm, open, toasts, refresh, settle };
}

function mainSwitch(root: HTMLElement): HTMLButtonElement {
  const found = root.querySelector<HTMLButtonElement>(
    'button[role="switch"][aria-label="Use AI in Shelfmark"]',
  );
  if (!found) {
    throw new Error('No main switch');
  }
  return found;
}

function meaningSwitch(root: HTMLElement): HTMLButtonElement {
  const found = root.querySelector<HTMLButtonElement>(
    'button[role="switch"][aria-label="Search by meaning"]',
  );
  if (!found) {
    throw new Error('No Search by meaning switch');
  }
  return found;
}

function meaningRow(root: HTMLElement): Element {
  const found = meaningSwitch(root).closest('ui-settings-row');
  if (!found) {
    throw new Error('No Search by meaning row');
  }
  return found;
}

function radio(root: HTMLElement, group: string, label: string): HTMLInputElement {
  const row = Array.from(root.querySelectorAll('ui-settings-row')).find((item) =>
    item.querySelector('.ui-settings-row__title')?.textContent?.includes(group),
  );
  const found = Array.from(
    row?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? [],
  ).find((input) => input.closest('label')?.textContent?.includes(label));
  if (!found) {
    throw new Error(`No radio "${label}" in "${group}"`);
  }
  return found;
}

describe('AiSettingsPage', () => {
  it('shows only the main switch while AI is off, without axe violations', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('AI');
    expect(mainSwitch(root).getAttribute('aria-checked')).toBe('false');
    expect(root.textContent).toContain('Never used to train models');
    expect(root.textContent).not.toContain('Summaries');
    expect(root.textContent).not.toContain('This month');
    expect([...root.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toEqual([
      'AI features',
      'Your AI data',
      'Connect your assistant',
    ]);
    // Privacy and data links here: /settings/ai#ai-data.
    expect(root.querySelector('#ai-data h2')?.textContent?.trim()).toBe('Your AI data');
    expect(await axeViolations(root)).toEqual([]);
  });

  it('opens the intro the first time AI is turned on; its Turn on AI saves and shows the choices', async () => {
    const { root, open, api, settle } = await setup({ introResult: 'turn-on' });

    mainSwitch(root).click();
    await settle();

    expect(open).toHaveBeenCalledWith(AiIntroDialogComponent, expect.anything());
    expect(api.updateSettings).toHaveBeenCalledWith({ enabled: true });
    await vi.waitFor(() => {
      expect(mainSwitch(root).getAttribute('aria-checked')).toBe('true');
    });
    await settle();
    expect(root.textContent).toContain('Summaries');
    expect(radio(root, 'Folder', 'Suggest').checked).toBe(true);
    expect(radio(root, 'Tags', 'Suggest').checked).toBe(true);
  });

  it('leaves AI off when the intro is closed with Not now', async () => {
    const { root, api, settle } = await setup({ introResult: 'not-now' });

    mainSwitch(root).click();
    await settle();

    expect(api.updateSettings).not.toHaveBeenCalled();
    expect(mainSwitch(root).getAttribute('aria-checked')).toBe('false');
  });

  it('turns AI on and off without the intro once it was seen', async () => {
    const { root, open, api, settle } = await setup({
      initial: response({ introSeen: true }),
    });

    mainSwitch(root).click();
    await settle();
    expect(open).not.toHaveBeenCalled();
    expect(api.updateSettings).toHaveBeenLastCalledWith({ enabled: true });

    mainSwitch(root).click();
    await settle();
    expect(api.updateSettings).toHaveBeenLastCalledWith({ enabled: false });
    expect(root.textContent).not.toContain('Summaries');
  });

  it('saves a mode, a switch and the summary language at once', async () => {
    const { root, api, settle } = await setup({ initial: response(ON) });

    radio(root, 'Folder', 'Automatic').click();
    await settle();
    expect(api.updateSettings).toHaveBeenLastCalledWith({ folderMode: AI_FEATURE_MODE.Auto });
    expect(radio(root, 'Folder', 'Automatic').checked).toBe(true);

    root
      .querySelector<HTMLButtonElement>('button[role="switch"][aria-label="Include my notes"]')
      ?.click();
    await settle();
    expect(api.updateSettings).toHaveBeenLastCalledWith({ includeNotes: true });
    expect(root.textContent).toContain('Match the app (English)');
  });

  it('puts a mode back with a toast when saving fails', async () => {
    const { root, toasts, settle } = await setup({ initial: response(ON), failUpdate: true });

    radio(root, 'Tags', 'Off').click();
    await settle();
    await vi.waitFor(() => expect(toasts).toHaveLength(1));
    await settle();

    expect(toasts[0]).toMatchObject({
      kind: TOAST_KIND.Danger,
      title: 'Couldn’t save your AI settings',
    });
    expect(radio(root, 'Tags', 'Suggest').checked).toBe(true);
  });

  it('saves Search by meaning at once and says how many links are ready, without axe violations', async () => {
    const { root, api, settle } = await setup({
      initial: response({
        ...ON,
        search: { state: AI_SEARCH_STATE.Processing, ready: 840, total: 1000 },
      }),
    });
    const row = meaningRow(root);
    expect(row.textContent).toContain('Voyage AI');
    expect(row.textContent).toContain('840 of 1,000 links ready');
    expect(await axeViolations(root)).toEqual([]);

    meaningSwitch(root).click();
    await settle();
    expect(api.updateSettings).toHaveBeenLastCalledWith({ meaningSearch: false });
    expect(meaningSwitch(root).getAttribute('aria-checked')).toBe('false');
    expect(meaningRow(root).textContent).not.toContain('links ready');
  });

  it('saves Ask your shelf at once and shows the questions left', async () => {
    const { root, api, settle } = await setup({ initial: response(ON) });
    const askSwitch = (): HTMLButtonElement | null =>
      root.querySelector<HTMLButtonElement>('button[role="switch"][aria-label="Ask your shelf"]');
    const row = askSwitch()?.closest('ui-settings-row');
    expect(row?.textContent).toContain('Uses Claude by Anthropic');
    expect(row?.textContent).toContain('nothing is stored');
    expect(row?.textContent).toContain('12 questions left today');
    askSwitch()?.click();
    await settle();
    expect(api.updateSettings).toHaveBeenLastCalledWith({ ask: false });
    expect(askSwitch()?.getAttribute('aria-checked')).toBe('false');
    expect(askSwitch()?.closest('ui-settings-row')?.textContent).not.toContain('questions left');
  });

  it('says Ready, or paused until the reset day at the limit', async () => {
    const ready = await setup({ initial: response(ON) });
    expect(meaningRow(ready.root).textContent).toContain('Ready');
    TestBed.resetTestingModule();
    const quota = await setup({
      initial: response({ ...ON, search: { state: AI_SEARCH_STATE.Quota, ready: 10, total: 10 } }),
    });
    expect(meaningRow(quota.root).textContent).toMatch(/Paused until .*2026: this month’s limit/);
  });

  it('puts Search by meaning back with a toast when saving fails', async () => {
    const { root, toasts, settle } = await setup({ initial: response(ON), failUpdate: true });

    meaningSwitch(root).click();
    await settle();
    await vi.waitFor(() => expect(toasts).toHaveLength(1));
    await settle();
    await vi.waitFor(() => expect(meaningSwitch(root).getAttribute('aria-checked')).toBe('true'));
  });

  it('shows the usage with its reset date, the limit and the provider line', async () => {
    const { root } = await setup({
      initial: response({
        ...ON,
        usage: {
          linksUsed: 1000,
          linksLimit: 1000,
          resetsOn: '2026-12-01',
          backfillUsed: 0,
          backfillLimit: 5000,
        },
        providerStatus: AI_PROVIDER_STATUS.Unavailable,
      }),
    });

    expect(root.textContent).toContain('1,000 of 1,000 links this month');
    expect(root.textContent).toMatch(/Resets on .*2026/);
    expect(root.textContent).toContain('You used this month’s 1,000 links.');
    expect(root.querySelector('ui-ai-line')?.textContent).toContain('AI isn’t responding');
    expect(root.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
  });

  it('starts and stops processing existing links', async () => {
    const { root, api, harness, settle } = await setup({ initial: response(ON) });
    const loader = TestbedHarnessEnvironment.loader(harness.fixture);

    expect(root.textContent).toContain('212 links were saved before you turned AI on.');
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Start' }))).click();
    await settle();
    expect(api.startBackfill).toHaveBeenCalled();
    expect(root.textContent).toContain('86 of 212 done.');

    await (await loader.getHarness(UiButtonHarness.with({ text: 'Stop' }))).click();
    await settle();
    expect(api.stopBackfill).toHaveBeenCalled();
  });

  it('hides processing existing links for a tier without the allowance', async () => {
    const { root } = await setup({
      initial: response({
        ...ON,
        usage: {
          linksUsed: 0,
          linksLimit: 50,
          resetsOn: '2026-12-01',
          backfillUsed: 0,
          backfillLimit: 0,
        },
      }),
    });

    expect(root.textContent).toContain('This month');
    expect(root.textContent).not.toContain('Process existing links');
  });

  it('deletes AI data after confirming and reloads the feed', async () => {
    const { api, confirm, refresh, toasts, harness, settle } = await setup();
    const loader = TestbedHarnessEnvironment.loader(harness.fixture);

    await (await loader.getHarness(UiButtonHarness.with({ text: 'Delete AI data' }))).click();
    await settle();

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
    await vi.waitFor(() => expect(api.deleteData).toHaveBeenCalled());
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(toasts[0]).toMatchObject({ kind: TOAST_KIND.Success, title: 'AI data deleted' });
  });

  it('keeps everything when deleting AI data is cancelled', async () => {
    const { api, harness, settle } = await setup({ confirm: false });
    const loader = TestbedHarnessEnvironment.loader(harness.fixture);

    await (await loader.getHarness(UiButtonHarness.with({ text: 'Delete AI data' }))).click();
    await settle();

    expect(api.deleteData).not.toHaveBeenCalled();
  });

  it('on a phone opens a full-label page per mode, without axe violations', async () => {
    const { root } = await setup({ initial: response(ON), phone: true });

    const folder = root.querySelector<HTMLAnchorElement>('a[href="/settings/ai/folder"]');
    expect(folder?.getAttribute('aria-label')).toBe('Folder: Suggest');
    expect(root.querySelector('a[href="/settings/ai/tags"]')).not.toBeNull();
    expect(root.querySelectorAll('ui-segmented-control')).toHaveLength(0);
    expect(await axeViolations(root)).toEqual([]);
  });
});
