import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { ChipComponent } from '../chip/chip.component';
import { FaviconComponent } from '../favicon/favicon.component';
import { MenuItemComponent } from '../menu/menu-item.component';
import { MenuSeparatorComponent } from '../menu/menu-separator.component';
import { MenuTriggerDirective } from '../menu/menu-trigger.directive';
import { MenuComponent } from '../menu/menu.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { CardComponent } from './card.component';
import { CARD_STORY_IMAGE } from './stories/card-story-image.const';
import { BUTTON_HIT_AREA, BUTTON_SIZE, BUTTON_VARIANT } from '../button';
import { CHIP_VARIANT } from '../chip';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { SKELETON_SHAPE } from '../skeleton';

const meta: Meta<CardComponent> = {
  title: 'Components/Card',
  component: CardComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        ButtonComponent,
        ChipComponent,
        FaviconComponent,
        MenuComponent,
        MenuItemComponent,
        MenuSeparatorComponent,
        MenuTriggerDirective,
        SkeletonComponent,
      ],
    }),
  ],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Surface of a saved link in the cards view. Flat at rest; on hover (pointer devices only) a soft shadow spreads from under the card, the border darkens, the image zooms to 1.06, the overlay bar slides up and the actions fade in. It never lifts or scales and has no ripple. ' +
          'The title sits in one native link (or button) stretched over the card, so there is one tab stop and nothing is nested in anything: the favorite toggle and the "..." trigger sit above it and never activate the card. ' +
          'Slots: `title`, `meta`, `favorite`, `actions`, `overlay`, `fallback`; the default slot is the body below the title. Under reduced motion there is no zoom or slide.',
      },
    },
  },
  args: {
    image: CARD_STORY_IMAGE.Preview,
    href: 'https://example.com/',
    newTab: true,
    selected: false,
    actionsPinned: false,
    reveal: false,
    headingLevel: 2,
    description: 'opens in a new tab',
  },
  argTypes: {
    image: { control: 'text' },
    href: { control: 'text' },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3, 4, 5, 6] },
  },
};

export default meta;
type Story = StoryObj<CardComponent>;

const TITLE = 'Angular 22: everything about Signal Forms in 20 minutes';

/** The full card content shared by the stories. */
const content = (title = TITLE, favorite = false) => `
  <span slot="fallback">Y</span>
  <span slot="overlay" class="cs-overlay"><span>youtube.com</span><strong>Open ↗</strong></span>
  <ui-favicon slot="meta" [src]="favicon" letter="y" />
  <span slot="meta">youtube.com</span>
  <ui-button slot="favorite" variant="${BUTTON_VARIANT.Ghost}" size="${BUTTON_SIZE.Sm}" hitArea="${BUTTON_HIT_AREA.Overlay}" iconOnly
    [iconLeft]="${favorite ? "'star-filled'" : "'star'"}"
    [ariaPressed]="${favorite}"
    ariaLabel="${favorite ? 'Remove from favorites' : 'Add to favorites'}" />
  <span slot="title">${title}</span>
  <p class="cs-note">Watch on the weekend</p>
  <div class="cs-tags"><ui-chip variant="${CHIP_VARIANT.Tag}">angular</ui-chip><ui-chip variant="${CHIP_VARIANT.Tag}">courses</ui-chip></div>
  <ui-button slot="actions" variant="${BUTTON_VARIANT.Secondary}" size="${BUTTON_SIZE.Sm}" iconOnly iconLeft="more" ariaLabel="More actions" />`;

const cardTemplate = (inner: string, attrs = '') => `
  <div class="cs-grid cs-grid--single">
    <ui-card ${attrs}
      [image]="image" [href]="href" [newTab]="newTab" [selected]="selected"
      [description]="description" [actionsPinned]="actionsPinned" [reveal]="reveal" [headingLevel]="headingLevel">${inner}</ui-card>
  </div>`;

const withProps = (args: object) => ({
  ...args,
  favicon: CARD_STORY_IMAGE.Favicon,
});

/** Image, favicon and domain, title, note and tags. Hover it with a mouse to see the motion. */
export const Default: Story = {
  render: (args) => ({ props: withProps(args), template: cardTemplate(content()) }),
};

/** Without a preview image the site letter shows on `accent-bg`. */
export const WithoutImage: Story = {
  args: { image: undefined },
  render: (args) => ({ props: withProps(args), template: cardTemplate(content()) }),
};

/** An image that cannot load (the CSP blocks external hosts) falls back the same way. */
export const ImageFailed: Story = {
  args: { image: CARD_STORY_IMAGE.Broken },
  render: (args) => ({ props: withProps(args), template: cardTemplate(content()) }),
};

/** No image and no `fallback` slot: a picture icon in `text-muted`. */
export const PlaceholderIcon: Story = {
  args: { image: undefined },
  render: (args) => ({
    props: withProps(args),
    template: cardTemplate(`
      <ui-favicon slot="meta" [src]="favicon" />
      <span slot="meta">cos.com</span>
      <span slot="title">Wool coat, straight cut, graphite</span>
      <div class="cs-tags"><ui-chip variant="${CHIP_VARIANT.Tag}">clothes</ui-chip></div>`),
  }),
};

/** `selected`: `accent` border and `accent-bg` surface; `aria-current` on the link. */
export const Selected: Story = {
  args: { selected: true },
  render: (args) => ({ props: withProps(args), template: cardTemplate(content()) }),
};

/** The "..." actions kept visible (`actionsPinned`) and the favorite switched on. */
export const WithActions: Story = {
  args: { actionsPinned: true },
  render: (args) => ({ props: withProps(args), template: cardTemplate(content(TITLE, true)) }),
};

/** Titles clamp to two lines; a long unbroken word wraps instead of overflowing. */
export const LongTitle: Story = {
  render: (args) => ({
    props: withProps(args),
    template: cardTemplate(
      content(
        'A very long article title that goes on and on, repeating itself until it must be cut after two lines: https://example.com/a/really/long/path/that/never/breaks/anywhere',
      ),
    ),
  }),
};

/** Keyboard focus: one ring around the whole card, the overlay and the actions show. */
export const Focus: Story = {
  render: (args) => ({ props: withProps(args), template: cardTemplate(content()) }),
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLElement>('.ui-card__link')?.focus();
  },
};

/** Without `href` the activation target is a button; `activated` carries the click. */
export const AsButton: Story = {
  args: { href: undefined, newTab: false, description: undefined },
  render: (args) => ({ props: withProps(args), template: cardTemplate(content()) }),
};

/** The actions menu: the card keeps its actions visible while the menu is open. */
export const WithMenu: Story = {
  render: (args) => ({
    props: { ...withProps(args), open: signal(false) },
    template: `
      <div class="cs-grid cs-grid--single">
        <ui-card
          [image]="image" [href]="href" [newTab]="newTab" [description]="description"
          [actionsPinned]="open()">
          <ui-favicon slot="meta" [src]="favicon" letter="y" />
          <span slot="meta">youtube.com</span>
          <span slot="title">${TITLE}</span>
          <ui-button slot="actions" [uiMenuTrigger]="menu" variant="${BUTTON_VARIANT.Secondary}" size="${BUTTON_SIZE.Sm}" iconOnly
            iconLeft="more" ariaLabel="More actions" />
        </ui-card>
        <ui-menu #menu align="end" ariaLabel="Link actions" (opened)="open.set(true)" (closed)="open.set(false)">
          <ui-menu-item icon="edit">Edit</ui-menu-item>
          <ui-menu-item icon="folder-move">Move to…</ui-menu-item>
          <ui-menu-separator />
          <ui-menu-item icon="trash" danger>Delete</ui-menu-item>
        </ui-menu>
      </div>`,
  }),
};

/** A phone column (360 px): one column, actions always visible on touch. */
export const Phone: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: (args) => ({
    props: withProps(args),
    template: `<div class="cs-phone">${cardTemplate(content())}</div>`,
  }),
};

/**
 * Heading structure: the page title is the `h1`, every card title an `h2` (`headingLevel`,
 * 2 by default; use 3 under an `h2` section title). Screen reader users can jump card to card
 * by heading, and no level is skipped.
 */
export const InAGrid: Story = {
  render: (args) => ({
    props: withProps(args),
    template: `
      <h1 class="cs-heading">Saved links</h1>
      <div class="cs-grid">
        <ui-card [image]="image" href="https://example.com/a">${content('Signal Forms in 20 minutes')}</ui-card>
        <ui-card href="https://example.com/b">${content('Angular Aria patterns')}</ui-card>
        <ui-card [image]="image" href="https://example.com/c">${content('Zoneless change detection')}</ui-card>
      </div>`,
  }),
};

/** Skeleton, then the content fades in over 200 ms (`reveal`). */
export const Reveal: Story = {
  render: (args) => ({
    props: { ...withProps(args), loaded: signal(false) },
    template: `
      <div class="cs-reveal">
        <ui-button variant="${BUTTON_VARIANT.Secondary}" (click)="loaded.set(!loaded())">
          {{ loaded() ? 'Show skeleton' : 'Load content' }}
        </ui-button>
        <div class="cs-reveal__stage" [attr.aria-busy]="!loaded()">
          @if (loaded()) {
            <ui-card [image]="image" [href]="href" [newTab]="newTab" [reveal]="true">${content()}</ui-card>
          } @else {
            <ui-skeleton shape="${SKELETON_SHAPE.Card}" />
          }
        </div>
      </div>`,
  }),
};

/** Every state in both themes. */
export const AllVariants: Story = {
  render: (args) => ({
    props: { ...withProps(args), themes: Object.values(THEME) },
    template: `
      <div class="cs-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="cs-pane">
            <div class="cs-grid">
              <ui-card [image]="image" href="https://example.com/" [newTab]="true">${content()}</ui-card>
              <ui-card href="https://example.com/" [newTab]="true">${content('Without a preview image')}</ui-card>
              <ui-card [image]="image" href="https://example.com/" [selected]="true" [actionsPinned]="true">${content('Selected, with actions and a favorite', true)}</ui-card>
              <ui-card [image]="image" href="https://example.com/">${content(
                'A very long article title that goes on and on, repeating itself until it must be cut after two lines',
              )}</ui-card>
            </div>
          </div>
        }
      </div>`,
  }),
};
