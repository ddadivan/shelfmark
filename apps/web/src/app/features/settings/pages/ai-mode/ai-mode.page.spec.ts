import { TestBed } from '@angular/core/testing';
import {
  ACCOUNT_PLAN,
  AI_APPLIED_PART,
  AI_BACKFILL_STATE,
  AI_FEATURE_MODE,
  AI_PROVIDER_STATUS,
  AI_TIER,
  type AiSettingsResponse,
  type UpdateAiSettingsRequest,
} from '@shelfmark/contracts';
import { ToastService } from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { setupSettingsPage } from '../../../../../testing/settings-page-testbed';
import { AI_API } from '../../../ai/models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../../ai/models/ai-settings-default.const';
import AiModePage from './ai-mode.page';

const RESPONSE: AiSettingsResponse = {
  settings: { ...AI_SETTINGS_DEFAULT, enabled: true, tagsMode: AI_FEATURE_MODE.Off },
  introSeen: true,
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

async function setup(part: string, fail = false) {
  const api = {
    getSettings: vi.fn(() => of(RESPONSE)),
    updateSettings: vi.fn((change: UpdateAiSettingsRequest) =>
      fail
        ? throwError(() => new Error('down'))
        : of({ ...RESPONSE, settings: { ...RESPONSE.settings, ...change } }),
    ),
  };
  const show = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: AI_API, useValue: api },
      { provide: ToastService, useValue: { show } },
    ],
  });
  const page = await setupSettingsPage(AiModePage, `ai/${part}`, { phone: true, data: { part } });
  await vi.waitFor(() => {
    page.harness.fixture.detectChanges();
    expect(page.root.querySelector('input[type="radio"]:not(:disabled)')).not.toBeNull();
  });
  const settle = async () => {
    await page.harness.fixture.whenStable();
    page.harness.fixture.detectChanges();
  };
  return { ...page, api, show, settle };
}

function radios(root: HTMLElement): HTMLInputElement[] {
  return Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
}

describe('AiModePage', () => {
  it('lists the full-label choices with their explanations, back to Settings › AI', async () => {
    const { root } = await setup(AI_APPLIED_PART.Folder);

    expect(root.querySelector('h1')?.textContent).toContain('Folder');
    expect(root.textContent).toContain('Apply automatically when I don’t choose');
    expect(root.textContent).toContain('Only for links left in Unsorted.');
    expect(root.textContent).toContain('A folder you pick yourself is never changed by AI.');
    expect(root.querySelector('a[href="/settings/ai"]')?.textContent).toContain('AI');
    expect(radios(root).find((input) => input.checked)?.value).toBe(AI_FEATURE_MODE.Suggest);
    expect(await axeViolations(root)).toEqual([]);
  });

  it('saves the tags mode at once', async () => {
    const { root, api, settle } = await setup(AI_APPLIED_PART.Tags);
    expect(radios(root).find((input) => input.checked)?.value).toBe(AI_FEATURE_MODE.Off);

    radios(root)
      .find((input) => input.value === AI_FEATURE_MODE.Auto)
      ?.click();
    await settle();

    expect(api.updateSettings).toHaveBeenCalledWith({ tagsMode: AI_FEATURE_MODE.Auto });
  });

  it('puts the choice back with a toast when saving fails', async () => {
    const { root, show, settle } = await setup(AI_APPLIED_PART.Folder, true);

    radios(root)
      .find((input) => input.value === AI_FEATURE_MODE.Off)
      ?.click();
    await settle();
    await vi.waitFor(() => expect(show).toHaveBeenCalled());
    await settle();

    expect(radios(root).find((input) => input.checked)?.value).toBe(AI_FEATURE_MODE.Suggest);
  });
});
