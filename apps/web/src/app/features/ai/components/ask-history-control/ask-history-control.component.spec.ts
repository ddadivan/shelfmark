import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { DialogService, ToastService } from '@shelfmark/ui';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { firstValueFrom, of } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { AI_API } from '../../models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../models/ai-settings-default.const';
import { ASK_HISTORY_API } from '../../models/ask-history-api.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskHistoryControlComponent } from './ask-history-control.component';

async function setup(confirm: boolean) {
  const api = fakeAiApi();
  api.updateSettings.mockImplementation((change) =>
    of(aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT, enabled: true, ...change } })),
  );
  const history = {
    list: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(() => of({ deleted: 3 })),
  };
  const dialogs = { confirm: vi.fn(async () => confirm) };
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: AI_API, useValue: api },
      { provide: ASK_HISTORY_API, useValue: history },
      { provide: DialogService, useValue: dialogs },
      { provide: ToastService, useValue: { show: vi.fn() } },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  await TestBed.inject(AiSettingsStore).load();
  const fixture = TestBed.createComponent(AskHistoryControlComponent);
  await fixture.whenStable();
  return { fixture, api, history, dialogs, loader: TestbedHarnessEnvironment.loader(fixture) };
}

describe('AskHistoryControlComponent', () => {
  it('saves Keep Ask history from the switch (on by default)', async () => {
    const { fixture, api } = await setup(true);
    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[role="switch"]',
    );
    expect(toggle?.getAttribute('aria-checked')).toBe('true');
    toggle?.click();
    await fixture.whenStable();
    expect(api.updateSettings).toHaveBeenCalledWith({ askHistory: false });
  });

  it('clears the history only after the confirmation', async () => {
    const declined = await setup(false);
    await (await declined.loader.getHarness(UiButtonHarness)).click();
    expect(declined.dialogs.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Clear your Ask history?', destructive: true }),
    );
    expect(declined.history.clear).not.toHaveBeenCalled();
    TestBed.resetTestingModule();
    const accepted = await setup(true);
    await (await accepted.loader.getHarness(UiButtonHarness)).click();
    await accepted.fixture.whenStable();
    expect(accepted.history.clear).toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    const { fixture } = await setup(true);
    expect(await axeViolations(fixture.nativeElement as HTMLElement)).toEqual([]);
  });
});
