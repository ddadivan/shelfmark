import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import {
  ACCOUNT_PLAN,
  AI_BACKFILL_STATE,
  AI_PROVIDER_STATUS,
  AI_TIER,
  type AiSettingsResponse,
  AI_SEARCH_STATE,
  ASK_PERIOD,
} from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { UiButtonHarness, UiDialogHarness } from '@shelfmark/ui/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { AI_API } from '../../models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../models/ai-settings-default.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AiIntroDialogComponent } from './ai-intro-dialog.component';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class HostComponent {}

const RESPONSE: AiSettingsResponse = {
  settings: { ...AI_SETTINGS_DEFAULT },
  introSeen: false,
  announcementSeen: true,
  entitlements: { plan: ACCOUNT_PLAN.Free, aiTier: AI_TIER.Free },
  usage: {
    linksUsed: 0,
    linksLimit: 50,
    resetsOn: '2026-12-01',
    backfillUsed: 0,
    backfillLimit: 0,
  },
  providerStatus: AI_PROVIDER_STATUS.Ok,
  pendingJobs: 0,
  backfill: {
    state: AI_BACKFILL_STATE.Idle,
    eligible: 0,
    total: 0,
    done: 0,
    estimatedMinutes: null,
  },
  search: { state: AI_SEARCH_STATE.Ready, ready: 10, total: 10 },
  ask: {
    available: true,
    allowance: { questionsLeft: 12, period: ASK_PERIOD.Day, resetsOn: '2026-11-19' },
  },
};

/** An AI pack account with links saved before AI was on: the intro offers to process them. */
function withOffer(eligible: number): AiSettingsResponse {
  return {
    ...RESPONSE,
    entitlements: { plan: ACCOUNT_PLAN.Free, aiTier: AI_TIER.AiPack },
    usage: { ...RESPONSE.usage, linksLimit: 1000, backfillLimit: 5000 },
    backfill: { ...RESPONSE.backfill, eligible, estimatedMinutes: 2 },
  };
}

async function setup(
  options: {
    fail?: boolean;
    phone?: boolean;
    offer?: number;
    backfillState?: AiSettingsResponse['backfill']['state'];
    startFails?: boolean;
  } = {},
) {
  const base = options.offer === undefined ? RESPONSE : withOffer(options.offer);
  const initial: AiSettingsResponse = {
    ...base,
    backfill: { ...base.backfill, state: options.backfillState ?? base.backfill.state },
  };
  const api = {
    getSettings: vi.fn(() => of(initial)),
    updateSettings: vi.fn(() =>
      options.fail
        ? throwError(() => new Error('down'))
        : of({ ...initial, settings: { ...initial.settings, enabled: true }, introSeen: true }),
    ),
    startBackfill: vi.fn(() =>
      options.startFails
        ? throwError(() => new Error('refused'))
        : of({
            ...initial.backfill,
            state: AI_BACKFILL_STATE.Running,
            total: initial.backfill.eligible,
          }),
    ),
  };
  const phone = options.phone ?? false;
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      provideRouter([]),
      { provide: AI_API, useValue: api },
      {
        provide: ViewportService,
        useValue: { phone: signal(phone), compact: signal(phone), desktop: signal(!phone) },
      },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const store = TestBed.inject(AiSettingsStore);
  await store.load();
  const fixture = TestBed.createComponent(HostComponent);
  const ref = TestBed.inject(DialogService).open<AiIntroDialogComponent, boolean>(
    AiIntroDialogComponent,
    { size: DIALOG_SIZE.Md },
  );
  const result = vi.fn();
  void ref.result.then(result);
  const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  const dialog = await loader.getHarness(UiDialogHarness);
  return { api, store, loader, dialog, result };
}

describe('AiIntroDialogComponent', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.replaceChildren();
    });
  });

  it('explains what AI does, what is sent and that nothing trains models, without axe violations', async () => {
    const { dialog } = await setup();

    expect(await dialog.getTitle()).toBe('Turn on AI in Shelfmark?');
    const body = await dialog.getBodyText();
    expect(body).toContain('Suggests tags and a folder');
    expect(body).toContain('Writes short summaries');
    expect(body).toContain('Finds links by meaning');
    expect(body).toContain('go to Voyage AI');
    expect(body).toContain('Answers questions from your links');
    expect(body).toContain('What is sent to the model');
    expect(body).toContain('Not used for training');
    expect(body).toContain('Settings › AI');
    const container = document.querySelector('.cdk-dialog-container');
    expect(container?.querySelector('a[href="/privacy#ai"]')?.textContent).toContain(
      'Read the privacy policy',
    );
    expect(await axeViolations(container as Element)).toEqual([]);
  });

  it('turns AI on with Turn on AI and closes with true', async () => {
    const { api, store, loader, result } = await setup();

    await (await loader.getHarness(UiButtonHarness.with({ text: 'Turn on AI' }))).click();

    await vi.waitFor(() => expect(result).toHaveBeenCalledWith(true));
    expect(api.updateSettings).toHaveBeenCalledWith({ enabled: true });
    expect(store.isOn()).toBe(true);
    expect(store.introSeen()).toBe(true);
  });

  it('leaves AI off with Not now', async () => {
    const { api, store, loader, result } = await setup();

    await (await loader.getHarness(UiButtonHarness.with({ text: 'Not now' }))).click();

    await vi.waitFor(() => expect(result).toHaveBeenCalledWith(false));
    expect(api.updateSettings).not.toHaveBeenCalled();
    expect(store.isOn()).toBe(false);
  });

  it('stays open with a notice when turning on fails', async () => {
    const { dialog, loader, result, store } = await setup({ fail: true });

    await (await loader.getHarness(UiButtonHarness.with({ text: 'Turn on AI' }))).click();

    await vi.waitFor(async () =>
      expect(await dialog.getBodyText()).toContain('Couldn’t turn on AI'),
    );
    expect(result).not.toHaveBeenCalled();
    expect(store.isOn()).toBe(false);
  });

  it('uses the short title on a phone', async () => {
    const { dialog } = await setup({ phone: true });

    expect(await dialog.getTitle()).toBe('Turn on AI?');
  });

  describe('the next step: process the links saved before', () => {
    it('follows Turn on AI with the count, the three promises and the allowance, without axe violations', async () => {
      const { dialog, loader, result } = await setup({ offer: 120 });
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Turn on AI' }))).click();
      await vi.waitFor(async () =>
        expect(await dialog.getTitle()).toBe('AI is on. Process your 120 saved links?'),
      );
      expect(result).not.toHaveBeenCalled();
      const body = await dialog.getBodyText();
      expect(body).toContain('haven’t been read by AI yet');
      expect(body).toContain('Nothing changes without your choice');
      expect(body).toContain('Runs in the background');
      expect(body).toContain('separate allowance of 5,000 links');
      expect(body).toContain('A reminder also appears in search.');
      const container = document.querySelector('.cdk-dialog-container') as Element;
      const link = container.querySelector('a[href="/settings/ai#ai-backfill"]');
      expect(link?.textContent).toContain('Settings › AI › Process existing links');
      expect(document.activeElement?.textContent).toContain('Process your 120 saved links?');
      expect(await axeViolations(container)).toEqual([]);
    });

    it('starts the backfill with Process N links and closes with true', async () => {
      const { api, store, loader, result } = await setup({ offer: 1 });
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Turn on AI' }))).click();
      const process = await loader.getHarness(UiButtonHarness.with({ text: 'Process 1 link' }));
      await process.click();
      await vi.waitFor(() => expect(result).toHaveBeenCalledWith(true));
      expect(api.startBackfill).toHaveBeenCalledTimes(1);
      expect(store.backfillRunning()).toBe(true);
    });

    it('closes with true and starts nothing with Later', async () => {
      const { api, loader, result, store } = await setup({ offer: 30 });
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Turn on AI' }))).click();
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Later' }))).click();
      await vi.waitFor(() => expect(result).toHaveBeenCalledWith(true));
      expect(api.startBackfill).not.toHaveBeenCalled();
      expect(store.isOn()).toBe(true);
    });

    it('stays on the step when the start is refused', async () => {
      const { dialog, loader, result } = await setup({ offer: 30, startFails: true });
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Turn on AI' }))).click();
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Process 30 links' }))).click();
      await vi.waitFor(async () =>
        expect(
          await (
            await loader.getHarness(UiButtonHarness.with({ text: 'Process 30 links' }))
          ).isDisabled(),
        ).toBe(false),
      );
      expect(result).not.toHaveBeenCalled();
      expect(await dialog.getTitle()).toContain('Process your 30 saved links?');
    });

    it('closes right away when a run is already going or there is nothing to process', async () => {
      for (const options of [
        { offer: 30, backfillState: AI_BACKFILL_STATE.Running },
        { offer: 0 },
      ]) {
        const { loader, result } = await setup(options);
        await (await loader.getHarness(UiButtonHarness.with({ text: 'Turn on AI' }))).click();
        await vi.waitFor(() => expect(result).toHaveBeenCalledWith(true));
        document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
          element.replaceChildren();
        });
        TestBed.resetTestingModule();
      }
    });
  });
});
