import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LoadMoreComponent } from './load-more.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';

const meta: Meta<LoadMoreComponent> = {
  title: 'Components/LoadMore',
  component: LoadMoreComponent,
  tags: ['autodocs'],
  args: { text: 'Loading more links', loading: true },
  render: (args) => ({
    props: args,
    template: `<div class="ls-list"><ui-load-more [text]="text" [loading]="loading" /></div>`,
  }),
};

export default meta;
type Story = StoryObj<LoadMoreComponent>;

/** The row under the last item of a list while the next page loads. */
export const Default: Story = {};

/** Not loading: the host stays as an empty live region and the row is gone. */
export const Idle: Story = { args: { loading: false } };

/** Both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div class="ls-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ls-panel">
            <div class="ls-list"><ui-load-more text="Loading more links" /></div>
          </div>
        }
      </div>`,
  }),
};
