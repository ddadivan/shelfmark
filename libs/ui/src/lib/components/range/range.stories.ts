import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { RangeComponent } from './range.component';

const meta: Meta<RangeComponent> = {
  title: 'Components/Range',
  component: RangeComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A slider for one number in whole steps, such as the grid size of the View menu. A native ' +
          '`input[type=range]`: the arrow keys move one step, Home and End jump to the ends. `label` ' +
          'is the accessible name, `valueText` the spoken value. Bind with `[formField]` or `[(value)]`.',
      },
    },
  },
  args: { label: 'Grid size', min: 1, max: 6, step: 1, value: 3, disabled: false },
  render: (args) => ({
    props: args,
    template: `
      <div style="inline-size: 16rem; padding: 1rem">
        <ui-range [label]="label" [min]="min" [max]="max" [step]="step" [disabled]="disabled"
          [valueText]="valueText" [(value)]="value" />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<RangeComponent>;

export const Default: Story = {};

export const WithValueText: Story = {
  args: { valueText: (value: number) => `${value} of 6` },
};

export const Disabled: Story = { args: { disabled: true } };

/** Every position and the disabled state, in both themes. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME), values: [1, 3, 6] },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            @for (v of values; track v) {
              <ui-range label="Grid size" [min]="1" [max]="6" [value]="v" />
            }
            <ui-range label="Grid size, disabled" [min]="1" [max]="6" [value]="3" disabled />
          </div>
        }
      </div>`,
  }),
};
