import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { CARD_STORY_IMAGE } from '../card/stories/card-story-image.const';
import { ChipComponent } from '../chip/chip.component';
import { FaviconComponent } from '../favicon/favicon.component';
import { MenuItemComponent } from '../menu/menu-item/menu-item.component';
import { MenuSeparatorComponent } from '../menu/menu-separator/menu-separator.component';
import { MenuTriggerDirective } from '../../directives/menu-trigger/menu-trigger.directive';
import { MenuComponent } from '../menu/menu.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { ListItemComponent } from './list-item.component';
import { BUTTON_SIZE, BUTTON_VARIANT } from '../button';
import { CHIP_VARIANT } from '../chip';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { SKELETON_SHAPE } from '../skeleton';

const meta: Meta<ListItemComponent> = {
  title: 'Components/List item',
  component: ListItemComponent,
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
          'One saved link in the list view and, `compact`, in "Recently opened". Slots: `leading` (a favicon), `title` and `meta` (inside the link), `trailing` (tags, favorite, "..."). ' +
          'The title and meta live in one native link (or button) stretched over the row: one tab stop, nothing nested, and the trailing controls never activate the row. ' +
          'Hover is `surface-hover` (pointer devices only), `selected` is `accent-bg`, focus is the 2px ring, a press plays the ripple (a pressed colour under reduced motion).',
      },
    },
  },
  args: {
    href: 'https://example.com/',
    newTab: true,
    selected: false,
    compact: false,
    reveal: false,
    thumb: undefined,
    description: 'opens in a new tab',
  },
  argTypes: {
    href: { control: 'text' },
    thumb: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<ListItemComponent>;

const TITLE = 'Angular 22: everything about Signal Forms in 20 minutes';

/** The full row content shared by the stories. */
const content = (title = TITLE, favorite = false, tags = true) => `
  <ui-favicon slot="leading" [src]="favicon" letter="y" />
  <span slot="title">${title}</span>
  <span slot="meta">youtube.com, in Work / Angular</span>
  ${tags ? `<ui-chip slot="trailing" variant="${CHIP_VARIANT.Tag}">angular</ui-chip>` : ''}
  <ui-button slot="trailing" variant="${BUTTON_VARIANT.Ghost}" size="${BUTTON_SIZE.Sm}" iconOnly
    [iconLeft]="${favorite ? "'star-filled'" : "'star'"}"
    [ariaPressed]="${favorite}"
    ariaLabel="${favorite ? 'Remove from favorites' : 'Add to favorites'}" />
  <ui-button slot="trailing" variant="${BUTTON_VARIANT.Ghost}" size="${BUTTON_SIZE.Sm}" iconOnly iconLeft="more" ariaLabel="More actions" />`;

const rowTemplate = (inner: string) => `
  <div class="cs-list">
    <ui-list-item
      [href]="href" [newTab]="newTab" [selected]="selected" [compact]="compact" [thumb]="thumb"
      [description]="description" [reveal]="reveal">${inner}</ui-list-item>
  </div>`;

const withProps = (args: object) => ({
  ...args,
  favicon: CARD_STORY_IMAGE.Favicon,
});

/** Favicon, title and meta, a tag, the favorite toggle and the "..." trigger. */
export const Default: Story = {
  render: (args) => ({ props: withProps(args), template: rowTemplate(content()) }),
};

/** `selected`: `accent-bg`; `aria-current` on the link. */
export const Selected: Story = {
  args: { selected: true },
  render: (args) => ({ props: withProps(args), template: rowTemplate(content(TITLE, true)) }),
};

/** `compact`: 8px padding and a smaller title; the feature leaves the tags out. */
export const Compact: Story = {
  args: { compact: true },
  render: (args) => ({
    props: withProps(args),
    template: rowTemplate(content('NestJS course for frontend developers', false, false)),
  }),
};

/** A 56 x 40 preview thumb before the text; an empty or failed image shows a picture icon. */
export const WithThumb: Story = {
  args: { thumb: CARD_STORY_IMAGE.Preview },
  render: (args) => ({ props: withProps(args), template: rowTemplate(content()) }),
};

/** No preview (the image fails or is missing): the thumb keeps its box with a picture icon. */
export const ThumbFailed: Story = {
  args: { thumb: CARD_STORY_IMAGE.Broken },
  render: (args) => ({ props: withProps(args), template: rowTemplate(content()) }),
};

/** One-line title and meta are cut with an ellipsis; the trailing controls keep their place. */
export const LongTitle: Story = {
  render: (args) => ({
    props: withProps(args),
    template: rowTemplate(
      content(
        'A very long article title that goes on and on, repeating itself until it must be cut: https://example.com/a/really/long/path/that/never/breaks/anywhere',
      ),
    ),
  }),
};

/** Keyboard focus: one ring around the whole row. */
export const Focus: Story = {
  render: (args) => ({ props: withProps(args), template: rowTemplate(content()) }),
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLElement>('.ui-list-item__link')?.focus();
  },
};

/** Without `href` the activation target is a button; `activated` carries the click. */
export const AsButton: Story = {
  args: { href: undefined, newTab: false, description: undefined },
  render: (args) => ({ props: withProps(args), template: rowTemplate(content()) }),
};

/** The "..." trigger opens a menu; the trailing controls never activate the row. */
export const WithMenu: Story = {
  render: (args) => ({
    props: withProps(args),
    template: `
      <div class="cs-list">
        <ui-list-item [href]="href" [newTab]="newTab" [description]="description">
          <ui-favicon slot="leading" [src]="favicon" letter="y" />
          <span slot="title">${TITLE}</span>
          <span slot="meta">youtube.com, in Work / Angular</span>
          <ui-button slot="trailing" [uiMenuTrigger]="menu" variant="${BUTTON_VARIANT.Ghost}" size="${BUTTON_SIZE.Sm}" iconOnly
            iconLeft="more" ariaLabel="More actions" />
        </ui-list-item>
        <ui-menu #menu align="end" ariaLabel="Link actions">
          <ui-menu-item icon="edit">Edit</ui-menu-item>
          <ui-menu-item icon="folder-move">Move to…</ui-menu-item>
          <ui-menu-separator />
          <ui-menu-item icon="trash" danger>Delete</ui-menu-item>
        </ui-menu>
      </div>`,
  }),
};

/** A phone column (360 px). */
export const Phone: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: (args) => ({
    props: withProps(args),
    template: `<div class="cs-phone">${rowTemplate(content(TITLE, false, false))}</div>`,
  }),
};

/** Skeleton, then the rows fade in over 200 ms (`reveal`). */
export const Reveal: Story = {
  render: (args) => ({
    props: { ...withProps(args), loaded: signal(false) },
    template: `
      <div class="cs-reveal">
        <ui-button variant="${BUTTON_VARIANT.Secondary}" (click)="loaded.set(!loaded())">
          {{ loaded() ? 'Show skeleton' : 'Load content' }}
        </ui-button>
        <div class="cs-list cs-reveal__stage" [attr.aria-busy]="!loaded()">
          @if (loaded()) {
            <ui-list-item [href]="href" [reveal]="true">${content()}</ui-list-item>
            <ui-list-item [href]="href" [reveal]="true">${content('NestJS course for frontend developers')}</ui-list-item>
          } @else {
            <ui-skeleton shape="${SKELETON_SHAPE.Row}" [count]="2" />
          }
        </div>
      </div>`,
  }),
};

/** Every state in both themes. */
export const AllVariants: Story = {
  render: (args) => ({
    props: {
      ...withProps(args),
      preview: CARD_STORY_IMAGE.Preview,
      themes: Object.values(THEME),
    },
    template: `
      <div class="cs-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="cs-pane">
            <div class="cs-list cs-surface">
              <ui-list-item href="https://example.com/">${content()}</ui-list-item>
              <ui-list-item href="https://example.com/" [selected]="true">${content('Selected row', true)}</ui-list-item>
              <ui-list-item href="https://example.com/" [thumb]="preview">${content('With a preview thumb')}</ui-list-item>
              <ui-list-item href="https://example.com/" thumb="">${content('Missing preview')}</ui-list-item>
              <ui-list-item href="https://example.com/" [compact]="true">${content('Compact row', false, false)}</ui-list-item>
              <ui-list-item href="https://example.com/">${content(
                'A very long article title that goes on and on, repeating itself until it must be cut with an ellipsis',
              )}</ui-list-item>
            </div>
          </div>
        }
      </div>`,
  }),
};
