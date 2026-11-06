import type { Meta, StoryObj } from '@storybook/angular-vite';
import type { SpinnerSize } from './models/spinner-size.type';
import { SpinnerComponent } from './spinner.component';

const SIZES: SpinnerSize[] = ['sm', 'md', 'lg'];

const meta: Meta<SpinnerComponent> = {
  title: 'Components/Spinner',
  component: SpinnerComponent,
  tags: ['autodocs'],
  args: { size: 'md' },
  argTypes: { size: { control: 'inline-radio', options: SIZES }, label: { control: 'text' } },
};

export default meta;
type Story = StoryObj<SpinnerComponent>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

/** With `label` the spinner is an indeterminate `progressbar`; without it it is decorative. */
export const Labelled: Story = { args: { label: 'Loading links' } };

/** Every size in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { sizes: SIZES },
    template: `
      <div class="ls-themes">
        @for (theme of ['light', 'dark']; track theme) {
          <div [attr.data-theme]="theme" class="ls-panel">
            <div class="ls-row">
              @for (s of sizes; track s) {
                <ui-spinner [size]="s" />
              }
              <ui-spinner label="Loading links" />
            </div>
          </div>
        }
      </div>`,
  }),
};
