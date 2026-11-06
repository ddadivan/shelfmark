import type { Meta, StoryObj } from '@storybook/angular-vite';
import { CARD_STORY_IMAGE } from '../card/stories/card-story-image.const';
import { FaviconComponent } from './favicon.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';

const meta: Meta<FaviconComponent> = {
  title: 'Components/Favicon',
  component: FaviconComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The site icon, 16 px in a `radius-sm` square. Without an image, or when it fails (the CSP blocks external hosts), it shows the site letter, else the link icon. Decorative: the domain next to it is the text.',
      },
    },
  },
  args: { src: CARD_STORY_IMAGE.Favicon },
  render: (args) => ({
    props: args,
    template: `<ui-favicon [src]="src" [letter]="letter" />`,
  }),
};

export default meta;
type Story = StoryObj<FaviconComponent>;

export const Image: Story = {};

/** No image: the first letter of the site. */
export const Letter: Story = { args: { src: undefined, letter: 'y' } };

/** No image and no letter: the link icon in `text-muted`. */
export const Icon: Story = { args: { src: undefined } };

/** The image cannot load (the CSP blocks external hosts), so the letter stays. */
export const ImageFailed: Story = { args: { src: CARD_STORY_IMAGE.Broken, letter: 'y' } };

/** Every source in both themes. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: {
      themes: Object.values(THEME),
      sources: [
        { src: CARD_STORY_IMAGE.Favicon, letter: undefined },
        { src: undefined, letter: 'y' },
        { src: undefined, letter: undefined },
        { src: CARD_STORY_IMAGE.Broken, letter: 'y' },
        { src: CARD_STORY_IMAGE.Broken, letter: undefined },
      ],
    },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <div class="ds-row">
              @for (s of sources; track $index) {
                <ui-favicon [src]="s.src" [letter]="s.letter" />
              }
            </div>
          </div>
        }
      </div>`,
  }),
};
