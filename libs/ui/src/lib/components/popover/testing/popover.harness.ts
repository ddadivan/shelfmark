import { ContentContainerComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';
import type { PopoverHarnessFilters } from './models/popover-harness-filters.interface';

/**
 * Harness for `ui-popover`. An open popover lives in an overlay pane under `<body>`, so load it
 * with `TestbedHarnessEnvironment.documentRootLoader(fixture)`. A harness taken while closed stays
 * valid: the host element itself moves into the pane. Its content is reachable with
 * `getHarness` / `getAllHarnesses` (the projected chips, for example).
 */
export class UiPopoverHarness extends ContentContainerComponentHarness {
  static hostSelector = 'ui-popover';

  static with(options: PopoverHarnessFilters = {}): HarnessPredicate<UiPopoverHarness> {
    return new HarnessPredicate(UiPopoverHarness, options).addOption(
      'heading',
      options.heading,
      (harness, heading) => HarnessPredicate.stringMatches(harness.getHeading(), heading),
    );
  }

  private readonly surface = this.locatorForOptional('.ui-popover__surface');
  private readonly headingElement = this.locatorForOptional('.ui-popover__heading');

  /** The heading text; empty while closed (nothing is rendered). */
  async getHeading(): Promise<string> {
    return (await (await this.headingElement())?.text()) ?? '';
  }

  /** Shown and not leaving. */
  async isOpen(): Promise<boolean> {
    const surface = await this.surface();
    return surface !== null && !(await surface.hasClass('ui-popover--leave'));
  }

  /** The trigger that opens this popover (the element whose `aria-controls` names it). */
  private async trigger() {
    const id = await (await this.host()).getAttribute('id');
    return this.documentRootLocatorFactory().locatorFor(`[aria-controls="${id}"]`)();
  }

  /** Opens it with a click on its trigger. Does nothing when it is open already. */
  async open(): Promise<void> {
    if (!(await this.isOpen())) {
      await (await this.trigger()).click();
    }
  }

  /** Whether the trigger reports the popover as open (`aria-expanded`). */
  async isTriggerExpanded(): Promise<boolean> {
    return (await (await this.trigger()).getAttribute('aria-expanded')) === 'true';
  }

  /** Closes with Esc (focus goes back to the trigger). */
  async close(): Promise<void> {
    if (await this.isOpen()) {
      await (await this.host()).sendKeys(TestKey.ESCAPE);
    }
  }
}
