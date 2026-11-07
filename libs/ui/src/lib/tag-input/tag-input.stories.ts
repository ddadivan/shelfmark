import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { disabled, form, FormField, minLength, submit } from '@angular/forms/signals';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import type { TagSuggestion } from './models/tag-suggestion.interface';
import { TagInputComponent } from './tag-input.component';

const SUGGESTIONS: TagSuggestion[] = [
  { name: 'signals', countLabel: '12 links' },
  { name: 'angular', countLabel: '8 links' },
  { name: 'forms', countLabel: '5 links' },
  { name: 'design', countLabel: '3 links' },
  { name: 'courses', countLabel: '1 link' },
];

const TEXTS = {
  placeholder: 'Add tag',
  createLabel: 'Create tag “{name}”',
  removeLabel: 'Remove tag {name}',
  addedLabel: 'Tag {name} added',
  removedLabel: 'Tag {name} removed',
  duplicateLabel: 'Tag {name} is already added',
  listLabel: 'Tag suggestions',
  maxTagsLabel: 'Up to 3 tags',
};

const meta: Meta<TagInputComponent> = {
  title: 'Components/TagInput',
  component: TagInputComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Several tags in one field: removable chips inside the box and a text input on Angular Aria ' +
          'combobox with a listbox of existing tags and a "Create tag" row. Enter or a comma adds ' +
          '(trimmed, 50 characters at most, duplicates ignored ignoring case), Backspace in the empty ' +
          'input removes the last tag, arrows move through the list, Esc closes it. Added and removed ' +
          'tags are announced. Bind with `[formField]`; without a form use `[(value)]` and `error`. ' +
          'The list lives in the page body and follows the theme of the page.',
      },
    },
  },
  args: {
    label: 'Tags',
    hint: 'Enter adds, Backspace removes the last one',
    error: '',
    disabled: false,
    required: false,
    maxTags: undefined,
    suggestions: SUGGESTIONS,
    value: ['angular', 'courses'],
    ...TEXTS,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="tis-field tis-open">
        <ui-tag-input
          [label]="label"
          [hint]="hint"
          [error]="error"
          [disabled]="disabled"
          [required]="required"
          [maxTags]="maxTags"
          [suggestions]="suggestions"
          [placeholder]="placeholder"
          [createLabel]="createLabel"
          [removeLabel]="removeLabel"
          [addedLabel]="addedLabel"
          [removedLabel]="removedLabel"
          [duplicateLabel]="duplicateLabel"
          [listLabel]="listLabel"
          [maxTagsLabel]="maxTagsLabel"
          [(value)]="value"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<TagInputComponent>;

/** Types into the input of the story, like a user would. */
const typeText =
  (text: string): Story['play'] =>
  async ({ canvasElement }) => {
    const input = canvasElement.querySelector<HTMLInputElement>('input[role="combobox"]');
    if (input) {
      input.focus();
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  };

export const Empty: Story = { args: { value: [] } };

export const WithTags: Story = {};

/** Typing "sig": matching tags with their counts and the active "Create tag" row. */
export const TypingWithSuggestions: Story = { play: typeText('sig') };

export const CreateOption: Story = { play: typeText('rxjs') };

export const AtMaxTags: Story = { args: { value: ['angular', 'forms', 'design'], maxTags: 3 } };

export const ErrorState: Story = { args: { value: [], error: 'Add at least one tag' } };

export const Disabled: Story = { args: { disabled: true } };

/** Every state in both themes, independent of the toolbar (closed; open states have own stories). */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    moduleMetadata: { imports: [TagInputComponent] },
    props: {
      suggestions: SUGGESTIONS,
      texts: TEXTS,
      themes: Object.values(THEME),
      empty: [] as string[],
      some: ['angular', 'courses'],
      full: ['angular', 'forms', 'design'],
      many: [
        'angular',
        'signals',
        'forms',
        'design',
        'courses',
        'a-tag-with-a-rather-long-name-that-wraps',
      ],
    },
    template: `
      <div class="tis-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="tis-panel">
            <ui-tag-input label="Empty" [suggestions]="suggestions" [value]="empty" [placeholder]="texts.placeholder"
              [removeLabel]="texts.removeLabel" hint="Enter adds, Backspace removes the last one" />
            <ui-tag-input label="With tags" [suggestions]="suggestions" [value]="some" [placeholder]="texts.placeholder"
              [removeLabel]="texts.removeLabel" />
            <ui-tag-input label="Many tags wrap" [suggestions]="suggestions" [value]="many" [placeholder]="texts.placeholder"
              [removeLabel]="texts.removeLabel" />
            <ui-tag-input label="At the limit" [suggestions]="suggestions" [value]="full" [maxTags]="3"
              [maxTagsLabel]="texts.maxTagsLabel" [removeLabel]="texts.removeLabel" />
            <ui-tag-input label="Error" [suggestions]="suggestions" [value]="empty" [placeholder]="texts.placeholder"
              error="Add at least one tag" />
            <ui-tag-input label="Disabled" [suggestions]="suggestions" [value]="some" [disabled]="true"
              [removeLabel]="texts.removeLabel" />
          </div>
        }
      </div>`,
  }),
};

/**
 * A real Signal Forms model: `minLength` shows its message once the field is touched or on
 * submit, and the switch disables the field from the form. (`required` does not treat an empty
 * array as empty.) Messages are plain strings here; a feature passes translated ones.
 */
@Component({
  selector: 'ui-tag-input-forms-demo',
  imports: [TagInputComponent, ButtonComponent, FormField, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="tis-form" novalidate (submit)="send($event)">
      <ui-tag-input
        label="Tags"
        hint="Enter or comma adds"
        placeholder="Add tag"
        createLabel="Create tag “{name}”"
        removeLabel="Remove tag {name}"
        addedLabel="Tag {name} added"
        removedLabel="Tag {name} removed"
        duplicateLabel="Tag {name} is already added"
        listLabel="Tag suggestions"
        maxTagsLabel="Up to 5 tags"
        [maxTags]="5"
        [suggestions]="suggestions"
        [formField]="f.tags"
      />
      <div class="tis-form">
        <ui-button type="submit">Save link</ui-button>
        <ui-button variant="ghost" (click)="locked.set(!locked())">
          {{ locked() ? 'Unlock tags' : 'Lock tags' }}
        </ui-button>
      </div>
      <p class="tis-values">{{ model() | json }}</p>
    </form>
  `,
})
class TagInputFormsDemoComponent {
  protected readonly suggestions = SUGGESTIONS;
  protected readonly model = signal<{ tags: string[] }>({ tags: [] });
  protected readonly locked = signal(false);
  protected readonly f = form(this.model, (p) => {
    minLength(p.tags, 1, { message: 'Add at least one tag' });
    disabled(p.tags, () => this.locked());
  });

  protected send(event: Event): void {
    event.preventDefault();
    void submit(this.f, async () => undefined);
  }
}

export const BoundToSignalForms: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    moduleMetadata: { imports: [TagInputFormsDemoComponent] },
    template: '<ui-tag-input-forms-demo />',
  }),
};
