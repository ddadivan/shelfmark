import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { SUGGESTION_KIND } from './models/suggestion-kind.const';
import { SuggestionRowComponent } from './suggestion-row/suggestion-row.component';
import { SuggestionComponent } from './suggestion.component';

const meta: Meta<SuggestionComponent> = {
  title: 'Components/Suggestion',
  component: SuggestionComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [SuggestionRowComponent, SuggestionComponent] })],
  parameters: {
    docs: {
      description: {
        component:
          'A chip the model proposes: an existing tag, one new tag or a folder. Dashed `ai-line` edge until ' +
          'it is taken, then solid sage. Always inside `ui-suggestion-row` (its toolbar gives one tab stop and ' +
          'the arrow keys). Every string is an input; the app passes translated text.',
      },
    },
  },
  args: {
    label: 'signals',
    ariaLabel: 'Add tag signals',
    kind: SUGGESTION_KIND.Tag,
    folderColor: 'ocean',
    folderIcon: 'code',
    newLabel: 'New',
    dismissLabel: 'Dismiss suggestion signals',
    selected: null,
  },
  argTypes: {
    kind: { control: 'inline-radio', options: Object.values(SUGGESTION_KIND) },
    selected: { control: 'inline-radio', options: [null, true, false] },
    accepted: { action: 'accepted' },
    dismissed: { action: 'dismissed' },
    toggled: { action: 'toggled' },
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-suggestion-row ariaLabel="Suggested">
        <ui-suggestion
          [label]="label"
          [ariaLabel]="ariaLabel"
          [kind]="kind"
          [folderColor]="folderColor"
          [folderIcon]="folderIcon"
          [newLabel]="newLabel"
          [dismissLabel]="dismissLabel"
          [selected]="selected"
          (accepted)="accepted()"
          (dismissed)="dismissed()"
          (toggled)="toggled($event)"
        />
      </ui-suggestion-row>`,
  }),
};

export default meta;
type Story = StoryObj<SuggestionComponent>;

/** An existing tag: dashed edge, + in indigo. Click or press Enter to take it. */
export const Tag: Story = {};

/** A tag that does not exist yet: always marked "New". */
export const NewTag: Story = {
  args: {
    label: 'state management',
    ariaLabel: 'Create and add tag state management',
    kind: SUGGESTION_KIND.NewTag,
    dismissLabel: 'Dismiss suggestion state management',
  },
};

/** An existing folder, with its colour tile. */
export const Folder: Story = {
  args: {
    label: 'Angular',
    ariaLabel: 'Move to Angular',
    kind: SUGGESTION_KIND.Folder,
    dismissLabel: 'Dismiss suggestion Angular',
  },
};

/** Review list (Tidy Unsorted): starts solid, a click toggles it back to dashed. */
export const Selected: Story = { args: { selected: true, dismissLabel: '' } };

/** Review list, not selected. */
export const NotSelected: Story = { args: { selected: false, dismissLabel: '' } };

/** The row: label, chips, "Add all" with two or more chips. */
export const Row: Story = {
  render: () => ({
    template: `
      <ui-suggestion-row ariaLabel="Suggested tags" [addAll]="true" addAllLabel="Add all">
        <ui-suggestion label="signals" ariaLabel="Add tag signals" dismissLabel="Dismiss suggestion signals" />
        <ui-suggestion label="rxjs" ariaLabel="Add tag rxjs" dismissLabel="Dismiss suggestion rxjs" />
        <ui-suggestion label="state management" ariaLabel="Create and add tag state management" kind="new-tag" dismissLabel="Dismiss suggestion state management" />
      </ui-suggestion-row>`,
  }),
};

/** Loading: skeleton pills and "Suggesting…" in a busy status region. */
export const Loading: Story = {
  render: () => ({
    template: `<ui-suggestion-row ariaLabel="Suggested tags" [loading]="true" />`,
  }),
};

/** Every kind and state, in both themes side by side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <div class="ds-stack">
              <ui-suggestion-row [ariaLabel]="'Suggested tags, ' + theme" [addAll]="true">
                <ui-suggestion label="signals" ariaLabel="Add tag signals" dismissLabel="Dismiss suggestion signals" />
                <ui-suggestion label="state management" ariaLabel="Create and add tag state management" kind="new-tag" dismissLabel="Dismiss suggestion state management" />
              </ui-suggestion-row>
              <ui-suggestion-row [ariaLabel]="'Suggested folder, ' + theme">
                <ui-suggestion label="Angular" ariaLabel="Move to Angular" kind="folder" folderColor="ocean" folderIcon="code" dismissLabel="Dismiss suggestion Angular" />
              </ui-suggestion-row>
              <ui-suggestion-row [ariaLabel]="'Review list, ' + theme">
                <ui-suggestion label="Angular" ariaLabel="Move to Angular" kind="folder" folderColor="ocean" folderIcon="code" [selected]="true" />
                <ui-suggestion label="Recipes" ariaLabel="Move to Recipes" kind="folder" folderColor="clay" folderIcon="utensils" [selected]="false" />
                <ui-suggestion label="signals" ariaLabel="Add tag signals" [selected]="true" />
              </ui-suggestion-row>
              <ui-suggestion-row ariaLabel="Suggested tags" [loading]="true" />
            </div>
          </div>
        }
      </div>`,
  }),
};
