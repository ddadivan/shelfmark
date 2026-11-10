import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { ICON_NAMES } from '../icon/models/icon-names.const';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { FolderIconComponent } from './folder-icon.component';
import { FOLDER_COLOUR } from './models/folder-colour.const';
import { FOLDER_ICON_SIZE } from './models/folder-icon-size.const';

const meta: Meta<FolderIconComponent> = {
  title: 'Components/Folder icon',
  component: FolderIconComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [FolderIconComponent] })],
  args: { icon: 'folder', colour: FOLDER_COLOUR.Graphite, size: FOLDER_ICON_SIZE.Md },
  argTypes: {
    icon: { control: 'select', options: ICON_NAMES },
    colour: { control: 'select', options: Object.values(FOLDER_COLOUR) },
    size: { control: 'inline-radio', options: Object.values(FOLDER_ICON_SIZE) },
  },
  parameters: {
    docs: {
      description: {
        component:
          'The coloured tile that stands for a folder. Tile `folder-<colour>-bg`, glyph `folder-<colour>`. ' +
          'Decorative unless `label` is set. Glyph sizes: sm and md 16, lg 20, xl 24 (the design draws 14 / 16 / 20 / 26).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<FolderIconComponent>;

export const Default: Story = {};

export const Labelled: Story = { args: { label: 'Recipes', colour: FOLDER_COLOUR.Clay } };

/** Every colour at every size, in light and dark. */
export const AllVariants: Story = {
  render: () => ({
    props: {
      themes: Object.values(THEME),
      colours: Object.values(FOLDER_COLOUR),
      sizes: Object.values(FOLDER_ICON_SIZE),
    },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane" style="display: grid; gap: 1rem">
            @for (size of sizes; track size) {
              <div style="display: flex; gap: 0.75rem; align-items: center">
                @for (colour of colours; track colour) {
                  <ui-folder-icon [colour]="colour" [size]="size" icon="folder" />
                }
              </div>
            }
          </div>
        }
      </div>`,
  }),
};
