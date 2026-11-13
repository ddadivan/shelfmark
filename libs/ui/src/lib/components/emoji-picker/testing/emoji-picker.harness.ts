import {
  ComponentHarness,
  HarnessPredicate,
  TestKey,
  type TestElement,
} from '@angular/cdk/testing';
import type { EmojiPickerHarnessFilters } from './models/emoji-picker-harness-filters.interface';

/**
 * Harness for `ui-emoji-picker`. The panel renders in an overlay pane under `<body>`; the harness
 * finds it through the field's `aria-controls`, so it works from any loader. Emoji are addressed
 * by their accessible name (the item's `name`).
 */
export class UiEmojiPickerHarness extends ComponentHarness {
  static hostSelector = 'ui-emoji-picker';

  static with(options: EmojiPickerHarnessFilters = {}): HarnessPredicate<UiEmojiPickerHarness> {
    return new HarnessPredicate(UiEmojiPickerHarness, options)
      .addOption('label', options.label, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getLabel(), label),
      )
      .addOption('value', options.value, (harness, value) =>
        HarnessPredicate.stringMatches(harness.getValue(), value),
      );
  }

  private readonly field = this.locatorFor('input[role="combobox"]');
  private readonly label = this.locatorFor('.ui-field__label');
  private readonly error = this.locatorFor('.ui-field__error');

  async getLabel(): Promise<string> {
    return (await (await this.label()).text()).trim();
  }

  async getValue(): Promise<string> {
    return (await this.field()).getProperty<string>('value');
  }

  async getPlaceholder(): Promise<string> {
    return (await (await this.field()).getAttribute('placeholder')) ?? '';
  }

  /** The error message, `''` when there is none. */
  async getError(): Promise<string> {
    return (await (await this.error()).text()).trim();
  }

  async isDisabled(): Promise<boolean> {
    return (await (await this.field()).getProperty<boolean>('disabled')) === true;
  }

  async isOpen(): Promise<boolean> {
    return (await (await this.field()).getAttribute('aria-expanded')) === 'true';
  }

  async isFocused(): Promise<boolean> {
    return (await this.field()).isFocused();
  }

  /** Types into the field (replacing its text), as a person typing or pasting an emoji. */
  async setValue(text: string): Promise<void> {
    const field = await this.field();
    await field.clear();
    if (text) {
      await field.setInputValue(text);
      await field.dispatchEvent('input');
    }
  }

  /** Opens the panel with a click on the field; nothing when it is open already. */
  async open(): Promise<void> {
    if (!(await this.isOpen())) {
      const field = await this.field();
      await field.focus();
      await field.click();
    }
  }

  /** Closes with Esc. */
  async close(): Promise<void> {
    const panel = await this.panel();
    if (panel) {
      await panel.sendKeys(TestKey.ESCAPE);
    }
  }

  /** Types into the search box (opens the panel first). */
  async search(text: string): Promise<void> {
    await this.open();
    const box = await this.inPanel('.ui-emoji-picker__search-input');
    await box.clear();
    if (text) {
      await box.sendKeys(text);
    }
  }

  /** Accessible names of the category tabs. */
  async getCategories(): Promise<string[]> {
    return this.panelAttributes('[role="tab"]', 'aria-label');
  }

  /** Clicks the category tab with this name. */
  async selectCategory(label: string): Promise<void> {
    await (await this.inPanel(`[role="tab"][aria-label="${label}"]`)).click();
  }

  /** Headings of the shown sections ("Recent", "Yours", the category or the results). */
  async getSections(): Promise<string[]> {
    const id = await this.panelId();
    if (!id) {
      return [];
    }
    const headings = await this.documentRootLocatorFactory().locatorForAll(
      `[id="${id}"] .ui-emoji-picker__heading`,
    )();
    return Promise.all(headings.map(async (heading) => (await heading.text()).trim()));
  }

  /** Names of the shown emoji, optionally only those of the section with this heading. */
  async getEmojiNames(section?: string): Promise<string[]> {
    const scope = section ? await this.sectionSelector(section) : '';
    if (scope === null) {
      return [];
    }
    return this.panelAttributes(`${scope} [role="gridcell"]`, 'aria-label');
  }

  /** The names of the own emoji the person may remove ("Yours" entries with a remove action). */
  async getRemovableNames(): Promise<string[]> {
    return this.panelAttributes('[data-own] [role="gridcell"][aria-description]', 'aria-label');
  }

  /** Opens the panel if needed and clicks the first emoji with this name. */
  async choose(name: string): Promise<void> {
    await this.open();
    await (await this.cell(name)).click();
  }

  /** Removes an own emoji with Delete on its cell (the keyboard path of the "×"). */
  async remove(name: string): Promise<void> {
    const cell = await this.cell(name, '[data-own] ');
    await cell.focus();
    await cell.sendKeys(TestKey.DELETE);
  }

  /** The "no results" text of the open panel, `''` while there are emoji. */
  async getNoResultsText(): Promise<string> {
    const id = await this.panelId();
    if (!id) {
      return '';
    }
    const status = await this.documentRootLocatorFactory().locatorForOptional(
      `[id="${id}"] .ui-emoji-picker__status`,
    )();
    return status ? (await status.text()).trim() : '';
  }

  private async panelId(): Promise<string | null> {
    return (await this.field()).getAttribute('aria-controls');
  }

  private async panel(): Promise<TestElement | null> {
    const id = await this.panelId();
    return id ? this.documentRootLocatorFactory().locatorForOptional(`[id="${id}"]`)() : null;
  }

  private async inPanel(selector: string): Promise<TestElement> {
    const id = await this.panelId();
    if (!id) {
      throw new Error('UiEmojiPickerHarness: the panel is closed');
    }
    return this.documentRootLocatorFactory().locatorFor(`[id="${id}"] ${selector}`)();
  }

  private async panelAttributes(selector: string, attribute: string): Promise<string[]> {
    const id = await this.panelId();
    if (!id) {
      return [];
    }
    const elements = await this.documentRootLocatorFactory().locatorForAll(
      `[id="${id}"] ${selector}`,
    )();
    return Promise.all(
      elements.map(async (element) => (await element.getAttribute(attribute)) ?? ''),
    );
  }

  /** `[aria-labelledby="<heading id>"]` of the section with this heading, `null` when absent. */
  private async sectionSelector(label: string): Promise<string | null> {
    const id = await this.panelId();
    if (!id) {
      return null;
    }
    const headings = await this.documentRootLocatorFactory().locatorForAll(
      `[id="${id}"] .ui-emoji-picker__heading`,
    )();
    for (const heading of headings) {
      if ((await heading.text()).trim() === label) {
        return `[aria-labelledby="${await heading.getAttribute('id')}"]`;
      }
    }
    return null;
  }

  private async cell(name: string, scope = ''): Promise<TestElement> {
    const cell = await this.inPanel(`${scope}[role="gridcell"][aria-label="${name}"]`).catch(
      () => null,
    );
    if (!cell) {
      throw new Error(`UiEmojiPickerHarness: no emoji named "${name}"`);
    }
    return cell;
  }
}
