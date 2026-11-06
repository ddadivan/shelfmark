import type { Meta, StoryObj } from '@storybook/angular-vite';
import { IllustrationComponent } from './illustration.component';
import { ILLUSTRATION_DEFAULT_MOTION } from './models/illustration-default-motion.const';
import type { IllustrationName } from './models/illustration-name.type';
import { ILLUSTRATION_NAMES } from './models/illustration-names.const';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { ILLUSTRATION_MOTION } from './models/illustration-motion.const';

const MOTIONS = Object.values(ILLUSTRATION_MOTION);

const meta: Meta<IllustrationComponent> = {
  title: 'Components/Illustration',
  component: IllustrationComponent,
  tags: ['autodocs'],
  args: { name: 'empty-feed', motion: ILLUSTRATION_MOTION.Once },
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
export const Loop: Story = { args: { name: 'welcome-collect', motion: ILLUSTRATION_MOTION.Loop } };
export const Once: Story = { args: { name: 'empty-feed', motion: ILLUSTRATION_MOTION.Once } };
export const Static: Story = { args: { name: 'empty-feed', motion: ILLUSTRATION_MOTION.None } };

/** Every scene in every mode. Switch the theme in the toolbar for light and dark. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { names: ILLUSTRATION_NAMES, motions: MOTIONS },
    template: `
      @for (m of motions; track m) {
        <h3 class="story-heading">motion="{{ m }}"</h3>
        <div class="story-grid">
          @for (n of names; track n) {
            <figure class="story-figure">
              <ui-illustration [name]="n" [motion]="m" [label]="n" class="story-fill" />
              <figcaption class="story-caption">{{ n }}</figcaption>
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
    props: { names: ILLUSTRATION_NAMES, themes: Object.values(THEME) },
    template: `
      <div class="story-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="story-theme-pane story-theme-pane--scenes">
            @for (n of names; track n) {
              <ui-illustration [name]="n" motion="none" [label]="n" class="story-fill" />
            }
          </div>
        }
      </div>`,
  }),
};
