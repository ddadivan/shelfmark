import type { Meta, StoryObj } from '@storybook/angular-vite';
import { MeterComponent } from './meter.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';

const meta: Meta<MeterComponent> = {
  title: 'Components/Meter',
  component: MeterComponent,
  tags: ['autodocs'],
  args: { value: 64, label: 'Export progress' },
  argTypes: { value: { control: { type: 'range', min: 0, max: 100, step: 1 } } },
  render: (args) => ({
    props: args,
    template: `
      <div class="ls-meter">
        <div class="ls-meter__head">
          <span>Preparing shelfmark-export.html</span>
          <span class="ls-meter__value">{{ value }}%</span>
        </div>
        <ui-meter [value]="value" [label]="label" />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<MeterComponent>;

export const Default: Story = {};

export const Empty: Story = { args: { value: 0 } };

export const Half: Story = { args: { value: 50 } };

export const Complete: Story = { args: { value: 100 } };

/** Every step in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { values: [0, 25, 64, 100], themes: Object.values(THEME) },
    template: `
      <div class="ls-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ls-panel">
            @for (v of values; track v) {
              <div class="ls-meter">
                <div class="ls-meter__head">
                  <span>Preparing export</span>
                  <span class="ls-meter__value">{{ v }}%</span>
                </div>
                <ui-meter [value]="v" label="Export progress" />
              </div>
            }
          </div>
        }
      </div>`,
  }),
};
