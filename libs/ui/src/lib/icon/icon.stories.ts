import type { Meta, StoryObj } from '@storybook/angular-vite';
import { IconComponent } from './icon.component';
import { ICON_NAMES } from './models/icon-names.const';
import { THEME, THEME_ATTRIBUTE } from '../theme';

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

/** Provider marks: GitHub follows `currentColor`, Google keeps its brand colours in both themes. */
export const ProviderMarks: Story = {
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div style="display: flex; gap: 1.5rem; flex-wrap: wrap">
        @for (theme of themes; track theme) {
          <div
            [attr.${THEME_ATTRIBUTE}]="theme"
            style="display: flex; align-items: center; gap: 1rem; padding: 1.5rem; background: var(--bg); color: var(--text); border: 1px solid var(--border)"
          >
            <ui-icon name="google" [size]="24" label="Google" />
            <ui-icon name="github" [size]="24" label="GitHub" />
            <ui-icon name="google" [size]="20" />
            <ui-icon name="github" [size]="20" />
          </div>
        }
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
