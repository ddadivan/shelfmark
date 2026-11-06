import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  disabled,
  form,
  FormField,
  maxLength,
  pattern,
  required,
  submit,
} from '@angular/forms/signals';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { InputComponent } from '../input/input.component';
import type { RadioOption } from '../radio-group/models/radio-option.interface';
import { RadioGroupComponent } from '../radio-group/radio-group.component';
import { TextareaComponent } from '../textarea/textarea.component';

/**
 * A real Signal Forms model: `required` and `pattern` errors appear after the field is touched
 * (blur) or on submit, `maxLength` drives the counter, the lock switch disables the link field
 * from the form. The messages are plain strings here; a feature passes translated ones.
 */
@Component({
  selector: 'ui-field-forms-demo',
  imports: [
    InputComponent,
    TextareaComponent,
    RadioGroupComponent,
    ButtonComponent,
    FormField,
    JsonPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="fs-form fs-wide" novalidate (submit)="send($event)">
      <ui-input
        label="Link"
        type="url"
        icon="link"
        placeholder="https://"
        hint="Title and preview fill in by themselves"
        [clearable]="true"
        clearLabel="Clear link"
        [formField]="f.url"
      />
      <ui-textarea
        label="Note"
        placeholder="Why are you saving this?"
        hint="Helps you find it later"
        counterLabel="characters"
        [formField]="f.note"
      />
      <ui-radio-group ariaLabel="Where it goes" [options]="options" [formField]="f.where" />
      <div class="fs-form">
        <ui-button type="submit">Save link</ui-button>
        <ui-button variant="ghost" (click)="locked.set(!locked())">
          {{ locked() ? 'Unlock link field' : 'Lock link field' }}
        </ui-button>
      </div>
      <p class="fs-values">{{ model() | json }}</p>
    </form>
  `,
})
class FieldFormsDemoComponent {
  protected readonly options: RadioOption[] = [
    { value: 'inbox', title: 'Inbox', description: 'Sort it later' },
    { value: 'folder', title: 'A folder', description: 'Pick one next' },
  ];
  protected readonly model = signal({ url: '', note: '', where: 'inbox' });
  protected readonly locked = signal(false);
  protected readonly f = form(this.model, (p) => {
    required(p.url, { message: 'Enter a link' });
    pattern(p.url, /^https?:\/\/\S+$/, { message: 'Enter an address that starts with https://' });
    maxLength(p.note, 40, { message: 'Keep the note under 40 characters' });
    disabled(p.url, () => this.locked());
  });

  protected send(event: Event): void {
    event.preventDefault();
    void submit(this.f, async () => undefined);
  }
}

const meta: Meta = {
  title: 'Components/Field/Signal Forms',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const BoundToSignalForms: Story = {
  render: () => ({
    moduleMetadata: { imports: [FieldFormsDemoComponent] },
    template: '<ui-field-forms-demo />',
  }),
};
