import { TestBed } from '@angular/core/testing';
import { ToastService } from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { PREVIEW_STUB_LINK } from '../../../../testing/link-preview-stub';
import { LinksStore } from '../../../stores/links.store';
import { provideTranslocoForTest } from '../../../testing/transloco-testing';
import { LINKS_API } from '../../links/models/links-api.const';
import { LinkInlineEditService } from './link-inline-edit.service';

function setup(fail = false) {
  const api = {
    update: vi.fn((id: string, change: object) =>
      fail ? throwError(() => new Error('offline')) : of({ ...PREVIEW_STUB_LINK, ...change, id }),
    ),
  };
  const store = { applyEdit: vi.fn() };
  const toasts = { show: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
      { provide: LinksStore, useValue: store },
      { provide: ToastService, useValue: toasts },
    ],
  });
  return { service: TestBed.inject(LinkInlineEditService), api, store, toasts };
}

describe('LinkInlineEditService', () => {
  it('saves a changed title and skips an empty or unchanged one', async () => {
    const { service, api, store } = setup();
    expect(await service.saveTitle(PREVIEW_STUB_LINK, '  ')).toBe(false);
    expect(await service.saveTitle(PREVIEW_STUB_LINK, 'Angular overview ')).toBe(false);
    expect(await service.saveTitle(PREVIEW_STUB_LINK, ' New title ')).toBe(true);
    expect(api.update).toHaveBeenCalledWith('id-1', { title: 'New title' });
    expect(store.applyEdit).toHaveBeenCalledWith(expect.objectContaining({ title: 'New title' }));
  });

  it('saves a note and clears it when emptied', async () => {
    const { service, api } = setup();
    const link = { ...PREVIEW_STUB_LINK, note: 'Old' };
    expect(await service.saveNote(link, 'Old')).toBe(false);
    await service.saveNote(link, 'New');
    await service.saveNote(link, '   ');
    expect(api.update).toHaveBeenNthCalledWith(1, 'id-1', { note: 'New' });
    expect(api.update).toHaveBeenNthCalledWith(2, 'id-1', { note: null });
  });

  it('says when a save failed and retries from the toast', async () => {
    const { service, api, toasts } = setup(true);
    expect(await service.saveTitle(PREVIEW_STUB_LINK, 'New')).toBe(false);
    expect(toasts.show).toHaveBeenCalledWith(expect.objectContaining({ kind: 'danger' }));
    const toast = toasts.show.mock.calls[0]?.[0] as { action: { run: () => void } };
    toast.action.run();
    expect(api.update).toHaveBeenCalledTimes(2);
  });
});
