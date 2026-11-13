import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';
import { UiOptionHarness } from '../../select/testing/option.harness';
import type { OptionHarnessFilters } from '../../select/testing/models/option-harness-filters.interface';
import type { CommandListHarnessFilters } from './models/command-list-harness-filters.interface';

/**
 * Harness for `ui-command-list` (search dialog, header search popup). The rows are
 * `UiOptionHarness`es found through the input's `aria-controls`, so the harness works in place and
 * in `popup` mode, where the results live in an overlay pane.
 */
export class UiCommandListHarness extends ComponentHarness {
  static hostSelector = 'ui-command-list';

  static with(options: CommandListHarnessFilters = {}): HarnessPredicate<UiCommandListHarness> {
    return new HarnessPredicate(UiCommandListHarness, options).addOption(
      'label',
      options.label,
      (harness, label) => HarnessPredicate.stringMatches(harness.getInputLabel(), label),
    );
  }

  private readonly input = this.locatorFor('input[role="combobox"]');

  async getInputLabel(): Promise<string | null> {
    return (await this.input()).getAttribute('aria-label');
  }

  async getPlaceholder(): Promise<string | null> {
    return (await this.input()).getAttribute('placeholder');
  }

  async getQuery(): Promise<string> {
    return (await this.input()).getProperty<string>('value');
  }

  /** Replaces the query by typing it, as a user would (the list's `query` model follows). */
  async setQuery(text: string): Promise<void> {
    const input = await this.input();
    await input.clear();
    if (text) {
      await input.sendKeys(text);
    }
  }

  async focus(): Promise<void> {
    return (await this.input()).focus();
  }

  async isFocused(): Promise<boolean> {
    return (await this.input()).isFocused();
  }

  /** `aria-expanded` of the input: always true in place, the panel state in `popup` mode. */
  async isOpen(): Promise<boolean> {
    return (await (await this.input()).getAttribute('aria-expanded')) === 'true';
  }

  /** `aria-busy` on the listbox while results load. */
  async isBusy(): Promise<boolean> {
    const list = await this.list();
    return list !== null && (await list.getAttribute('aria-busy')) === 'true';
  }

  /** No rows: the listbox is hidden and the empty slot shows in the status region. */
  async isEmpty(): Promise<boolean> {
    const list = await this.list();
    return list === null || (await list.getProperty<boolean>('hidden')) === true;
  }

  /** Accessible name of the listbox (`listLabel`). */
  async getListLabel(): Promise<string | null> {
    const list = await this.list();
    return list ? list.getAttribute('aria-label') : null;
  }

  /** Text of the persistent status region (the status slot, plus the empty slot when empty). */
  async getStatusText(): Promise<string> {
    const id = await this.listId();
    if (id === null) {
      return '';
    }
    const status = await this.documentRootLocatorFactory().locatorForOptional(
      `[id="${id}"] ~ [role="status"]`,
    )();
    return status ? (await status.text()).replace(/\s+/g, ' ').trim() : '';
  }

  /** Group headings in order. */
  async getGroupHeadings(): Promise<string[]> {
    const id = await this.listId();
    if (id === null) {
      return [];
    }
    const headings = await this.documentRootLocatorFactory().locatorForAll(
      `[id="${id}"] [role="group"] > .ui-command-list__heading`,
    )();
    return Promise.all(headings.map(async (heading) => (await heading.text()).trim()));
  }

  /** The rows, optionally filtered (`text` is the whole row text: title, meta and trailing). */
  async getOptions(filters: OptionHarnessFilters = {}): Promise<UiOptionHarness[]> {
    const id = await this.listId();
    if (id === null) {
      return [];
    }
    return this.documentRootLocatorFactory().locatorForAll(
      UiOptionHarness.with({ ...filters, ancestor: `[id="${id}"]` }),
    )();
  }

  /** Text of the row under the arrow keys (`aria-activedescendant`), `null` when none. */
  async getActiveOptionText(): Promise<string | null> {
    for (const option of await this.getOptions()) {
      if (await option.isActive()) {
        return option.getText();
      }
    }
    return null;
  }

  /** Clicks the first matching row; `background` holds Ctrl (a background choice). */
  async chooseOption(filters: OptionHarnessFilters, background = false): Promise<void> {
    const [option] = await this.getOptions(filters);
    if (!option) {
      throw new Error(`UiCommandListHarness: no option matches ${JSON.stringify(filters)}`);
    }
    await option.click(background ? { control: true } : {});
  }

  /** Presses Enter in the input (chooses the active row); `background` holds Ctrl. */
  async pressEnter(background = false): Promise<void> {
    const input = await this.input();
    if (background) {
      await input.sendKeys({ control: true }, TestKey.ENTER);
    } else {
      await input.sendKeys(TestKey.ENTER);
    }
  }

  /** Sends keys to the input (arrows, Home / End, Esc). */
  async sendKeys(...keys: (string | TestKey)[]): Promise<void> {
    return (await this.input()).sendKeys(...keys);
  }

  private async listId(): Promise<string | null> {
    return (await this.input()).getAttribute('aria-controls');
  }

  private async list() {
    const id = await this.listId();
    return id === null
      ? null
      : this.documentRootLocatorFactory().locatorForOptional(`[id="${id}"]`)();
  }
}
