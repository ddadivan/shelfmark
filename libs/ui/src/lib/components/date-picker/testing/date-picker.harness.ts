import { ComponentHarness } from '@angular/cdk/testing';

/** Harness for `ui-date-picker`: the month shown, the picked day, picking a day, changing the month. */
export class UiDatePickerHarness extends ComponentHarness {
  static hostSelector = 'ui-date-picker';

  private readonly title = this.locatorFor('.ui-date-picker__title');

  /** "November 2026". */
  async getMonthTitle(): Promise<string> {
    return (await this.title()).text();
  }

  /** The picked day (`YYYY-MM-DD`), `null` when none. */
  async getSelectedDay(): Promise<string | null> {
    const picked = await this.locatorForOptional('[aria-pressed="true"]')();
    return picked ? picked.getAttribute('data-day') : null;
  }

  /** Whether the day (`YYYY-MM-DD`, in the month shown) can be picked. */
  async isDayDisabled(iso: string): Promise<boolean> {
    return (await this.day(iso)).getProperty<boolean>('disabled');
  }

  /** Picks a day of the month shown. */
  async selectDay(iso: string): Promise<void> {
    await (await this.day(iso)).click();
  }

  /** The arrow button of the header: `1` the next month, `-1` the one before. */
  async shiftMonth(direction: 1 | -1): Promise<void> {
    const buttons = await this.locatorForAll('.ui-date-picker__head button')();
    const button = direction === 1 ? buttons[buttons.length - 1] : buttons[0];
    await button?.click();
  }

  private async day(iso: string) {
    return this.locatorFor(`[data-day="${iso}"]`)();
  }
}
