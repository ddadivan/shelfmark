import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import type { CleanupSummary } from '@shelfmark/contracts';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { fakeCleanupApi } from '../../../../../testing/cleanup-report';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { CLEANUP_API } from '../../models/cleanup-api.const';
import { CleanupCardComponent } from './cleanup-card.component';

async function setup(summary: CleanupSummary = { show: true, duplicates: 3, similarTags: 2 }) {
  const api = fakeCleanupApi();
  api.getSummary.mockReturnValue(of(summary));
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: CLEANUP_API, useValue: api },
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CleanupCardComponent);
  await fixture.whenStable();
  await fixture.whenStable();
  return {
    api,
    fixture,
    navigate,
    element: fixture.nativeElement as HTMLElement,
    loader: TestbedHarnessEnvironment.loader(fixture),
  };
}

describe('CleanupCardComponent', () => {
  it('says what was found, opens the clean-up page and passes axe', async () => {
    const { element, loader, navigate } = await setup();
    expect(element.textContent).toContain('Your library could use a tidy-up');
    expect(element.textContent).toContain(
      '3 duplicates and 2 pairs of similar tags. Nothing changes until you review.',
    );
    expect(await axeViolations(element)).toEqual([]);
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Review' }))).click();
    expect(navigate).toHaveBeenCalledWith('/settings/library/cleanup');
  });

  it('names only what is there, and renders nothing when the summary says not to show', async () => {
    const one = await setup({ show: true, duplicates: 1, similarTags: 0 });
    expect(one.element.textContent).toContain('1 duplicate. Nothing changes');
    TestBed.resetTestingModule();
    const hidden = await setup({ show: false, duplicates: 4, similarTags: 0 });
    expect(hidden.element.textContent?.trim()).toBe('');
  });

  it('hides the card with × and puts it back when the dismissal fails', async () => {
    const { api, element, fixture, loader } = await setup();
    api.dismissCard.mockReturnValueOnce(throwError(() => new Error('down')));
    await (await loader.getHarness(UiButtonHarness.with({ label: 'Hide for a month' }))).click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Your library could use a tidy-up');
    await (await loader.getHarness(UiButtonHarness.with({ label: 'Hide for a month' }))).click();
    await fixture.whenStable();
    expect(api.dismissCard).toHaveBeenCalledTimes(2);
    expect(element.textContent?.trim()).toBe('');
  });
});
