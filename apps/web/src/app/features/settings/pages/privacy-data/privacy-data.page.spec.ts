import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  LIBRARY_SETTINGS_DEFAULT,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { setupSettingsPage } from '../../../../../testing/settings-page-testbed';
import { LinksStore } from '../../../../stores/links.store';
import { USER_SETTINGS_API } from '../../models/user-settings-api.const';
import PrivacyDataPage from './privacy-data.page';

const BASE: UserSettingsResponse = {
  trashRetentionDays: 30,
  folderColours: true,
  pauseHistory: false,
  ...MOCK_APPEARANCE_DEFAULTS,
  ...LIBRARY_SETTINGS_DEFAULT,
};

async function setup({ fail = false } = {}) {
  let current: UserSettingsResponse = { ...BASE };
  const settingsApi = {
    get: vi.fn(() => of(current)),
    update: vi.fn((request: UpdateUserSettingsRequest) => {
      if (fail) {
        return throwError(() => new Error('down'));
      }
      current = { ...current, ...request };
      return of(current);
    }),
  };
  TestBed.configureTestingModule({
    providers: [{ provide: USER_SETTINGS_API, useValue: settingsApi }],
  });
  const page = await setupSettingsPage(PrivacyDataPage, 'privacy');
  const show = vi.spyOn(TestBed.inject(ToastService), 'show');
  const stable = async () => {
    await page.harness.fixture.whenStable();
    page.harness.detectChanges();
  };
  return { ...page, settingsApi, show, stable };
}

function remember(root: HTMLElement): HTMLButtonElement {
  const found = root.querySelector<HTMLButtonElement>(
    'button[role="switch"][aria-label="Remember recently opened"]',
  );
  if (!found) {
    throw new Error('No "Remember recently opened" switch');
  }
  return found;
}

describe('PrivacyDataPage', () => {
  it('links the privacy policy and the one export page, and states what is kept', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('Privacy and data');
    expect(root.querySelector('a[href="/privacy"]')?.getAttribute('aria-label')).toBe(
      'Read the privacy policy',
    );
    expect(root.querySelector('a[href="/settings/import-export"]')?.textContent).toContain(
      'Open export',
    );
    expect(root.textContent).toContain('Export your data');
    expect(root.textContent).not.toContain('Download your data');
    expect(root.textContent).toContain("We don't sell or share your data");
  });

  it('opens the policy in the app, without a page load', async () => {
    const { root, harness } = await setup();

    root.querySelector<HTMLElement>('a[href="/privacy"]')?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/privacy');
  });

  it('asks before it stops remembering recently opened, then pauses and clears (#315)', async () => {
    const { root, settingsApi, stable } = await setup();
    const confirm = vi.spyOn(TestBed.inject(DialogService), 'confirm');
    const clear = vi.spyOn(TestBed.inject(LinksStore), 'clearHistory').mockResolvedValue(true);
    await vi.waitFor(async () => {
      await stable();
      expect(remember(root).getAttribute('aria-checked')).toBe('true');
    });

    confirm.mockResolvedValueOnce(false);
    remember(root).click();
    await vi.waitFor(async () => {
      await stable();
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(remember(root).getAttribute('aria-checked')).toBe('true');
    });
    expect(settingsApi.update).not.toHaveBeenCalledWith({ pauseHistory: true });

    confirm.mockResolvedValueOnce(true);
    remember(root).click();
    await vi.waitFor(async () => {
      await stable();
      expect(settingsApi.update).toHaveBeenCalledWith({ pauseHistory: true });
      expect(clear).toHaveBeenCalledTimes(1);
      expect(remember(root).getAttribute('aria-checked')).toBe('false');
    });

    remember(root).click();
    await vi.waitFor(async () => {
      await stable();
      expect(settingsApi.update).toHaveBeenLastCalledWith({ pauseHistory: false });
    });
  });

  it('puts the switch back with a toast when pausing fails', async () => {
    const { root, show, stable } = await setup({ fail: true });
    vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(true);
    const clear = vi.spyOn(TestBed.inject(LinksStore), 'clearHistory').mockResolvedValue(true);
    await vi.waitFor(async () => {
      await stable();
      expect(remember(root).getAttribute('aria-checked')).toBe('true');
    });

    remember(root).click();
    await vi.waitFor(async () => {
      await stable();
      expect(show).toHaveBeenCalledWith(expect.objectContaining({ kind: TOAST_KIND.Danger }));
      expect(remember(root).getAttribute('aria-checked')).toBe('true');
    });
    expect(clear).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
