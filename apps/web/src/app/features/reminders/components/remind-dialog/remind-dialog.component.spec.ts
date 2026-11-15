import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { UiButtonHarness, UiDatePickerHarness, UiDialogHarness } from '@shelfmark/ui/testing';
import axe from 'axe-core';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import type { RemindDialogData } from '../../models/remind-dialog-data.interface';
import type { RemindDialogResult } from '../../models/remind-dialog-result.interface';
import { localIsoDay } from '../../utils/local-iso-day';
import { RemindDialogComponent } from './remind-dialog.component';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class RootComponent {}

// Wednesday 11 November 2026, 10:00 local time: every preset is offered.
const NOW = new Date(2026, 10, 11, 10, 0);

async function setup(data: Partial<RemindDialogData> = {}) {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
  await loadEnglish();
  const ref = TestBed.inject(DialogService).open<
    RemindDialogComponent,
    RemindDialogResult,
    RemindDialogData
  >(RemindDialogComponent, {
    size: DIALOG_SIZE.Sm,
    data: { heading: 'Remind me', subtitle: 'Wool coat', current: null, ...data },
  });
  const closed = vi.fn();
  void ref.result.then(closed);
  const loader = TestbedHarnessEnvironment.documentRootLoader(
    TestBed.createComponent(RootComponent),
  );
  const dialog = await loader.getHarness(UiDialogHarness);
  return { dialog, closed };
}

const root = () => document.querySelector<HTMLElement>('.cdk-dialog-container');

afterEach(() => {
  vi.useRealTimers();
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.replaceChildren());
});

describe('RemindDialogComponent', () => {
  it('lists the presets with their times, the time zone and the link title', async () => {
    const { dialog } = await setup();
    expect(await dialog.getTitle()).toContain('Remind me');
    const labels = await Promise.all(
      (await dialog.getAllHarnesses(UiButtonHarness)).map((button) => button.getText()),
    );
    expect(labels).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Later today\s*Today, /),
        expect.stringMatching(/^Tomorrow\s*Tomorrow, /),
        expect.stringMatching(/^This weekend\s*Sat, /),
        expect.stringMatching(/^Next week\s*Mon, /),
        expect.stringMatching(/^In a month\s*Dec 11, /),
        'Pick date and time…',
        'Cancel',
      ]),
    );
    expect(root()?.textContent).toContain('Wool coat');
    expect(root()?.textContent).toContain('Times are in your time zone');
    expect(labels).not.toContain('Remove reminder');
  });

  it('closes with the preset time at once', async () => {
    const { dialog, closed } = await setup();
    await (await dialog.getHarness(UiButtonHarness.with({ text: /^Tomorrow/ }))).click();
    await vi.waitFor(() => expect(closed).toHaveBeenCalled());
    expect(closed).toHaveBeenCalledWith({ remindAt: new Date(2026, 10, 12, 9, 0).toISOString() });
  });

  it('picks a day and a time in the calendar and confirms it', async () => {
    const { dialog, closed } = await setup();
    await (await dialog.getHarness(UiButtonHarness.with({ text: 'Pick date and time…' }))).click();
    const picker = await dialog.getHarness(UiDatePickerHarness);
    expect(await picker.getSelectedDay()).toBe(localIsoDay(NOW));
    expect(await picker.isDayDisabled('2026-11-10')).toBe(true);
    await picker.selectDay('2026-11-20');
    const time = root()?.querySelector<HTMLInputElement>('input[type="time"]');
    if (!time) throw new Error('no time field');
    time.value = '18:30';
    time.dispatchEvent(new Event('input'));
    const confirm = await dialog.getHarness(UiButtonHarness.with({ text: /^Remind me / }));
    expect(await confirm.getText()).toMatch(/^Remind me Nov 20, /);
    await confirm.click();
    await vi.waitFor(() => expect(closed).toHaveBeenCalled());
    expect(closed).toHaveBeenCalledWith({
      remindAt: new Date(2026, 10, 20, 18, 30).toISOString(),
    });
  });

  it('refuses a time today that has passed', async () => {
    const { dialog, closed } = await setup();
    await (await dialog.getHarness(UiButtonHarness.with({ text: 'Pick date and time…' }))).click();
    const time = root()?.querySelector<HTMLInputElement>('input[type="time"]');
    if (!time) throw new Error('no time field');
    time.value = '08:00';
    time.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(root()?.textContent).toContain('This time has already passed'));
    const confirm = await dialog.getHarness(UiButtonHarness.with({ text: 'Pick a day' }));
    expect(await confirm.isDisabled()).toBe(true);
    expect(closed).not.toHaveBeenCalled();
  });

  it('shows the current reminder and removes it', async () => {
    const { dialog, closed } = await setup({ current: new Date(2026, 10, 12, 9).toISOString() });
    expect(root()?.textContent).toContain('Current reminder: Tomorrow, ');
    await (await dialog.getHarness(UiButtonHarness.with({ text: 'Remove reminder' }))).click();
    await vi.waitFor(() => expect(closed).toHaveBeenCalledWith({ remindAt: null }));
  });

  it('Cancel changes nothing', async () => {
    const { dialog, closed } = await setup();
    await (await dialog.getHarness(UiButtonHarness.with({ text: 'Cancel' }))).click();
    await vi.waitFor(() => expect(closed).toHaveBeenCalledWith(undefined));
  });

  it('has no axe violations, with the calendar open too', async () => {
    const { dialog } = await setup();
    const run = async () =>
      (
        await axe.run(root() as HTMLElement, { rules: { 'color-contrast': { enabled: false } } })
      ).violations.map((violation) => violation.id);
    expect(await run()).toEqual([]);
    await (await dialog.getHarness(UiButtonHarness.with({ text: 'Pick date and time…' }))).click();
    expect(await run()).toEqual([]);
  });
});
