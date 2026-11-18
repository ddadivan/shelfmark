import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';
import type { SuggestionHarnessFilters } from './models/suggestion-harness-filters.interface';

/** Harness for `ui-suggestion`: reads the label and state, takes or dismisses the chip. */
export class UiSuggestionHarness extends ComponentHarness {
  static hostSelector = 'ui-suggestion';

  static with(options: SuggestionHarnessFilters = {}): HarnessPredicate<UiSuggestionHarness> {
    return new HarnessPredicate(UiSuggestionHarness, options).addOption(
      'label',
      options.label,
      (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label),
    );
  }

  private readonly chip = this.locatorFor('.ui-suggestion__chip');
  private readonly apply = this.locatorFor('.ui-suggestion__apply');
  private readonly dismissButton = this.locatorForOptional('.ui-suggestion__dismiss');
  private readonly labelText = this.locatorFor('.ui-suggestion__label');

  /** The visible tag or folder name. */
  async getLabel(): Promise<string> {
    return (await (await this.labelText()).text()).trim();
  }

  /** What the main button does, as a screen reader hears it. */
  async getAriaLabel(): Promise<string | null> {
    return (await this.apply()).getAttribute('aria-label');
  }

  /** Solid (taken, or selected in a review list) rather than dashed. */
  async isAccepted(): Promise<boolean> {
    return (await this.chip()).hasClass('ui-suggestion__chip--accepted');
  }

  async hasDismiss(): Promise<boolean> {
    return (await this.dismissButton()) !== null;
  }

  /** Clicks the main button (takes the suggestion, or toggles it in a review list). */
  async accept(): Promise<void> {
    await (await this.apply()).click();
  }

  /** Clicks the x. Throws when the chip has none. */
  async dismiss(): Promise<void> {
    const button = await this.dismissButton();
    if (!button) {
      throw new Error('The suggestion has no dismiss button.');
    }
    await button.click();
  }
}
