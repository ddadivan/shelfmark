import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { firstValueFrom, of } from 'rxjs';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { AI_API } from '../../models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../models/ai-settings-default.const';
import { TidyEntryComponent } from './tidy-entry.component';

async function setup(total: number, on = true) {
  const api = fakeAiApi(
    aiSettingsResponse(on ? {} : { settings: { ...AI_SETTINGS_DEFAULT, enabled: false } }),
  );
  api.getTidyCount.mockReturnValue(of({ total }));
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AI_API, useValue: api },
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(TidyEntryComponent);
  await vi.waitFor(async () => {
    await fixture.whenStable();
    expect(api.getSettings).toHaveBeenCalled();
  });
  await fixture.whenStable();
  return { api, fixture, navigate, loader: TestbedHarnessEnvironment.loader(fixture) };
}

describe('TidyEntryComponent', () => {
  it('shows the count and opens Tidy Unsorted', async () => {
    const { fixture, loader, navigate } = await setup(12);
    const button = await loader.getHarness(UiButtonHarness.with({ text: /Tidy with suggestions/ }));
    expect(await button.getText()).toContain('12');
    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
    await button.click();
    expect(navigate).toHaveBeenCalledWith('/unsorted/tidy');
  });

  it('renders nothing without suggestions or while AI is off', async () => {
    const empty = await setup(0);
    expect(await empty.loader.getAllHarnesses(UiButtonHarness)).toHaveLength(0);
    TestBed.resetTestingModule();
    const off = await setup(12, false);
    expect(await off.loader.getAllHarnesses(UiButtonHarness)).toHaveLength(0);
    expect(off.api.getTidyCount).not.toHaveBeenCalled();
  });
});
