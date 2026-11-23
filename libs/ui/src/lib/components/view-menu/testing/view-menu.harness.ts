import { ComponentHarness, TestKey } from '@angular/cdk/testing';
import type { ViewMenuField } from '../models/view-menu-field.interface';

/**
 * Harness for `ui-view-menu`. The open panel lives in an overlay pane under `<body>` (found
 * through the trigger's `aria-controls`), so the harness works with a loader of the fixture or
 * `TestbedHarnessEnvironment.documentRootLoader(fixture)`.
 */
export class UiViewMenuHarness extends ComponentHarness {
  static hostSelector = 'ui-view-menu';

  private readonly trigger = this.locatorFor('.ui-view-menu__trigger');
  private readonly root = this.documentRootLocatorFactory();

  /** The trigger text ("View"). */
  async getLabel(): Promise<string> {
    return (await (await this.trigger()).text()).trim();
  }

  async isOpen(): Promise<boolean> {
    return (await (await this.trigger()).getAttribute('aria-expanded')) === 'true';
  }

  /** Opens the panel with a click on the trigger (no-op when open). */
  async open(): Promise<void> {
    if (!(await this.isOpen())) {
      await (await this.trigger()).click();
    }
  }

  /** Closes the panel with Esc on the trigger (no-op when closed). */
  async close(): Promise<void> {
    if (await this.isOpen()) {
      await (await this.trigger()).sendKeys(TestKey.ESCAPE);
    }
  }

  /** The grid step, 1-based; opens the panel first. */
  async getStep(): Promise<number> {
    const range = await this.range();
    return Number(await range.getProperty<string>('value'));
  }

  /** The caption of the step ("4 / 6"). */
  async getStepText(): Promise<string> {
    await this.open();
    const text = await (await this.inPanel('.ui-view-menu__step')).text();
    return text.trim();
  }

  /** Sets the grid step as a drag of the slider would; opens the panel first. */
  async setStep(step: number): Promise<void> {
    const range = await this.range();
    await range.setInputValue(String(step));
    await range.dispatchEvent('input');
  }

  /** Whether the slider is turned off (`gridDisabled`); opens the panel first. */
  async isGridDisabled(): Promise<boolean> {
    return (await this.range()).getProperty<boolean>('disabled');
  }

  /** Label and state of every switch, in order; opens the panel first. */
  async getFields(): Promise<Pick<ViewMenuField, 'label' | 'checked'>[]> {
    await this.open();
    const switches = await this.inPanelAll('.ui-view-menu__row button[role="switch"]');
    return Promise.all(
      switches.map(async (button) => ({
        label: (await button.getAttribute('aria-label')) ?? '',
        checked: (await button.getAttribute('aria-checked')) === 'true',
      })),
    );
  }

  /** Flips the switch named `label` with a click on it; opens the panel first. */
  async toggleField(label: string): Promise<void> {
    await this.open();
    const switches = await this.inPanelAll('.ui-view-menu__row button[role="switch"]');
    for (const button of switches) {
      if ((await button.getAttribute('aria-label')) === label) {
        await button.click();
        return;
      }
    }
    throw new Error(`No view menu field named "${label}"`);
  }

  private async range() {
    await this.open();
    return this.inPanel('input[type="range"]');
  }

  private async panelSelector(): Promise<string> {
    const id = await (await this.trigger()).getAttribute('aria-controls');
    return `#${id}`;
  }

  private async inPanel(selector: string) {
    return this.root.locatorFor(`${await this.panelSelector()} ${selector}`)();
  }

  private async inPanelAll(selector: string) {
    return this.root.locatorForAll(`${await this.panelSelector()} ${selector}`)();
  }
}
