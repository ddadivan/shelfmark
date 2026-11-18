import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { REDISCOVER_MODE, type LinkResponse, type RediscoverResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { of } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { READ_LATER } from '../../models/read-later.const';
import { REDISCOVER_API } from '../../models/rediscover-api.const';
import { ForgottenListComponent } from './forgotten-list.component';

function link(n: number): LinkResponse {
  return {
    ...MOCK_LINKS[0],
    id: `l${n}`,
    title: `Old link ${n}`,
    url: `https://site${n}.example.com/a`,
    createdAt: '2026-06-10T10:00:00.000Z',
    faviconUrl: null,
  };
}

async function setup(block: RediscoverResponse, readLater = false) {
  const api = {
    getBlock: vi.fn(() => of(block)),
    dismiss: vi.fn(() => of(undefined)),
    hide: vi.fn(() => of(undefined)),
  };
  const actions = { open: vi.fn(), remind: vi.fn(async () => undefined) };
  const later = { add: vi.fn(async () => undefined) };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: REDISCOVER_API, useValue: api },
      { provide: LinkActionsService, useValue: actions },
      { provide: UserSettingsStore, useValue: { openInNewTab: signal(true) } },
      ...(readLater ? [{ provide: READ_LATER, useValue: later }] : []),
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(ForgottenListComponent);
  await vi.waitFor(async () => {
    await fixture.whenStable();
    expect(api.getBlock).toHaveBeenCalled();
  });
  await fixture.whenStable();
  return {
    api,
    actions,
    later,
    fixture,
    loader: TestbedHarnessEnvironment.loader(fixture),
    element: fixture.nativeElement as HTMLElement,
  };
}

const FORGOTTEN: RediscoverResponse = {
  week: '2026-W47',
  mode: REDISCOVER_MODE.Forgotten,
  theme: null,
  items: [link(1), link(2), link(3)],
};

describe('ForgottenListComponent', () => {
  it('lists old links without the AI mark in forgotten mode, without axe violations', async () => {
    const { element } = await setup(FORGOTTEN);
    expect(element.textContent).toContain('A few links you saved and never came back to.');
    expect(element.textContent).toContain('Saved in June 2026');
    expect(element.querySelectorAll('li')).toHaveLength(3);
    expect(element.querySelector('ui-icon[name="spark"]')).toBeNull();
    expect(element.textContent).not.toContain('Read later');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('names the theme with the spark in theme mode', async () => {
    const { element } = await setup({
      ...FORGOTTEN,
      mode: REDISCOVER_MODE.Theme,
      theme: 'Angular',
    });
    expect(element.textContent).toContain('You’ve been saving a lot about Angular.');
    expect(element.querySelector('.forgotten-list__spark')).not.toBeNull();
  });

  it('reminds, hides a link, offers Read later only when provided, and dismisses', async () => {
    const { loader, api, actions, later, element, fixture } = await setup(FORGOTTEN, true);
    await (await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Remind me' })))[0]?.click();
    expect(actions.remind).toHaveBeenCalledWith(FORGOTTEN.items[0]);
    await (await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Read later' })))[0]?.click();
    expect(later.add).toHaveBeenCalledWith(FORGOTTEN.items[0]);
    await (
      await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Not interested' }))
    )[1]?.click();
    expect(api.hide).toHaveBeenCalledWith('l2');
    await fixture.whenStable();
    expect(element.querySelectorAll('li')).toHaveLength(2);
    await (
      await loader.getHarness(UiButtonHarness.with({ label: 'Hide until next week' }))
    ).click();
    await fixture.whenStable();
    expect(api.dismiss).toHaveBeenCalled();
    expect(element.querySelector('ui-panel')).toBeNull();
    expect(element.querySelector('ui-empty-state')).not.toBeNull();
  });

  it('shows a small empty state without items', async () => {
    const { element } = await setup({ ...FORGOTTEN, mode: null, items: [] });
    expect(element.querySelector('ui-panel')).toBeNull();
    expect(element.textContent).toContain('Nothing forgotten');
  });
});
