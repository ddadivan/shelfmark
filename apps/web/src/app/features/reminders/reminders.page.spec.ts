import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideRouter } from '@angular/router';
import type { LinkResponse, ListRemindersResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { ToastService } from '@shelfmark/ui';
import { UiButtonHarness, UiMenuHarness } from '@shelfmark/ui/testing';
import { NEVER, of, throwError } from 'rxjs';
import { axeViolations } from '../../../testing/axe';
import { ViewportService } from '../../core/layout/viewport.service';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { LINKS_API } from '../links/models/links-api.const';
import { REMINDERS_API } from './models/reminders-api.const';
import type { RemindersApi } from './models/reminders-api.interface';
import RemindersPage from './reminders.page';

const HOUR = 3_600_000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();
const link = (id: string, remindAt: string): LinkResponse => ({
  ...(MOCK_LINKS[0] as LinkResponse),
  id,
  title: id,
  url: `https://${id.toLowerCase().replace(/\s/g, '')}.example.com/`,
  remindAt,
});

interface Options {
  list?: ListRemindersResponse;
  fail?: boolean;
  phone?: boolean;
}

async function setup(options: Options = {}) {
  let current = options.list ?? {
    due: [link('Wool coat', inHours(-3))],
    upcoming: [link('Lisbon guide', inHours(24 * 20))],
  };
  const api = {
    list: vi.fn<RemindersApi['list']>(() =>
      options.fail ? throwError(() => new Error('down')) : of(current),
    ),
    count: vi.fn<RemindersApi['count']>(() => of({ due: current.due.length })),
    set: vi.fn<RemindersApi['set']>((id, remindAt) => {
      const found = [...current.due, ...current.upcoming].find((item) => item.id === id);
      return of({ ...(found as LinkResponse), remindAt });
    }),
    clear: vi.fn<RemindersApi['clear']>((id) => {
      current = {
        due: current.due.filter((item) => item.id !== id),
        upcoming: current.upcoming.filter((item) => item.id !== id),
      };
      return of(undefined);
    }),
    setMany: vi.fn<RemindersApi['setMany']>(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideTranslocoForTest(),
      { provide: REMINDERS_API, useValue: api },
      { provide: LINKS_API, useValue: { list: vi.fn(() => NEVER), open: vi.fn(() => NEVER) } },
      { provide: ToastService, useValue: { show: vi.fn() } },
      {
        provide: ViewportService,
        useValue: {
          phone: signal(options.phone ?? false),
          compact: signal(options.phone ?? false),
          desktop: signal(!options.phone),
          wide: signal(false),
        },
      },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(RemindersPage);
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  return { fixture, element, api, loader };
}

const groups = (element: HTMLElement) =>
  [...element.querySelectorAll('ui-history-group')].map((group) => [
    group.querySelector('h2, h3')?.textContent?.trim(),
    [...group.querySelectorAll('app-reminder-row')].map((row) =>
      row.querySelector('[slot="title"]')?.textContent?.trim(),
    ),
  ]);

afterEach(() => {
  document.querySelectorAll('app-reminders-page').forEach((el) => el.remove());
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.replaceChildren());
});

describe('RemindersPage', () => {
  it('lists due links first and the upcoming ones by day, with the count', async () => {
    const { element } = await setup();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Reminders');
    expect(element.textContent).toContain('1 reminder is due');
    expect(groups(element)).toEqual([
      ['Due', ['Wool coat']],
      ['Later', ['Lisbon guide']],
    ]);
    expect(element.textContent).toContain('Due 3 hours ago');
  });

  it('Done clears the reminder and the row leaves', async () => {
    const { element, api, loader, fixture } = await setup();
    await (
      await loader.getHarness(
        UiButtonHarness.with({ text: 'Done', ancestor: 'app-reminder-row:first-of-type' }),
      )
    ).click();
    await fixture.whenStable();
    expect(api.clear).toHaveBeenCalledWith('Wool coat');
    expect(groups(element)).toEqual([['Later', ['Lisbon guide']]]);
    expect(element.textContent).toContain('Nothing is due right now');
  });

  it('Snooze moves a due link to the preset time', async () => {
    const { element, api, fixture } = await setup();
    const menu = await TestbedHarnessEnvironment.documentRootLoader(fixture).getHarness(
      UiMenuHarness.with({ label: 'Snooze the reminder of Wool coat' }),
    );
    await menu.clickItem({ text: /^Tomorrow/ });
    await fixture.whenStable();
    expect(api.set).toHaveBeenCalledWith('Wool coat', expect.any(String));
    expect(groups(element)[0]).toEqual(['Tomorrow', ['Wool coat']]);
  });

  it('shows the empty state without reminders', async () => {
    const { element } = await setup({ list: { due: [], upcoming: [] } });
    expect(element.textContent).toContain('No reminders yet');
    expect(element.querySelector('app-reminder-row')).toBeNull();
  });

  it('offers a retry when the list fails', async () => {
    const { element, api, loader, fixture } = await setup({ fail: true });
    expect(element.textContent).toContain("Couldn't load your reminders");
    api.list.mockReturnValue(of({ due: [], upcoming: [] }));
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Try again' }))).click();
    await fixture.whenStable();
    expect(element.textContent).toContain('No reminders yet');
  });

  it('uses icon buttons and the way back to the Library on the phone', async () => {
    const { element, loader } = await setup({ phone: true });
    expect(element.textContent).toContain('Library');
    const done = await loader.getHarness(
      UiButtonHarness.with({ text: '', ancestor: 'app-reminder-row:first-of-type' }),
    );
    expect(await done.getAriaLabel()).toBe('Mark the reminder of Wool coat as done');
  });

  it('has no axe violations', async () => {
    const { element } = await setup();
    expect(await axeViolations(element)).toEqual([]);
  });
});
