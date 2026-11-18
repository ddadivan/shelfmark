import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MOCK_LIST_FOLDERS_RESPONSE } from '@shelfmark/contracts/testing';
import {
  UiButtonHarness,
  UiSuggestionHarness,
  UiSuggestionRowHarness,
} from '@shelfmark/ui/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom, of } from 'rxjs';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { TIDY_LINK, tidyItems } from '../../../../../testing/tidy-items';
import { FOLDERS_API } from '../../../links/models/folders-api.const';
import { AI_API } from '../../models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../models/ai-settings-default.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { TidyApplyService } from '../../services/tidy-apply.service';
import TidyPage from './tidy.page';
import { tidyAiOn } from './tidy.guard';

async function setup(items = tidyItems(), on = true, total = items.length) {
  const api = fakeAiApi(
    aiSettingsResponse(on ? {} : { settings: { ...AI_SETTINGS_DEFAULT, enabled: false } }),
  );
  api.getTidy.mockReturnValue(of({ items, total }));
  const applier = { apply: vi.fn<TidyApplyService['apply']>(async () => true) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AI_API, useValue: api },
      { provide: FOLDERS_API, useValue: { list: () => of(MOCK_LIST_FOLDERS_RESPONSE) } },
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: TidyApplyService, useValue: applier },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  await TestBed.inject(AiSettingsStore).load();
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(TidyPage);
  await fixture.whenStable();
  if (on) {
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('.tidy__list, .tidy__empty')).not.toBeNull();
    });
  }
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  return {
    api,
    applier,
    fixture,
    loader,
    navigate,
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('TidyPage', () => {
  it('lists every link with its chips selected, names the run and passes axe', async () => {
    const { element, loader } = await setup();
    expect(element.querySelector('h1')?.textContent).toContain('Tidy Unsorted');
    expect(element.textContent).toContain('Suggestions for 2 links. Tap a chip to leave it out.');
    const row = await loader.getHarness(
      UiSuggestionRowHarness.with({ ariaLabel: `Changes for ${TIDY_LINK.title}` }),
    );
    const chips = await row.getSuggestions();
    expect(await Promise.all(chips.map((chip) => chip.getAriaLabel()))).toEqual([
      'Move to Reading, added',
      'Add tag docs, added',
    ]);
    expect(await Promise.all(chips.map((chip) => chip.isAccepted()))).toEqual([true, true]);
    expect(
      await (
        await loader.getHarness(UiButtonHarness.with({ text: 'Apply to 2 links' }))
      ).isDisabled(),
    ).toBe(false);
    expect(await axeViolations(element)).toEqual([]);
  });

  it('leaves a tapped chip out and counts a link without chips as not applied', async () => {
    const { loader } = await setup();
    const pasta = await loader.getHarness(UiSuggestionHarness.with({ label: 'pasta' }));
    await pasta.accept();
    expect(await pasta.isAccepted()).toBe(false);
    expect(await pasta.getAriaLabel()).toBe('Create and add tag pasta, New');
    expect(await loader.getHarness(UiButtonHarness.with({ text: 'Apply to 1 link' }))).toBeTruthy();
  });

  it('applies the selection in one run from the one primary button', async () => {
    const { applier, loader } = await setup();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Apply to 2 links' }))).click();
    expect(applier.apply).toHaveBeenCalledWith(
      [
        { linkId: TIDY_LINK.id, suggestionIds: ['f1', 't1'] },
        { linkId: 'l2', suggestionIds: ['n2'] },
      ],
      expect.any(Function),
    );
  });

  it('skips a link with Undo skip, and dismisses a left-out chip', async () => {
    const { api, element, loader } = await setup();
    const skips = await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Skip' }));
    await skips[1]?.click();
    expect(element.textContent).toContain('Skipped — stays in Unsorted');
    expect(await loader.getHarness(UiButtonHarness.with({ text: 'Apply to 1 link' }))).toBeTruthy();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Undo skip' }))).click();
    expect(element.textContent).not.toContain('Skipped — stays in Unsorted');

    const docs = await loader.getHarness(UiSuggestionHarness.with({ label: 'docs' }));
    await docs.accept();
    expect(await docs.hasDismiss()).toBe(true);
    await docs.dismiss();
    expect(api.dismissSuggestion).toHaveBeenCalledWith('t1');
    expect(await loader.getAllHarnesses(UiSuggestionHarness.with({ label: 'docs' }))).toHaveLength(
      0,
    );
  });

  it('shows "Nothing to tidy" when everything is skipped or nothing is listed', async () => {
    const { element, loader, navigate } = await setup([]);
    expect(element.textContent).toContain('Nothing to tidy');
    expect(element.querySelector('.tidy__list')).toBeNull();
    expect(await axeViolations(element)).toEqual([]);
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Back to Unsorted' }))).click();
    expect(navigate).toHaveBeenCalledWith('/unsorted');
  });

  it('offers the next links when everything here is skipped and more follow', async () => {
    const { api, element, fixture, loader } = await setup(tidyItems(), true, 130);
    expect(element.textContent).toContain('128 more links after these.');
    expect(
      await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Show the next links' })),
    ).toHaveLength(0);
    for (const skip of await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Skip' }))) {
      await skip.click();
    }
    expect(element.textContent).not.toContain('Nothing to tidy');
    api.getTidy.mockClear();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Show the next links' }))).click();
    await fixture.whenStable();
    expect(api.getTidy).toHaveBeenCalledWith('l2');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('renders nothing AI and leaves for Unsorted while AI is off', async () => {
    const { element, navigate } = await setup(tidyItems(), false);
    expect(element.querySelector('.tidy')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/unsorted');
  });
});

describe('tidyAiOn', () => {
  async function guard(on: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AI_API,
          useValue: fakeAiApi(
            aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT, enabled: on } }),
          ),
        },
      ],
    });
    return TestBed.runInInjectionContext(() => tidyAiOn({} as never, {} as never));
  }

  it('lets Tidy open while AI is on and sends to Unsorted otherwise', async () => {
    expect(await guard(true)).toBe(true);
    TestBed.resetTestingModule();
    const tree = await guard(false);
    expect(String(tree)).toBe('/unsorted');
  });
});
