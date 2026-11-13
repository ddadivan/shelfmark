import { ComponentHarness, HarnessPredicate, type TestKey } from '@angular/cdk/testing';
import { BUTTON_VARIANT } from '../models/button-variant.const';
import type { ButtonVariant } from '../models/button-variant.type';
import type { ButtonHarnessFilters } from './models/button-harness-filters.interface';

/**
 * Harness for `ui-button`. The host is a non-focusable wrapper; every query and action goes to
 * the inner native `<button>` (or `<a>` with `href`), as a user would.
 */
export class UiButtonHarness extends ComponentHarness {
  static hostSelector = 'ui-button';

  /** A predicate for a button with the given text, label, name, variant or disabled state. */
  static with(options: ButtonHarnessFilters = {}): HarnessPredicate<UiButtonHarness> {
    return new HarnessPredicate(UiButtonHarness, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getText(), text),
      )
      .addOption('label', options.label, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAriaLabel(), label),
      )
      .addOption('name', options.name, (harness, name) =>
        HarnessPredicate.stringMatches(harness.getName(), name),
      )
      .addOption(
        'variant',
        options.variant,
        async (harness, variant) => (await harness.getVariant()) === variant,
      )
      .addOption(
        'disabled',
        options.disabled,
        async (harness, disabled) => (await harness.isDisabled()) === disabled,
      );
  }

  private readonly control = this.locatorFor('button, a');

  /** Clicks the inner control (with modifier keys, for example `{ control: true }`). */
  async click(
    modifiers: { control?: boolean; meta?: boolean; shift?: boolean } = {},
  ): Promise<void> {
    return (await this.control()).click(modifiers);
  }

  /** Sends keys to the inner control (for example ArrowDown on a menu trigger). */
  async sendKeys(...keys: (string | TestKey)[]): Promise<void> {
    return (await this.control()).sendKeys(...keys);
  }

  async focus(): Promise<void> {
    return (await this.control()).focus();
  }

  async blur(): Promise<void> {
    return (await this.control()).blur();
  }

  async isFocused(): Promise<boolean> {
    return (await this.control()).isFocused();
  }

  /** The visible label, trimmed. */
  async getText(): Promise<string> {
    return (await (await this.control()).text()).trim();
  }

  async getAriaLabel(): Promise<string | null> {
    return (await this.control()).getAttribute('aria-label');
  }

  /** The accessible name: `aria-label` when set, else the visible text. */
  async getName(): Promise<string> {
    return (await this.getAriaLabel()) ?? (await this.getText());
  }

  async getVariant(): Promise<ButtonVariant> {
    const control = await this.control();
    for (const variant of Object.values(BUTTON_VARIANT)) {
      if (await control.hasClass(`ui-button--${variant}`)) {
        return variant;
      }
    }
    return BUTTON_VARIANT.Secondary;
  }

  /** Disabled natively (`<button disabled>`) or, for a link, through `aria-disabled`. */
  async isDisabled(): Promise<boolean> {
    const control = await this.control();
    const [native, aria] = await Promise.all([
      control.getProperty<boolean | undefined>('disabled'),
      control.getAttribute('aria-disabled'),
    ]);
    return native === true || aria === 'true';
  }

  /** Busy while the spinner shows (`aria-busy="true"`). */
  async isLoading(): Promise<boolean> {
    return (await (await this.control()).getAttribute('aria-busy')) === 'true';
  }

  /** `true` / `false` from `aria-expanded`, `null` when the button controls no popup. */
  async isExpanded(): Promise<boolean | null> {
    const value = await (await this.control()).getAttribute('aria-expanded');
    return value === null ? null : value === 'true';
  }

  /** `aria-pressed` as written (`true`, `false`, `mixed`), `null` for a plain button. */
  async getPressed(): Promise<string | null> {
    return (await this.control()).getAttribute('aria-pressed');
  }

  /** `href` of a link button; `null` for a `<button>` or a disabled link. */
  async getHref(): Promise<string | null> {
    return (await this.control()).getAttribute('href');
  }

  async isLink(): Promise<boolean> {
    return (await (await this.control()).getProperty<string>('tagName')) === 'A';
  }
}
