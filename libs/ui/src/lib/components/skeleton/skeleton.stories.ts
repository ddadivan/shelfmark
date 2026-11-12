import type { Meta, StoryObj } from '@storybook/angular-vite';
import { SKELETON_SHAPE } from './models/skeleton-shape.const';
import { SkeletonComponent } from './skeleton.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';

const meta: Meta<SkeletonComponent> = {
  title: 'Components/Skeleton',
  component: SkeletonComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Placeholder for a first load, in the shape of the content (card, row, tree, preview, line). Widths vary 90 / 70 / 50% so it reads as text. The shimmer stops under reduced motion. It is `aria-hidden`: the consumer marks its container `aria-busy="true"` and announces the loading. Later refetches use the top bar, never skeletons again.',
      },
    },
  },
  args: { shape: SKELETON_SHAPE.Line, count: 3 },
  argTypes: {
    shape: { control: 'inline-radio', options: Object.values(SKELETON_SHAPE) },
    count: { control: { type: 'number', min: 0, max: 12 } },
  },
  render: (args) => ({
    props: { ...args, cardShape: SKELETON_SHAPE.Card },
    template: `
      <div class="cs-phone" aria-busy="true">
        <div [class]="shape === cardShape ? 'cs-grid cs-grid--single' : 'cs-list'">
          <ui-skeleton [shape]="shape" [count]="count" />
        </div>
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<SkeletonComponent>;

/** Three text lines: 90, 70 and 50% wide. */
export const Line: Story = {};

/** Mirrors `ui-card`: 16:9 media, meta line, two title lines, chips. */
export const Card: Story = { args: { shape: SKELETON_SHAPE.Card, count: 1 } };

/** Mirrors `ui-list-item`: icon, title and meta. */
export const Row: Story = { args: { shape: SKELETON_SHAPE.Row, count: 4 } };

/** Mirrors `ui-tree`: icon and name rows, one nested. */
export const Tree: Story = { args: { shape: SKELETON_SHAPE.Tree, count: 5 } };

/** The link preview box in the add-link dialog. */
export const Preview: Story = { args: { shape: SKELETON_SHAPE.Preview, count: 1 } };

/** Every shape in both themes. */
export const AllVariants: Story = {
  render: () => ({
    props: {
      themes: Object.values(THEME),
      shapes: Object.values(SKELETON_SHAPE).filter((shape) => shape !== SKELETON_SHAPE.Card),
      card: SKELETON_SHAPE.Card,
    },
    template: `
      <div class="cs-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="cs-pane" aria-busy="true">
            <div class="cs-grid cs-grid--single">
              <ui-skeleton [shape]="card" [count]="1" />
            </div>
            @for (shape of shapes; track shape) {
              <div class="cs-list">
                <p class="cs-heading">{{ shape }}</p>
                <ui-skeleton [shape]="shape" [count]="3" />
              </div>
            }
          </div>
        }
      </div>`,
  }),
};
