import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { HighlightComponent } from './highlight.component';

const meta: Meta<HighlightComponent> = {
  title: 'Components/Highlight',
  component: HighlightComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Marks the parts of a text that match a search query. Case-insensitive and literal ' +
          '(`.` or `(` are not patterns); a string query is split on whitespace, an array is a ' +
          'list of terms; overlapping and touching matches become one mark. Rendered as text ' +
          'nodes and `<mark>` elements, never as HTML. Colours are the `highlight-bg` and ' +
          '`highlight-text` tokens.',
      },
    },
  },
  args: { text: 'Angular 22: everything about Signal Forms in 20 minutes', query: 'signal' },
};

export default meta;
type Story = StoryObj<HighlightComponent>;

export const Default: Story = {};

export const SeveralTerms: Story = { args: { query: 'forms minutes' } };

export const TermList: Story = { args: { query: ['Signal Forms', '22'] } };

export const OverlappingTerms: Story = { args: { query: ['signal f', 'al form'] } };

export const LiteralCharacters: Story = {
  args: { text: 'C++ (and C#) notes: a.b*c', query: ['c++', '(and', 'a.b*c'] },
};

export const NoMatch: Story = { args: { query: 'rxjs' } };

/** Every case in both themes, plain and on hover and selected row backgrounds. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    moduleMetadata: { imports: [HighlightComponent] },
    props: {
      themes: Object.values(THEME),
      title: 'Angular 22: everything about Signal Forms in 20 minutes',
    },
    template: `
      <div class="cls-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="cls-hl">
            <ui-highlight [text]="title" query="signal" />
            <ui-highlight [text]="title" query="forms minutes" />
            <ui-highlight [text]="title" [query]="['signal f', 'al form']" />
            <ui-highlight [text]="title" query="rxjs" />
            <div class="cls-hl__row cls-hl__row--hover">
              <ui-highlight [text]="title" query="signal" />
            </div>
            <div class="cls-hl__row cls-hl__row--active">
              <ui-highlight [text]="title" query="signal" />
            </div>
          </div>
        }
      </div>`,
  }),
};
