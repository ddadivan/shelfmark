import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import type { Theme } from '../theme';
import type { SegmentedOption } from './models/segmented-option.interface';
import { SegmentedControlComponent } from './segmented-control.component';

const VIEW: SegmentedOption[] = [
  { value: 'cards', label: 'Cards', icon: 'cards' },
  { value: 'list', label: 'List', icon: 'list' },
];
const THEMES: SegmentedOption[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
const PARTLY_DISABLED: SegmentedOption[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark', disabled: true },
];

const meta: Meta<SegmentedControlComponent> = {
  title: 'Components/SegmentedControl',
  component: SegmentedControlComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Single choice from 2 to 4 options (cards and list, a theme). A radiogroup of native ' +
          'radios: Tab enters the selected option, the arrow keys move and select. The thumb ' +
          'slides to the choice (it jumps under reduced motion). Icon-only needs a label per ' +
          'option for its name and tooltip. Bind with `[formField]` or `[(value)]`.',
      },
    },
  },
  args: {
    options: VIEW,
    value: 'cards',
    iconOnly: false,
    disabled: false,
    ariaLabel: 'View',
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-segmented-control
        [options]="options"
        [iconOnly]="iconOnly"
        [disabled]="disabled"
        [ariaLabel]="ariaLabel"
        [(value)]="value"
      />`,
  }),
};

export default meta;
type Story = StoryObj<SegmentedControlComponent>;

export const IconsAndLabels: Story = {};

export const IconOnly: Story = { args: { iconOnly: true } };

export const LabelsOnly: Story = {
  args: { options: THEMES, value: 'system', ariaLabel: 'Theme' },
};

export const SecondSelected: Story = { args: { value: 'list' } };

export const NothingSelected: Story = { args: { value: '' } };

export const Focus: Story = {
  play: ({ canvasElement }) => {
    canvasElement.querySelector('input')?.focus();
  },
};

export const DisabledOption: Story = {
  args: { options: PARTLY_DISABLED, value: 'system', ariaLabel: 'Theme' },
};

export const Disabled: Story = { args: { disabled: true } };

const variants = (theme: Theme) => `
  <div ${THEME_ATTRIBUTE}="${theme}" class="sg-panel">
    <p class="sg-hint">${theme} theme</p>
    <div class="sg-row">
      <ui-segmented-control [options]="view" value="cards" ariaLabel="Icons and labels" />
      <ui-segmented-control [options]="view" value="list" [iconOnly]="true" ariaLabel="Icon only" />
      <ui-segmented-control [options]="themes" value="system" ariaLabel="Labels only" />
      <ui-segmented-control [options]="partly" value="light" ariaLabel="One option disabled" />
      <ui-segmented-control [options]="view" value="" ariaLabel="Nothing selected" />
      <ui-segmented-control [options]="view" value="cards" [disabled]="true" ariaLabel="Disabled" />
    </div>
  </div>`;

/** Every form and state in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    props: { view: VIEW, themes: THEMES, partly: PARTLY_DISABLED },
    template: Object.values(THEME).map(variants).join(''),
  }),
};
