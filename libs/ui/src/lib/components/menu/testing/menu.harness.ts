import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';
import { UiMenuItemHarness } from './menu-item.harness';
import type { MenuHarnessFilters } from './models/menu-harness-filters.interface';
import type { MenuItemHarnessFilters } from './models/menu-item-harness-filters.interface';

/**
 * Harness for `ui-menu`. An open menu lives in an overlay pane under `<body>`, so load it with
 * `TestbedHarnessEnvironment.documentRootLoader(fixture)`. A harness taken while closed stays valid:
 * the host element itself moves into the pane.
 */
export class UiMenuHarness extends ComponentHarness {
  static hostSelector = 'ui-menu';

  static with(options: MenuHarnessFilters = {}): HarnessPredicate<UiMenuHarness> {
    return new HarnessPredicate(UiMenuHarness, options).addOption(
      'label',
      options.label,
      (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label),
    );
  }

  private readonly surface = this.locatorForOptional('.ui-menu__surface');
  private readonly itemElements = this.locatorForAll('[role^="menuitem"]');

  async getLabel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /** Shown and not leaving. */
  async isOpen(): Promise<boolean> {
    const surface = await this.surface();
    return surface !== null && !(await surface.hasClass('ui-menu--leave'));
  }

  /**
   * Opens the menu through its trigger (the element whose `aria-controls` names this menu, as
   * `uiMenuTrigger` writes it). Does nothing when it is open already.
   */
  async open(): Promise<void> {
    if (await this.isOpen()) {
      return;
    }
    const id = await (await this.host()).getAttribute('id');
    const trigger = await this.documentRootLocatorFactory().locatorFor(`[aria-controls="${id}"]`)();
    await trigger.click();
  }

  /** Closes with Esc (focus goes back to the trigger). */
  async close(): Promise<void> {
    if (await this.isOpen()) {
      await this.sendKeys(TestKey.ESCAPE);
    }
  }

  /** Items of the open menu (none while closed), optionally filtered. */
  async getItems(filters: MenuItemHarnessFilters = {}): Promise<UiMenuItemHarness[]> {
    return this.locatorForAll(UiMenuItemHarness.with(filters))();
  }

  /** Opens the menu if needed and clicks the first item that matches. */
  async clickItem(filters: MenuItemHarnessFilters): Promise<void> {
    await this.open();
    const item = await this.locatorFor(UiMenuItemHarness.with(filters))();
    await item.click();
  }

  /** Text of the focused item, `null` when focus is outside the menu. */
  async getFocusedItemText(): Promise<string | null> {
    for (const item of await this.getItems()) {
      if (await item.isFocused()) {
        return item.getText();
      }
    }
    return null;
  }

  /**
   * Sends keys (arrows, Home / End, Enter, Esc, typeahead) to the focused item, as a keyboard user
   * would; to the host when no item has focus.
   */
  async sendKeys(...keys: (string | TestKey)[]): Promise<void> {
    for (const element of await this.itemElements()) {
      if (await element.isFocused()) {
        return element.sendKeys(...keys);
      }
    }
    return (await this.host()).sendKeys(...keys);
  }
}
