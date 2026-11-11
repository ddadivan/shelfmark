import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE, THEME_CUSTOM } from '../theme';
import { THEME_PICKER_KIND } from './models/theme-picker-kind.const';
import type { ThemePickerOption } from './models/theme-picker-option.interface';
import { ThemePickerComponent } from './theme-picker.component';

const title = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1);

const THEMES: ThemePickerOption[] = [
  { value: 'system', label: 'System', theme: 'system' },
  { value: THEME.Light, label: 'Light', theme: THEME.Light },
  { value: THEME.Dark, label: 'Dark', theme: THEME.Dark },
  {
    value: THEME_CUSTOM,
    label: 'Custom',
    theme: THEME_CUSTOM,
    base: THEME.Light,
    accent: 'ocean',
    background: 'paper',
    corners: 'soft',
  },
];

const ACCENT_NAMES = ['sage', 'ocean', 'plum', 'clay', 'amber', 'rose', 'teal', 'graphite'];
const accents = (base: string): ThemePickerOption[] =>
  ACCENT_NAMES.map((accent) => ({
    value: accent,
    label: title(accent),
    theme: THEME_CUSTOM,
    base,
    accent,
  }));

const BACKGROUND_NAMES: Record<string, string[]> = {
  light: ['stone', 'paper', 'mist', 'white'],
  dark: ['graphite', 'ink', 'forest', 'black'],
};
const backgrounds = (base: string): ThemePickerOption[] =>
  BACKGROUND_NAMES[base].map((background) => ({
    value: background,
    label: title(background),
    theme: THEME_CUSTOM,
    base,
    background,
  }));

const meta: Meta<ThemePickerComponent> = {
  title: 'Components/ThemePicker',
  component: ThemePickerComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Choose a theme, an accent colour or a background (Settings › Appearance). Each option is ' +
          'drawn under its own theme attributes (`data-theme`, `data-custom-*`), so it shows the ' +
          'real token values with no inline colours. Native radios: the arrow keys move and select, ' +
          'Tab enters the checked option, each option is named by its label.',
      },
    },
  },
  args: { options: THEMES, kind: THEME_PICKER_KIND.Theme, ariaLabel: 'Theme', value: THEME_CUSTOM },
  argTypes: { kind: { control: 'inline-radio', options: Object.values(THEME_PICKER_KIND) } },
  render: (args) => ({
    props: args,
    template: `
      <div class="fs-wide">
        <ui-theme-picker [options]="options" [kind]="kind" [ariaLabel]="ariaLabel" [(value)]="value" />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<ThemePickerComponent>;

export const Themes: Story = {};

export const Accents: Story = {
  args: {
    options: accents(THEME.Light),
    kind: THEME_PICKER_KIND.Accent,
    ariaLabel: 'Accent colour',
    value: 'ocean',
  },
};

export const Backgrounds: Story = {
  args: {
    options: backgrounds(THEME.Light),
    kind: THEME_PICKER_KIND.Background,
    ariaLabel: 'Background',
    value: 'paper',
  },
};

/** Every kind in light, dark and a dark Custom theme (the page itself in Custom tokens). */
export const AllVariants: Story = {
  render: () => ({
    props: {
      panes: [
        { theme: THEME.Light, base: null, accent: null, background: null },
        { theme: THEME.Dark, base: null, accent: null, background: null },
        { theme: THEME_CUSTOM, base: THEME.Dark, accent: 'rose', background: 'ink' },
      ],
      themes: THEMES,
      accents,
      backgrounds,
    },
    template: `
      <div class="ds-themes">
        @for (pane of panes; track pane.theme) {
          <div
            [attr.${THEME_ATTRIBUTE}]="pane.theme"
            [attr.data-custom-base]="pane.base"
            [attr.data-custom-accent]="pane.accent"
            [attr.data-custom-background]="pane.background"
            class="ds-pane"
          >
            <ui-theme-picker [options]="themes" ariaLabel="Theme" value="dark" />
            <ui-theme-picker
              [options]="accents(pane.base ?? pane.theme)"
              kind="accent"
              ariaLabel="Accent colour"
              value="teal"
            />
            <ui-theme-picker
              [options]="backgrounds(pane.base ?? pane.theme)"
              kind="background"
              ariaLabel="Background"
              [value]="backgrounds(pane.base ?? pane.theme)[1].value"
            />
          </div>
        }
      </div>`,
  }),
};
