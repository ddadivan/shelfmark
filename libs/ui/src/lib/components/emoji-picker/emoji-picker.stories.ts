import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { EmojiPickerComponent } from './emoji-picker.component';
import type { EmojiPickerCategory } from './models/emoji-picker-category.interface';
import type { EmojiPickerItem } from './models/emoji-picker-item.interface';

function items(entries: readonly (readonly [string, string, ...string[]])[]): EmojiPickerItem[] {
  return entries.map(([emoji, name, ...keywords]) => ({ emoji, name, keywords }));
}

/** A small sample of the app's curated folder collection, English names. */
const CATEGORIES: EmojiPickerCategory[] = [
  {
    id: 'food',
    label: 'Food',
    items: items([
      ['🍕', 'pizza', 'cheese', 'slice'],
      ['🍔', 'hamburger', 'burger'],
      ['🍟', 'french fries', 'chips'],
      ['🌮', 'taco', 'mexican'],
      ['🍝', 'spaghetti', 'pasta'],
      ['🍣', 'sushi', 'fish'],
      ['🥗', 'green salad', 'healthy'],
      ['🍰', 'shortcake', 'cake'],
      ['🍩', 'doughnut', 'sweet'],
      ['☕', 'hot beverage', 'coffee'],
      ['🍷', 'wine glass', 'drink'],
    ]),
  },
  {
    id: 'travel',
    label: 'Travel',
    items: items([
      ['✈️', 'airplane', 'flight'],
      ['🚗', 'automobile', 'car'],
      ['🚲', 'bicycle', 'bike'],
      ['🗺️', 'world map', 'atlas'],
      ['🏝️', 'desert island', 'beach'],
      ['🧳', 'luggage', 'suitcase'],
    ]),
  },
  {
    id: 'work',
    label: 'Work',
    items: items([
      ['💼', 'briefcase', 'office'],
      ['📊', 'bar chart', 'stats'],
      ['📅', 'calendar', 'date'],
      ['💻', 'laptop', 'computer'],
    ]),
  },
  {
    id: 'animals',
    label: 'Animals',
    items: items([
      ['🐶', 'dog face', 'pet'],
      ['🐱', 'cat face', 'pet'],
      ['🦊', 'fox', 'face'],
    ]),
  },
];

const RECENT = items([
  ['🍕', 'pizza'],
  ['🐶', 'dog face'],
]);

const OWN: EmojiPickerItem[] = [
  { emoji: '🦩', name: '🦩', removeLabel: 'Remove 🦩' },
  { emoji: '🧑‍🍳', name: '🧑‍🍳', removeLabel: 'Remove 🧑‍🍳' },
  // Used by a folder: shown, but not offered for removal.
  { emoji: '🪐', name: '🪐' },
];

const meta: Meta<EmojiPickerComponent> = {
  title: 'Components/EmojiPicker',
  component: EmojiPickerComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Picks one emoji (the folder icon). A text field, so typing or pasting still works; a click, ' +
          'Enter or ArrowDown opens a glass panel (a bottom sheet below 40em) with search, category ' +
          'tabs and emoji grids (arrows move, Enter chooses, Esc closes). "Recent" and "Yours" sit ' +
          'above the category; an own emoji with a `removeLabel` shows a "×" and Delete removes it. ' +
          'Every string comes in translated; `opened` is the moment to load the names.',
      },
    },
  },
  args: {
    label: 'Emoji',
    hint: 'One emoji instead of an icon',
    placeholder: 'Choose an emoji',
    searchLabel: 'Search emoji',
    categoriesLabel: 'Categories',
    recentLabel: 'Recent',
    ownLabel: 'Yours',
    resultsLabel: 'Results',
    noResultsLabel: 'No emoji found',
    loadingLabel: 'Loading emoji',
    closeLabel: 'Close',
    categories: CATEGORIES,
    recent: [],
    own: [],
    value: '',
    disabled: false,
    error: '',
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 22rem">
        <ui-emoji-picker
          [label]="label"
          [hint]="hint"
          [placeholder]="placeholder"
          [searchLabel]="searchLabel"
          [categoriesLabel]="categoriesLabel"
          [recentLabel]="recentLabel"
          [ownLabel]="ownLabel"
          [resultsLabel]="resultsLabel"
          [noResultsLabel]="noResultsLabel"
          [loadingLabel]="loadingLabel"
          [closeLabel]="closeLabel"
          [categories]="categories"
          [recent]="recent"
          [own]="own"
          [disabled]="disabled"
          [error]="error"
          [(value)]="value"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<EmojiPickerComponent>;

/** Opens the panel like a user would, after the story rendered. */
const openPanel: Story['play'] = async ({ canvasElement }) => {
  canvasElement.querySelector<HTMLInputElement>('input[role="combobox"]')?.click();
  await new Promise((resolve) => setTimeout(resolve, 400));
};

/** Types into the search box of the open panel. */
async function search(text: string): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('.ui-emoji-picker__search-input');
  if (input) {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}

export const Empty: Story = {};

export const Chosen: Story = { args: { value: '🍕' } };

export const ErrorState: Story = { args: { value: 'ab', error: 'Enter exactly one emoji' } };

export const Disabled: Story = { args: { value: '🍕', disabled: true } };

/** Open on the first category. */
export const Open: Story = { args: { value: '🍔' }, play: openPanel };

/** Recent and own emoji above the category. */
export const RecentAndYours: Story = { args: { recent: RECENT, own: OWN }, play: openPanel };

/** Own emoji with the "×" (shown on hover and focus, always on touch); the third is in use. */
export const RemovableOwnEmoji: Story = { args: { own: OWN }, play: openPanel };

export const SearchResults: Story = {
  play: async (context) => {
    await openPanel(context);
    await search('pet');
  },
};

export const NoResults: Story = {
  play: async (context) => {
    await openPanel(context);
    await search('zzz');
  },
};

/** The names are still loading: a spinner. */
export const Loading: Story = { args: { categories: [] }, play: openPanel };

/** Closed states in both themes, independent of the toolbar (open states have own stories). */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME), categories: CATEGORIES },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane" style="display: grid; gap: 1rem; max-width: 22rem">
            <ui-emoji-picker label="Empty" placeholder="Choose an emoji" searchLabel="Search emoji" categoriesLabel="Categories" [categories]="categories" />
            <ui-emoji-picker label="Chosen" searchLabel="Search emoji" categoriesLabel="Categories" [categories]="categories" value="🍕" />
            <ui-emoji-picker label="Error" searchLabel="Search emoji" categoriesLabel="Categories" [categories]="categories" value="ab" error="Enter exactly one emoji" />
            <ui-emoji-picker label="Disabled" searchLabel="Search emoji" categoriesLabel="Categories" [categories]="categories" value="🍕" disabled />
          </div>
        }
      </div>`,
  }),
};
