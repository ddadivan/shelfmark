import type { Meta, StoryObj } from '@storybook/angular-vite';
import type { SpinnerSize } from './models/spinner-size.type';
import { SpinnerComponent } from './spinner.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { SPINNER_SIZE } from './models/spinner-size.const';

const SIZES: SpinnerSize[] = Object.values(SPINNER_SIZE);

const meta: Meta<SpinnerComponent> = {
  title: 'Components/Spinner',
  component: SpinnerComponent,
  tags: ['autodocs'],
  args: { size: SPINNER_SIZE.Md },
  argTypes: { size: { control: 'inline-radio', options: SIZES }, label: { control: 'text' } },
};

export default meta;
type Story = StoryObj<SpinnerComponent>;

export const Default: Story = {};

export const Small: Story = { args: { size: SPINNER_SIZE.Sm } };

export const Large: Story = { args: { size: SPINNER_SIZE.Lg } };

/** With `label` the spinner is a `role="status"` region; without it it is decorative. */
export const Labelled: Story = { args: { label: 'Loading links' } };

/** Every size in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { sizes: SIZES, themes: Object.values(THEME) },
    template: `
      <div class="ls-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ls-panel">
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
