import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { AiLineComponent } from './ai-line.component';

const meta: Meta<AiLineComponent> = {
  title: 'Components/AiLine',
  component: AiLineComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The quiet one-line status that stands in for AI content when it cannot appear: one sentence with ' +
          'the spark, an optional ghost button. Never red, never a toast.',
      },
    },
  },
  args: {
    text: "Suggestions aren't available right now. Your link saves as usual.",
    actionLabel: '',
  },
  argTypes: { action: { action: 'action' } },
};

export default meta;
type Story = StoryObj<AiLineComponent>;

/** Provider error: what happened and what still works. */
export const Default: Story = {};

/** With "Try again" (a provider error, once). */
export const WithAction: Story = { args: { actionLabel: 'Try again' } };

/** Limit reached, with the way to the settings. */
export const LimitReached: Story = {
  args: {
    text: "Suggestions are paused until Dec 1. You used this month's 100 links.",
    actionLabel: 'AI settings',
  },
};

/** On a phone width the button wraps under the sentence. */
export const Narrow: Story = {
  args: { actionLabel: 'Try again' },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 20rem">
        <ui-ai-line [text]="text" [actionLabel]="actionLabel" (action)="action()" />
      </div>`,
  }),
};

/** Every variant, in both themes side by side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <div class="ds-stack">
              <ui-ai-line text="Suggestions aren't available right now. Your link saves as usual." />
              <ui-ai-line text="Suggestions aren't available right now. Your link saves as usual." actionLabel="Try again" />
              <ui-ai-line text="Suggestions are paused until Dec 1. You used this month's 100 links." actionLabel="AI settings" />
            </div>
          </div>
        }
      </div>`,
  }),
};
