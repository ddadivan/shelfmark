import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  AI_BACKFILL_STATE,
  type AiBackfillStatus,
  type AiSettingsResponse,
} from '@shelfmark/contracts';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { of } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { AI_API } from '../../models/ai-api.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AiUsageSectionComponent } from './ai-usage-section.component';

const RUNNING: AiBackfillStatus = {
  state: AI_BACKFILL_STATE.Running,
  eligible: 0,
  total: 40,
  done: 10,
  estimatedMinutes: 6,
};

async function setup(response: AiSettingsResponse = aiSettingsResponse()) {
  const api = fakeAiApi(response);
  TestBed.configureTestingModule({
    providers: [provideTranslocoForTest(), provideRouter([]), { provide: AI_API, useValue: api }],
  });
  await loadEnglish();
  await TestBed.inject(AiSettingsStore).load();
  const fixture = TestBed.createComponent(AiUsageSectionComponent);
  await fixture.whenStable();
  return {
    api,
    fixture,
    loader: TestbedHarnessEnvironment.loader(fixture),
    element: fixture.nativeElement as HTMLElement,
  };
}

function withBackfill(backfill: Partial<AiBackfillStatus>, usage = {}): AiSettingsResponse {
  const base = aiSettingsResponse();
  return aiSettingsResponse({
    backfill: { ...base.backfill, ...backfill },
    usage: { ...base.usage, ...usage },
  });
}

describe('AiUsageSectionComponent', () => {
  it('shows the links used this month with the reset date, and no warning below the limit', async () => {
    const { element } = await setup();
    expect(element.textContent).toContain('3 of 1,000 links this month');
    expect(element.textContent).toContain('Resets on');
    expect(element.querySelector('ui-notice')).toBeNull();
    expect(element.textContent).toContain('Every existing link has been processed.');
  });

  it('warns once the monthly limit is reached', async () => {
    const { element } = await setup(withBackfill({}, { linksUsed: 1000 }));
    expect(element.querySelector('ui-notice')?.textContent).toContain(
      'You used this month’s 1,000 links.',
    );
  });

  it('offers Start for links saved before AI, and starts the backfill', async () => {
    const { api, loader, element } = await setup(withBackfill({ eligible: 12 }));
    api.startBackfill.mockReturnValue(of(RUNNING));
    expect(element.textContent).toContain('12 links were saved before you turned AI on.');
    // The AI intro links to this row (`/settings/ai#ai-backfill`).
    expect(element.querySelector('#ai-backfill')?.textContent).toContain('Process existing links');
    const start = await loader.getHarness(UiButtonHarness.with({ text: 'Start' }));
    expect(await start.isDisabled()).toBe(false);
    await start.click();
    expect(api.startBackfill).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('10 of 40 done.');
  });

  it('shows the progress with Stop and the time left while it runs', async () => {
    const { api, loader, element } = await setup(withBackfill(RUNNING));
    api.stopBackfill.mockReturnValue(
      of({ ...RUNNING, state: AI_BACKFILL_STATE.Idle, eligible: 30 }),
    );
    expect(element.textContent).toContain('Processing existing links');
    expect(element.textContent).toContain('About 6 min left');
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Stop' }))).click();
    expect(api.stopBackfill).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('30 links were saved before');
  });

  it('hides "Process existing links" when the tier has no allowance', async () => {
    const { element } = await setup(withBackfill({ eligible: 5 }, { backfillLimit: 0 }));
    expect(element.textContent).not.toContain('Process existing links');
  });

  it('has no axe violations', async () => {
    const { element } = await setup(withBackfill(RUNNING));
    expect(await axeViolations(element)).toEqual([]);
  });
});
