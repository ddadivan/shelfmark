import { ContentContainerComponentHarness, HarnessPredicate } from '@angular/cdk/testing';
import { UiDialogHarness } from '../../dialog/testing/dialog.harness';
import type { SheetHarnessFilters } from './models/sheet-harness-filters.interface';

/**
 * Harness for `ui-sheet`, the content component of a bottom sheet. It wraps the `ui-dialog` the
 * sheet renders; load it with `TestbedHarnessEnvironment.documentRootLoader(fixture)` and load
 * projected content (header actions, list rows) from it.
 */
export class UiSheetHarness extends ContentContainerComponentHarness {
  static hostSelector = 'ui-sheet';

  static with(options: SheetHarnessFilters = {}): HarnessPredicate<UiSheetHarness> {
    return new HarnessPredicate(UiSheetHarness, options).addOption(
      'title',
      options.title,
      (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title),
    );
  }

  private readonly dialog = this.locatorFor(UiDialogHarness);

  async getTitle(): Promise<string> {
    return (await this.dialog()).getTitle();
  }

  async getBodyText(): Promise<string> {
    return (await this.dialog()).getBodyText();
  }

  /** `height="tall"`. */
  async isTall(): Promise<boolean> {
    return (await this.dialog()).isTall();
  }

  async hasCloseButton(): Promise<boolean> {
    return (await this.dialog()).hasCloseButton();
  }

  /** Clicks the header close button. */
  async close(): Promise<void> {
    return (await this.dialog()).close();
  }

  async pressEscape(): Promise<void> {
    return (await this.dialog()).pressEscape();
  }
}
