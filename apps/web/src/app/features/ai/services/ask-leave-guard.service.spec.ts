import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { DialogService, type ConfirmDialogConfig } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { AskLeaveGuard } from './ask-leave-guard.service';

async function setup(answer: boolean) {
  const dialogs = {
    confirm: vi.fn<(config: ConfirmDialogConfig) => Promise<boolean>>(async () => answer),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: DialogService, useValue: dialogs },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  return { dialogs, guard: TestBed.inject(AskLeaveGuard) };
}

describe('AskLeaveGuard', () => {
  it('lets the exit through without asking when nothing is unsaved', async () => {
    const { dialogs, guard } = await setup(false);
    expect(await guard.canLeave({ unsaved: signal(false), streaming: signal(false) })).toBe(true);
    expect(dialogs.confirm).not.toHaveBeenCalled();
  });

  it('asks with the reason, Stay focused and not destructive; Leave answers true', async () => {
    const { dialogs, guard } = await setup(true);
    expect(await guard.canLeave({ unsaved: signal(true), streaming: signal(false) })).toBe(true);
    expect(dialogs.confirm).toHaveBeenCalledWith({
      title: 'Leave this conversation?',
      message: 'This conversation isn’t saved to your Ask history. If you leave, it’s gone.',
      confirmLabel: 'Leave',
      cancelLabel: 'Stay',
      focusCancel: true,
    });
  });

  it('names a streaming answer and answers false for Stay, Esc or the scrim', async () => {
    const { dialogs, guard } = await setup(false);
    expect(await guard.canLeave({ unsaved: signal(true), streaming: signal(true) })).toBe(false);
    expect(dialogs.confirm.mock.calls[0]?.[0].message).toContain('still being written');
  });

  it('asks once while a question is open; a second exit shares the answer', async () => {
    const { dialogs, guard } = await setup(true);
    const chat = { unsaved: signal(true), streaming: signal(false) };
    const [first, second] = await Promise.all([guard.canLeave(chat), guard.canLeave(chat)]);
    expect([first, second]).toEqual([true, true]);
    expect(dialogs.confirm).toHaveBeenCalledTimes(1);
  });
});
