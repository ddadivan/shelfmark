import { TestBed } from '@angular/core/testing';
import { ToastService, type ToastOptions } from '@shelfmark/ui';
import { DELETE_UNDO_MS } from './models/delete-undo.const';
import { UndoToastService } from './undo-toast.service';

function setup() {
  const shown: ToastOptions[] = [];
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ToastService,
        useValue: {
          show: (options: ToastOptions) => {
            shown.push(options);
            return { dismiss: () => undefined };
          },
        },
      },
    ],
  });
  return { shown, service: TestBed.inject(UndoToastService) };
}

describe('UndoToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

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

  it('expires after the window when Undo was not pressed', () => {
    const { service } = setup();
    const callbacks = options();
    service.show(callbacks);

    vi.advanceTimersByTime(DELETE_UNDO_MS - 1);
    expect(callbacks.onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(callbacks.onExpire).toHaveBeenCalledTimes(1);
    expect(callbacks.onUndo).not.toHaveBeenCalled();
  });

  it('undoes without expiring afterwards', () => {
    const { shown, service } = setup();
    const callbacks = options();
    service.show(callbacks);

    shown[0].action?.run();
    vi.advanceTimersByTime(DELETE_UNDO_MS);

    expect(callbacks.onUndo).toHaveBeenCalledTimes(1);
    expect(callbacks.onExpire).not.toHaveBeenCalled();
  });
});
