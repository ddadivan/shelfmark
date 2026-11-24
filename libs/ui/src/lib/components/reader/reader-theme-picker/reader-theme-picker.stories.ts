import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../../models/theme';
import { READER_THEME } from '../models/reader-theme.const';
import type { ReaderThemeOption } from './models/reader-theme-option.interface';
import { ReaderThemePickerComponent } from './reader-theme-picker.component';

const OPTIONS: ReaderThemeOption[] = [
  { value: READER_THEME.Light, label: 'Light' },
  { value: READER_THEME.Sepia, label: 'Sepia' },
  { value: READER_THEME.Dark, label: 'Dark' },
  { value: READER_THEME.Black, label: 'Black' },
];

const meta: Meta<ReaderThemePickerComponent> = {
  title: 'Components/Reader theme picker',
  component: ReaderThemePickerComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Reading settings › Theme (Shelf ReaderView): four "Aa" tiles drawn in each Reader theme\'s own fixed ' +
          'tokens, a radiogroup of native radios. The checked tile has a 2px `text` ring with a 2px `surface` gap.',
      },
    },
  },
  args: { options: OPTIONS, value: READER_THEME.Sepia, ariaLabel: 'Theme' },
  render: (args) => ({
    props: args,
    template: `<div style="inline-size: 18.5rem">
      <ui-reader-theme-picker [options]="options" [(value)]="value" [ariaLabel]="ariaLabel" /></div>`,
  }),
};

export default meta;
type Story = StoryObj<ReaderThemePickerComponent>;

export const Default: Story = {};

/** In both app themes: the tiles keep their fixed palettes, the ring follows the page. */
export const AllVariants: Story = {
  render: (args) => ({
    props: { ...args, themes: Object.values(THEME) },
    template: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" style="background: var(--surface); padding: 1rem">
            <ui-reader-theme-picker [options]="options" [value]="theme" [ariaLabel]="ariaLabel + ' ' + theme" />
          </div>
        }
      </div>`,
  }),
};
