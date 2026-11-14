import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { SegmentedControlComponent } from '../segmented-control/segmented-control.component';
import { SwitchComponent } from '../switch/switch.component';
import { ButtonComponent } from '../button/button.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { SETTINGS_ROW_ALIGN } from './models/settings-row-align.const';
import { SettingsRowComponent } from './settings-row.component';
import { SettingsSectionComponent } from './settings-section/settings-section.component';

const SECTION = `
  <ui-settings-section title="Saving" style="max-width: 40rem">
    <ui-settings-row #dup title="Warn about duplicates" description="Shows where you already saved the same link">
      <ui-switch label="Warn about duplicates" [checked]="true" />
    </ui-settings-row>
    <ui-settings-row #view title="Default view" description="How folders open the first time">
      <ui-segmented-control
        [ariaLabelledby]="view.titleId"
        [options]="options"
        value="cards"
      />
    </ui-settings-row>
    <ui-settings-row title="Safari on iPhone" description="Kyiv · 2 hours ago" icon="user">
      <ui-button variant="ghost" size="sm">Sign out</ui-button>
    </ui-settings-row>
    <ui-settings-row
      title="Long description keeps the control at the top"
      description="This setting needs a longer explanation, so the control stays level with the first line instead of floating in the middle of two or three lines of text."
      align="${SETTINGS_ROW_ALIGN.Top}"
    >
      <ui-switch label="Long description" />
    </ui-settings-row>
  </ui-settings-section>`;

const OPTIONS = [
  { value: 'cards', label: 'Cards' },
  { value: 'list', label: 'List' },
];

const meta: Meta<SettingsSectionComponent> = {
  title: 'Components/Settings row',
  component: SettingsSectionComponent,
  tags: ['autodocs'],
  subcomponents: { SettingsRowComponent },
  decorators: [
    moduleMetadata({
      imports: [
        SettingsSectionComponent,
        SettingsRowComponent,
        SwitchComponent,
        SegmentedControlComponent,
        ButtonComponent,
      ],
    }),
  ],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '`ui-settings-section` (`title`) groups `ui-settings-row`s (`title`, `description`, `icon`, `align`) on the panel surface. ' +
          'The control goes in the default slot: a switch for instant settings, a segmented control for 2 to 4 choices, a select for longer lists. ' +
          'Rows are separated by a border line; on narrow screens the control drops under the text.',
      },
    },
  },
  args: { title: 'Saving' },
  render: () => ({ props: { options: OPTIONS }, template: SECTION }),
};

export default meta;
type Story = StoryObj<SettingsSectionComponent>;

export const Default: Story = {};

/** The group in both themes side by side. */
export const AllVariants: Story = {
  render: () => ({
    props: { options: OPTIONS, themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">${SECTION}</div>
        }
      </div>`,
  }),
};
