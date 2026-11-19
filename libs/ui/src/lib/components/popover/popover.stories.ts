import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ChipComponent } from '../chip/chip.component';
import { PopoverTriggerDirective } from '../../directives/popover-trigger/popover-trigger.directive';
import { PopoverComponent } from './popover.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import type { Theme } from '../../models/theme';

interface PopoverArgs {
  heading: string;
  hover: boolean;
}

const meta: Meta<PopoverArgs> = {
  title: 'Components/Popover',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A small glass panel above its trigger with a heading and content, such as all the tags ' +
          'of a card behind its "+N" chip. Hover or keyboard focus opens it after a short delay ' +
          '(the pointer can move into it), a click or tap pins it open, Enter moves focus into it. ' +
          'Esc closes it and gives focus back to the trigger; a press outside closes it. ' +
          'It is a non-modal dialog named by its heading; the popup lives in the page body and ' +
          'follows the theme of the page.',
      },
    },
  },
  args: { heading: 'All tags', hover: true },
};

export default meta;
type Story = StoryObj<PopoverArgs>;

const imports = [ChipComponent, PopoverComponent, PopoverTriggerDirective];

const tags = ['angular', 'javascript', 'reading', 'a-very-long-tag-name-for-the-ellipsis'];
const chips = tags.map((tag) => `<li><ui-chip clickable truncate>${tag}</ui-chip></li>`).join('');
const list = `<ul class="ps-chips">${chips}</ul>`;

/** "+3" on a card footer: hover, focus, click or tap it. */
export const FromChip: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `
      <div class="ms-panel">
        <div class="ms-row ps-foot">
          <ui-chip truncate>angular</ui-chip>
          <ui-chip variant="neutral" clickable ariaLabel="3 more tags: javascript, reading, a-very-long-tag-name-for-the-ellipsis"
            [uiPopoverTrigger]="pop" [uiPopoverTriggerHover]="hover">+3</ui-chip>
        </div>
        <ui-popover #pop [heading]="heading">${list}</ui-popover>
      </div>`,
  }),
};

/** Opened by a click: it stays open until Esc, a press outside or another click. */
export const Open: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `
      <div class="ms-panel">
        <div class="ms-row ps-foot">
          <ui-chip variant="neutral" clickable ariaLabel="4 tags" [uiPopoverTrigger]="pop">+4</ui-chip>
        </div>
        <ui-popover #pop [heading]="heading">${list}</ui-popover>
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('.ps-foot button')?.click();
  },
};

const variants = (theme: Theme) => `
  <div ${THEME_ATTRIBUTE}="${theme}" class="ms-panel">
    <p class="ms-hint">${theme} theme: a static panel (open the stories above for the live popup)</p>
    <div class="ms-row">
      <ui-popover inline heading="All tags">${list}</ui-popover>
      <ui-popover inline heading="Folders"><p class="ms-hint">Nothing else here.</p></ui-popover>
    </div>
  </div>`;

/** Both themes: the glass panel with tag chips (a long one ends in an ellipsis) and with text. */
export const AllVariants: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `${Object.values(THEME).map(variants).join('')}`,
  }),
};
