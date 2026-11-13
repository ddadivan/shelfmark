import {
  ComponentHarness,
  HarnessPredicate,
  type TestElement,
  TestKey,
} from '@angular/cdk/testing';
import { BUTTON_VARIANT } from '../../button/models/button-variant.const';
import { UiButtonHarness } from '../../button/testing/button.harness';
import type { ColorPickerHarnessFilters } from './models/color-picker-harness-filters.interface';

/**
 * Harness for `ui-color-picker`: the "+" swatch button and its disclosed panel (area with two
 * hidden sliders, hue slider, hex field, Cancel / Add).
 */
export class UiColorPickerHarness extends ComponentHarness {
  static hostSelector = 'ui-color-picker';

  static with(options: ColorPickerHarnessFilters = {}): HarnessPredicate<UiColorPickerHarness> {
    return new HarnessPredicate(UiColorPickerHarness, options).addOption(
      'label',
      options.label,
      (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label),
    );
  }

  private readonly swatch = this.locatorFor('.ui-color-picker__swatch');
  private readonly panel = this.locatorForOptional('.ui-color-picker__panel');
  private readonly sliders = this.locatorForAll('.ui-color-picker__hidden-slider');
  private readonly hue = this.locatorFor('.ui-color-picker__hue');
  private readonly hex = this.locatorFor('.ui-color-picker__hex-input');
  private readonly error = this.locatorForOptional('.ui-color-picker__error');
  private readonly cancelButton = this.locatorFor(
    UiButtonHarness.with({ ancestor: '.ui-color-picker__actions', variant: BUTTON_VARIANT.Ghost }),
  );
  private readonly addButton = this.locatorFor(
    UiButtonHarness.with({
      ancestor: '.ui-color-picker__actions',
      variant: BUTTON_VARIANT.Primary,
    }),
  );

  async getLabel(): Promise<string | null> {
    return (await this.swatch()).getAttribute('aria-label');
  }

  async isOpen(): Promise<boolean> {
    return (await (await this.swatch()).getAttribute('aria-expanded')) === 'true';
  }

  async isDisabled(): Promise<boolean> {
    return (await this.swatch()).getProperty<boolean>('disabled');
  }

  /** The swatch shows an own colour (a value is set) rather than the "+". */
  async hasColour(): Promise<boolean> {
    return (await this.swatch()).hasClass('ui-color-picker__swatch--own');
  }

  async isSelected(): Promise<boolean> {
    return (await this.swatch()).hasClass('ui-color-picker__swatch--selected');
  }

  /** Clicks the swatch: opens or closes the panel. */
  async toggle(): Promise<void> {
    return (await this.swatch()).click();
  }

  async open(): Promise<void> {
    if (!(await this.isOpen())) {
      await this.toggle();
    }
  }

  /** The hex field's text. */
  async getHex(): Promise<string> {
    return (await this.openField(this.hex)).getProperty<string>('value');
  }

  /** Replaces the hex field's text by typing. */
  async setHex(text: string): Promise<void> {
    const field = await this.openField(this.hex);
    await field.clear();
    if (text) {
      await field.sendKeys(text);
    }
  }

  /** Presses Enter in the hex field (tidies the text, as a blur does). */
  async confirmHex(): Promise<void> {
    return (await this.openField(this.hex)).sendKeys(TestKey.ENTER);
  }

  async isHexInvalid(): Promise<boolean> {
    return (await (await this.openField(this.hex)).getAttribute('aria-invalid')) === 'true';
  }

  /** The invalid-hex message, `null` while the text is valid. */
  async getError(): Promise<string | null> {
    const error = await this.error();
    return error ? (await error.text()).trim() : null;
  }

  async getHue(): Promise<number> {
    return Number(await (await this.openField(this.hue)).getProperty<string>('value'));
  }

  async setHue(degrees: number): Promise<void> {
    return this.setRange(await this.openField(this.hue), degrees);
  }

  async setBrightness(percent: number): Promise<void> {
    return this.setRange(await this.slider(0), percent);
  }

  async setSaturation(percent: number): Promise<void> {
    return this.setRange(await this.slider(1), percent);
  }

  /** Whether Add is enabled (it is disabled while the hex text is invalid). */
  async canAdd(): Promise<boolean> {
    return !(await (await this.addButton()).isDisabled());
  }

  /** Clicks Add: commits the colour (the feature closes the panel through `open` if it wants). */
  async add(): Promise<void> {
    return (await this.addButton()).click();
  }

  /** Clicks Cancel: closes without a change. */
  async cancel(): Promise<void> {
    return (await this.cancelButton()).click();
  }

  /** Presses Esc in the panel. */
  async pressEscape(): Promise<void> {
    return (await this.openField(this.hex)).sendKeys(TestKey.ESCAPE);
  }

  private async openField<T>(locator: () => Promise<T>): Promise<T> {
    if ((await this.panel()) === null) {
      throw new Error('UiColorPickerHarness: the panel is closed; call open() first');
    }
    return locator();
  }

  private async slider(index: number): Promise<TestElement> {
    const slider = (await this.openField(this.sliders))[index];
    if (!slider) {
      throw new Error('UiColorPickerHarness: slider not found');
    }
    return slider;
  }

  private async setRange(element: TestElement, value: number): Promise<void> {
    await element.setInputValue(String(value));
    await element.dispatchEvent('input');
  }
}
