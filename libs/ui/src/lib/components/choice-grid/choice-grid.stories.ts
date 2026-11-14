import type { Meta, StoryObj } from '@storybook/angular-vite';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { CARD_STORY_IMAGE } from '../card/stories/card-story-image.const';
import { ChoiceGridComponent } from './choice-grid.component';
import { CHOICE_GRID_KIND } from './models/choice-grid-kind.const';
import type { ChoiceOption } from './models/choice-option.interface';

const SWATCHES: ChoiceOption[] = Object.values(FOLDER_COLOUR).map((colour) => ({
  value: colour,
  label: colour.charAt(0).toUpperCase() + colour.slice(1),
  colour,
}));

const ICONS: ChoiceOption[] = [
  { value: 'folder', label: 'Folder', icon: 'folder' },
  { value: 'bookmark', label: 'Bookmark', icon: 'bookmark' },
  { value: 'star', label: 'Star', icon: 'star' },
  { value: 'clock', label: 'Clock', icon: 'clock' },
  { value: 'link', label: 'Link', icon: 'link' },
  { value: 'tag', label: 'Tag', icon: 'tag' },
  { value: 'inbox', label: 'Inbox', icon: 'inbox' },
  { value: 'image', label: 'Image', icon: 'image' },
];

/** Pictures (#418, the folder cover): "None" with a glyph, two previews, one that fails to load. */
const IMAGES: ChoiceOption[] = [
  { value: '', label: 'No cover', icon: 'close' },
  { value: 'a', label: 'Cover from “Roast chicken”', image: CARD_STORY_IMAGE.Preview },
  { value: 'b', label: 'Cover from “Lemon tart”', image: CARD_STORY_IMAGE.Preview },
  { value: 'c', label: 'Cover from “Broken page”', image: CARD_STORY_IMAGE.Broken },
];

const meta: Meta<ChoiceGridComponent> = {
  title: 'Components/ChoiceGrid',
  component: ChoiceGridComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Choose one of many small visual options: colour swatches or icon tiles. Native radios: ' +
          'the arrow keys move and select, Tab enters the checked option, each option is named by its label.',
      },
    },
  },
  args: {
    options: SWATCHES,
    kind: CHOICE_GRID_KIND.Swatch,
    colour: FOLDER_COLOUR.Clay,
    ariaLabel: 'Color',
    value: 'clay',
  },
  argTypes: {
    kind: { control: 'inline-radio', options: Object.values(CHOICE_GRID_KIND) },
    colour: { control: 'select', options: Object.values(FOLDER_COLOUR) },
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="fs-wide">
        <ui-choice-grid
          [options]="options"
          [kind]="kind"
          [colour]="colour"
          [ariaLabel]="ariaLabel"
          [disabled]="disabled"
          [(value)]="value"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<ChoiceGridComponent>;

export const Swatches: Story = {};

export const Icons: Story = {
  args: { options: ICONS, kind: CHOICE_GRID_KIND.Icon, ariaLabel: 'Icon', value: 'star' },
};

/** 16:9 picture thumbnails (#418): an option without a picture, or whose picture fails, shows its glyph. */
export const Images: Story = {
  args: { options: IMAGES, kind: CHOICE_GRID_KIND.Image, ariaLabel: 'Cover', value: 'a' },
};

/** Own colors can be removed: a "×" on hover and focus (always on touch), Delete or Backspace on the focused swatch. */
export const RemovableOwnColours: Story = {
  args: {
    options: [
      ...SWATCHES,
      {
        value: '#a33a5b',
        label: 'Own color #a33a5b',
        colour: '#a33a5b',
        removeLabel: 'Remove color #a33a5b',
      },
      {
        value: '#23716c',
        label: 'Own color #23716c',
        colour: '#23716c',
        removeLabel: 'Remove color #23716c',
      },
    ],
    ariaLabel: 'Color',
    value: '#a33a5b',
  },
};

/** Every kind in light and dark. */
export const AllVariants: Story = {
  render: () => ({
    props: { themes: Object.values(THEME), swatches: SWATCHES, icons: ICONS, images: IMAGES },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane" style="display: grid; gap: 1rem">
            <ui-choice-grid [options]="swatches" ariaLabel="Color" value="plum" />
            <ui-choice-grid [options]="icons" kind="icon" colour="teal" ariaLabel="Icon" value="tag" />
            <ui-choice-grid [options]="images" kind="image" ariaLabel="Cover" value="b" />
          </div>
        }
      </div>`,
  }),
};
