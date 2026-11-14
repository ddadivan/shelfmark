import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { FlagComponent } from './flag.component';
import { FLAG_CODE } from './models/flag-code.const';

const meta: Meta<FlagComponent> = {
  title: 'Components/Flag',
  component: FlagComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A small country flag for the language list (#315): 20 x 14, soft corners, a hairline ' +
          'edge so white stripes keep their shape. Decorative: the language name carries the ' +
          'meaning. The flags are SVG files in `assets/flags`.',
      },
    },
  },
  args: { code: FLAG_CODE.Gb },
  argTypes: { code: { control: 'inline-radio', options: Object.values(FLAG_CODE) } },
};

export default meta;
type Story = StoryObj<FlagComponent>;

export const Default: Story = {};

/** Every flag in both themes. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { codes: Object.values(FLAG_CODE), themes: Object.values(THEME) },
    template: `
      <div class="fs-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="fs-panel">
            @for (code of codes; track code) {
              <ui-flag [code]="code" />
            }
          </div>
        }
      </div>`,
  }),
};
