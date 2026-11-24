import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { ConversationRowComponent } from './conversation-row.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import type { Theme } from '../../models/theme';

const meta: Meta<ConversationRowComponent> = {
  title: 'Components/Conversation row',
  component: ConversationRowComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [ButtonComponent] })],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '`ui-conversation-row` is one conversation of a chat history list (Shelf 11-ask): the title on one line with "…", ' +
          'the current one on `surface-hover` in 500 weight with `aria-current="page"`. The title is one native link stretched over the row; ' +
          '`slot="actions"` (a delete button) shows on hover and focus, always with touch input.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<ConversationRowComponent>;

const list = (theme: Theme): string => `
  <div ${THEME_ATTRIBUTE}="${theme}" style="max-width: 15rem; padding: 0.5rem; background: var(--bg)">
    <div role="list" aria-label="Conversations">
      <ui-conversation-row href="#" current>Something to watch this weekend, under an hour
        <ui-button slot="actions" variant="ghost" size="sm" iconLeft="trash" iconOnly ariaLabel="Delete conversation" />
      </ui-conversation-row>
      <ui-conversation-row href="#">How many links do I have?
        <ui-button slot="actions" variant="ghost" size="sm" iconLeft="trash" iconOnly ariaLabel="Delete conversation" />
      </ui-conversation-row>
      <ui-conversation-row href="#">Which Signal Forms video first?</ui-conversation-row>
    </div>
  </div>`;

export const Light: Story = { render: () => ({ template: list(THEME.Light) }) };
export const Dark: Story = { render: () => ({ template: list(THEME.Dark) }) };
