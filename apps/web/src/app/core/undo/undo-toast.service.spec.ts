import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import {
  TOAST_CLOSE_REASON,
  TOAST_DURATION_MS,
  TOAST_KIND,
  ToastService,
  toastShortcutLabel,
  type ToastCloseReason,
  type ToastFolder,
  type ToastOptions,
} from '@shelfmark/ui';
import { UndoToastService } from './undo-toast.service';

function setup() {
  const shown: ToastOptions[] = [];
  const closers: Array<(reason: ToastCloseReason) => void> = [];
  TestBed.configureTestingModule({
    providers: [
      {
        provide: TranslocoService,
        useValue: {
          translate: (key: string, params?: Record<string, string>) =>
            `${key}|${params?.['shortcut']}|${params?.['action']}`,
        },
      },
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
    title: 'Link deleted',
    actionLabel: 'Undo',
    onUndo: vi.fn(),
    onExpire: vi.fn(),
  });

  it('shows an 8 second toast with the Undo action', () => {
    const { shown, service } = setup();

    service.show(options());

    expect(shown[0]).toMatchObject({ title: 'Link deleted', duration: TOAST_DURATION_MS.Undo });
    expect(shown[0].action?.label).toBe('Undo');
  });

  it('hints at the shortcut that reaches the action', () => {
    const { shown, service } = setup();

    service.show(options());

    expect(shown[0].actionHint).toBe(`toast.actionHint|${toastShortcutLabel()}|Undo`);
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

  it('is a red toast without a folder by default', () => {
    const { shown, service } = setup();

    service.show(options());

    expect(shown[0].kind).toBe(TOAST_KIND.Danger);
    expect(shown[0].folder).toBeUndefined();
  });

  it('takes the kind and folder of a moved toast and runs nothing on expiry without onExpire', async () => {
    const { shown, closers, service } = setup();
    const folder = { icon: 'folder', colour: 'blue' } as unknown as ToastFolder;
    const onUndo = vi.fn();

    service.show({ title: 'Moved', kind: TOAST_KIND.Moved, folder, actionLabel: 'Undo', onUndo });
    closers[0](TOAST_CLOSE_REASON.Timeout);
    await flush();
    shown[0].action?.run();

    expect(shown[0]).toMatchObject({ kind: TOAST_KIND.Moved, folder });
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('returns the toast ref so callers can await how it closed', async () => {
    const { closers, service } = setup();

    const ref = service.show(options());
    closers[0](TOAST_CLOSE_REASON.Timeout);

    await expect(ref.closed).resolves.toBe(TOAST_CLOSE_REASON.Timeout);
  });

  it('retry() shows a red toast whose action runs onRetry', () => {
    const { shown, service } = setup();
    const onRetry = vi.fn();

    service.retry({ title: 'Move failed', detail: 'Try again', onRetry });
    shown[0].action?.run();

    expect(shown[0]).toMatchObject({
      kind: TOAST_KIND.Danger,
      title: 'Move failed',
      detail: 'Try again',
    });
    expect(shown[0].duration).toBeUndefined();
    expect(shown[0].action?.label).toContain('links.item.retry');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
