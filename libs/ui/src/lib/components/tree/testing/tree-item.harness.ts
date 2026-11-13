import {
  ComponentHarness,
  HarnessPredicate,
  type ModifierKeys,
  TestKey,
} from '@angular/cdk/testing';
import type { TreeItemHarnessFilters } from './models/tree-item-harness-filters.interface';

/**
 * Harness for one row of `ui-tree` (the `role="treeitem"` element). Its children are a sibling
 * group, so the row's queries never see them.
 */
export class UiTreeItemHarness extends ComponentHarness {
  static hostSelector = 'ui-tree [role="treeitem"]';

  static with(options: TreeItemHarnessFilters = {}): HarnessPredicate<UiTreeItemHarness> {
    return new HarnessPredicate(UiTreeItemHarness, options)
      .addOption('name', options.name, (harness, name) =>
        HarnessPredicate.stringMatches(harness.getName(), name),
      )
      .addOption(
        'level',
        options.level,
        async (harness, level) => (await harness.getLevel()) === level,
      )
      .addOption(
        'expanded',
        options.expanded,
        async (harness, expanded) => (await harness.isExpanded()) === expanded,
      )
      .addOption(
        'current',
        options.current,
        async (harness, current) => (await harness.isCurrent()) === current,
      )
      .addOption(
        'folder',
        options.folder,
        async (harness, folder) => (await harness.isFolder()) === folder,
      );
  }

  private readonly name = this.locatorFor('.ui-tree__name');
  private readonly count = this.locatorForOptional('.ui-tree__count');
  private readonly dropBadge = this.locatorForOptional('.ui-tree__drop-badge');
  private readonly twist = this.locatorForOptional('.ui-tree__twist');
  private readonly more = this.locatorForOptional('.ui-tree__more button');

  async getName(): Promise<string> {
    return (await (await this.name()).text()).trim();
  }

  /** The link count shown at the end, `null` without one (or while the drop badge replaces it). */
  async getCount(): Promise<number | null> {
    const count = await this.count();
    return count ? Number((await count.text()).trim()) : null;
  }

  /** The drop badge ("Move here") while the row is the drop target, else `null`. */
  async getDropLabel(): Promise<string | null> {
    const badge = await this.dropBadge();
    return badge ? (await badge.text()).trim() : null;
  }

  async getLevel(): Promise<number> {
    return Number(await (await this.host()).getAttribute('aria-level'));
  }

  async isFolder(): Promise<boolean> {
    return (await this.host()).hasClass('ui-tree__row--folder');
  }

  /** Has children that can open and close. */
  async isExpandable(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-owns')) !== null;
  }

  async isExpanded(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-expanded')) === 'true';
  }

  async isCurrent(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-current')) !== null;
  }

  /** Marked as not a drop target (`aria-disabled`, for example the dragged folder's own children). */
  async isDisabled(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-disabled')) === 'true';
  }

  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Clicks the row: chooses it (`selected`) and, for a folder with children, toggles it (Aria). */
  async select(): Promise<void> {
    return (await this.host()).click();
  }

  /** Opens the children with the chevron, without choosing the row. Nothing when open. */
  async expand(): Promise<void> {
    if (!(await this.isExpanded())) {
      await this.toggle();
    }
  }

  /** Closes the children with the chevron. Nothing when closed. */
  async collapse(): Promise<void> {
    if (await this.isExpanded()) {
      await this.toggle();
    }
  }

  /** Clicks the chevron. */
  async toggle(): Promise<void> {
    const twist = await this.twist();
    if (!twist || !(await this.isExpandable())) {
      throw new Error(`UiTreeItemHarness: "${await this.getName()}" has no children to toggle`);
    }
    await twist.click();
  }

  /** Whether the row has the "..." menu button (folder rows with `menuLabel`). */
  async hasMenuButton(): Promise<boolean> {
    return (await this.more()) !== null;
  }

  async getMenuButtonLabel(): Promise<string | null> {
    const more = await this.more();
    return more ? more.getAttribute('aria-label') : null;
  }

  /** `aria-expanded` of the "..." button (the feature binds `menuNodeId` while its menu is open). */
  async isMenuOpen(): Promise<boolean> {
    const more = await this.more();
    return more !== null && (await more.getAttribute('aria-expanded')) === 'true';
  }

  /** Clicks the "..." button: the tree emits `contextMenu` with the `button` trigger. */
  async openMenu(): Promise<void> {
    const more = await this.more();
    if (!more) {
      throw new Error(`UiTreeItemHarness: "${await this.getName()}" has no menu button`);
    }
    await more.click();
  }

  /** Right-clicks the row: the tree emits `contextMenu` with the `pointer` trigger (folders only). */
  async rightClick(): Promise<void> {
    return (await this.host()).rightClick(1, 1);
  }

  /** Sends keys to the row (arrows, Home / End, Enter, the context-menu key). */
  async sendKeys(...keys: (string | TestKey)[]): Promise<void> {
    return (await this.host()).sendKeys(...keys);
  }

  /** Sends keys with modifiers held, for example Shift+F10 or Alt+Enter for the folder menu. */
  async sendKeysWith(modifiers: ModifierKeys, ...keys: (string | TestKey)[]): Promise<void> {
    return (await this.host()).sendKeys(modifiers, ...keys);
  }
}
