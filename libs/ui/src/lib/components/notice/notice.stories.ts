import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { ICON_NAMES } from '../icon/models/icon-names.const';
import { NoticeComponent } from './notice.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { NOTICE_KIND } from './models/notice-kind.const';

const meta: Meta<NoticeComponent> = {
  title: 'Components/Notice',
  component: NoticeComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [ButtonComponent] })],
  args: { kind: NOTICE_KIND.Warning },
  argTypes: {
    kind: { control: 'inline-radio', options: Object.values(NOTICE_KIND) },
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
  args: { kind: NOTICE_KIND.Danger },
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

/** Accent tint, polite `role="status"`. */
export const Info: Story = {
  args: { kind: NOTICE_KIND.Info },
  render: (args) => ({
    props: args,
    template: `<ui-notice [kind]="kind" [icon]="icon">Links are saved to your library.</ui-notice>`,
  }),
};

/** Full-width centred strip with a trailing action, as the demo banner. */
export const Banner: Story = {
  parameters: { layout: 'fullscreen' },
  args: { kind: NOTICE_KIND.Info },
  render: (args) => ({
    props: args,
    template: `
      <ui-notice [kind]="kind" [banner]="true">
        <strong>You're in a demo.</strong> Play with everything, this sandbox resets in 23 h.
        <ui-button uiNoticeAction size="sm" href="#sign-in">Sign in to keep your links</ui-button>
      </ui-notice>`,
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
              <ui-notice kind="info">Links are saved to your library.</ui-notice>
              <ui-notice kind="info" [banner]="true">
                <strong>You're in a demo.</strong> This sandbox resets in 23 h.
                <ui-button uiNoticeAction size="sm" href="#sign-in">Sign in to keep your links</ui-button>
              </ui-notice>
            </div>
          </div>
        }
      </div>`,
  }),
};
