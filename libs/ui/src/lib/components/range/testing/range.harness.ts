import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';
import type { RangeHarnessFilters } from './models/range-harness-filters.interface';

/** Harness for `ui-range` (the native slider inside). */
export class UiRangeHarness extends ComponentHarness {
  static hostSelector = 'ui-range';

  static with(options: RangeHarnessFilters = {}): HarnessPredicate<UiRangeHarness> {
    return new HarnessPredicate(UiRangeHarness, options).addOption(
      'label',
      options.label,
      (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label),
    );
  }

  private readonly input = this.locatorFor('input');

  async getLabel(): Promise<string> {
    return (await (await this.input()).getAttribute('aria-label')) ?? '';
  }

  async getValue(): Promise<number> {
    return Number(await (await this.input()).getProperty<string>('value'));
  }

  async getMin(): Promise<number> {
    return Number(await (await this.input()).getAttribute('min'));
  }

  async getMax(): Promise<number> {
    return Number(await (await this.input()).getAttribute('max'));
  }

  /** The spoken value (`aria-valuetext`), `null` when none is set. */
  async getValueText(): Promise<string | null> {
    return (await this.input()).getAttribute('aria-valuetext');
  }

  async isDisabled(): Promise<boolean> {
    return (await this.input()).getProperty<boolean>('disabled');
  }

  /** Sets the value as a drag would: `input` events, the value clamped to the range by the browser. */
  async setValue(value: number): Promise<void> {
    const input = await this.input();
    await input.setInputValue(String(value));
    await input.dispatchEvent('input');
  }
}
