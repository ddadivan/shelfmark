import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { FaviconComponent } from '../favicon/favicon.component';
import { IconComponent } from '../icon/icon.component';
import { MenuItemComponent } from '../menu/menu-item/menu-item.component';
import { MenuSeparatorComponent } from '../menu/menu-separator/menu-separator.component';
import { MenuTriggerDirective } from '../../directives/menu-trigger/menu-trigger.directive';
import { MenuComponent } from '../menu/menu.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { CardComponent } from './card.component';
import { CARD_MEDIA } from './models/card-media.const';
import { CARD_STORY_IMAGE } from './stories/card-story-image.const';
import { BUTTON_HIT_AREA, BUTTON_SIZE, BUTTON_VARIANT } from '../button';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { SKELETON_SHAPE } from '../skeleton';

const meta: Meta<CardComponent> = {
  title: 'Components/Card',
  component: CardComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        ButtonComponent,
        CheckboxComponent,
        FaviconComponent,
        IconComponent,
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
          "The link card of the feed (Shelf LinkCard): the preview full bleed at the top (`media`: `natural` keeps the picture's own ratio for masonry, `cover` is 4:3, `contain` shows a product whole), a folder and date row, the title (16/24, two lines), the source (favicon and channel, repository or price and domain), up to three `#tags` and the person's note on sage. " +
          'White with a hairline at rest (a lighter fill in dark); on hover (pointer devices only) the `shadow-hover` shadow settles in 200 ms and the preview zooms 3.5% over 900 ms. `selected` (open in the preview pane) takes the `pick` fill; `checked` (a bulk pick) adds a 2px accent ring. ' +
          'Over the preview sit glass buttons: `play` top left, `favorite` top right, `actions` (the ⋯) beside the star on hover, and `select` in place of the play mark on hover, focus or while selecting. The title sits in one native link (or button) stretched over the card: one tab stop, nothing nested. ' +
          'Slots: `title`, `meta`, `date`, `source`, `tags`, `note`, `play`, `favorite`, `actions`, `select`, `overlay`, `fallback`; the default slot is for anything else. Every empty slot takes no room. Under reduced motion there is no zoom or slide.',
      },
    },
  },
  args: {
    image: CARD_STORY_IMAGE.Preview,
    href: 'https://example.com/',
    newTab: true,
    selected: false,
    checked: false,
    media: CARD_MEDIA.Cover,
    actionsPinned: false,
    reveal: false,
    headingLevel: 2,
    description: 'opens in a new tab',
  },
  argTypes: {
    image: { control: 'text' },
    href: { control: 'text' },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3, 4, 5, 6] },
    media: { control: 'inline-radio', options: Object.values(CARD_MEDIA) },
    imageRatio: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<CardComponent>;

const TITLE = 'Angular 22: everything about Signal Forms in 20 minutes';

/** The full card content shared by the stories. */
const content = (title = TITLE, favorite = false) => `
  <span slot="fallback">Y</span>
  <span slot="overlay" class="cs-overlay"><span>youtube.com</span><strong>Open ↗</strong></span>
  <ui-icon slot="meta" name="folder" [size]="16" class="cs-folder" />
  <span slot="meta">Angular</span>
  <span slot="date">today</span>
  <ui-checkbox slot="select" hideLabel label="Select link" [checked]="checked" />
  <ui-button slot="play" variant="${BUTTON_VARIANT.Secondary}" size="${BUTTON_SIZE.Sm}" iconOnly iconLeft="play" ariaLabel="Video" />
  <ui-button slot="favorite" variant="${BUTTON_VARIANT.Secondary}" size="${BUTTON_SIZE.Sm}" hitArea="${BUTTON_HIT_AREA.Overlay}" iconOnly
    [iconLeft]="${favorite ? "'star-filled'" : "'star'"}"
    [ariaPressed]="${favorite}"
    ariaLabel="${favorite ? 'Remove from favorites' : 'Add to favorites'}" />
  <span slot="title">${title}</span>
  <ui-favicon slot="source" [src]="favicon" letter="y" colour="#d4352c" />
  <span slot="source">Fireship</span>
  <span slot="tags">#video #angular</span>
  <span slot="note">Watch on the weekend</span>
  <ui-button slot="actions" variant="${BUTTON_VARIANT.Secondary}" size="${BUTTON_SIZE.Sm}" iconOnly iconLeft="more" ariaLabel="More actions" />`;

const cardTemplate = (inner: string, attrs = '') => `
  <div class="cs-grid cs-grid--single">
    <ui-card ${attrs}
      [image]="image" [href]="href" [newTab]="newTab" [selected]="selected" [checked]="checked" [media]="media" [imageRatio]="imageRatio"
      [description]="description" [actionsPinned]="actionsPinned" [reveal]="reveal" [headingLevel]="headingLevel">${inner}</ui-card>
  </div>`;

const withProps = (args: object) => ({
  ...args,
  favicon: CARD_STORY_IMAGE.Favicon,
});

/** Folder and date, title, source, tags and note. Hover it with a mouse to see the motion. */
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
      <span slot="meta">Shopping</span>
      <span slot="title">Wool coat, straight cut, graphite</span>
      <ui-favicon slot="source" colour="#1a73e8" letter="c" />
      <span slot="source">$98 · cos.com</span>
      <span slot="tags">#clothes</span>`),
  }),
};

/** `selected` (open in the preview pane): the `pick` fill; `aria-current` on the link. */
export const Selected: Story = {
  args: { selected: true },
  render: (args) => ({ props: withProps(args), template: cardTemplate(content()) }),
};

/** `checked` (a bulk pick): the `pick` fill and a 2px accent ring. */
export const Checked: Story = {
  args: { checked: true },
  render: (args) => ({ props: withProps(args), template: cardTemplate(content()) }),
};

/** Shops: `media="contain"` shows the whole product on `surface-hover`. */
export const Contain: Story = {
  args: { media: CARD_MEDIA.Contain, image: CARD_STORY_IMAGE.Portrait },
  render: (args) => ({
    props: withProps(args),
    template: cardTemplate(content('Wool coat, straight cut')),
  }),
};

/** A bare card: with no folder, date, source, tags or note, those rows take no room. */
export const Bare: Story = {
  render: (args) => ({
    props: withProps(args),
    template: cardTemplate(`<span slot="title">${TITLE}</span>`),
  }),
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
          <span slot="meta">Angular</span>
          <span slot="title">${TITLE}</span>
          <ui-favicon slot="source" [src]="favicon" letter="y" />
          <span slot="source">youtube.com</span>
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

const MASONRY = [
  { image: 'Wide', ratio: 21 / 9, title: 'Excalidraw: a virtual whiteboard' },
  { image: 'Portrait', ratio: 2 / 3, title: 'The Ojai Jacket in Topsoil Donegal Moon Wool' },
  { image: 'Square', ratio: 1, title: 'Tree Runners: Thunder Green (Blizzard Sole)' },
  { image: 'Preview', ratio: 16 / 9, title: 'Angular in 100 Seconds' },
  { image: 'Portrait', ratio: 2 / 3, title: 'The Crater Shirt in Denver Plaid' },
  { image: 'Wide', ratio: 21 / 9, title: 'nrwl/nx: smart monorepos' },
] as const;

const masonry = `
  <div class="cs-masonry">
    @for (c of cases; track $index) {
      <ui-card [image]="images[c.image]" [imageRatio]="c.ratio" media="natural" href="https://example.com/">
        <span slot="meta">Folder</span>
        <span slot="date">today</span>
        <span slot="title">{{ c.title }}</span>
        <span slot="source">example.com</span>
        <span slot="tags">#design</span>
        @if ($index % 3 === 0) {
          <span slot="note">A note on this one</span>
        }
        <ui-button slot="favorite" variant="${BUTTON_VARIANT.Secondary}" size="${BUTTON_SIZE.Sm}" iconOnly iconLeft="star" ariaLabel="Add to favorites" />
      </ui-card>
    }
  </div>`;

/** Masonry: `media="natural"` and `imageRatio` give every card the picture's own ratio (wide, portrait, square). */
export const Masonry: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { images: CARD_STORY_IMAGE, cases: MASONRY },
    template: masonry,
  }),
};

/** Every state in both themes. */
export const AllVariants: Story = {
  render: (args) => ({
    props: { ...withProps(args), themes: Object.values(THEME), images: CARD_STORY_IMAGE },
    template: `
      <div class="cs-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="cs-pane">
            <div class="cs-grid">
              <ui-card [image]="image" href="https://example.com/" [newTab]="true">${content()}</ui-card>
              <ui-card href="https://example.com/" [newTab]="true">${content('Without a preview image')}</ui-card>
              <ui-card [image]="image" href="https://example.com/" [selected]="true" [actionsPinned]="true">${content('Selected, with actions and a favorite', true)}</ui-card>
              <ui-card [image]="image" href="https://example.com/" [checked]="true" [selecting]="true">${content('Checked for a bulk action')}</ui-card>
              <ui-card [image]="images.Portrait" media="contain" href="https://example.com/">${content('A product, contained')}</ui-card>
              <ui-card [image]="image" href="https://example.com/">${content(
                'A very long article title that goes on and on, repeating itself until it must be cut after two lines',
              )}</ui-card>
            </div>
          </div>
        }
      </div>`,
  }),
};
