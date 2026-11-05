import type { Meta, StoryObj } from '@storybook/angular-vite';
import { IllustrationComponent } from './illustration.component';
import { ILLUSTRATION_DEFAULT_MOTION } from './models/illustration-default-motion.const';
import type { IllustrationMotion } from './models/illustration-motion.type';
import type { IllustrationName } from './models/illustration-name.type';
import { ILLUSTRATION_NAMES } from './models/illustration-names.const';

const MOTIONS: IllustrationMotion[] = ['loop', 'once', 'none'];

const meta: Meta<IllustrationComponent> = {
  title: 'Components/Illustration',
  component: IllustrationComponent,
  tags: ['autodocs'],
  args: { name: 'empty-feed', motion: 'once' },
  argTypes: {
    name: { control: 'select', options: ILLUSTRATION_NAMES },
    motion: {
      control: 'inline-radio',
      options: MOTIONS,
      description:
        'Defaults per scene: loop for the welcome scenes, once for empty states and errors. Reduced motion shows the final frame.',
    },
  },
};

export default meta;
type Story = StoryObj<IllustrationComponent>;

function scene(name: IllustrationName): Story {
  return { args: { name, motion: ILLUSTRATION_DEFAULT_MOTION[name], label: name } };
}

export const WelcomeCollect: Story = scene('welcome-collect');
export const WelcomeSave: Story = scene('welcome-save');
export const WelcomeFind: Story = scene('welcome-find');
export const EmptyFeed: Story = scene('empty-feed');
export const EmptyFolder: Story = scene('empty-folder');
export const NotFound: Story = scene('not-found');
export const PageNotFound: Story = scene('page-not-found');
export const Offline: Story = scene('offline');

/** The same scene in each mode; reload the story to replay `once`. */
export const Loop: Story = { args: { name: 'welcome-collect', motion: 'loop' } };
export const Once: Story = { args: { name: 'empty-feed', motion: 'once' } };
export const Static: Story = { args: { name: 'empty-feed', motion: 'none' } };

/** Every scene in every mode. Switch the theme in the toolbar for light and dark. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { names: ILLUSTRATION_NAMES, motions: MOTIONS },
    template: `
      @for (m of motions; track m) {
        <h3 style="margin: 1.5rem 0 0.75rem; font-size: 0.875rem">motion="{{ m }}"</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 1rem">
          @for (n of names; track n) {
            <figure style="margin: 0; padding: 0.75rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg)">
              <ui-illustration [name]="n" [motion]="m" [label]="n" style="--ui-illustration-width: 100%" />
              <figcaption style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted)">{{ n }}</figcaption>
            </figure>
          }
        </div>
      }`,
  }),
};

/** Both themes side by side, independent of the toolbar. */
export const BothThemes: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { names: ILLUSTRATION_NAMES },
    template: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem">
        @for (theme of ['light', 'dark']; track theme) {
          <div [attr.data-theme]="theme" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); gap: 1rem; padding: 1rem; background: var(--bg); color: var(--text); border-radius: var(--radius-lg)">
            @for (n of names; track n) {
              <ui-illustration [name]="n" motion="none" [label]="n" style="--ui-illustration-width: 100%" />
            }
          </div>
        }
      </div>`,
  }),
};
