import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import type { TabBarItem } from './models/tab-bar-item.interface';
import { TabBarComponent } from './tab-bar.component';

const ITEMS: readonly TabBarItem[] = [
  { id: 'library', label: 'Library', icon: 'saved-link', href: '#library' },
  { id: 'search', label: 'Search', icon: 'search', href: '#search' },
  { id: 'tags', label: 'Tags', icon: 'tag', href: '#tags' },
  { id: 'you', label: 'You', icon: 'user', href: '#you' },
];

const meta: Meta<TabBarComponent> = {
  title: 'Components/Tab bar',
  component: TabBarComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [TabBarComponent] })],
  args: {
    items: ITEMS,
    active: 'library',
    ariaLabel: 'Main',
    addLabel: 'Add link',
    fixed: false,
  },
  argTypes: { active: { control: 'select', options: ITEMS.map((item) => item.id) } },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The phone navigation: a floating glass bar, 68px tall, with up to four destinations and the primary Add button in the middle (five slots, never more). ' +
          'Labels are always visible. `fixed` (default on) pins it 16px from the sides and 20px plus the safe area from the bottom; the stories render it inline. ' +
          'A plain click emits `selected` with the event so the app can `preventDefault()` and route.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<TabBarComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="max-width: 24rem"><ui-tab-bar [items]="items" [active]="active" [ariaLabel]="ariaLabel" [addLabel]="addLabel" [fixed]="fixed" /></div>`,
  }),
};

/** Each tab active in turn, in light and dark. */
export const AllVariants: Story = {
  render: () => ({
    props: { themes: Object.values(THEME), items: ITEMS },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane" style="display: grid; gap: 1rem; max-width: 24rem">
            @for (item of items; track item.id) {
              <ui-tab-bar [items]="items" [active]="item.id" ariaLabel="Main" addLabel="Add link" [fixed]="false" />
            }
          </div>
        }
      </div>`,
  }),
};
