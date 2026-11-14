import {
  ComponentHarness,
  HarnessPredicate,
  TestKey,
  type TestElement,
} from '@angular/cdk/testing';
import type { PickerMenuHarnessFilters } from './models/picker-menu-harness-filters.interface';

/**
 * Harness for `ui-picker-menu`. The popover renders in an overlay pane under `<body>`; the harness
 * finds it through the trigger's `aria-controls`, so it works from any loader. Options are
 * addressed by their visible name.
 */
export class UiPickerMenuHarness extends ComponentHarness {
  static hostSelector = 'ui-picker-menu';

  static with(options: PickerMenuHarnessFilters = {}): HarnessPredicate<UiPickerMenuHarness> {
    return new HarnessPredicate(UiPickerMenuHarness, options).addOption(
      'label',
      options.label,
      (harness, label) => HarnessPredicate.stringMatches(harness.getTriggerLabel(), label),
    );
  }

  private readonly trigger = this.locatorFor('button.ui-picker-menu__trigger');
  private readonly name = this.locatorFor('.ui-picker-menu__name');

  /** The visible name on the trigger (the shown folder). */
  async getTriggerLabel(): Promise<string> {
    return (await (await this.name()).text()).trim();
  }

  async isOpen(): Promise<boolean> {
    return (await (await this.trigger()).getAttribute('aria-expanded')) === 'true';
  }

  /** Opens the popover with a click on the trigger; nothing when it is open already. */
  async open(): Promise<void> {
    if (!(await this.isOpen())) {
      await (await this.trigger()).click();
    }
  }

  /** Closes with Esc. */
  async close(): Promise<void> {
    const panel = await this.panel();
    if (panel) {
      await panel.sendKeys(TestKey.ESCAPE);
    }
  }

  /** Types into the search box (opens the popover first). */
  async search(text: string): Promise<void> {
    await this.open();
    const box = await this.inPanel('.ui-picker-list__search-input');
    await box.clear();
    if (text) {
      await box.sendKeys(text);
    }
  }

  /** Names of the shown options, in order ("Unsorted" first when the list has that row). */
  async getOptionNames(): Promise<string[]> {
    const id = await this.panelId();
    if (!id) {
      return [];
    }
    const labels = await this.documentRootLocatorFactory().locatorForAll(
      `[id="${id}"] .ui-picker-list__label`,
    )();
    return Promise.all(labels.map(async (label) => (await label.text()).trim()));
  }

  /** True for a row that cannot be chosen (the other half's folder). */
  async isOptionDisabled(name: string): Promise<boolean> {
    return (await (await this.option(name)).getAttribute('aria-disabled')) === 'true';
  }

  /** Opens the popover if needed and clicks the option with this name. */
  async choose(name: string): Promise<void> {
    await this.open();
    await (await this.option(name)).click();
  }

  private async panelId(): Promise<string | null> {
    return (await this.trigger()).getAttribute('aria-controls');
  }

  private async panel(): Promise<TestElement | null> {
    const id = await this.panelId();
    return id ? this.documentRootLocatorFactory().locatorForOptional(`[id="${id}"]`)() : null;
  }

  private async inPanel(selector: string): Promise<TestElement> {
    const id = await this.panelId();
    if (!id) {
      throw new Error('UiPickerMenuHarness: the popover is closed');
    }
    return this.documentRootLocatorFactory().locatorFor(`[id="${id}"] ${selector}`)();
  }

  private async option(name: string): Promise<TestElement> {
    const id = await this.panelId();
    if (!id) {
      throw new Error('UiPickerMenuHarness: the popover is closed');
    }
    // Every row has exactly one name element, so both lists share their order.
    const rows = await this.documentRootLocatorFactory().locatorForAll(
      `[id="${id}"] [role="option"]`,
    )();
    const row = rows[(await this.getOptionNames()).indexOf(name)];
    if (!row) {
      throw new Error(`UiPickerMenuHarness: no option named "${name}"`);
    }
    return row;
  }
}
