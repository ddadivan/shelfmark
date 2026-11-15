import type { Meta, StoryObj } from '@storybook/angular-vite';
import { DatePickerComponent } from './date-picker.component';

const meta: Meta<DatePickerComponent> = {
  title: 'Components/DatePicker',
  component: DatePickerComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A month calendar to pick one day for a reminder. Names come from Intl in the ' +
          'interface language; weeks start on the account setting. One tab stop: arrows move a ' +
          'day or a week, Home / End the week, Page Up / Down the month, Enter or Space pick. ' +
          'Days before `min` are disabled. Bind with `[(date)]` (`YYYY-MM-DD`).',
      },
    },
  },
  args: {
    date: '2026-11-14',
    min: '2026-11-09',
    today: '2026-11-09',
    locale: 'en-GB',
    firstDay: 1,
    previousMonthLabel: 'Previous month',
    nextMonthLabel: 'Next month',
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 22rem">
        <ui-date-picker
          [(date)]="date"
          [min]="min"
          [today]="today"
          [locale]="locale"
          [firstDay]="firstDay"
          [previousMonthLabel]="previousMonthLabel"
          [nextMonthLabel]="nextMonthLabel"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<DatePickerComponent>;

export const Default: Story = {};

export const NothingPicked: Story = { args: { date: null } };

export const SundayFirstInUsEnglish: Story = { args: { locale: 'en-US', firstDay: 7 } };

export const German: Story = {
  args: { locale: 'de', previousMonthLabel: 'Vorheriger Monat', nextMonthLabel: 'Nächster Monat' },
};
