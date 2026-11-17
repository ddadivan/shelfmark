import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { UiBarChartHarness } from '@shelfmark/ui/testing';
import { adminApiStub } from '../../../../../testing/admin-api-stub';
import { axeViolations } from '../../../../../testing/axe';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { buildMockAdminStats } from '../../mock/build-mock-admin-stats';
import { ADMIN_API } from '../../models/admin-api.const';
import type { AdminApi } from '../../models/admin-api.interface';
import AdminStatsPage from './admin-stats.page';

async function setup(stats: AdminApi['stats']) {
  const api: AdminApi = { ...adminApiStub(true), stats: vi.fn(stats) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/stats', component: AdminStatsPage },
        { path: 'admin/feedback', children: [] },
      ]),
      provideTranslocoForTest(),
      { provide: ADMIN_API, useValue: api },
      {
        provide: ViewportService,
        useValue: { phone: signal(false), compact: signal(false), desktop: signal(true) },
      },
    ],
  });
  await loadEnglish();
  const harness = await RouterTestingHarness.create('/admin/stats');
  await harness.fixture.whenStable();
  return {
    api,
    harness,
    root: harness.routeNativeElement as HTMLElement,
    loader: TestbedHarnessEnvironment.loader(harness.fixture),
  };
}

function text(element: Element | null | undefined): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('AdminStatsPage', () => {
  it('shows the tiles, the sign-up chart, feature shares, preferences and ratings', async () => {
    const { root, loader } = await setup(() => Promise.resolve(buildMockAdminStats(new Date())));

    expect(text(root.querySelector('h1'))).toBe('Usage stats');
    const tiles = [...root.querySelectorAll('.admin-stats__tile')].map((tile) =>
      [...tile.children].map(text),
    );
    expect(tiles[0]).toEqual(['Real users', '47']);
    expect(tiles[1]).toEqual(['Active in the last 7 days', '38%', '18 of 47']);
    expect(tiles.at(-1)).toEqual(['Demo sandboxes now', '6', 'Not counted anywhere else']);

    const chart = await loader.getHarness(
      UiBarChartHarness.with({ label: 'Sign-ups, last 30 days' }),
    );
    expect(await chart.getRows()).toHaveLength(30);
    expect(await chart.getAccessibleName()).toBe('Sign-ups, last 30 days. 18 in this period');

    const page = text(root);
    expect(page).toContain('Mean 23.4 · median 9');
    expect(page).toContain('Folders inside folders');
    expect(page).toContain('32% · 15 of 47');
    expect(page).toContain('Never chosen');
    expect(page).toContain('Deutsch');
    expect(page).toContain('30 days');
    expect(page).toContain('After 3 days');
    expect(page).toContain('21 answered · 6 skipped');
    expect(page).toContain('1–6: 3 · 7–8: 9 · 9–10: 9');
    expect(page).toContain('Messages by status');
    // History paused: 2 of 47, a group of fewer than 3, so hidden.
    const paused = [...root.querySelectorAll('app-admin-share-row')].find((row) =>
      text(row).startsWith('History paused'),
    );
    expect(text(paused)).toBe('History pausedHidden: a group of fewer than 3');
    expect(paused?.querySelector('ui-meter')).toBeNull();
    expect(page).toContain('7–8: 6 · Other: 6');
    expect(page).toContain('return numbers that reach back before then may read high');
  });

  it('switches the chart to weeks', async () => {
    const { root, harness, loader } = await setup(() =>
      Promise.resolve(buildMockAdminStats(new Date())),
    );
    const weeks = [...root.querySelectorAll<HTMLInputElement>('.admin-stats__unit input')][1];
    weeks.click();
    await harness.fixture.whenStable();
    const chart = await loader.getHarness(
      UiBarChartHarness.with({ label: 'Sign-ups, last 12 weeks' }),
    );
    expect(await chart.getRows()).toHaveLength(12);
  });

  it('says why shares are hidden while there are too few real users', async () => {
    const { root } = await setup(() => Promise.resolve(buildMockAdminStats(new Date(), true)));
    const page = text(root);
    expect(page).toContain('Not enough users yet: shares and groups appear from 3 real users.');
    expect(page).toContain('Fewer than 3');
    const adoption = [...root.querySelectorAll('app-admin-share-row')].slice(0, 15);
    expect(adoption.every((row) => row.querySelector('ui-meter') === null)).toBe(true);
    expect(adoption.every((row) => text(row).endsWith('Not enough users yet'))).toBe(true);
    expect(text(root.querySelector('.admin-stats__tile:nth-child(2) dd'))).toBe('–');
  });

  it('shows an error with Retry, and loads again', async () => {
    let fail = true;
    const { root, harness, api } = await setup(() =>
      fail ? Promise.reject(new Error('down')) : Promise.resolve(buildMockAdminStats(new Date())),
    );
    expect(text(root)).toContain("Couldn't load the stats.");
    fail = false;
    root.querySelector<HTMLButtonElement>('ui-notice button')?.click();
    await harness.fixture.whenStable();
    expect(api.stats).toHaveBeenCalledTimes(2);
    expect(text(root)).toContain('Real users');
  });

  it('keeps the numbers when a refresh fails', async () => {
    let fail = false;
    const { root, harness } = await setup(() =>
      fail ? Promise.reject(new Error('down')) : Promise.resolve(buildMockAdminStats(new Date())),
    );
    fail = true;
    root.querySelector<HTMLButtonElement>('.admin-stats__meta button')?.click();
    await harness.fixture.whenStable();
    expect(text(root)).toContain("Couldn't refresh. These are the last numbers.");
    expect(text(root)).toContain('Real users');
  });

  it('shows the loading state until the stats answer', async () => {
    const { root } = await setup(() => new Promise(() => undefined));
    expect(root.querySelector('[role="status"][aria-busy="true"] ui-skeleton')).not.toBeNull();
  });

  it('opens the inbox from the switch', async () => {
    const { root, harness } = await setup(() => Promise.resolve(buildMockAdminStats(new Date())));
    const feedback = root.querySelector<HTMLInputElement>('app-admin-switch input');
    feedback?.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/admin/feedback');
  });

  it('has no axe violations', async () => {
    const { root } = await setup(() => Promise.resolve(buildMockAdminStats(new Date())));
    expect(await axeViolations(root)).toEqual([]);
  });
});
