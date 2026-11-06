import type { Meta, StoryObj } from '@storybook/angular-vite';
import type { RadioOption } from './models/radio-option.interface';
import type { RadioOrientation } from './models/radio-orientation.type';
import { RadioGroupComponent } from './radio-group.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';

const OPTIONS: RadioOption[] = [
  {
    value: 'move',
    title: 'Move links to Unsorted',
    description: 'The folders go, all 34 links stay',
  },
  { value: 'delete', title: 'Delete links too', description: "This can't be undone" },
];

const ORIENTATIONS: RadioOrientation[] = ['vertical', 'horizontal'];

const meta: Meta<RadioGroupComponent> = {
  title: 'Components/RadioGroup',
  component: RadioGroupComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Choose one of a few options with explanations. Native radios: the arrow keys move and ' +
          'select, Tab enters the checked option. The safe option goes first and is selected by ' +
          'default. Bind with `[formField]`.',
      },
    },
  },
  args: {
    options: OPTIONS,
    orientation: 'vertical',
    ariaLabel: 'What happens to the links',
    disabled: false,
    value: 'move',
  },
  argTypes: { orientation: { control: 'inline-radio', options: ORIENTATIONS } },
  render: (args) => ({
    props: args,
    template: `
      <div class="fs-wide">
        <ui-radio-group
          [options]="options"
          [orientation]="orientation"
          [ariaLabel]="ariaLabel"
          [disabled]="disabled"
          [(value)]="value"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<RadioGroupComponent>;

export const Vertical: Story = {};

export const Horizontal: Story = { args: { orientation: 'horizontal' } };

export const SecondSelected: Story = { args: { value: 'delete' } };

export const NothingSelected: Story = { args: { value: '' } };

export const Focus: Story = {
  play: ({ canvasElement }) => {
    canvasElement.querySelector('input')?.focus();
  },
};

export const Disabled: Story = { args: { disabled: true } };

/** Both orientations and states in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { options: OPTIONS, themes: Object.values(THEME) },
    template: `
      <div class="fs-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="fs-panel">
            <ui-radio-group [options]="options" value="move" ariaLabel="Vertical" />
            <ui-radio-group [options]="options" value="delete" orientation="horizontal"
              ariaLabel="Horizontal" />
            <ui-radio-group [options]="options" value="move" [disabled]="true"
              ariaLabel="Disabled" />
          </div>
        }
      </div>`,
  }),
};
