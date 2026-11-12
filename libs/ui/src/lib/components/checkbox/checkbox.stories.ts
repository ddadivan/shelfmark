import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { CheckboxComponent } from './checkbox.component';

const meta: Meta<CheckboxComponent> = {
  title: 'Components/Checkbox',
  component: CheckboxComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A native checkbox with a label, optional hint and error. Bind with `[formField]` ' +
          '(Signal Forms) or `[(checked)]`. `indeterminate` shows the mixed state.',
      },
    },
  },
  args: {
    label: 'Add to favorites',
    hint: '',
    error: '',
    checked: false,
    indeterminate: false,
    disabled: false,
    required: false,
    hideLabel: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-checkbox
        [label]="label"
        [hint]="hint"
        [error]="error"
        [disabled]="disabled"
        [required]="required"
        [hideLabel]="hideLabel"
        [indeterminate]="indeterminate"
        [(checked)]="checked"
      />`,
  }),
};

export default meta;
type Story = StoryObj<CheckboxComponent>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { checked: true } };

export const Indeterminate: Story = { args: { indeterminate: true } };

export const WithHint: Story = { args: { hint: 'Favorites appear first in the feed' } };

export const WithError: Story = { args: { error: 'Confirm to continue' } };

/** Box only: the label stays the accessible name (a checkbox inside a row that names its item). */
export const HiddenLabel: Story = { args: { hideLabel: true } };

export const Disabled: Story = { args: { disabled: true, checked: true } };

/** Every state, in both themes side by side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: {
      themes: Object.values(THEME),
      cases: [
        { label: 'Unchecked' },
        { label: 'Checked', checked: true },
        { label: 'Indeterminate', indeterminate: true },
        { label: 'With hint', hint: 'A short explanation', checked: true },
        { label: 'With error', error: 'Confirm to continue' },
        { label: 'Disabled', disabled: true },
        { label: 'Disabled checked', disabled: true, checked: true },
      ],
    },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            @for (c of cases; track c.label) {
              <ui-checkbox
                [label]="c.label"
                [hint]="c.hint ?? ''"
                [error]="c.error ?? ''"
                [checked]="c.checked ?? false"
                [indeterminate]="c.indeterminate ?? false"
                [disabled]="c.disabled ?? false"
              />
            }
          </div>
        }
      </div>`,
  }),
};
