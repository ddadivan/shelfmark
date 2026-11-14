import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';
import type { ChoiceHarnessFilters } from './models/choice-harness-filters.interface';

/** Harness for one option of `ui-choice-grid` (a labelled radio drawn as a swatch or icon tile). */
export class UiChoiceHarness extends ComponentHarness {
  static hostSelector = 'ui-choice-grid .ui-choice';

  static with(options: ChoiceHarnessFilters = {}): HarnessPredicate<UiChoiceHarness> {
    return new HarnessPredicate(UiChoiceHarness, options)
      .addOption('label', options.label, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getLabel(), label),
      )
      .addOption(
        'value',
        options.value,
        async (harness, value) => (await harness.getValue()) === value,
      )
      .addOption(
        'checked',
        options.checked,
        async (harness, checked) => (await harness.isChecked()) === checked,
      );
  }

  private readonly radio = this.locatorFor('input[type="radio"]');
  private readonly removeButton = this.locatorForOptional('.ui-choice__remove');

  async getLabel(): Promise<string> {
    return (await (await this.radio()).getAttribute('aria-label')) ?? '';
  }

  async getValue(): Promise<string> {
    return (await this.radio()).getProperty<string>('value');
  }

  async isChecked(): Promise<boolean> {
    return (await this.radio()).getProperty<boolean>('checked');
  }

  async isDisabled(): Promise<boolean> {
    return (await this.radio()).getProperty<boolean>('disabled');
  }

  async isFocused(): Promise<boolean> {
    return (await this.radio()).isFocused();
  }

  /** Clicks the radio: the grid's value becomes this option's value. */
  async select(): Promise<void> {
    return (await this.radio()).click();
  }

  /** An own option that can be deleted (`removeLabel`). */
  async isRemovable(): Promise<boolean> {
    return (await (await this.radio()).getAttribute('aria-description')) !== null;
  }

  /** The remove action's name, read from the radio's `aria-description`. */
  async getRemoveLabel(): Promise<string | null> {
    return (await this.radio()).getAttribute('aria-description');
  }

  /** Clicks the small "×" (pointer and touch path); the grid emits `removed`. */
  async remove(): Promise<void> {
    const button = await this.removeButton();
    if (!button) {
      throw new Error(`UiChoiceHarness: "${await this.getLabel()}" cannot be removed`);
    }
    await button.click();
  }

  /** Presses Delete on the focused radio (keyboard path of `remove`). */
  async removeWithKeyboard(): Promise<void> {
    return (await this.radio()).sendKeys(TestKey.DELETE);
  }

  /** Sends keys to the radio (arrows move the choice natively in a real browser). */
  async sendKeys(...keys: (string | TestKey)[]): Promise<void> {
    return (await this.radio()).sendKeys(...keys);
  }
}
