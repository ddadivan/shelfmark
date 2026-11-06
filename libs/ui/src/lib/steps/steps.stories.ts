import type { Meta, StoryObj } from '@storybook/angular-vite';
import { StepsComponent } from './steps.component';

const meta: Meta<StepsComponent> = {
  title: 'Components/Steps',
  component: StepsComponent,
  tags: ['autodocs'],
  args: { count: 3, current: 1, label: 'Step 1 of 3' },
  render: (args) => ({
    props: args,
    template: `<ui-steps [count]="count" [current]="current" [label]="label" />`,
  }),
};

export default meta;
type Story = StoryObj<StepsComponent>;

export const First: Story = {};

export const Second: Story = { args: { current: 2, label: 'Step 2 of 3' } };

export const Third: Story = { args: { current: 3, label: 'Step 3 of 3' } };

/** Every step in both themes. Change `current` in the controls to see the dot stretch. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { steps: [1, 2, 3] },
    template: `
      <div class="ds-themes">
        @for (theme of ['light', 'dark']; track theme) {
          <div [attr.data-theme]="theme" class="ds-pane">
            @for (step of steps; track step) {
              <ui-steps [count]="3" [current]="step" [label]="'Step ' + step + ' of 3'" />
            }
          </div>
        }
      </div>`,
  }),
};
