import { TestBed } from '@angular/core/testing';
import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { RemindersStore } from '../../../stores/reminders.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { REMIND_PRESET } from '../models/remind-preset.const';
import type { RemindDialogResult } from '../models/remind-dialog-result.interface';
import { ReminderActionsService } from './reminder-actions.service';

const LINK: LinkResponse = { ...(MOCK_LINKS[0] as LinkResponse), title: 'Wool coat' };
const AT = new Date(Date.now() + 86_400_000).toISOString();

async function setup(result: RemindDialogResult | undefined, saved = true) {
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
  await loadEnglish();
  const open = vi
    .spyOn(TestBed.inject(DialogService), 'open')
    .mockReturnValue({ result: Promise.resolve(result) } as ReturnType<DialogService['open']>);
  const set = vi.spyOn(TestBed.inject(RemindersStore), 'set').mockResolvedValue(saved);
  const show = vi.spyOn(TestBed.inject(ToastService), 'show').mockReturnValue(undefined as never);
  return { actions: TestBed.inject(ReminderActionsService), open, set, show };
}

describe('ReminderActionsService', () => {
  it('opens the dialog for one link with its title and current reminder, then saves', async () => {
    const { actions, open, set, show } = await setup({ remindAt: AT });
    expect(await actions.remind([{ ...LINK, remindAt: AT }])).toBe(true);
    expect(open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: { heading: 'Remind me', subtitle: 'Wool coat', current: AT },
      }),
    );
    expect(set).toHaveBeenCalledWith([expect.objectContaining({ id: LINK.id })], AT);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: TOAST_KIND.Success,
        title: expect.stringMatching(/^Reminder set for /),
      }),
    );
  });

  it('names the count for a selection and saves nothing when dismissed', async () => {
    const { actions, open, set } = await setup(undefined);
    expect(await actions.remind([LINK, { ...LINK, id: 'other' }])).toBe(false);
    expect(open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({ heading: 'Remind me about 2 links' }),
      }),
    );
    expect(set).not.toHaveBeenCalled();
    expect(await actions.remind([])).toBe(false);
  });

  it('removes a reminder and Done clears with a toast', async () => {
    const { actions, set, show } = await setup({ remindAt: null });
    await actions.remind([LINK]);
    expect(set).toHaveBeenCalledWith([LINK], null);
    expect(await actions.done(LINK)).toBe(true);
    expect(show).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Reminder removed' }));
  });

  it('snoozes to the preset time', async () => {
    const { actions, set } = await setup(undefined);
    const at = new Date(2030, 0, 1, 9);
    await actions.snooze(LINK, { preset: REMIND_PRESET.Tomorrow, at });
    expect(set).toHaveBeenCalledWith([LINK], at.toISOString());
  });

  it('says when saving failed and offers Retry', async () => {
    const { actions, show, set } = await setup(undefined, false);
    expect(await actions.done(LINK)).toBe(false);
    const toast = show.mock.calls[0]?.[0];
    expect(toast).toMatchObject({ kind: TOAST_KIND.Danger, title: "Couldn't save the reminder" });
    toast?.action?.run();
    expect(set).toHaveBeenCalledTimes(2);
  });
});
