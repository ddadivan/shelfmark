import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import type { PickerOption } from '../picker-list/models/picker-option.interface';
import { PickerMenuComponent } from './picker-menu.component';

const FOLDERS: PickerOption[] = [
  {
    id: 'work',
    name: 'Work',
    colour: FOLDER_COLOUR.Ocean,
    children: [
      { id: 'angular', name: 'Angular', colour: FOLDER_COLOUR.Plum, icon: 'code' },
      { id: 'courses', name: 'Courses', colour: FOLDER_COLOUR.Ocean },
    ],
  },
  { id: 'clothes', name: 'Clothes', colour: FOLDER_COLOUR.Rose, icon: 'shirt' },
  { id: 'recipes', name: 'Recipes', colour: FOLDER_COLOUR.Sage, icon: 'utensils' },
];

const meta: Meta<PickerMenuComponent> = {
  title: 'Components/Picker menu',
  component: PickerMenuComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A title-sized button that opens the folder picker in a glass popover: the header of ' +
          'each half of the side-by-side view. The popover is a dialog that hosts `ui-picker-list` ' +
          '(search box focused on open, arrows, Enter, typing); choosing a row emits `chosen` and ' +
          'closes it, Esc or a click outside closes it and focus returns to the trigger. The shown ' +
          'value carries the check; rows in `currentIds` show `currentLabel` and cannot be chosen. ' +
          'The popover lives in the overlay layer, so it takes the theme of the page (toolbar).',
      },
    },
  },
  args: {
    options: FOLDERS,
    value: 'clothes',
    label: 'Clothes',
    icon: 'shirt',
    colour: FOLDER_COLOUR.Rose,
    emptyLabel: 'Unsorted',
    currentIds: ['angular'],
    currentLabel: 'On the left',
    searchLabel: 'Find a folder',
    listLabel: 'Show on the right',
    noResultsLabel: 'No folders found',
    triggerLabel: 'Right folder: Clothes. Change',
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="min-height: 28rem">
        <ui-picker-menu
          [options]="options"
          [value]="value"
          [label]="label"
          [icon]="icon"
          [colour]="colour"
          [emptyLabel]="emptyLabel"
          [currentIds]="currentIds"
          [currentLabel]="currentLabel"
          [searchLabel]="searchLabel"
          [listLabel]="listLabel"
          [noResultsLabel]="noResultsLabel"
          [triggerLabel]="triggerLabel"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<PickerMenuComponent>;

/** Opens the popover like a user would, after the story rendered. */
const openMenu: Story['play'] = async ({ canvasElement }) => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  canvasElement.querySelector<HTMLButtonElement>('.ui-picker-menu__trigger')?.click();
  await new Promise((resolve) => setTimeout(resolve, 400));
};

export const Closed: Story = {};

/** Open: the shown folder has the check, the other half's folder is marked and disabled. */
export const Open: Story = { play: openMenu };

export const UnsortedShown: Story = {
  args: {
    value: null,
    label: 'Unsorted',
    icon: 'inbox',
    colour: FOLDER_COLOUR.Graphite,
    triggerLabel: 'Right folder: Unsorted. Change',
  },
  play: openMenu,
};

/** A long name is cut with an ellipsis inside the width of its half. */
export const LongName: Story = {
  args: {
    label: 'Everything I want to read about the new reactivity model and its migration path',
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 24rem">
        <ui-picker-menu
          [options]="options"
          [value]="value"
          [label]="label"
          [icon]="icon"
          [colour]="colour"
          searchLabel="Find a folder"
          listLabel="Show on the right"
        />
      </div>`,
  }),
};

/** Both themes side by side, closed (the popover is an overlay and follows the toolbar theme). */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: { ...args, themes: Object.values(THEME) },
    template: `
      <div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr))">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" style="padding: 1rem; background: var(--bg); color: var(--text)">
            <ui-picker-menu
              [options]="options"
              [value]="value"
              [label]="label"
              [icon]="icon"
              [colour]="colour"
              [emptyLabel]="emptyLabel"
              [currentIds]="currentIds"
              [currentLabel]="currentLabel"
              [searchLabel]="searchLabel"
              [listLabel]="listLabel"
              [noResultsLabel]="noResultsLabel"
              [triggerLabel]="triggerLabel"
            />
          </div>
        }
      </div>`,
  }),
};
