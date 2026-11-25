import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LinkTileComponent } from './link-tile.component';

const meta: Meta<LinkTileComponent> = {
  title: 'Components/LinkTile',
  component: LinkTileComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A tile that is one link: a hairline card (or a flat result row) with an optional icon ' +
          'tile and the slots `eyebrow`, `heading` and `text`. One native anchor, one tab stop; ' +
          '`activated` lets the app route a plain click.',
      },
    },
  },
  args: { href: '#tags', flat: false, end: false, newTab: false },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 24rem">
        <ui-link-tile [href]="href" [icon]="icon" [flat]="flat" [end]="end" [newTab]="newTab">
          <span slot="eyebrow">Organise</span>
          <span slot="heading">Tags</span>
          <span slot="text">Short labels that cut across folders.</span>
        </ui-link-tile>
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<LinkTileComponent>;

export const Default: Story = {};

export const WithIcon: Story = { args: { icon: 'play' } };

export const Flat: Story = { args: { flat: true } };

export const Next: Story = { args: { end: true } };
