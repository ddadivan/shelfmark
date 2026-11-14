import type { Meta, StoryObj } from '@storybook/angular-vite';
import { CardComponent } from '../../components/card/card.component';
import { CARD_STORY_IMAGE } from '../../components/card/stories/card-story-image.const';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { PointerShadowDirective } from './pointer-shadow.directive';

const meta: Meta<PointerShadowDirective> = {
  title: 'Directives/PointerShadow',
  component: PointerShadowDirective,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'On a `ui-card`, the hover shadow leans away from the pointer (at most 6 px) through the ' +
          '`--shadow-x` / `--shadow-y` custom properties, once per animation frame. The card never ' +
          'moves. Only with a fine, hovering pointer; static under `prefers-reduced-motion`; reset on ' +
          'pointer leave; no listeners on touch devices. Move the mouse over the card.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<PointerShadowDirective>;

/** Move the pointer over the card: the shadow leans the other way. */
export const Default: Story = {
  render: () => ({
    moduleMetadata: { imports: [PointerShadowDirective, CardComponent] },
    props: { image: CARD_STORY_IMAGE.Preview },
    template: `
      <ui-card uiPointerShadow [image]="image" href="https://example.com/">
        <span slot="title">Hover me</span>
        <span slot="meta">example.com</span>
      </ui-card>`,
  }),
};

/** Both themes side by side (dark keeps its glow). */
export const AllVariants: Story = {
  render: () => ({
    moduleMetadata: { imports: [PointerShadowDirective, CardComponent] },
    props: { themes: Object.values(THEME), image: CARD_STORY_IMAGE.Preview },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <ui-card uiPointerShadow [image]="image" href="https://example.com/">
              <span slot="title">Hover me</span>
              <span slot="meta">example.com</span>
            </ui-card>
          </div>
        }
      </div>`,
  }),
};
