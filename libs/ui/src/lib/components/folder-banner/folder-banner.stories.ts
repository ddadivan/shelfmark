import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { CARD_STORY_IMAGE } from '../card/stories/card-story-image.const';
import { FolderIconComponent } from '../folder-icon/folder-icon.component';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import { FolderBannerComponent } from './folder-banner.component';

const CONTENT = `
  <div style="display: flex; gap: 1rem; align-items: center">
    <ui-folder-icon size="xl" icon="utensils" [colour]="colour" />
    <div>
      <h2 style="margin: 0">Recipes</h2>
      <p style="margin: 0.25rem 0 0; color: var(--text-muted)">Dishes worth cooking twice</p>
    </div>
  </div>`;

const meta: Meta<FolderBannerComponent & { colour: string }> = {
  title: 'Components/Folder banner',
  component: FolderBannerComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [FolderBannerComponent, FolderIconComponent] })],
  args: { colour: FOLDER_COLOUR.Clay, image: null },
  argTypes: {
    colour: { control: 'select', options: [...Object.values(FOLDER_COLOUR), '#3a7bd5'] },
    image: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'The header surface of a folder page: a soft band of the folder colour (nothing for graphite, ' +
          'quieter on dark), or a cover picture with a scrim from the page background behind the content. ' +
          'A picture that fails falls back to the band. Content is projected.',
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<ui-folder-banner [colour]="colour" [image]="image">${CONTENT}</ui-folder-banner>`,
  }),
};

export default meta;
type Story = StoryObj<FolderBannerComponent & { colour: string }>;

export const Band: Story = {};

export const OwnColour: Story = { args: { colour: '#3a7bd5' } };

export const Graphite: Story = { args: { colour: FOLDER_COLOUR.Graphite } };

export const Cover: Story = { args: { image: CARD_STORY_IMAGE.Preview } };

/** A cover that fails to load shows the band instead. */
export const BrokenCover: Story = { args: { image: CARD_STORY_IMAGE.Broken } };

/** Band and cover in light and dark. */
export const AllVariants: Story = {
  render: () => ({
    props: {
      themes: Object.values(THEME),
      colours: [FOLDER_COLOUR.Sage, FOLDER_COLOUR.Rose, '#3a7bd5'],
      cover: CARD_STORY_IMAGE.Preview,
    },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane" style="display: grid; gap: 1rem">
            @for (colour of colours; track colour) {
              <ui-folder-banner [colour]="colour">${CONTENT}</ui-folder-banner>
            }
            <ui-folder-banner colour="teal" [image]="cover">
              ${CONTENT.replace('[colour]="colour"', 'colour="teal"')}
            </ui-folder-banner>
          </div>
        }
      </div>`,
  }),
};
