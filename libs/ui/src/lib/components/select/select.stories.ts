import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { disabled, form, FormField, required, submit } from '@angular/forms/signals';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import type { SelectOption } from './models/select-option.interface';
import { SelectComponent } from './select.component';
import { SELECT_FIXTURE_ID } from './models/select-fixture-id.const';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';

const FLAT: SelectOption[] = [
  { id: SELECT_FIXTURE_ID.Work, name: 'Work' },
  { id: SELECT_FIXTURE_ID.Reading, name: 'Reading list' },
  { id: SELECT_FIXTURE_ID.Recipes, name: 'Recipes' },
  { id: SELECT_FIXTURE_ID.Clothes, name: 'Clothes' },
];

const NESTED: SelectOption[] = [
  {
    id: SELECT_FIXTURE_ID.Work,
    name: 'Work',
    children: [
      {
        id: SELECT_FIXTURE_ID.Angular,
        name: 'Angular',
        children: [
          { id: SELECT_FIXTURE_ID.Signals, name: 'Signals' },
          { id: SELECT_FIXTURE_ID.Forms, name: 'Signal Forms' },
        ],
      },
      { id: SELECT_FIXTURE_ID.Courses, name: 'Courses' },
    ],
  },
  { id: SELECT_FIXTURE_ID.Clothes, name: 'Clothes' },
  {
    id: SELECT_FIXTURE_ID.Recipes,
    name: 'Recipes',
    children: [{ id: SELECT_FIXTURE_ID.Soups, name: 'Soups' }],
  },
];

const DEEP: SelectOption[] = [
  {
    id: 'l1',
    name: 'Level one',
    children: [
      {
        id: 'l2',
        name: 'Level two',
        children: [
          {
            id: 'l3',
            name: 'Level three',
            children: [
              {
                id: 'l4',
                name: 'Level four',
                children: [
                  {
                    id: 'l5',
                    name: 'Level five',
                    children: [{ id: SELECT_FIXTURE_ID.DeepSix, name: 'Level six' }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

const LONG: SelectOption[] = [
  {
    id: SELECT_FIXTURE_ID.Long,
    name: 'Everything I want to read about the new reactivity model and its migration path',
    children: [
      {
        id: SELECT_FIXTURE_ID.LongChild,
        name: 'Notes on zoneless change detection in large production applications',
      },
    ],
  },
  { id: SELECT_FIXTURE_ID.Short, name: 'Short' },
];

const MANY: SelectOption[] = Array.from({ length: 30 }, (_, i) => ({
  id: `folder-${i + 1}`,
  name: `Folder ${i + 1}`,
  children: i % 5 === 0 ? [{ id: `sub-${i + 1}`, name: `Subfolder of ${i + 1}` }] : [],
}));

const meta: Meta<SelectComponent> = {
  title: 'Components/Select',
  component: SelectComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Folder picker on Angular Aria combobox and listbox, in the shared field shell. The value is ' +
          'an option id, or `null` for the empty option (`emptyLabel`). The popup is a connected ' +
          'overlay that grows from the field; nested levels are indented 16px and nested options ' +
          'are named by their path for screen readers. Arrows, Home / End, Enter and typing (typeahead, ' +
          'or the filter with `searchable`) move and choose; Esc closes and keeps the value. Bind it ' +
          'with `[formField]`; without a form use `[(value)]` and `error`. The popup lives in the page ' +
          'body and follows the theme of the page.',
      },
    },
  },
  args: {
    label: 'Folder',
    options: NESTED,
    searchable: false,
    emptyLabel: 'Unsorted',
    placeholder: 'Choose a folder',
    searchLabel: 'Find a folder',
    noResultsLabel: 'No folders found',
    hint: '',
    error: '',
    disabled: false,
    required: false,
    value: SELECT_FIXTURE_ID.Angular,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="ss-field ss-open">
        <ui-select
          [label]="label"
          [options]="options"
          [searchable]="searchable"
          [emptyLabel]="emptyLabel"
          [placeholder]="placeholder"
          [searchLabel]="searchLabel"
          [noResultsLabel]="noResultsLabel"
          [hint]="hint"
          [error]="error"
          [disabled]="disabled"
          [required]="required"
          [(value)]="value"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<SelectComponent>;

/** Opens the popup like a user would, after the story rendered. */
const openPopup: Story['play'] = async ({ canvasElement }) => {
  canvasElement.querySelector<HTMLButtonElement>('button[role="combobox"]')?.click();
  await new Promise((resolve) => setTimeout(resolve, 400));
};

/** Types into the search box of the open popup. */
async function search(text: string): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('.ui-select__search-input');
  if (input) {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}

export const Nested: Story = {};

export const Flat: Story = { args: { options: FLAT, value: SELECT_FIXTURE_ID.Recipes } };

export const NestedDeep: Story = { args: { options: DEEP, value: SELECT_FIXTURE_ID.DeepSix } };

export const LongNames: Story = { args: { options: LONG, value: SELECT_FIXTURE_ID.LongChild } };

export const EmptyValue: Story = { args: { value: null } };

export const Placeholder: Story = { args: { value: null, emptyLabel: '' } };

export const WithHint: Story = { args: { hint: 'Where the link is saved' } };

export const ErrorState: Story = {
  args: { value: null, emptyLabel: '', error: 'Choose a folder' },
};

export const Disabled: Story = { args: { disabled: true, hint: 'The folder cannot change here' } };

/** Open: indented levels, the selected option with a check and the accent background. */
export const Open: Story = { play: openPopup };

/** Open with the search box (focus is in it); a long list scrolls inside the popup. */
export const OpenSearchable: Story = {
  args: { searchable: true, options: MANY, value: SELECT_FIXTURE_ID.Folder12 },
  play: openPopup,
};

export const Filtered: Story = {
  args: { searchable: true },
  play: async (context) => {
    await openPopup(context);
    await search('ang');
  },
};

export const NoResults: Story = {
  args: { searchable: true },
  play: async (context) => {
    await openPopup(context);
    await search('zzz');
  },
};

/** Every state in both themes, independent of the toolbar (closed; open states have own stories). */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    moduleMetadata: { imports: [SelectComponent] },
    props: { nested: NESTED, long: LONG, themes: Object.values(THEME) },
    template: `
      <div class="ss-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ss-panel">
            <ui-select label="Folder" [options]="nested" emptyLabel="Unsorted" value="${SELECT_FIXTURE_ID.Angular}"
              hint="Where the link is saved" searchLabel="Find a folder" />
            <ui-select label="Unsorted" [options]="nested" emptyLabel="Unsorted" [value]="null" />
            <ui-select label="No choice yet" [options]="nested" placeholder="Choose a folder" [value]="null" />
            <ui-select label="Long name" [options]="long" value="${SELECT_FIXTURE_ID.LongChild}" />
            <ui-select label="Error" [options]="nested" placeholder="Choose a folder" [value]="null"
              error="Choose a folder" />
            <ui-select label="Disabled" [options]="nested" emptyLabel="Unsorted" value="${SELECT_FIXTURE_ID.Clothes}"
              [disabled]="true" />
          </div>
        }
      </div>`,
  }),
};

/**
 * A real Signal Forms model: `required` shows its message once the field is touched (the popup
 * closes) or on submit, and the switch disables the field from the form. The messages are plain
 * strings here; a feature passes translated ones.
 */
@Component({
  selector: 'ui-select-forms-demo',
  imports: [SelectComponent, ButtonComponent, FormField, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="ss-form" novalidate (submit)="send($event)">
      <ui-select
        label="Folder"
        [options]="folders"
        [searchable]="true"
        placeholder="Choose a folder"
        searchLabel="Find a folder"
        noResultsLabel="No folders found"
        hint="Where the link is saved"
        [formField]="f.folder"
      />
      <ui-select
        label="Folder with Unsorted"
        [options]="folders"
        emptyLabel="Unsorted"
        [formField]="f.fallback"
      />
      <div class="ss-form">
        <ui-button type="submit">Save link</ui-button>
        <ui-button variant="ghost" (click)="locked.set(!locked())">
          {{ locked() ? 'Unlock folder' : 'Lock folder' }}
        </ui-button>
      </div>
      <p class="ss-values">{{ model() | json }}</p>
    </form>
  `,
})
class SelectFormsDemoComponent {
  protected readonly folders = NESTED;
  protected readonly model = signal<{ folder: string | null; fallback: string | null }>({
    folder: null,
    fallback: null,
  });
  protected readonly locked = signal(false);
  protected readonly f = form(this.model, (p) => {
    required(p.folder, { message: 'Choose a folder' });
    disabled(p.folder, () => this.locked());
  });

  protected send(event: Event): void {
    event.preventDefault();
    void submit(this.f, async () => undefined);
  }
}

export const BoundToSignalForms: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    moduleMetadata: { imports: [SelectFormsDemoComponent] },
    template: '<ui-select-forms-demo />',
  }),
};
