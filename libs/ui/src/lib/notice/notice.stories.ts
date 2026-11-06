import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ICON_NAMES } from '../icon/models/icon-names.const';
import { NoticeComponent } from './notice.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';

const meta: Meta<NoticeComponent> = {
  title: 'Components/Notice',
  component: NoticeComponent,
  tags: ['autodocs'],
  args: { kind: 'warning' },
  argTypes: {
    kind: { control: 'inline-radio', options: ['warning', 'danger'] },
    icon: { control: 'select', options: [undefined, ...ICON_NAMES] },
  },
  render: (args) => ({
    props: args,
    template: `<ui-notice [kind]="kind" [icon]="icon">You already saved this link.</ui-notice>`,
  }),
};

export default meta;
type Story = StoryObj<NoticeComponent>;

/** Polite `role="status"`. */
export const Warning: Story = {};

/** Assertive `role="alert"`. */
export const Danger: Story = {
  args: { kind: 'danger' },
  render: (args) => ({
    props: args,
    template: `<ui-notice [kind]="kind" [icon]="icon">We could not load a preview for this link.</ui-notice>`,
  }),
};

export const WithLink: Story = {
  render: (args) => ({
    props: args,
    template: `<ui-notice [kind]="kind" [icon]="icon">You already saved this link. <a href="#open">Open it</a></ui-notice>`,
  }),
};

export const CustomIcon: Story = { args: { icon: 'info' } };

/** Both kinds, with and without a link, in both themes. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <div class="ds-stack">
              <ui-notice kind="warning">You already saved this link.</ui-notice>
              <ui-notice kind="warning">You already saved this link. <a href="#open">Open it</a></ui-notice>
              <ui-notice kind="danger">We could not load a preview for this link.</ui-notice>
              <ui-notice kind="danger">The address looks wrong. <a href="#help">Learn more</a></ui-notice>
            </div>
          </div>
        }
      </div>`,
  }),
};
