import { TestBed } from '@angular/core/testing';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { LazyToastService, loadToastHost } from './lazy-toast.service';

describe('LazyToastService', () => {
  it('shows a toast through the ToastService once the toast code has loaded', async () => {
    const show = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: ToastService, useValue: { show } }] });
    const options = { kind: TOAST_KIND.Danger, title: 'Failed' };

    TestBed.inject(LazyToastService).show(options);
    await vi.dynamicImportSettled();

    expect(show).toHaveBeenCalledWith(options);
  });

  it('shows without waiting when the toast code is already loaded', async () => {
    const show = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: ToastService, useValue: { show } }] });
    await loadToastHost();

    TestBed.inject(LazyToastService).show({ kind: TOAST_KIND.Danger, title: 'Again' });

    expect(show).toHaveBeenCalledTimes(1);
  });
});
