import type { Meta, StoryObj } from '@storybook/angular-vite';
import { IllustrationComponent } from './illustration.component';
import type { IllustrationName } from './models/illustration-name.type';
import { ILLUSTRATION_NAMES } from './models/illustration-names.const';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { MOTION_ATTRIBUTE, MOTION_REDUCED } from '../../services/motion';
import { ILLUSTRATION_MOTION } from './models/illustration-motion.const';

const MOTIONS = Object.values(ILLUSTRATION_MOTION);

const meta: Meta<IllustrationComponent> = {
  title: 'Components/Illustration',
  component: IllustrationComponent,
  tags: ['autodocs'],
  args: { name: 'empty-feed' },
  argTypes: {
    name: { control: 'select', options: ILLUSTRATION_NAMES },
    motion: {
      control: 'inline-radio',
      options: MOTIONS,
      description:
        'Every scene loops by default: one slow movement on the sage detail and the sparks twinkle. Reduced motion shows the still drawing; the loop pauses off screen and in a hidden tab.',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Square 120 x 120 scenes (240px on desktop, 160px on a phone, `--ui-illustration-size`). Spec: `docs/design-next/shelf/design-system/components/Illustration/README.md`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<IllustrationComponent>;

function scene(name: IllustrationName): Story {
  return { args: { name, label: name } };
}

export const NotFound: Story = scene('not-found');
export const EmptyFeed: Story = scene('empty-feed');
export const Failed: Story = scene('error');
export const WelcomeFind: Story = scene('welcome-find');

/** Loop is the default; `once` plays one move and holds it (reload to replay); `none` is still. */
export const Loop: Story = { args: { name: 'welcome-collect', motion: ILLUSTRATION_MOTION.Loop } };
export const Once: Story = { args: { name: 'empty-feed', motion: ILLUSTRATION_MOTION.Once } };
export const Static: Story = { args: { name: 'empty-feed', motion: ILLUSTRATION_MOTION.None } };

/** Every scene in both themes at the desktop size (240px) and the phone size (160px). */
export const Gallery: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { names: ILLUSTRATION_NAMES, themes: Object.values(THEME) },
    template: `
      <div class="story-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="story-theme-pane">
            <h3 class="story-heading">{{ theme }} · 240</h3>
            <div class="story-ill-size story-ill-size--lg">
              @for (n of names; track n) {
                <figure class="story-ill-figure">
                  <ui-illustration [name]="n" />
                  <figcaption class="story-caption">{{ n }}</figcaption>
                </figure>
              }
            </div>
            <h3 class="story-heading">{{ theme }} · 160</h3>
            <div class="story-ill-size story-ill-size--sm">
              @for (n of names; track n) {
                <figure class="story-ill-figure">
                  <ui-illustration [name]="n" />
                  <figcaption class="story-caption">{{ n }}</figcaption>
                </figure>
              }
            </div>
          </div>
        }
      </div>`,
  }),
};

/** The still drawing every scene shows under reduced motion (the app's Animations setting here; the OS setting does the same). */
export const ReducedMotion: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { names: ILLUSTRATION_NAMES, themes: Object.values(THEME) },
    template: `
      <div class="story-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" [attr.${MOTION_ATTRIBUTE}]="'${MOTION_REDUCED}'" class="story-theme-pane">
            <div class="story-ill-size story-ill-size--sm">
              @for (n of names; track n) {
                <ui-illustration [name]="n" />
              }
            </div>
          </div>
        }
      </div>`,
  }),
};
