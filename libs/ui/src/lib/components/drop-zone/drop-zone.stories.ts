import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { DropZoneComponent } from './drop-zone.component';

const meta: Meta<DropZoneComponent> = {
  title: 'Components/Drop zone',
  component: DropZoneComponent,
  tags: ['autodocs'],
  args: {
    label: 'Drop the file here or',
    actionLabel: 'Choose file',
    accept: '.html,text/html',
    disabled: false,
    invalid: false,
  },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<DropZoneComponent>;

/** Drop a file on it or press the button. */
export const Default: Story = {};

export const WithHint: Story = {
  args: { hint: 'Chrome, Edge, Firefox and Safari export an HTML file.' },
};

export const Disabled: Story = { args: { disabled: true } };

export const Invalid: Story = { args: { invalid: true, hint: 'Choose an HTML file.' } };

/** The dragged-over look: drag a file from the desktop over the zone to see it live. */
export const DragOver: Story = {
  render: (args) => ({
    props: args,
    template: `<ui-drop-zone over [label]="label" [actionLabel]="actionLabel" />`,
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Border `accent`, fill `accent-bg` (shown here with `over`, which a feature sets while a file is over a larger area such as a dialog).',
      },
    },
  },
};

/** Narrow (360px) layout. */
export const Phone: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="width: 22.5rem"><ui-drop-zone [label]="label" [actionLabel]="actionLabel" hint="Chrome, Edge, Firefox and Safari export an HTML file." /></div>`,
  }),
};

/** Every state in both themes. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <div class="ds-stack">
              <ui-drop-zone label="Drop the file here or" actionLabel="Choose file" />
              <ui-drop-zone label="Drop the file here or" actionLabel="Choose file" hint="HTML export" />
              <ui-drop-zone class="ui-drop-zone--over" label="Drop the file here or" actionLabel="Choose file" />
              <ui-drop-zone label="Drop the file here or" actionLabel="Choose file" [invalid]="true" />
              <ui-drop-zone label="Drop the file here or" actionLabel="Choose file" [disabled]="true" />
            </div>
          </div>
        }
      </div>`,
  }),
};

const STACKED = `illustration="welcome-save" heading="Browser bookmarks" text="HTML file from Chrome, Safari, Firefox or Edge. Folders become folders." hint=".html, up to 10 MB and 5,000 links" label="or drag the file here" actionLabel="Choose file"`;

/**
 * With an `illustration` the zone stacks like an empty state (import step 1): the scene on the
 * soft disc (160px, plays once), heading, text, hint, a `md` button and the label under it.
 */
export const Stacked: Story = {
  render: () => ({
    template: `<div style="max-width: 32rem"><ui-drop-zone ${STACKED} /></div>`,
  }),
};

/** Stacked at 360px. */
export const StackedPhone: Story = {
  render: () => ({
    template: `<div style="width: 22.5rem"><ui-drop-zone ${STACKED} /></div>`,
  }),
};

/** Stacked at rest, dragged over, invalid and disabled in both themes. */
export const StackedAllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <div class="ds-stack">
              <ui-drop-zone ${STACKED} />
              <ui-drop-zone ${STACKED.replace('or drag the file here', 'Release to import')} over />
              <ui-drop-zone ${STACKED} [invalid]="true" />
              <ui-drop-zone ${STACKED} [disabled]="true" />
            </div>
          </div>
        }
      </div>`,
  }),
};
