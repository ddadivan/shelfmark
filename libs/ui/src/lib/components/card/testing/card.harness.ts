import { ContentContainerComponentHarness, HarnessPredicate } from '@angular/cdk/testing';
import type { CardHarnessFilters } from './models/card-harness-filters.interface';
import type { CardHarnessSlot } from './models/card-harness-slot.type';

/**
 * Harness for `ui-card`. The card has one activation target: the title link (`href`) or button,
 * stretched over the card. Harnesses of projected controls (favorite, "...", checkbox) load from
 * this harness or from one area with `getChildLoader(CARD_HARNESS_SLOT.Actions)`.
 */
export class UiCardHarness extends ContentContainerComponentHarness<CardHarnessSlot> {
  static hostSelector = 'ui-card';

  static with(options: CardHarnessFilters = {}): HarnessPredicate<UiCardHarness> {
    return new HarnessPredicate(UiCardHarness, options)
      .addOption('title', options.title, (harness, title) =>
        HarnessPredicate.stringMatches(harness.getTitle(), title),
      )
      .addOption(
        'selected',
        options.selected,
        async (harness, selected) => (await harness.isSelected()) === selected,
      );
  }

  private readonly control = this.locatorFor('.ui-card__link');
  private readonly heading = this.locatorFor('.ui-card__heading');
  private readonly image = this.locatorForOptional('.ui-card__image');
  private readonly site = this.locatorFor('.ui-card__site');
  private readonly description = this.locatorForOptional('.ui-card__description');

  async getTitle(): Promise<string> {
    return (await (await this.control()).text()).trim();
  }

  /** Text of the meta slot (domain). */
  async getMetaText(): Promise<string> {
    return (await (await this.site()).text()).trim();
  }

  /** The visually hidden description ("opens in a new tab"), `null` without one. */
  async getDescription(): Promise<string | null> {
    const description = await this.description();
    return description ? (await description.text()).trim() : null;
  }

  /** `href` of the title link, `null` when the card is a button. */
  async getHref(): Promise<string | null> {
    return (await this.control()).getAttribute('href');
  }

  async opensInNewTab(): Promise<boolean> {
    return (await (await this.control()).getAttribute('target')) === '_blank';
  }

  /** 1 to 6, from the heading element around the title. */
  async getHeadingLevel(): Promise<number> {
    const tag = await (await this.heading()).getProperty<string>('tagName');
    return Number(tag.slice(1));
  }

  /** `aria-current` on the control (`selected`). */
  async isSelected(): Promise<boolean> {
    return (await (await this.control()).getAttribute('aria-current')) === 'true';
  }

  /** Checked in selection mode (`checked`). */
  async isChecked(): Promise<boolean> {
    return (await this.host()).hasClass('ui-card--checked');
  }

  async isFavorited(): Promise<boolean> {
    return (await this.host()).hasClass('ui-card--favorited');
  }

  /** The preview image is shown (set and not failed); `false` while the fallback shows. */
  async hasImage(): Promise<boolean> {
    return (await this.image()) !== null;
  }

  /** `src` of the preview image, `null` while the fallback shows. */
  async getImageSrc(): Promise<string | null> {
    const image = await this.image();
    return image ? image.getAttribute('src') : null;
  }

  /** Clicks the title link or button (with modifiers for a new-tab or selection click). */
  async click(
    modifiers: { control?: boolean; meta?: boolean; shift?: boolean } = {},
  ): Promise<void> {
    return (await this.control()).click(modifiers);
  }

  async focus(): Promise<void> {
    return (await this.control()).focus();
  }

  async isFocused(): Promise<boolean> {
    return (await this.control()).isFocused();
  }

  async hover(): Promise<void> {
    return (await this.host()).hover();
  }
}
