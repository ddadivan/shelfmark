import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import {
  ACCOUNT_PLAN,
  AI_BACKFILL_STATE,
  AI_PROVIDER_STATUS,
  AI_TIER,
  type AiSettingsResponse,
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
};

async function setup(options: { fail?: boolean; phone?: boolean } = {}) {
  const api = {
    getSettings: vi.fn(() => of(RESPONSE)),
    updateSettings: vi.fn(() =>
      options.fail
        ? throwError(() => new Error('down'))
        : of({ ...RESPONSE, settings: { ...RESPONSE.settings, enabled: true }, introSeen: true }),
    ),
  };
  const phone = options.phone ?? false;
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
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
});
