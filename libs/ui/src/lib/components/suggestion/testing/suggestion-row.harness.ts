import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';
import type { SuggestionRowHarnessFilters } from './models/suggestion-row-harness-filters.interface';
import { UiSuggestionHarness } from './suggestion.harness';

/** Harness for `ui-suggestion-row`: its chips, "Add all" and the loading state. */
export class UiSuggestionRowHarness extends ComponentHarness {
  static hostSelector = 'ui-suggestion-row';

  static with(options: SuggestionRowHarnessFilters = {}): HarnessPredicate<UiSuggestionRowHarness> {
    return new HarnessPredicate(UiSuggestionRowHarness, options).addOption(
      'ariaLabel',
      options.ariaLabel,
      async (harness, ariaLabel) =>
        HarnessPredicate.stringMatches(await harness.getAriaLabel(), ariaLabel),
    );
  }

  private readonly addAllButton = this.locatorForOptional('.ui-suggestion-row__add-all');

  /** The row's accessible name; `null` while it is loading (a status region). */
  async getAriaLabel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  async isLoading(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-busy')) === 'true';
  }

  /** The chips of the row, in order. */
  async getSuggestions(): Promise<UiSuggestionHarness[]> {
    return this.locatorForAll(UiSuggestionHarness)();
  }

  async hasAddAll(): Promise<boolean> {
    return (await this.addAllButton()) !== null;
  }

  /** Clicks "Add all". Throws when the row has none. */
  async acceptAll(): Promise<void> {
    const button = await this.addAllButton();
    if (!button) {
      throw new Error('The suggestion row has no "Add all" button.');
    }
    await button.click();
  }
}
