import type { Meta, StoryObj } from '@storybook/angular-vite';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { ChoiceGridComponent } from './choice-grid.component';
import { CHOICE_GRID_KIND } from './models/choice-grid-kind.const';
import type { ChoiceOption } from './models/choice-option.interface';

const SWATCHES: ChoiceOption[] = Object.values(FOLDER_COLOUR).map((colour) => ({
  value: colour,
  label: colour.charAt(0).toUpperCase() + colour.slice(1),
  colour,
}));

const ICONS: ChoiceOption[] = [
  { value: 'folder', label: 'Folder', icon: 'folder' },
  { value: 'bookmark', label: 'Bookmark', icon: 'bookmark' },
  { value: 'star', label: 'Star', icon: 'star' },
  { value: 'clock', label: 'Clock', icon: 'clock' },
  { value: 'link', label: 'Link', icon: 'link' },
  { value: 'tag', label: 'Tag', icon: 'tag' },
  { value: 'inbox', label: 'Inbox', icon: 'inbox' },
  { value: 'image', label: 'Image', icon: 'image' },
];

const meta: Meta<ChoiceGridComponent> = {
  title: 'Components/ChoiceGrid',
  component: ChoiceGridComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Choose one of many small visual options: colour swatches or icon tiles. Native radios: ' +
          'the arrow keys move and select, Tab enters the checked option, each option is named by its label.',
      },
    },
  },
  args: {
    options: SWATCHES,
    kind: CHOICE_GRID_KIND.Swatch,
    colour: FOLDER_COLOUR.Clay,
    ariaLabel: 'Colour',
    value: 'clay',
  },
  argTypes: {
    kind: { control: 'inline-radio', options: Object.values(CHOICE_GRID_KIND) },
    colour: { control: 'select', options: Object.values(FOLDER_COLOUR) },
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="fs-wide">
        <ui-choice-grid
          [options]="options"
          [kind]="kind"
          [colour]="colour"
          [ariaLabel]="ariaLabel"
          [disabled]="disabled"
          [(value)]="value"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<ChoiceGridComponent>;

export const Swatches: Story = {};

export const Icons: Story = {
  args: { options: ICONS, kind: CHOICE_GRID_KIND.Icon, ariaLabel: 'Icon', value: 'star' },
};

/** Both kinds in light and dark. */
export const AllVariants: Story = {
  render: () => ({
    props: { themes: Object.values(THEME), swatches: SWATCHES, icons: ICONS },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane" style="display: grid; gap: 1rem">
            <ui-choice-grid [options]="swatches" ariaLabel="Colour" value="plum" />
            <ui-choice-grid [options]="icons" kind="icon" colour="teal" ariaLabel="Icon" value="tag" />
          </div>
        }
      </div>`,
  }),
};
