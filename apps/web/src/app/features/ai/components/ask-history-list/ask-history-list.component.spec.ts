import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import type { AskConversationListResponse } from '@shelfmark/contracts';
import { DialogService, ToastService, type ConfirmDialogConfig } from '@shelfmark/ui';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { AI_API } from '../../models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../models/ai-settings-default.const';
import { ASK_HISTORY_API } from '../../models/ask-history-api.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskHistoryListComponent } from './ask-history-list.component';

const now = new Date().toISOString();
const LIST: AskConversationListResponse = {
  items: [
    { id: 'a', title: 'Something to watch this weekend', turns: 2, createdAt: now, updatedAt: now },
    {
      id: 'b',
      title: 'Coats I saved in autumn',
      turns: 1,
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    },
  ],
  nextCursor: 'b',
};

async function setup({ fails = false, askHistory = true, sheet = false } = {}) {
  const history = {
    list: vi.fn(() => (fails ? throwError(() => new Error('offline')) : of(LIST))),
    get: vi.fn(),
    remove: vi.fn(() => of(undefined)),
    clear: vi.fn(() => of({ deleted: 2 })),
  };
  const dialogs = { confirm: vi.fn(async (_config: ConfirmDialogConfig) => true) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      {
        provide: AI_API,
        useValue: fakeAiApi(
          aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT, enabled: true, askHistory } }),
        ),
      },
      { provide: ASK_HISTORY_API, useValue: history },
      { provide: DialogService, useValue: dialogs },
      { provide: ToastService, useValue: { show: vi.fn() } },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  await TestBed.inject(AiSettingsStore).load();
  const fixture = TestBed.createComponent(AskHistoryListComponent);
  fixture.componentRef.setInput('activeId', 'a');
  fixture.componentRef.setInput('sheet', sheet);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  return { fixture, host, history, dialogs, loader: TestbedHarnessEnvironment.loader(fixture) };
}

describe('AskHistoryListComponent', () => {
  it('draws Shelf 11-ask: New conversation, Today and Earlier, the current row and the foot line', async () => {
    const { host } = await setup();
    const aside = host.querySelector('aside');
    expect(aside?.getAttribute('aria-label')).toBe('Conversations');
    expect(host.querySelector('.ask-history__new')?.textContent?.trim()).toBe('New conversation');
    expect([...host.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toEqual([
      'Today',
      'Earlier',
    ]);
    const links = [...host.querySelectorAll<HTMLAnchorElement>('ui-conversation-row a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/ask?c=a', '/ask?c=b']);
    expect(links[0]?.getAttribute('aria-current')).toBe('page');
    expect(host.textContent).toContain('Kept on your account for 30 days.');
    expect(host.textContent).toContain('Show more');
    expect(await axeViolations(host)).toEqual([]);
  });

  it('opens a row in the app and leaves a modified click to the browser', async () => {
    const { fixture, host } = await setup();
    const opened: string[] = [];
    fixture.componentInstance.opened.subscribe((id) => opened.push(id));
    const link = host.querySelectorAll<HTMLAnchorElement>('ui-conversation-row a')[1];
    const plain = new MouseEvent('click', { bubbles: true, cancelable: true });
    link?.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(true);
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    link?.addEventListener('click', (event) => event.preventDefault());
    link?.dispatchEvent(modified);
    expect(opened).toEqual(['b']);
  });

  it('deletes a row and clears all after a confirmation each', async () => {
    const { fixture, host, history, dialogs, loader } = await setup();
    const removed: string[] = [];
    let cleared = 0;
    fixture.componentInstance.removed.subscribe((id) => removed.push(id));
    fixture.componentInstance.cleared.subscribe(() => (cleared += 1));
    const deletes = await loader.getAllHarnesses(
      UiButtonHarness.with({ name: 'Delete conversation' }),
    );
    await deletes[1]?.click();
    await fixture.whenStable();
    expect(dialogs.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ destructive: true, message: expect.stringContaining('Coats') }),
    );
    expect(history.remove).toHaveBeenCalledWith('b');
    expect(removed).toEqual(['b']);
    expect(host.textContent).not.toContain('Coats I saved in autumn');
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Clear all' }))).click();
    await fixture.whenStable();
    expect(history.clear).toHaveBeenCalled();
    expect(cleared).toBe(1);
    expect(host.textContent).toContain('Your conversations show here.');
  });

  it('shows the failure with Try again, the off line, and no New conversation in the sheet', async () => {
    const { host, history, loader, fixture } = await setup({
      fails: true,
      askHistory: false,
      sheet: true,
    });
    expect(host.textContent).toContain('Conversations couldn’t be loaded.');
    expect(host.textContent).toContain('Keep Ask history is off');
    expect(host.querySelector('.ask-history__new')).toBeNull();
    history.list.mockReturnValue(of(LIST));
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Try again' }))).click();
    await fixture.whenStable();
    expect(host.querySelectorAll('ui-conversation-row')).toHaveLength(2);
  });
});
