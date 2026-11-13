import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';
import type { OptionHarnessFilters } from './models/option-harness-filters.interface';

/**
 * Harness for one `role="option"` row of an Angular Aria listbox. Shared by the listboxes of
 * `ui-select`, `ui-tag-input` and `ui-command-list`, whose harnesses return it.
 */
export class UiOptionHarness extends ComponentHarness {
  static hostSelector = '[role="option"]';

  static with(options: OptionHarnessFilters = {}): HarnessPredicate<UiOptionHarness> {
    return new HarnessPredicate(UiOptionHarness, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getText(), text),
      )
      .addOption('name', options.name, (harness, name) =>
        HarnessPredicate.stringMatches(harness.getName(), name),
      )
      .addOption(
        'disabled',
        options.disabled,
        async (harness, disabled) => (await harness.isDisabled()) === disabled,
      );
  }

  /** Clicks the row (with Ctrl / Cmd for a background choice in the command list). */
  async click(modifiers: { control?: boolean; meta?: boolean } = {}): Promise<void> {
    return (await this.host()).click(modifiers);
  }

  /** Visible text, whitespace collapsed. */
  async getText(): Promise<string> {
    return (await (await this.host()).text()).replace(/\s+/g, ' ').trim();
  }

  async getName(): Promise<string> {
    return (await (await this.host()).getAttribute('aria-label')) ?? (await this.getText());
  }

  async isDisabled(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-disabled')) === 'true';
  }

  /** The row under the arrow keys (`aria-activedescendant` of the combobox points at it). */
  async isActive(): Promise<boolean> {
    return (await (await this.host()).getAttribute('data-active')) === 'true';
  }

  /** The current choice: `aria-selected="true"` or the `is-selected` mark of `ui-select`. */
  async isSelected(): Promise<boolean> {
    const host = await this.host();
    return (await host.getAttribute('aria-selected')) === 'true' || host.hasClass('is-selected');
  }
}
