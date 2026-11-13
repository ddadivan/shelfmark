import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';
import { UiOptionHarness } from './option.harness';
import type { OptionHarnessFilters } from './models/option-harness-filters.interface';
import type { SelectHarnessFilters } from './models/select-harness-filters.interface';

/**
 * Harness for `ui-select`. The options render in an overlay pane under `<body>`; the harness
 * finds them through the trigger's `aria-controls`, so it works from any loader.
 */
export class UiSelectHarness extends ComponentHarness {
  static hostSelector = 'ui-select';

  static with(options: SelectHarnessFilters = {}): HarnessPredicate<UiSelectHarness> {
    return new HarnessPredicate(UiSelectHarness, options)
      .addOption('label', options.label, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getLabel(), label),
      )
      .addOption(
        'disabled',
        options.disabled,
        async (harness, disabled) => (await harness.isDisabled()) === disabled,
      );
  }

  private readonly trigger = this.locatorFor('button[role="combobox"]');
  private readonly label = this.locatorFor('.ui-field__label');
  private readonly valueText = this.locatorFor('.ui-select__value');
  private readonly hint = this.locatorForOptional('.ui-field__hint');
  private readonly error = this.locatorFor('.ui-field__error');

  async getLabel(): Promise<string> {
    return (await (await this.label()).text()).trim();
  }

  /** Text on the trigger: the chosen option, the empty label or the placeholder. */
  async getValueText(): Promise<string> {
    return (await (await this.valueText()).text()).trim();
  }

  /** Whether the trigger shows the placeholder (nothing chosen and no empty option). */
  async isPlaceholderShown(): Promise<boolean> {
    return (await this.valueText()).hasClass('ui-select__value--placeholder');
  }

  async getHint(): Promise<string | null> {
    const hint = await this.hint();
    return hint ? (await hint.text()).trim() : null;
  }

  /** The error message, `''` when there is none. */
  async getError(): Promise<string> {
    return (await (await this.error()).text()).trim();
  }

  async isDisabled(): Promise<boolean> {
    return (await (await this.trigger()).getProperty<boolean>('disabled')) === true;
  }

  async isRequired(): Promise<boolean> {
    return (await (await this.trigger()).getAttribute('aria-required')) === 'true';
  }

  async isInvalid(): Promise<boolean> {
    return (await (await this.trigger()).getAttribute('aria-invalid')) === 'true';
  }

  async isOpen(): Promise<boolean> {
    return (await (await this.trigger()).getAttribute('aria-expanded')) === 'true';
  }

  async focus(): Promise<void> {
    return (await this.trigger()).focus();
  }

  async blur(): Promise<void> {
    return (await this.trigger()).blur();
  }

  async isFocused(): Promise<boolean> {
    return (await this.trigger()).isFocused();
  }

  /** Opens the list with a click on the trigger; nothing when it is open already. */
  async open(): Promise<void> {
    if (!(await this.isOpen())) {
      const trigger = await this.trigger();
      await trigger.focus();
      await trigger.click();
    }
  }

  /** Closes with Esc. */
  async close(): Promise<void> {
    if (await this.isOpen()) {
      await (await this.trigger()).sendKeys(TestKey.ESCAPE);
    }
  }

  /** Sends keys to the trigger (arrows, Home / End, Enter, typeahead). */
  async sendKeys(...keys: (string | TestKey)[]): Promise<void> {
    return (await this.trigger()).sendKeys(...keys);
  }

  /** Options of the open list (none while closed), optionally filtered. */
  async getOptions(filters: OptionHarnessFilters = {}): Promise<UiOptionHarness[]> {
    const list = await this.listSelector();
    if (list === null) {
      return [];
    }
    return this.documentRootLocatorFactory().locatorForAll(
      UiOptionHarness.with({ ...filters, ancestor: list }),
    )();
  }

  /** Opens the list if needed and clicks the first option that matches. */
  async chooseOption(filters: OptionHarnessFilters): Promise<void> {
    await this.open();
    const [option] = await this.getOptions(filters);
    if (!option) {
      throw new Error(`UiSelectHarness: no option matches ${JSON.stringify(filters)}`);
    }
    await option.click();
  }

  /** Types into the search box of a `searchable` select (opens it first). */
  async search(text: string): Promise<void> {
    await this.open();
    const box = await this.documentRootLocatorFactory().locatorFor(
      `input[aria-controls="${await this.listId()}"]`,
    )();
    await box.clear();
    if (text) {
      await box.sendKeys(text);
    }
  }

  /** The "no results" text of the open list, `''` while there are options. */
  async getNoResultsText(): Promise<string> {
    const list = await this.listSelector();
    if (list === null) {
      return '';
    }
    const status = await this.documentRootLocatorFactory().locatorForOptional(
      `${list} ~ [role="status"]`,
    )();
    return status ? (await status.text()).trim() : '';
  }

  private async listId(): Promise<string | null> {
    return (await this.trigger()).getAttribute('aria-controls');
  }

  private async listSelector(): Promise<string | null> {
    const id = await this.listId();
    return id ? `[id="${id}"]` : null;
  }
}
