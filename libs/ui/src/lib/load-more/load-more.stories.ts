import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LoadMoreComponent } from './load-more.component';

const meta: Meta<LoadMoreComponent> = {
  title: 'Components/LoadMore',
  component: LoadMoreComponent,
  tags: ['autodocs'],
  args: { text: 'Loading more links' },
  render: (args) => ({
    props: args,
    template: `<div class="ls-list"><ui-load-more [text]="text" /></div>`,
  }),
};

export default meta;
type Story = StoryObj<LoadMoreComponent>;

/** The row under the last item of a list while the next page loads. */
export const Default: Story = {};

/** Both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    template: `
      <div class="ls-themes">
        @for (theme of ['light', 'dark']; track theme) {
          <div [attr.data-theme]="theme" class="ls-panel">
            <div class="ls-list"><ui-load-more text="Loading more links" /></div>
          </div>
        }
      </div>`,
  }),
};
