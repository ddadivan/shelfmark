import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { ColorPickerComponent } from './color-picker.component';

const meta: Meta<ColorPickerComponent> = {
  title: 'Components/ColorPicker',
  component: ColorPickerComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'An own colour (Settings › Appearance, the "+" accent swatch). The swatch discloses the system ' +
          'colour picker and a hex field; `value` follows every change, `committed` emits a finished choice ' +
          '(the picker closed, Enter, or leaving a valid hex field). Projected content shows under the fields, ' +
          'such as a contrast warning. Esc closes the panel and returns focus to the swatch. The host is ' +
          '`display: contents`, so the open panel takes its own line in a wrapping row.',
      },
    },
  },
  args: {
    label: 'Your own colour',
    pickerLabel: 'Choose a colour',
    hexLabel: 'Hex code',
    invalidMessage: 'Enter a colour as # and six digits or letters a–f, like #2e6a99',
    value: '',
    open: false,
    selected: false,
    disabled: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 0.625rem; max-width: 26rem">
        <ui-color-picker
          [label]="label"
          [pickerLabel]="pickerLabel"
          [hexLabel]="hexLabel"
          [invalidMessage]="invalidMessage"
          [selected]="selected"
          [disabled]="disabled"
          [(value)]="value"
          [(open)]="open"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<ColorPickerComponent>;

export const Empty: Story = {};

export const Chosen: Story = { args: { value: '#a33a5b', selected: true } };

export const Open: Story = { args: { value: '#2e6a99', open: true } };

export const Disabled: Story = { args: { disabled: true } };

/** Closed, chosen and open, in both themes side by side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <div style="display: flex; flex-wrap: wrap; gap: 0.625rem; max-width: 22rem">
              <ui-color-picker label="Own colour" pickerLabel="Choose a colour" hexLabel="Hex code" invalidMessage="Not a colour" />
              <ui-color-picker label="Own colour, chosen" pickerLabel="Choose a colour" hexLabel="Hex code" invalidMessage="Not a colour" value="#23716c" selected />
              <ui-color-picker label="Own colour, open" pickerLabel="Choose a colour" hexLabel="Hex code" invalidMessage="Not a colour" value="#7a4b8a" [open]="true" />
            </div>
          </div>
        }
      </div>`,
  }),
};
