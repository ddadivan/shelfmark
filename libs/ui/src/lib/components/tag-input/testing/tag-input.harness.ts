import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';
import { UiOptionHarness } from '../../select/testing/option.harness';
import type { OptionHarnessFilters } from '../../select/testing/models/option-harness-filters.interface';
import type { TagInputHarnessFilters } from './models/tag-input-harness-filters.interface';

/**
 * Harness for `ui-tag-input`. Tags are the removable chips in the box; suggestions are
 * `UiOptionHarness`es in an overlay pane, found through the input's `aria-controls`.
 */
export class UiTagInputHarness extends ComponentHarness {
  static hostSelector = 'ui-tag-input';

  static with(options: TagInputHarnessFilters = {}): HarnessPredicate<UiTagInputHarness> {
    return new HarnessPredicate(UiTagInputHarness, options)
      .addOption('label', options.label, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getLabel(), label),
      )
      .addOption(
        'disabled',
        options.disabled,
        async (harness, disabled) => (await harness.isDisabled()) === disabled,
      );
  }

  private readonly input = this.locatorFor('input[role="combobox"]');
  private readonly label = this.locatorFor('.ui-field__label');
  private readonly error = this.locatorFor('.ui-field__error');
  private readonly status = this.locatorFor('.ui-tag-input__status');
  private readonly chipLabels = this.locatorForAll('.ui-tag-input__chip .ui-chip__body');
  private readonly removeButtons = this.locatorForAll('.ui-tag-input__chip .ui-chip__remove');

  async getLabel(): Promise<string> {
    return (await (await this.label()).text()).trim();
  }

  /** The tags, in order. */
  async getTags(): Promise<string[]> {
    return Promise.all((await this.chipLabels()).map(async (chip) => (await chip.text()).trim()));
  }

  /** Removes a tag with its chip's remove button. */
  async removeTag(name: string): Promise<void> {
    const index = (await this.getTags()).indexOf(name);
    const button = (await this.removeButtons())[index];
    if (index < 0 || !button) {
      throw new Error(`UiTagInputHarness: no tag "${name}"`);
    }
    await button.click();
  }

  /** `aria-label` of each chip's remove button ("Remove tag angular"). */
  async getRemoveLabels(): Promise<(string | null)[]> {
    return Promise.all(
      (await this.removeButtons()).map((button) => button.getAttribute('aria-label')),
    );
  }

  /** Text typed but not added yet. */
  async getQuery(): Promise<string> {
    return (await this.input()).getProperty<string>('value');
  }

  /** Types into the input (opens the suggestions); a comma in the text ends a tag. */
  async type(text: string): Promise<void> {
    return (await this.input()).sendKeys(text);
  }

  /** Types a tag and presses Enter: adds the exact match or the "Create tag" row. */
  async addTag(name: string): Promise<void> {
    const input = await this.input();
    await input.sendKeys(name, TestKey.ENTER);
  }

  /** Sends keys to the input (arrows, Enter, Backspace, Esc). */
  async sendKeys(...keys: (string | TestKey)[]): Promise<void> {
    return (await this.input()).sendKeys(...keys);
  }

  async getPlaceholder(): Promise<string | null> {
    return (await this.input()).getAttribute('placeholder');
  }

  /** The last announcement of the live region ("Tag angular added"). */
  async getAnnouncement(): Promise<string> {
    return (await (await this.status()).text()).trim();
  }

  async getError(): Promise<string> {
    return (await (await this.error()).text()).trim();
  }

  async isDisabled(): Promise<boolean> {
    return (await (await this.input()).getProperty<boolean>('disabled')) === true;
  }

  /** Read-only at `maxTags`. */
  async isAtLimit(): Promise<boolean> {
    return (await (await this.input()).getProperty<boolean>('readOnly')) === true;
  }

  async isInvalid(): Promise<boolean> {
    return (await (await this.input()).getAttribute('aria-invalid')) === 'true';
  }

  async isOpen(): Promise<boolean> {
    return (await (await this.input()).getAttribute('aria-expanded')) === 'true';
  }

  async focus(): Promise<void> {
    return (await this.input()).focus();
  }

  async blur(): Promise<void> {
    return (await this.input()).blur();
  }

  async isFocused(): Promise<boolean> {
    return (await this.input()).isFocused();
  }

  /** Suggestion rows of the open list (none while closed), optionally filtered. */
  async getSuggestions(filters: OptionHarnessFilters = {}): Promise<UiOptionHarness[]> {
    const id = await (await this.input()).getAttribute('aria-controls');
    if (id === null || !(await this.isOpen())) {
      return [];
    }
    return this.documentRootLocatorFactory().locatorForAll(
      UiOptionHarness.with({ ...filters, ancestor: `[id="${id}"]` }),
    )();
  }

  /** Clicks the first matching suggestion. */
  async chooseSuggestion(filters: OptionHarnessFilters): Promise<void> {
    const [option] = await this.getSuggestions(filters);
    if (!option) {
      throw new Error(`UiTagInputHarness: no suggestion matches ${JSON.stringify(filters)}`);
    }
    await option.click();
  }
}
