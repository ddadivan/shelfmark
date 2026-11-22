import type { Meta, StoryObj } from '@storybook/angular-vite';
import { MenuComponent } from '../../components/menu/menu.component';
import { MenuItemComponent } from '../../components/menu/menu-item/menu-item.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { FluidHoverDirective } from './fluid-hover.directive';

const meta: Meta<FluidHoverDirective> = {
  title: 'Directives/FluidHover',
  component: FluidHoverDirective,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'One highlight glides between the rows under the mouse (200 ms `ease-out`, 120 ms fade ' +
          'out) instead of each row blinking. Mouse only; the first entry fades in place; reduced ' +
          'motion fades without travelling. Used by the tree, menus and the picker list. Move the ' +
          'mouse over the rows.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<FluidHoverDirective>;

/** A plain list container: any element and a row selector. */
export const Default: Story = {
  render: () => ({
    moduleMetadata: { imports: [FluidHoverDirective] },
    template: `
      <ul style="list-style: none; padding: 8px; width: 240px; margin: 0" [uiFluidHover]="'li'">
        <li style="padding: 10px 12px; border-radius: 12px">Inbox</li>
        <li style="padding: 10px 12px; border-radius: 12px">Reading list</li>
        <li style="padding: 10px 12px; border-radius: 12px">Recipes</li>
      </ul>`,
  }),
};

/** The menu in both themes (the highlight travels between items). */
export const AllVariants: Story = {
  render: () => ({
    moduleMetadata: { imports: [FluidHoverDirective, MenuComponent, MenuItemComponent] },
    props: { themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <ui-menu inline ariaLabel="Actions">
              <ui-menu-item icon="edit">Rename</ui-menu-item>
              <ui-menu-item icon="folder">Move</ui-menu-item>
              <ui-menu-item icon="trash" danger>Delete</ui-menu-item>
            </ui-menu>
          </div>
        }
      </div>`,
  }),
};
