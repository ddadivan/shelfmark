import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { CLEANUP_STATE, type CleanupReport } from '@shelfmark/contracts';
import { MOCK_LIST_FOLDERS_RESPONSE } from '@shelfmark/contracts/testing';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { firstValueFrom, of } from 'rxjs';
import { axeViolations } from '../../../testing/axe';
import { cleanupReport, fakeCleanupApi } from '../../../testing/cleanup-report';
import { fakeAiApi } from '../../../testing/fake-ai-api';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../core/i18n/transloco.config';
import { AI_API } from '../ai/models/ai-api.const';
import { FOLDERS_API } from '../links/models/folders-api.const';
import CleanupPage from './cleanup.page';
import { CLEANUP_API } from './models/cleanup-api.const';
import { CleanupApplyService } from './services/cleanup-apply.service';

async function setup(report: CleanupReport = cleanupReport()) {
  const api = fakeCleanupApi(report);
  const applier = { apply: vi.fn<CleanupApplyService['apply']>(async () => true) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: CLEANUP_API, useValue: api },
      { provide: AI_API, useValue: fakeAiApi() },
      { provide: FOLDERS_API, useValue: { list: () => of(MOCK_LIST_FOLDERS_RESPONSE) } },
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: CleanupApplyService, useValue: applier },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CleanupPage);
  const element = fixture.nativeElement as HTMLElement;
  await vi.waitFor(async () => {
    await fixture.whenStable();
    expect(element.querySelector('ui-panel, .cleanup__group, ui-notice')).not.toBeNull();
  });
  return {
    api,
    applier,
    fixture,
    element,
    navigate,
    loader: TestbedHarnessEnvironment.loader(fixture),
  };
}

function checkbox(element: Element, label: string): HTMLInputElement {
  const found = [...element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(
    (input) => input.closest('label')?.textContent?.includes(label),
  );
  if (!found) {
    throw new Error(`no checkbox "${label}"`);
  }
  return found;
}

describe('CleanupPage', () => {
  it('lists the groups with every row checked, names the run and passes axe', async () => {
    const { element, loader } = await setup();
    expect(element.querySelector('h1')?.textContent).toContain('Clean up your library');
    expect(element.textContent).toContain('Checked 2 minutes ago.');
    expect(element.textContent).toContain('Duplicates');
    expect(element.textContent).toContain(
      'Saved 3 times: keep the one in Unsorted (it has more tags), move 2 copies to Trash',
    );
    expect(element.textContent).toContain(
      'angular.dev and next.angular.dev: keep angular.dev (it is in a folder), move 1 copy to Trash',
    );
    expect(element.textContent).toContain('Same page');
    expect(element.textContent).toContain('2 links get “javascript”; “js” is removed');
    expect(element.textContent).toContain('Found by AI');
    expect(element.querySelector('ui-ai-line')?.textContent).toContain(
      'Exact duplicates are checked without AI.',
    );
    expect(checkbox(element, 'Hacker News').checked).toBe(true);
    expect(await loader.getHarness(UiButtonHarness.with({ text: 'Apply 4 changes' }))).toBeTruthy();
    expect(await axeViolations(element)).toEqual([]);
  });

  it('leaves an unchecked row out, swaps a pair and applies the selection in one run', async () => {
    const { applier, element, fixture, loader } = await setup();
    checkbox(element, 'Hacker News').click();
    await fixture.whenStable();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Keep “js” instead' }))).click();
    expect(element.textContent).toContain('js ← javascript');
    expect(element.textContent).toContain('5 links get “js”; “javascript” is removed');
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Apply 2 changes' }))).click();
    expect(applier.apply).toHaveBeenCalledWith(
      {
        duplicates: [{ groupId: 'g2', trashIds: ['ng2'] }],
        tagMerges: [{ pairId: 'p1', keepTagId: 't-js' }],
      },
      expect.any(Function),
    );
  });

  it('starts the first run with the AI checks from the never-run state', async () => {
    const { api, element, loader } = await setup(
      cleanupReport({
        state: CLEANUP_STATE.None,
        checkedAt: null,
        duplicates: [],
        similarTags: [],
      }),
    );
    expect(element.textContent).toContain('Include AI checks');
    expect(await axeViolations(element)).toEqual([]);
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Check my library' }))).click();
    expect(api.run).toHaveBeenCalledWith({ includeAi: true });
  });

  it('shows the progress while checking, without the AI switch when AI checks are not available', async () => {
    const { element } = await setup(
      cleanupReport({ state: CLEANUP_STATE.Running, checked: 812, total: 1248 }),
    );
    expect(element.textContent).toContain('Checking your library…');
    expect(element.textContent).toContain('812 of 1,248 links.');
    expect(element.querySelector('ui-meter')).not.toBeNull();
    expect(await axeViolations(element)).toEqual([]);
  });

  it('says the library is tidy, offers Check again, and Cancel leads back to Library', async () => {
    const { api, element, loader, navigate } = await setup(
      cleanupReport({ duplicates: [], similarTags: [], aiAvailable: false }),
    );
    expect(element.textContent).toContain('Your library is tidy');
    expect(element.textContent).not.toContain('Include AI checks');
    expect(await axeViolations(element)).toEqual([]);
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Check again' }))).click();
    expect(api.run).toHaveBeenCalledWith({ includeAi: false });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('says a failed check found nothing yet and offers Try again, not "tidy"', async () => {
    const { api, element, loader } = await setup(
      cleanupReport({
        state: CLEANUP_STATE.Failed,
        duplicates: [],
        similarTags: [],
        aiAvailable: false,
      }),
    );
    expect(element.textContent).toContain('The check didn’t finish');
    expect(element.textContent).not.toContain('Your library is tidy');
    expect(await axeViolations(element)).toEqual([]);
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Try again' }))).click();
    expect(api.run).toHaveBeenCalledWith({ includeAi: false });
  });

  it('shows the applied state after a run was applied', async () => {
    const { element } = await setup(cleanupReport({ state: CLEANUP_STATE.Applied }));
    expect(element.textContent).toContain('All cleaned up');
    expect(element.querySelector('.cleanup__group')).toBeNull();
  });

  it('Cancel leads back to Settings › Library', async () => {
    const { loader, navigate } = await setup();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Cancel' }))).click();
    expect(navigate).toHaveBeenCalledWith('/settings/library');
  });
});
