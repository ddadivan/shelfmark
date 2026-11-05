import type { Meta, StoryObj } from '@storybook/angular-vite';
import { IconComponent } from './icon.component';
import { ICON_NAMES } from './models/icon-names.const';

const meta: Meta<IconComponent> = {
  title: 'Components/Icon',
  component: IconComponent,
  tags: ['autodocs'],
  args: { name: 'search', size: 16 },
  argTypes: {
    name: { control: 'select', options: ICON_NAMES },
    size: { control: 'inline-radio', options: [16, 20, 24] },
  },
};

export default meta;
type Story = StoryObj<IconComponent>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 1.5rem">
        <ui-icon name="folder" [size]="16" />
        <ui-icon name="folder" [size]="20" />
        <ui-icon name="folder" [size]="24" />
      </div>`,
  }),
};

export const LabelledAndDecorative: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 1.5rem">
        <span style="display: inline-flex; align-items: center; gap: 0.5rem">
          <ui-icon name="add" /> Add link (decorative, label is the text)
        </span>
        <ui-icon name="settings" [size]="24" label="Settings" />
      </div>`,
  }),
};

export const Colours: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 1.5rem">
        <ui-icon name="star-filled" [size]="24" style="color: var(--text)" />
        <ui-icon name="star-filled" [size]="24" style="color: var(--text-muted)" />
        <ui-icon name="star-filled" [size]="24" style="color: var(--accent)" />
        <ui-icon name="warning" [size]="24" style="color: var(--danger)" />
      </div>`,
  }),
};

export const AllIcons: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { names: ICON_NAMES },
    template: `
      <ul style="display: grid; grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr)); gap: 1rem; list-style: none; margin: 0; padding: 0">
        @for (n of names; track n) {
          <li style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem">
            <ui-icon [name]="n" [size]="24" />
            <code style="font-size: 0.75rem">{{ n }}</code>
          </li>
        }
      </ul>`,
  }),
};
