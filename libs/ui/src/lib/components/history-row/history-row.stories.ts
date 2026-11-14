import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { FolderIconComponent } from '../folder-icon/folder-icon.component';
import { HistoryGroupComponent } from './history-group/history-group.component';
import { HistoryRowComponent } from './history-row.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import type { Theme } from '../../models/theme';

const meta: Meta<HistoryGroupComponent> = {
  title: 'Components/History row',
  component: HistoryGroupComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [HistoryRowComponent, ButtonComponent, FolderIconComponent] }),
  ],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '`ui-history-group` is one day of "Recently opened" or Trash: a title above a card of `ui-history-row`s. ' +
          'A row has a 72 x 48 preview (48 x 48 below 40em), the title and folder (`meta`), a `time` and `actions`. ' +
          'Title and meta are one native link stretched over the row, so a row is one tab stop; `actions` sit above it and never open the link. ' +
          "Swipe actions on phones are the app's (issue #241).",
      },
    },
  },
  args: { title: 'Today' },
};

export default meta;
type Story = StoryObj<HistoryGroupComponent>;

const row = (title: string, folder: string, colour: string, time: string, actions = false) => `
  <ui-history-row href="https://example.com/" [newTab]="true" description="opens in a new tab">
    <span slot="title">${title}</span>
    <ng-container slot="meta"><ui-folder-icon size="sm" colour="${colour}" />${folder}</ng-container>
    <span slot="time">${time}</span>
    ${
      actions
        ? '<ui-button slot="actions" variant="ghost" size="sm" iconLeft="close" iconOnly ariaLabel="Remove from history" />'
        : ''
    }
  </ui-history-row>`;

const group = (title: string, actions = false) => `
  <ui-history-group title="${title}">
    ${row('Wool coat, straight cut, graphite', 'Shopping', 'amber', '10:42', actions)}
    ${row('Signal Forms in 20 minutes', 'Angular', 'sage', '9:15', actions)}
    ${row('A very long article title that goes on and on until it has to be cut with an ellipsis', 'Reading', 'graphite', '8:03', actions)}
  </ui-history-group>`;

/** Time text and a remove button per row; hover, focus and press act on the whole row. */
export const Default: Story = {
  render: () => ({ template: `<div class="hst-pane">${group('Today', true)}</div>` }),
};

/** Several days, no actions (the phone sheet swipes instead). */
export const Days: Story = {
  render: () => ({
    template: `<div class="hst-pane">${group('Today')}${group('Yesterday')}${group('Earlier this week')}</div>`,
  }),
};

/** Phone width: the preview is 48 x 48. Set the viewport to a phone to see the breakpoint. */
export const Phone: Story = {
  parameters: {
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => ({
    template: `<div class="hst-pane">${group('Today')}${group('Yesterday')}</div>`,
  }),
};

/** The time slot also takes a badge (Trash: days left). */
export const BadgeInTimeSlot: Story = {
  render: () => ({
    template: `<div class="hst-pane"><ui-history-group title="Trash">
      <ui-history-row>
        <span slot="title">Old recipe</span>
        <ng-container slot="meta"><ui-folder-icon size="sm" colour="amber" />Food</ng-container>
        <span slot="time" class="hst-time-badge">6 days left</span>
        <ui-button slot="actions" size="sm">Restore</ui-button>
      </ui-history-row>
    </ui-history-group></div>`,
  }),
};

/** Trash: a checkbox before the preview (`select` slot) and a folder tile as the preview fallback (`preview` slot). */
export const SelectAndPreviewSlots: Story = {
  render: () => ({
    template: `<div class="hst-pane"><ui-history-group title="Recently deleted">
      <ui-history-row previewSlot>
        <input slot="select" type="checkbox" aria-label="Select Old courses" />
        <ui-folder-icon slot="preview" size="md" colour="plum" />
        <span slot="title">Old courses</span>
        <ng-container slot="meta">From Work</ng-container>
        <span slot="time">27 days left</span>
        <ui-button slot="actions" size="sm">Restore</ui-button>
      </ui-history-row>
    </ui-history-group></div>`,
  }),
};

const frame = (theme: Theme) => `
  <div ${THEME_ATTRIBUTE}="${theme}" class="hst-pane">
    <p class="hst-hint">${theme} theme: desktop width, then a phone-width column</p>
    ${group('Today', true)}
    <div class="hst-phone">${group('Yesterday')}</div>
  </div>`;

/** Both themes, desktop and a narrow column (the 48 px preview needs a phone viewport, see Phone). */
export const AllVariants: Story = {
  render: () => ({
    template: `<div class="hst-themes">${Object.values(THEME).map(frame).join('')}</div>`,
  }),
};
