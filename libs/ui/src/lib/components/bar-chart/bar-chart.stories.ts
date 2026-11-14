import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { BarChartComponent } from './bar-chart.component';
import type { BarChartBar } from './models/bar-chart-bar.interface';

const DAYS: BarChartBar[] = [
  0, 1, 0, 2, 1, 0, 0, 3, 1, 0, 2, 4, 1, 0, 0, 1, 2, 0, 5, 3, 1, 0, 2, 1, 0, 0, 3, 2, 1, 4,
].map((value, index) => ({
  label: String(index + 1),
  value,
  description: `${index + 1} Nov: ${value} sign-ups`,
}));

const WEEKS: BarChartBar[] = [3, 5, 2, 8, 6, 9, 4, 11, 7, 12, 10, 14].map((value, index) => ({
  label: `W${index + 1}`,
  value,
  description: `Week ${index + 1}: ${value} sign-ups`,
}));

const meta: Meta<BarChartComponent> = {
  title: 'Components/BarChart',
  component: BarChartComponent,
  tags: ['autodocs'],
  args: {
    bars: DAYS,
    label: 'Sign-ups, last 30 days',
    summary: '45 in all',
    labelHeader: 'Day',
    valueHeader: 'Sign-ups',
    labelEvery: 5,
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 40rem">
        <ui-bar-chart
          [bars]="bars"
          [label]="label"
          [summary]="summary"
          [labelHeader]="labelHeader"
          [valueHeader]="valueHeader"
          [labelEvery]="labelEvery"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<BarChartComponent>;

export const Days: Story = {};

export const Weeks: Story = {
  args: { bars: WEEKS, label: 'Sign-ups, last 12 weeks', summary: '91 in all', labelEvery: 1 },
};

export const Empty: Story = {
  args: { bars: DAYS.map((bar) => ({ ...bar, value: 0 })), summary: 'None yet' },
};

/** Days and weeks in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { days: DAYS, weeks: WEEKS, themes: Object.values(THEME) },
    template: `
      <div class="ls-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ls-panel">
            <ui-bar-chart [bars]="days" label="Sign-ups, last 30 days" labelHeader="Day"
              valueHeader="Sign-ups" [labelEvery]="5" />
            <ui-bar-chart [bars]="weeks" label="Sign-ups, last 12 weeks" labelHeader="Week"
              valueHeader="Sign-ups" />
          </div>
        }
      </div>`,
  }),
};
