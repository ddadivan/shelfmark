import { TestBed } from '@angular/core/testing';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { ToastService } from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { RemindersStore } from '../../../stores/reminders.store';
import { provideTranslocoForTest } from '../../../testing/transloco-testing';
import { REMINDERS_API } from '../../reminders/models/reminders-api.const';
import { LINKS_API } from '../models/links-api.const';
import { AddLinkExtrasService } from './add-link-extras.service';

const LINK = { ...MOCK_LINKS[0], isFavorite: false, remindAt: null };

function setup(fail = false) {
  const links = {
    update: vi.fn((id: string, change: object) =>
      fail ? throwError(() => new Error('offline')) : of({ ...LINK, ...change, id }),
    ),
  };
  const reminders = {
    set: vi.fn((id: string, remindAt: string) =>
      fail ? throwError(() => new Error('offline')) : of({ ...LINK, id, remindAt }),
    ),
  };
  const store = { refresh: vi.fn(() => Promise.resolve()) };
  const toasts = { show: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      AddLinkExtrasService,
      { provide: LINKS_API, useValue: links },
      { provide: REMINDERS_API, useValue: reminders },
      { provide: RemindersStore, useValue: store },
      { provide: ToastService, useValue: toasts },
    ],
  });
  return { service: TestBed.inject(AddLinkExtrasService), links, reminders, store, toasts };
}

describe('AddLinkExtrasService', () => {
  it('changes nothing when neither was chosen', async () => {
    const { service, links, reminders } = setup();
    expect(await service.apply(LINK)).toBe(LINK);
    expect(links.update).not.toHaveBeenCalled();
    expect(reminders.set).not.toHaveBeenCalled();
  });

  it('applies the favorite and the chosen reminder after the save', async () => {
    const { service, links, reminders, store } = setup();
    const [option] = service.presets;
    if (!option) {
      throw new Error('no preset');
    }
    service.toggleFavorite();
    service.choose(option);
    expect(service.remindLabel()).not.toBeNull();
    expect(service.hint(option)).not.toBe('');
    const saved = await service.apply(LINK);
    expect(links.update).toHaveBeenCalledWith(LINK.id, { isFavorite: true });
    expect(reminders.set).toHaveBeenCalledWith(LINK.id, option.at.toISOString());
    expect(saved.remindAt).toBe(option.at.toISOString());
    expect(store.refresh).toHaveBeenCalled();

    service.choose(null);
    expect(service.remindAt()).toBeNull();
  });

  it('keeps the saved link and warns when a follow-up fails', async () => {
    const { service, toasts } = setup(true);
    const [option] = service.presets;
    service.toggleFavorite();
    service.choose(option ?? null);
    expect(await service.apply(LINK)).toEqual(LINK);
    expect(toasts.show).toHaveBeenCalledTimes(2);
  });
});
