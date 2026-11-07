import type { Meta, StoryObj } from '@storybook/angular-vite';
import { InputComponent } from './input.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { INPUT_TYPE } from './models/input-type.const';

const TYPES = Object.values(INPUT_TYPE);

const meta: Meta<InputComponent> = {
  title: 'Components/Input',
  component: InputComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Single-line field in the shared field shell: the label is always visible, the placeholder ' +
          'only shows an example. With Signal Forms bind it with `[formField]` (value, disabled, ' +
          'required and the first error message of a touched field come from the field); without a ' +
          'form use `[(value)]` and `error`. While `loading`, `search` swaps its icon for a spinner ' +
          'and other types show one after the text.',
      },
    },
  },
  args: {
    label: 'Link',
    type: INPUT_TYPE.Text,
    placeholder: 'https://',
    hint: '',
    error: '',
    icon: undefined,
    clearable: false,
    clearLabel: 'Clear',
    shortcut: '',
    loading: false,
    loadingLabel: 'Searching',
    disabled: false,
    required: false,
    value: '',
  },
  argTypes: { type: { control: 'inline-radio', options: TYPES } },
  render: (args) => ({
    props: args,
    template: `
      <div class="fs-narrow">
        <ui-input
          [label]="label"
          [type]="type"
          [placeholder]="placeholder"
          [hint]="hint"
          [error]="error"
          [icon]="icon"
          [clearable]="clearable"
          [clearLabel]="clearLabel"
          [shortcut]="shortcut"
          [loading]="loading"
          [loadingLabel]="loadingLabel"
          [disabled]="disabled"
          [required]="required"
          [(value)]="value"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<InputComponent>;

export const Default: Story = {};

export const Url: Story = {
  args: {
    type: INPUT_TYPE.Url,
    icon: 'link',
    clearable: true,
    value: 'https://youtube.com/watch?v=ng22',
    hint: 'Title and preview fill in by themselves',
  },
};

export const Search: Story = {
  args: {
    label: 'Search',
    type: INPUT_TYPE.Search,
    placeholder: 'Search links',
    shortcut: '⌘K',
  },
};

/** The spinner takes the 16px slot of the search icon; the field does not shift. */
export const SearchLoading: Story = {
  args: { ...Search.args, loading: true, value: 'angular' },
};

/** Other types show the spinner after the text, before the clear button (add-link preview). */
export const UrlLoading: Story = {
  args: {
    type: INPUT_TYPE.Url,
    icon: 'link',
    clearable: true,
    loading: true,
    loadingLabel: 'Loading preview',
    value: 'https://stepik.org/course/nestjs',
  },
};

export const Filled: Story = {
  args: { label: 'Title', value: "Angular 22: what's new" },
};

export const WithHint: Story = {
  args: { hint: 'Title and preview fill in by themselves' },
};

export const Clearable: Story = {
  args: { clearable: true, clearLabel: 'Clear link', value: 'https://angular.dev' },
};

export const Focus: Story = {
  args: { label: 'Title', value: "Angular 22: what's new", hint: 'Focus' },
  play: ({ canvasElement }) => {
    canvasElement.querySelector('input')?.focus();
  },
};

export const ErrorState: Story = {
  args: {
    type: INPUT_TYPE.Url,
    value: 'youtube com/ng22',
    error: 'Enter an address starting with http:// or https://',
  },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'https://angular.dev', hint: 'Only the owner can change this' },
};

/** Every type and state in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div class="fs-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="fs-panel">
            <ui-input label="Link" type="url" icon="link" placeholder="https://"
              value="https://youtube.com/watch?v=ng22" [clearable]="true" clearLabel="Clear"
              hint="Title and preview fill in by themselves" />
            <ui-input label="Search" type="search" placeholder="Search links" shortcut="⌘K" />
            <ui-input label="Search (loading)" type="search" value="angular" [loading]="true" />
            <ui-input label="Link (loading)" type="url" icon="link" value="https://stepik.org/course/nestjs"
              [loading]="true" loadingLabel="Loading preview" [clearable]="true" clearLabel="Clear" />
            <ui-input label="Title" value="Angular 22: what's new" />
            <ui-input label="Empty" placeholder="Placeholder shows an example" />
            <ui-input label="Link" type="url" value="youtube com/ng22"
              error="Enter an address starting with http:// or https://" />
            <ui-input label="Disabled" value="https://angular.dev" [disabled]="true" />
          </div>
        }
      </div>`,
  }),
};
