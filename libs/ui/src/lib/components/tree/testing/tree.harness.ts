import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';
import { UiTreeItemHarness } from './tree-item.harness';
import type { TreeHarnessFilters } from './models/tree-harness-filters.interface';
import type { TreeItemHarnessFilters } from './models/tree-item-harness-filters.interface';

/**
 * Harness for `ui-tree`. Children of a folder are rendered once it has been open (and then kept),
 * so `getItems()` lists the rows of never-opened folders only after `expand()`.
 */
export class UiTreeHarness extends ComponentHarness {
  static hostSelector = 'ui-tree';

  static with(options: TreeHarnessFilters = {}): HarnessPredicate<UiTreeHarness> {
    return new HarnessPredicate(UiTreeHarness, options).addOption(
      'label',
      options.label,
      (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label),
    );
  }

  private readonly tree = this.locatorFor('[role="tree"]');
  private readonly heading = this.locatorForOptional('.ui-tree__section');

  async getLabel(): Promise<string | null> {
    return (await this.tree()).getAttribute('aria-label');
  }

  /** The section heading between fixed rows and folders, `null` without one. */
  async getHeading(): Promise<string | null> {
    const heading = await this.heading();
    return heading ? (await heading.text()).trim() : null;
  }

  /** Every row in document order (fixed rows, then folders depth first), optionally filtered. */
  async getItems(filters: TreeItemHarnessFilters = {}): Promise<UiTreeItemHarness[]> {
    return this.locatorForAll(UiTreeItemHarness.with(filters))();
  }

  /** The first row that matches; throws when none does. */
  async getItem(filters: TreeItemHarnessFilters): Promise<UiTreeItemHarness> {
    return this.locatorFor(UiTreeItemHarness.with(filters))();
  }

  /** Names of the rows, in order. */
  async getItemNames(filters: TreeItemHarnessFilters = {}): Promise<string[]> {
    return Promise.all((await this.getItems(filters)).map((item) => item.getName()));
  }

  /** The current row (`activeId`), `null` when no row is current. */
  async getCurrentItem(): Promise<UiTreeItemHarness | null> {
    return this.locatorForOptional(UiTreeItemHarness.with({ current: true }))();
  }
}
