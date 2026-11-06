import type { Meta, StoryObj } from '@storybook/angular-vite';
import { AvatarComponent } from './avatar.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';

// A data URI: the production CSP (`img-src 'self' data:`) allows it, external hosts are blocked.
const PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23556b5a'/%3E%3Ccircle cx='24' cy='19' r='8' fill='%23e8efe9'/%3E%3Cpath d='M8 44c2-10 9-14 16-14s14 4 16 14z' fill='%23e8efe9'/%3E%3C/svg%3E";
// An undecodable data URI fails like a blocked host but raises no CSP violation in the test run.
const BROKEN = 'data:image/png;base64,AAAA';

const meta: Meta<AvatarComponent> = {
  title: 'Components/Avatar',
  component: AvatarComponent,
  tags: ['autodocs'],
  args: { name: 'Dmytro Dadivan', size: 'md' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  render: (args) => ({
    props: args,
    template: `<ui-avatar [src]="src" [name]="name" [size]="size" [label]="label" />`,
  }),
};

export default meta;
type Story = StoryObj<AvatarComponent>;

export const Initials: Story = {};

export const Photo: Story = { args: { src: PHOTO, label: 'Dmytro Dadivan' } };

/** The image cannot load (in the app the CSP blocks external hosts), so the initials stay. */
export const ImageFailed: Story = { args: { src: BROKEN } };

/** Neither image nor name: a user icon. */
export const NoName: Story = { args: { name: undefined } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

/** `role="img"` with an accessible name; without `label` the avatar is decorative. */
export const Labelled: Story = { args: { label: 'Dmytro Dadivan' } };

/** Every size and source in both themes. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: {
      sizes: ['sm', 'md', 'lg'],
      sources: [
        { name: 'Dmytro Dadivan', src: undefined },
        { name: 'Ada', src: undefined },
        { name: undefined, src: undefined },
        { name: 'Dmytro Dadivan', src: BROKEN },
        { name: 'Dmytro Dadivan', src: PHOTO },
      ],
      themes: Object.values(THEME),
    },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            @for (size of sizes; track size) {
              <div class="ds-row">
                @for (s of sources; track $index) {
                  <ui-avatar [name]="s.name" [src]="s.src" [size]="size" />
                }
              </div>
            }
          </div>
        }
      </div>`,
  }),
};
