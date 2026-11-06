import type { Meta, StoryObj } from '@storybook/angular-vite';
import { TextareaComponent } from './textarea.component';

const meta: Meta<TextareaComponent> = {
  title: 'Components/Textarea',
  component: TextareaComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Multi-line note field. Starts at `rows` (3), grows with its content up to 8 rows, then ' +
          'scrolls. `maxLength` shows a counter on the right of the hint row. Bind with ' +
          '`[formField]` like `ui-input`.',
      },
    },
  },
  args: {
    label: 'Note',
    placeholder: 'Why are you saving this?',
    hint: 'Why you saved it, helps you find it later',
    error: '',
    rows: 3,
    maxLength: undefined,
    counterLabel: 'characters',
    disabled: false,
    value: '',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="fs-wide">
        <ui-textarea
          [label]="label"
          [placeholder]="placeholder"
          [hint]="hint"
          [error]="error"
          [rows]="rows"
          [maxLength]="maxLength"
          [counterLabel]="counterLabel"
          [disabled]="disabled"
          [(value)]="value"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<TextareaComponent>;

export const Default: Story = {};

export const WithCounter: Story = {
  args: { maxLength: 2000, value: "Watch on the weekend, it's about Signal Forms" },
};

/** Past 8 rows the field stops growing and scrolls. */
export const GrowsToEightRows: Story = {
  args: {
    maxLength: 2000,
    value: Array.from({ length: 12 }, (_, i) => `Line ${i + 1} of the note`).join('\n'),
  },
};

export const Focus: Story = {
  args: { value: 'Watch on the weekend' },
  play: ({ canvasElement }) => {
    canvasElement.querySelector('textarea')?.focus();
  },
};

export const ErrorState: Story = {
  args: { maxLength: 20, value: 'Watch on the weekend, a long note', error: 'Keep the note short' },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'Watch on the weekend' },
};

/** Every state in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    template: `
      <div class="fs-themes">
        @for (theme of ['light', 'dark']; track theme) {
          <div [attr.data-theme]="theme" class="fs-panel">
            <ui-textarea label="Note" placeholder="Why are you saving this?"
              hint="Helps you find it later" />
            <ui-textarea label="Note" [maxLength]="2000" counterLabel="characters"
              hint="Helps you find it later" value="Watch on the weekend" />
            <ui-textarea label="Note" [maxLength]="20" value="Watch on the weekend, a long note"
              error="Keep the note short" />
            <ui-textarea label="Note" [disabled]="true" value="Watch on the weekend" />
          </div>
        }
      </div>`,
  }),
};
