import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { TooltipPanelComponent } from './tooltip-panel.component';
import { TooltipDirective } from './tooltip.directive';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import type { Theme } from '../theme';

interface TooltipArgs {
  uiTooltip: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  delay: number;
  uiTooltipShortcut: string;
}

const meta: Meta<TooltipArgs> = {
  title: 'Components/Tooltip',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Hover or focus a trigger and wait 400 ms. Esc closes it, the pointer may move onto it. ' +
          'Nothing shows on touch-only devices. Never the only place for essential information.',
      },
    },
  },
  args: { uiTooltip: 'Switch theme', position: 'top', delay: 400, uiTooltipShortcut: '' },
  argTypes: {
    position: { control: 'inline-radio', options: ['top', 'bottom', 'left', 'right'] },
    delay: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<TooltipArgs>;

const imports = [TooltipDirective, TooltipPanelComponent, ButtonComponent];

/** On a `ui-button`: the description is wired to the inner native button. */
export const OnButton: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `
      <div class="ts-panel">
        <ui-button
          [uiTooltip]="uiTooltip"
          [position]="position"
          [delay]="delay"
          [uiTooltipShortcut]="uiTooltipShortcut"
        >Save link</ui-button>
      </div>`,
  }),
};

/** An icon-only button: the tooltip repeats its accessible name and shows the shortcut. */
export const IconOnlyButton: Story = {
  args: { uiTooltip: 'Search', uiTooltipShortcut: '⌘K' },
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `
      <div class="ts-panel">
        <ui-button
          variant="ghost"
          iconOnly
          iconLeft="search"
          ariaLabel="Search"
          [uiTooltip]="uiTooltip"
          [position]="position"
          [delay]="delay"
          [uiTooltipShortcut]="uiTooltipShortcut"
        />
      </div>`,
  }),
};

/** Any element works; a focusable one also shows it on keyboard focus. */
export const OnPlainElements: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div class="ts-panel">
        <div class="ts-row">
          <span class="ts-plain" tabindex="0" uiTooltip="Saved 2 days ago, Nov 3, 2026">2 days ago</span>
          <span class="ts-plain" tabindex="0" uiTooltip="A very long title that was cut off with an ellipsis">A very long title that…</span>
        </div>
      </div>`,
  }),
};

/** All four positions; near a viewport edge a tooltip flips to the opposite side. */
export const Positions: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div class="ts-panel">
        <div class="ts-row">
          <ui-button uiTooltip="Top" position="top">Top</ui-button>
          <ui-button uiTooltip="Bottom" position="bottom">Bottom</ui-button>
          <ui-button uiTooltip="Left" position="left">Left</ui-button>
          <ui-button uiTooltip="Right" position="right">Right</ui-button>
        </div>
      </div>`,
  }),
};

const variants = (theme: Theme) => `
  <div ${THEME_ATTRIBUTE}="${theme}" class="ts-panel">
    <p class="ts-hint">${theme} theme: hover or focus the buttons</p>
    <div class="ts-row">
      <ui-button uiTooltip="Top" position="top">Top</ui-button>
      <ui-button uiTooltip="Bottom" position="bottom">Bottom</ui-button>
      <ui-button uiTooltip="Left" position="left">Left</ui-button>
      <ui-button uiTooltip="Right" position="right">Right</ui-button>
      <ui-button variant="ghost" iconOnly iconLeft="moon" ariaLabel="Switch theme"
        uiTooltip="Dark theme" />
      <ui-button variant="ghost" iconOnly iconLeft="search" ariaLabel="Search"
        uiTooltip="Search" uiTooltipShortcut="⌘K" />
    </div>
    <div class="ts-static">
      <ui-tooltip-panel text="Dark theme" side="top" />
      <ui-tooltip-panel text="Search" shortcut="⌘K" side="top" />
    </div>
  </div>`;

/** Both themes: live triggers and the static tooltip surface (text, text with shortcut). */
export const AllVariants: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    moduleMetadata: { imports },
    template: `${Object.values(THEME).map(variants).join('')}`,
  }),
};
