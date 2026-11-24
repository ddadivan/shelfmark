import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { StepperComponent } from './stepper.component';

const STEPS = ['Choose file', 'Check', 'Folders', 'Import'];

const meta: Meta<StepperComponent> = {
  title: 'Components/Stepper',
  component: StepperComponent,
  tags: ['autodocs'],
  args: { steps: STEPS, current: 1, label: 'Import steps' },
  render: (args) => ({
    props: args,
    template: `<ui-stepper [steps]="steps" [current]="current" [label]="label" />`,
  }),
};

export default meta;
type Story = StoryObj<StepperComponent>;

export const First: Story = {};

export const Second: Story = { args: { current: 2 } };

export const Last: Story = { args: { current: 4 } };

/** Every step in both themes. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { steps: STEPS, currents: [1, 2, 3, 4], themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            @for (current of currents; track current) {
              <ui-stepper [steps]="steps" [current]="current" label="Import steps" />
            }
          </div>
        }
      </div>`,
  }),
};
