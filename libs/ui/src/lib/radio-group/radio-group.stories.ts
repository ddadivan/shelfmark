import type { Meta, StoryObj } from '@storybook/angular-vite';
import type { RadioOption } from './models/radio-option.interface';
import { RadioGroupComponent } from './radio-group.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { RADIO_ORIENTATION } from './models/radio-orientation.const';

const OPTIONS: RadioOption[] = [
  {
    value: 'move',
    title: 'Move links to Unsorted',
    description: 'Folders are deleted, all 34 links stay',
  },
  { value: 'delete', title: 'Delete links too', description: "This can't be undone" },
];

/** The language list of Settings › Language (#315): a flag and the name in its own language. */
const LANGUAGES: RadioOption[] = [
  { value: 'en', title: 'English', flag: 'gb', lang: 'en' },
  { value: 'fr', title: 'Français', flag: 'fr', lang: 'fr' },
  { value: 'de', title: 'Deutsch', flag: 'de', lang: 'de' },
  { value: 'it', title: 'Italiano', flag: 'it', lang: 'it' },
  { value: 'es', title: 'Español', flag: 'es', lang: 'es' },
  { value: 'pt', title: 'Português', flag: 'br', lang: 'pt' },
  { value: 'browser', title: 'Match my browser', icon: 'monitor' },
];

const ORIENTATIONS = Object.values(RADIO_ORIENTATION);

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
    orientation: RADIO_ORIENTATION.Vertical,
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

export const Horizontal: Story = { args: { orientation: RADIO_ORIENTATION.Horizontal } };

export const SecondSelected: Story = { args: { value: 'delete' } };

export const NothingSelected: Story = { args: { value: '' } };

export const Focus: Story = {
  play: ({ canvasElement }) => {
    canvasElement.querySelector('input')?.focus();
  },
};

export const Disabled: Story = { args: { disabled: true } };

/** Options led by a flag or an icon: the interface languages, each in its own name (#315). */
export const WithFlags: Story = {
  args: { options: LANGUAGES, value: 'fr', ariaLabel: 'Interface language' },
};

/** Both orientations and states in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { options: OPTIONS, languages: LANGUAGES, themes: Object.values(THEME) },
    template: `
      <div class="fs-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="fs-panel">
            <ui-radio-group [options]="options" value="move" ariaLabel="Vertical" />
            <ui-radio-group [options]="options" value="delete" orientation="horizontal"
              ariaLabel="Horizontal" />
            <ui-radio-group [options]="options" value="move" [disabled]="true"
              ariaLabel="Disabled" />
            <ui-radio-group [options]="languages" value="de" ariaLabel="Languages" />
          </div>
        }
      </div>`,
  }),
};
