import { TestBed } from '@angular/core/testing';
import {
  TOAST_CLOSE_REASON,
  ToastService,
  type ToastCloseReason,
  type ToastOptions,
} from '@shelfmark/ui';
import { DELETE_UNDO_MS } from './models/delete-undo.const';
import { UndoToastService } from './undo-toast.service';

function setup() {
  const shown: ToastOptions[] = [];
  const closers: Array<(reason: ToastCloseReason) => void> = [];
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ToastService,
        useValue: {
          show: (options: ToastOptions) => {
            shown.push(options);
            return {
              dismiss: () => undefined,
              closed: new Promise<ToastCloseReason>((resolve) => closers.push(resolve)),
            };
          },
        },
      },
    ],
  });
  return { shown, closers, service: TestBed.inject(UndoToastService) };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('UndoToastService', () => {
  const options = () => ({
    text: 'Link deleted',
    actionLabel: 'Undo',
    onUndo: vi.fn(),
    onExpire: vi.fn(),
  });

  it('shows an 8 second toast with the Undo action', () => {
    const { shown, service } = setup();

    service.show(options());

    expect(shown[0]).toMatchObject({ text: 'Link deleted', duration: DELETE_UNDO_MS });
    expect(shown[0].action?.label).toBe('Undo');
  });

  it.each([TOAST_CLOSE_REASON.Timeout, TOAST_CLOSE_REASON.Dismissed, TOAST_CLOSE_REASON.Replaced])(
    'commits when the toast closes with "%s"',
    async (reason) => {
      const { closers, service } = setup();
      const callbacks = options();
      service.show(callbacks);
      expect(callbacks.onExpire).not.toHaveBeenCalled();

      closers[0](reason);
      await flush();

      expect(callbacks.onExpire).toHaveBeenCalledTimes(1);
      expect(callbacks.onUndo).not.toHaveBeenCalled();
    },
  );

  it('undoes without committing when the toast closes after the action', async () => {
    const { shown, closers, service } = setup();
    const callbacks = options();
    service.show(callbacks);

    shown[0].action?.run();
    closers[0](TOAST_CLOSE_REASON.Action);
    await flush();

    expect(callbacks.onUndo).toHaveBeenCalledTimes(1);
    expect(callbacks.onExpire).not.toHaveBeenCalled();
  });
});
