import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { SwitchComponent } from './switch.component';

const meta: Meta<SwitchComponent> = {
  title: 'Components/Switch',
  component: SwitchComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Turns a single setting on or off at once, no Save button. A native `role="switch"` button: ' +
          'Space and Enter toggle. `label` is the accessible name; the row shows the visible text. ' +
          'Bind with `[formField]` (Signal Forms) or `[(checked)]`. For a choice saved later use a checkbox.',
      },
    },
  },
  args: { label: 'Show notes', checked: false, disabled: false },
  render: (args) => ({
    props: args,
    template: `<ui-switch [label]="label" [disabled]="disabled" [(checked)]="checked" />`,
  }),
};

export default meta;
type Story = StoryObj<SwitchComponent>;

export const Off: Story = {};

export const On: Story = { args: { checked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledOn: Story = { args: { disabled: true, checked: true } };

/** Every state, in both themes side by side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: {
      themes: Object.values(THEME),
      cases: [
        { label: 'Off' },
        { label: 'On', checked: true },
        { label: 'Disabled off', disabled: true },
        { label: 'Disabled on', disabled: true, checked: true },
      ],
    },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            @for (c of cases; track c.label) {
              <ui-switch [label]="c.label" [checked]="c.checked ?? false" [disabled]="c.disabled ?? false" />
            }
          </div>
        }
      </div>`,
  }),
};
