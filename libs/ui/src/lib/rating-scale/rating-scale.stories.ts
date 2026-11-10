import type { Meta, StoryObj } from '@storybook/angular-vite';
import { RatingScaleComponent } from './rating-scale.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';

const LABELS = Array.from({ length: 10 }, (_, index) => `${index + 1} out of 10`);

const meta: Meta<RatingScaleComponent> = {
  title: 'Components/RatingScale',
  component: RatingScaleComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A 1 to 10 score as square buttons, at least 48px. One tab stop: arrows, Home and End move ' +
          'focus, Enter and Space pick. `readonly` shows the chosen score as a quiet copy.',
      },
    },
  },
  args: { max: 10, score: null, lowLabel: 'Not really', highLabel: 'Love it', readonly: false },
  render: (args) => ({
    props: { ...args, labels: LABELS },
    template: `
      <div style="max-width: 36rem">
        <ui-rating-scale
          [max]="max"
          [score]="score"
          [lowLabel]="lowLabel"
          [highLabel]="highLabel"
          [labels]="labels"
          [readonly]="readonly"
          readonlyLabel="Your score"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<RatingScaleComponent>;

export const Default: Story = {};

export const Chosen: Story = { args: { score: 6 } };

export const ReadOnly: Story = { args: { score: 6, readonly: true } };

/** Both themes. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME), labels: LABELS },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane" style="display: grid; gap: 1rem">
            <ui-rating-scale lowLabel="Not really" highLabel="Love it" [labels]="labels" [score]="4" />
            <ui-rating-scale [score]="6" [readonly]="true" readonlyLabel="Your score: 6" />
          </div>
        }
      </div>`,
  }),
};
