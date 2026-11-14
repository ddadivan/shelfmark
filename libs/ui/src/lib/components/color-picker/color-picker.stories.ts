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
          'An own color (Settings › Appearance, the "+" accent swatch). The swatch discloses a colour area, ' +
          'a hue slider and a hex field; `value` follows every change as a preview only, `committed` emits ' +
          'once, from the explicit "Add color" button. Esc, "Cancel" and the swatch discard the preview. ' +
          'Projected content shows under the fields, such as a contrast warning. The host is ' +
          '`display: contents`, so the open panel takes its own line in a wrapping row.',
      },
    },
  },
  args: {
    label: 'Your own color',
    pickerLabel: 'Color',
    saturationLabel: 'Saturation',
    brightnessLabel: 'Brightness',
    hueLabel: 'Hue',
    hexLabel: 'Hex code',
    invalidMessage: 'Enter a color as # and six digits or letters a–f, like #2e6a99',
    addLabel: 'Add color',
    cancelLabel: 'Cancel',
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
          [saturationLabel]="saturationLabel"
          [brightnessLabel]="brightnessLabel"
          [hueLabel]="hueLabel"
          [hexLabel]="hexLabel"
          [invalidMessage]="invalidMessage"
          [addLabel]="addLabel"
          [cancelLabel]="cancelLabel"
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
              <ui-color-picker label="Own color" pickerLabel="Color" saturationLabel="Saturation" brightnessLabel="Brightness" hueLabel="Hue" hexLabel="Hex code" invalidMessage="Not a colour" addLabel="Add color" cancelLabel="Cancel" />
              <ui-color-picker label="Own color, chosen" pickerLabel="Color" saturationLabel="Saturation" brightnessLabel="Brightness" hueLabel="Hue" hexLabel="Hex code" invalidMessage="Not a colour" addLabel="Add color" cancelLabel="Cancel" value="#23716c" selected />
              <ui-color-picker label="Own color, open" pickerLabel="Color" saturationLabel="Saturation" brightnessLabel="Brightness" hueLabel="Hue" hexLabel="Hex code" invalidMessage="Not a colour" addLabel="Add color" cancelLabel="Cancel" value="#7a4b8a" [open]="true" />
            </div>
          </div>
        }
      </div>`,
  }),
};
