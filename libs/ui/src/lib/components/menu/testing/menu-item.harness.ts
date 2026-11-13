import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';
import type { MenuItemHarnessFilters } from './models/menu-item-harness-filters.interface';

/** Harness for `ui-menu-item`; queries and actions go to the inner element with the menu item role. */
export class UiMenuItemHarness extends ComponentHarness {
  static hostSelector = 'ui-menu-item';

  static with(options: MenuItemHarnessFilters = {}): HarnessPredicate<UiMenuItemHarness> {
    return new HarnessPredicate(UiMenuItemHarness, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getText(), text),
      )
      .addOption(
        'disabled',
        options.disabled,
        async (harness, disabled) => (await harness.isDisabled()) === disabled,
      );
  }

  private readonly item = this.locatorFor('[role^="menuitem"]');
  private readonly label = this.locatorFor('.ui-menu-item__label');
  private readonly hint = this.locatorForOptional('.ui-menu-item__hint');

  /** Clicks the item: it activates (unless disabled) and the menu closes. */
  async click(): Promise<void> {
    return (await this.item()).click();
  }

  async hover(): Promise<void> {
    return (await this.item()).hover();
  }

  async getText(): Promise<string> {
    return (await (await this.label()).text()).trim();
  }

  /** The shortcut hint (`⌘C`), `null` without one. */
  async getShortcut(): Promise<string | null> {
    const hint = await this.hint();
    return hint ? (await hint.text()).trim() : null;
  }

  async isDisabled(): Promise<boolean> {
    return (await (await this.item()).getAttribute('aria-disabled')) === 'true';
  }

  async isDanger(): Promise<boolean> {
    return (await this.item()).hasClass('ui-menu-item--danger');
  }

  /** The current choice of a group (`selected`). */
  async isSelected(): Promise<boolean> {
    return (await this.item()).hasClass('is-selected');
  }

  /** `aria-checked` of a checkbox or radio item; `null` for a plain action. */
  async getChecked(): Promise<boolean | null> {
    const value = await (await this.item()).getAttribute('aria-checked');
    return value === null ? null : value === 'true';
  }

  /** `menuitem`, `menuitemcheckbox` or `menuitemradio`. */
  async getRole(): Promise<string | null> {
    return (await this.item()).getAttribute('role');
  }

  async isFocused(): Promise<boolean> {
    return (await this.item()).isFocused();
  }
}
