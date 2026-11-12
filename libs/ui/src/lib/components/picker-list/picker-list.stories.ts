import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import type { PickerOption } from './models/picker-option.interface';
import { PickerListComponent } from './picker-list.component';

const FOLDERS: PickerOption[] = [
  {
    id: 'work',
    name: 'Work',
    colour: FOLDER_COLOUR.Ocean,
    children: [
      {
        id: 'angular',
        name: 'Angular',
        colour: FOLDER_COLOUR.Plum,
        icon: 'star',
        children: [{ id: 'signals', name: 'Signals', colour: FOLDER_COLOUR.Plum }],
      },
      { id: 'courses', name: 'Courses', colour: FOLDER_COLOUR.Ocean },
    ],
  },
  { id: 'clothes', name: 'Clothes', colour: FOLDER_COLOUR.Rose },
  {
    id: 'long',
    name: 'Everything I want to read about the new reactivity model and its migration path',
    colour: FOLDER_COLOUR.Amber,
  },
  { id: 'recipes', name: 'Recipes', colour: FOLDER_COLOUR.Sage },
];

const MANY: PickerOption[] = Array.from({ length: 30 }, (_, i) => ({
  id: `folder-${i + 1}`,
  name: `Folder ${i + 1}`,
  colour: Object.values(FOLDER_COLOUR)[i % 8] ?? FOLDER_COLOUR.Graphite,
}));

const meta: Meta<PickerListComponent> = {
  title: 'Components/Picker list',
  component: PickerListComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Searchable, nested list that acts at once (the Move to folder picker): choosing a row ' +
          'emits `chosen`, there is no confirm button. A search box on top filters by name and ' +
          'keeps the ancestors of a match. Focus starts in the search box (not on touch screens); ' +
          'ArrowDown / ArrowUp enter the list, arrows, Home / End move, Enter chooses, Esc is left ' +
          'to the dialog or sheet around it. Rows in `currentIds` are marked and not choosable. ' +
          'Built on the Angular Aria listbox with `aria-activedescendant`; nested rows are named by ' +
          'their path.',
      },
    },
  },
  args: {
    options: FOLDERS,
    emptyLabel: 'Unsorted',
    currentIds: ['angular'],
    currentLabel: 'Current folder',
    searchLabel: 'Find a folder',
    listLabel: 'Folders',
    noResultsLabel: 'No folders found',
    autoFocus: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 28rem">
        <ui-picker-list
          [options]="options"
          [emptyLabel]="emptyLabel"
          [currentIds]="currentIds"
          [currentLabel]="currentLabel"
          [searchLabel]="searchLabel"
          [listLabel]="listLabel"
          [noResultsLabel]="noResultsLabel"
          [autoFocus]="autoFocus"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<PickerListComponent>;

async function search(canvasElement: HTMLElement, text: string): Promise<void> {
  const input = canvasElement.querySelector<HTMLInputElement>('input');
  if (input) {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}

export const Nested: Story = {};

export const UnsortedIsCurrent: Story = { args: { currentIds: [null] } };

export const NoCurrent: Story = { args: { currentIds: [] } };

export const WithoutUnsorted: Story = { args: { emptyLabel: '' } };

/** A long list scrolls inside the list; the search box stays on top. */
export const LongList: Story = { args: { options: MANY, currentIds: ['folder-3'] } };

export const Filtered: Story = {
  play: async ({ canvasElement }) => {
    await search(canvasElement, 'sig');
  },
};

export const NoResults: Story = {
  play: async ({ canvasElement }) => {
    await search(canvasElement, 'zzz');
  },
};

/** Both themes side by side, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: { ...args, themes: Object.values(THEME) },
    template: `
      <div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr))">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" style="padding: 1rem; background: var(--bg); color: var(--text)">
            <ui-picker-list
              [options]="options"
              [emptyLabel]="emptyLabel"
              [currentIds]="currentIds"
              [currentLabel]="currentLabel"
              [searchLabel]="searchLabel"
              [listLabel]="listLabel"
              [noResultsLabel]="noResultsLabel"
              [autoFocus]="false"
            />
          </div>
        }
      </div>`,
  }),
};
