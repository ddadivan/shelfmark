import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import type { SavedViewItem } from './models/saved-view-item.interface';
import { SAVED_VIEWS_LAYOUT } from './models/saved-views-layout.const';
import { SavedViewsComponent } from './saved-views.component';

const ITEMS: SavedViewItem[] = [
  { id: 'all', label: 'All', count: 12 },
  {
    id: 'videos',
    label: 'Videos',
    count: 5,
    menuLabel: 'Actions for Videos',
    hint: 'Links detected as videos',
  },
  {
    id: 'articles',
    label: 'Articles',
    count: 4,
    menuLabel: 'Actions for Articles',
    hint: 'Links detected as articles',
  },
  { id: 'read', label: 'To read', count: 3, menuLabel: 'Actions for To read' },
];

const MANY: SavedViewItem[] = [
  ...ITEMS,
  { id: 'shop', label: 'Shopping', count: 1, menuLabel: 'Actions for Shopping' },
  { id: 'work', label: 'Work videos', count: 18, menuLabel: 'Actions for Work videos' },
  { id: 'recipes', label: 'Recipes', count: 120, menuLabel: 'Actions for Recipes' },
];

const meta: Meta<SavedViewsComponent> = {
  title: 'Components/SavedViews',
  component: SavedViewsComponent,
  tags: ['autodocs'],
  args: {
    items: ITEMS,
    activeId: 'all',
    ariaLabel: 'Saved views',
    addLabel: 'Save this view',
    layout: SAVED_VIEWS_LAYOUT.Wrap,
  },
  argTypes: {
    layout: { control: 'inline-radio', options: Object.values(SAVED_VIEWS_LAYOUT) },
    selected: { action: 'selected' },
    add: { action: 'add' },
    menuRequested: { action: 'menuRequested' },
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-saved-views
        [items]="items"
        [activeId]="activeId"
        [ariaLabel]="ariaLabel"
        [addLabel]="addLabel"
        [layout]="layout"
        (selected)="selected($event)"
        (add)="add()"
        (menuRequested)="menuRequested($event)"
      />`,
  }),
};

export default meta;
type Story = StoryObj<SavedViewsComponent>;

/** "All" pressed, the views with their counts and the dashed add button. */
export const Default: Story = {};

/** A saved view is the current filter. */
export const ViewActive: Story = { args: { activeId: 'videos' } };

/** The current filter matches no view: nothing is pressed, "Save this view" is the way to keep it. */
export const NoneActive: Story = { args: { activeId: null } };

/** Counts not loaded yet. */
export const WithoutCounts: Story = {
  args: { items: ITEMS.map((item) => ({ ...item, count: null })) },
};

/** No add button (the "Recently opened" kind filter). */
export const WithoutAdd: Story = {
  args: {
    addLabel: '',
    ariaLabel: 'Filter',
    items: ITEMS.map(({ id, label, count }) => ({ id, label, count })),
  },
};

/** Desktop: many views wrap onto new lines. */
export const Wrapping: Story = {
  args: { items: MANY },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 26rem">
        <ui-saved-views [items]="items" [activeId]="activeId" [ariaLabel]="ariaLabel" [addLabel]="addLabel" />
      </div>`,
  }),
};

/** Phone: one row that scrolls sideways. */
export const Scrolling: Story = {
  args: { items: MANY, layout: SAVED_VIEWS_LAYOUT.Scroll },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 22.5rem">
        <ui-saved-views [items]="items" [activeId]="activeId" [ariaLabel]="ariaLabel" [addLabel]="addLabel" [layout]="layout" />
      </div>`,
  }),
};

/** Every state, in both themes side by side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { items: ITEMS, themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <ui-saved-views [items]="items" activeId="all" [ariaLabel]="'Saved views, ' + theme" addLabel="Save this view" />
            <ui-saved-views [items]="items" activeId="read" [ariaLabel]="'Saved views, view active, ' + theme" addLabel="Save this view" />
            <ui-saved-views [items]="items" [activeId]="null" [ariaLabel]="'Saved views, none active, ' + theme" />
          </div>
        }
      </div>`,
  }),
};
