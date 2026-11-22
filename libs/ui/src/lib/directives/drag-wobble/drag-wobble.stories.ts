import type { Meta, StoryObj } from '@storybook/angular-vite';
import { CardComponent } from '../../components/card/card.component';
import { CARD_STORY_IMAGE } from '../../components/card/stories/card-story-image.const';
import { DragWobbleDirective } from './drag-wobble.directive';

const meta: Meta<DragWobbleDirective> = {
  title: 'Directives/DragWobble',
  component: DragWobbleDirective,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Physics for a drag preview (Motion «Drag a link», #562). While the directive exists, ' +
          'pointer and touch moves of the document feed a smoothed velocity; a damped spring tilts ' +
          'the host by `clamp(vx · 6°/(px/ms), ±10°)` and a fast vertical move squashes it by at ' +
          'most 4%. It writes only `transform` and stops at rest. The owner calls `settle()` or ' +
          '`flyTo(target, slot)` on release. Nothing moves under reduced motion. Move the mouse ' +
          'quickly left and right anywhere on the page.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<DragWobbleDirective>;

/** Move the pointer quickly sideways: the card leans into the move and sways back when you stop. */
export const Default: Story = {
  render: () => ({
    moduleMetadata: { imports: [DragWobbleDirective, CardComponent] },
    props: { image: CARD_STORY_IMAGE.Preview },
    template: `
      <ui-card uiDragWobble [image]="image" href="https://example.com/">
        <span slot="title">Move the mouse quickly</span>
        <span slot="meta">example.com</span>
      </ui-card>`,
  }),
};
