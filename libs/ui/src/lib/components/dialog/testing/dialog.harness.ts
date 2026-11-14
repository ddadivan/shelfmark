import { ContentContainerComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';
import { DIALOG_SIZE } from '../models/dialog-size.const';
import type { DialogSize } from '../models/dialog-size.type';
import type { DialogHarnessFilters } from './models/dialog-harness-filters.interface';
import type { DialogHarnessSlot } from './models/dialog-harness-slot.type';

/**
 * Harness for `ui-dialog` (also inside `ui-sheet` and the confirm dialog). Dialogs opened with
 * `DialogService` live in an overlay under `<body>`: load them with
 * `TestbedHarnessEnvironment.documentRootLoader(fixture)`. Harnesses of the projected content
 * (buttons, fields) load from this harness, or from one area with `getChildLoader(DIALOG_HARNESS_SLOT.Footer)`.
 */
export class UiDialogHarness extends ContentContainerComponentHarness<DialogHarnessSlot> {
  static hostSelector = 'ui-dialog';

  static with(options: DialogHarnessFilters = {}): HarnessPredicate<UiDialogHarness> {
    return new HarnessPredicate(UiDialogHarness, options).addOption(
      'title',
      options.title,
      (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title),
    );
  }

  private readonly panel = this.locatorFor('.ui-dialog');
  private readonly title = this.locatorFor('.ui-dialog__title');
  private readonly body = this.locatorFor('.ui-dialog__body');
  private readonly closeButton = this.locatorForOptional('.ui-dialog__close button');

  async getTitle(): Promise<string> {
    return (await (await this.title()).text()).trim();
  }

  /** Text of the body (the default slot), whitespace collapsed. */
  async getBodyText(): Promise<string> {
    return (await (await this.body()).text()).replace(/\s+/g, ' ').trim();
  }

  /** `dialog` or `alertdialog`, from the CDK container that the title names; `null` inline. */
  async getRole(): Promise<string | null> {
    const container = await this.container();
    return container ? container.getAttribute('role') : null;
  }

  /** `aria-modal` of the CDK container (`true` for every dialog the service opens). */
  async isModal(): Promise<boolean> {
    const container = await this.container();
    return container !== null && (await container.getAttribute('aria-modal')) === 'true';
  }

  async getSize(): Promise<DialogSize> {
    const panel = await this.panel();
    if (await panel.hasClass('ui-dialog--lg')) {
      return DIALOG_SIZE.Lg;
    }
    return (await panel.hasClass('ui-dialog--md')) ? DIALOG_SIZE.Md : DIALOG_SIZE.Sm;
  }

  /** Shown as a bottom sheet (`ui-sheet`). */
  async isSheet(): Promise<boolean> {
    return (await this.panel()).hasClass('ui-dialog--sheet');
  }

  /** A `tall` sheet. */
  async isTall(): Promise<boolean> {
    return (await this.panel()).hasClass('ui-dialog--sheet-tall');
  }

  /** The body overflows and became a focusable region. */
  async isScrollable(): Promise<boolean> {
    return (await (await this.body()).getAttribute('role')) === 'region';
  }

  /** Playing its leave animation after a close. */
  async isLeaving(): Promise<boolean> {
    return (await this.panel()).hasClass('ui-dialog--leave');
  }

  async hasCloseButton(): Promise<boolean> {
    return (await this.closeButton()) !== null;
  }

  /** `aria-label` of the header close button, `null` without one. */
  async getCloseLabel(): Promise<string | null> {
    const button = await this.closeButton();
    return button ? button.getAttribute('aria-label') : null;
  }

  /** Clicks the header close button. */
  async close(): Promise<void> {
    const button = await this.closeButton();
    if (!button) {
      throw new Error('UiDialogHarness: the dialog has no close button (no closeLabel)');
    }
    await button.click();
  }

  /** Presses Esc inside the dialog (closes it unless it is not dismissible). */
  async pressEscape(): Promise<void> {
    return (await this.panel()).sendKeys(TestKey.ESCAPE);
  }

  private async container() {
    const id = await (await this.title()).getAttribute('id');
    return this.documentRootLocatorFactory().locatorForOptional(`[aria-labelledby="${id}"]`)();
  }
}
