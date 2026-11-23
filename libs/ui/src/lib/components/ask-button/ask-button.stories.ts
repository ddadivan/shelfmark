import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { AskButtonComponent } from './ask-button.component';

const meta: Meta<AskButtonComponent> = {
  title: 'Components/AskButton',
  component: AskButtonComponent,
  tags: ['autodocs'],
  args: { label: 'Ask', shortcut: 'Ctrl J', disabled: false },
};

export default meta;
type Story = StoryObj<AskButtonComponent>;

export const Default: Story = {};

/** Hover or tab to it: the four-colour glow fades in over 600 ms and turns (9 s a turn). */
export const BothThemes: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane" style="display: flex; gap: 1rem">
            <ui-ask-button label="Ask" shortcut="Ctrl J" />
            <ui-ask-button label="Ask" disabled />
          </div>
        }
      </div>`,
  }),
};
