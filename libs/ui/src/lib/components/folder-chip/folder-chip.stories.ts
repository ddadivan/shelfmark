import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import { FolderChipComponent } from './folder-chip.component';

const meta: Meta<FolderChipComponent & { colour: string }> = {
  title: 'Components/Folder chip',
  component: FolderChipComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [FolderChipComponent] })],
  args: { label: 'Recipes', icon: 'utensils', colour: FOLDER_COLOUR.Clay, hint: 'In folder' },
  argTypes: {
    colour: { control: 'select', options: [...Object.values(FOLDER_COLOUR), '#3a7bd5'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'The folder of a link in mixed feeds: the folder glyph or emoji and its name in the folder colour on ' +
          'its tint (graphite when none is chosen). Static text; a long name ends with "…". `hint` is for screen readers.',
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<ui-folder-chip [label]="label" [icon]="icon" [colour]="colour" [hint]="hint" />`,
  }),
};

export default meta;
type Story = StoryObj<FolderChipComponent & { colour: string }>;

export const Default: Story = {};

export const Emoji: Story = { args: { label: 'Trips', icon: '✈️', colour: '#3a7bd5' } };

/** A long name ends with "…" in a narrow place. */
export const LongName: Story = {
  render: () => ({
    template: `<div style="inline-size: 10rem"><ui-folder-chip label="A very long folder name that keeps going" colour="teal" /></div>`,
  }),
};

/** Every colour, an own one and graphite, in light and dark. */
export const AllVariants: Story = {
  render: () => ({
    props: { themes: Object.values(THEME), colours: [...Object.values(FOLDER_COLOUR), '#3a7bd5'] },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane" style="display: flex; flex-wrap: wrap; gap: 0.5rem">
            @for (colour of colours; track colour) {
              <ui-folder-chip [label]="colour" icon="folder" [colour]="colour" />
            }
            <ui-folder-chip label="Trips" icon="✈️" colour="rose" />
          </div>
        }
      </div>`,
  }),
};
