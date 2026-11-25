import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { BUTTON_HIT_AREA, BUTTON_SIZE, BUTTON_VARIANT } from '../button';
import { ButtonComponent } from '../button/button.component';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { FaviconComponent } from '../favicon/favicon.component';
import { CardComponent } from './card.component';
import { CARD_STORY_IMAGE } from './stories/card-story-image.const';
import './card-action-variants.stories.scss';

/** One placement of the card controls. */
type Variant = 'a' | 'b' | 'c';

/** A state shown per variant. */
type State = 'rest' | 'hover' | 'favorite' | 'checked';

const STATES: readonly { readonly id: State; readonly label: string }[] = [
  { id: 'rest', label: 'Rest' },
  { id: 'hover', label: 'Hover' },
  { id: 'favorite', label: 'Favorite' },
  { id: 'checked', label: 'Checked' },
];

const VARIANT_TITLE: Record<Variant, string> = {
  a: 'A. Clean at rest (recommended)',
  b: 'B. Pill always',
  c: 'C. Actions in the footer',
};

const btn = (slot: string, icon: string, label: string, extra = '') =>
  `<ui-button slot="${slot}" variant="${BUTTON_VARIANT.Glass}" size="${BUTTON_SIZE.Sm}" hitArea="${BUTTON_HIT_AREA.Overlay}" iconOnly iconLeft="${icon}" ariaLabel="${label}" ${extra} />`;

const footBtn = (icon: string, label: string, extra: string, cls: string) =>
  `<ui-button slot="source" class="va-foot ${cls}" variant="${BUTTON_VARIANT.Ghost}" size="${BUTTON_SIZE.Sm}" iconOnly iconLeft="${icon}" ariaLabel="${label}" ${extra} />`;

/** One real `ui-card`; the variant only decides where the star and the more button go. */
const card = (variant: Variant, state: State): string => {
  const favorite = state === 'favorite';
  const checked = state === 'checked';
  const icon = favorite ? 'star-filled' : 'star';
  const press = `[ariaPressed]="${favorite}"`;
  const label = favorite ? 'Remove from favorites' : 'Add to favorites';
  const preview =
    variant === 'c'
      ? ''
      : `${btn('favorite', icon, label, press)}${btn('actions', 'more', 'More actions')}`;
  const foot =
    variant === 'c'
      ? `${footBtn(icon, label, press, `va-foot--first${favorite ? ' va-foot--on' : ''}`)}${footBtn('more', 'More actions', '', '')}`
      : '';
  return `
    <ui-card class="${state === 'hover' ? 'is-hover' : ''}" [image]="image" href="https://example.com/" [newTab]="true"
      [checked]="${checked}" [favorited]="${favorite}" description="opens in a new tab">
      <span slot="fallback">Y</span>
      <span slot="meta">Angular</span>
      <span slot="date">2 days ago</span>
      <ui-checkbox slot="select" hideLabel label="Select link" [checked]="${checked}" />
      ${preview}
      <span slot="title">Angular 22: everything about Signal Forms in 20 minutes</span>
      <ui-favicon slot="source" [src]="favicon" letter="y" colour="#d4352c" />
      <span slot="source">youtube.com</span>
      ${foot}
      <span slot="tags">#video #angular</span>
      <span slot="note">Watch on the weekend</span>
    </ui-card>`;
};

const pane = (theme: string, inner: string, title: string) => `
  <div [attr.${THEME_ATTRIBUTE}]="'${theme}'" class="va-pane" data-testid="pane-${theme}">
    <h3 class="va-title">${title}</h3>
    ${inner}
  </div>`;

const variantRow = (variant: Variant) =>
  `<div class="va va-${variant} va-row">${STATES.map(
    (s) =>
      `<figure class="va-cell">${card(variant, s.id)}<figcaption class="va-caption">${s.label}</figcaption></figure>`,
  ).join('')}</div>`;

const variantTemplate = (variant: Variant) => `
  <div class="va-stage">${Object.values(THEME)
    .map((theme) => pane(theme, variantRow(variant), VARIANT_TITLE[variant]))
    .join('')}
  </div>`;

const props = { image: CARD_STORY_IMAGE.Preview, favicon: CARD_STORY_IMAGE.Favicon };

const meta: Meta = {
  title: 'Components/Card/Action variants (proposal)',
  tags: ['!autodocs'],
  decorators: [
    moduleMetadata({
      imports: [ButtonComponent, CheckboxComponent, FaviconComponent, CardComponent],
    }),
  ],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Proposal only, not shipped: three placements of the card controls on the real `ui-card`, styled from the outside by story-only `va-` classes. Rest, hover (forced with a class), favorite and checked, in both themes.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** Nothing on the preview at rest, except a small star badge for a favorite; on hover the select circle and one pill. */
export const ACleanAtRest: Story = {
  name: 'A. Clean at rest',
  render: () => ({ props, template: variantTemplate('a') }),
};

/** One glass pill [star | more] always on the preview; the select circle only on hover or while selecting. */
export const BPillAlways: Story = {
  name: 'B. Pill always',
  render: () => ({ props, template: variantTemplate('b') }),
};

/** A clean preview; star and more as 16px ghost buttons at the end of the site row. */
export const CFooterActions: Story = {
  name: 'C. Actions in the footer',
  render: () => ({ props, template: variantTemplate('c') }),
};

/** The hover state of the three variants side by side, in both themes. */
export const HoverCompared: Story = {
  name: 'Hover compared',
  render: () => ({
    props,
    template: `<div class="va-stage">${Object.values(THEME)
      .map((theme) =>
        pane(
          theme,
          `<div class="va-compare">${(['a', 'b', 'c'] as const)
            .map(
              (v) =>
                `<figure class="va-cell"><div class="va va-${v}">${card(v, 'hover')}</div><figcaption class="va-caption">${VARIANT_TITLE[v]}</figcaption></figure>`,
            )
            .join('')}</div>`,
          'Hover state',
        ),
      )
      .join('')}</div>`,
  }),
};
