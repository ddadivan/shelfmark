import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import { UiButtonHarness, UiMenuHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../testing/axe';
import { LinksStore } from '../../stores/links.store';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { LinkActionsService } from '../links/services/link-actions.service';
import { RediscoverStore } from '../rediscover/services/rediscover.store';
import { ReminderActionsService } from '../reminders/services/reminder-actions.service';
import type { ContinueItem } from './models/continue-item.interface';
import RevisitPage from './revisit.page';
import { RevisitService } from './services/revisit.service';

const link = (id: string, extra: Partial<LinkResponse> = {}): LinkResponse => ({
  ...MOCK_LINKS[0],
  id,
  title: `Link ${id}`,
  url: `https://example.org/${id}`,
  ...extra,
});

async function setup(empty = false) {
  const due = signal<LinkResponse[]>(
    empty ? [] : [link('due', { remindAt: new Date().toISOString() })],
  );
  const continueReading = signal<ContinueItem[]>(
    empty
      ? []
      : [
          {
            link: link('read'),
            progress: { linkId: 'read', fraction: 0.4, minutesLeft: 3, updatedAt: '' },
          },
        ],
  );
  const forgotten = signal<LinkResponse[]>(empty ? [] : [link('old')]);
  const recent = signal<LinkResponse[]>(
    empty ? [] : [link('opened', { lastOpenedAt: new Date().toISOString() })],
  );
  const revisit = {
    now: signal(Date.now()),
    due,
    continueReading,
    forgotten,
    recent,
    loaded: signal(true),
    waiting: computed(() => due().length + continueReading().length + forgotten().length),
    empty: signal(empty),
    load: vi.fn(() => Promise.resolve()),
    touch: vi.fn(),
  };
  const reminderActions = {
    done: vi.fn(() => Promise.resolve(true)),
    snooze: vi.fn(() => Promise.resolve(true)),
    remind: vi.fn(() => Promise.resolve(true)),
  };
  const rediscover = { hide: vi.fn(() => Promise.resolve()) };
  const links = { clearHistory: vi.fn(() => Promise.resolve(true)) };
  const dialogs = { confirm: vi.fn(() => Promise.resolve(true)) };
  const linkActions = { open: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([]),
      { provide: ReminderActionsService, useValue: reminderActions },
      { provide: RediscoverStore, useValue: rediscover },
      { provide: LinksStore, useValue: links },
      { provide: DialogService, useValue: dialogs },
      { provide: LinkActionsService, useValue: linkActions },
    ],
  });
  TestBed.overrideComponent(RevisitPage, {
    set: { providers: [{ provide: RevisitService, useValue: revisit }] },
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(RevisitPage);
  await fixture.whenStable();
  return {
    fixture,
    element: fixture.nativeElement as HTMLElement,
    loader: TestbedHarnessEnvironment.loader(fixture),
    overlays: TestbedHarnessEnvironment.documentRootLoader(fixture),
    revisit,
    reminderActions,
    rediscover,
    links,
    dialogs,
  };
}

describe('RevisitPage', () => {
  it('shows the four groups with their counts', async () => {
    const { element, revisit } = await setup();
    expect(revisit.load).toHaveBeenCalled();
    const headings = [...element.querySelectorAll('h2')].map((h) => h.textContent?.trim());
    expect(headings).toEqual([
      'Due 1',
      'Continue reading 1',
      'Forgotten this week 1',
      expect.stringContaining('Recently opened'),
    ]);
    expect(element.textContent).toContain('3 waiting.');
    expect(element.textContent).toContain('3 min left');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('marks a reminder done, snoozes it and continues reading on the Link page', async () => {
    const { loader, overlays, reminderActions, revisit } = await setup();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Done' }))).click();
    expect(reminderActions.done).toHaveBeenCalled();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Snooze' }))).click();
    const menu = await overlays.getHarness(UiMenuHarness.with({ label: 'Snooze Link due' }));
    await menu.clickItem({ text: /Tomorrow/ });
    expect(reminderActions.snooze).toHaveBeenCalled();
    expect(revisit.touch).toHaveBeenCalled();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Continue' }))).click();
    expect(navigate).toHaveBeenCalledWith(['/links'], { queryParams: { preview: 'read' } });
  });

  it('offers Later and Not interested for a forgotten link and clears the history', async () => {
    const { loader, overlays, reminderActions, rediscover, links, dialogs } = await setup();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Later' }))).click();
    expect(reminderActions.remind).toHaveBeenCalled();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Not interested' }))).click();
    expect(rediscover.hide).toHaveBeenCalledWith('old');
    await (await loader.getHarness(UiButtonHarness.with({ name: 'History options' }))).click();
    await (
      await overlays.getHarness(UiMenuHarness.with({ label: 'History options' }))
    ).clickItem({ text: 'Clear history' });
    await vi.waitFor(() => expect(links.clearHistory).toHaveBeenCalled());
    expect(dialogs.confirm).toHaveBeenCalled();
  });

  it('says nothing is waiting when every group is empty', async () => {
    const { element } = await setup(true);
    expect(element.textContent).toContain('Nothing waiting');
    expect(element.querySelector('h2')).not.toBeNull();
    expect(element.querySelectorAll('ui-list-item')).toHaveLength(0);
  });
});
