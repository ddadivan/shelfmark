import type { Meta, StoryObj } from '@storybook/angular-vite';
import { TYPE_STYLES } from './models/type-styles.const';

const meta: Meta = {
  title: 'Foundations/Typography',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Type styles are applied with the `type($style)` Sass mixin (`@include type(body);`); there are no global type classes. Sizes are in rem. Font: Onest (variable, self-hosted); mono falls back to the system monospace.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const TypeStyles: Story = {
  render: () => ({
    props: { styles: TYPE_STYLES },
    template: `
      <div class="fd-page">
        <table class="fd-table">
          <caption class="fd-sr-note">Type styles: size / line height in px, weight, tracking</caption>
          <thead>
            <tr><th scope="col">Style</th><th scope="col">Sample</th><th scope="col">Spec</th><th scope="col">Use</th></tr>
          </thead>
          <tbody>
            @for (s of styles; track s.name) {
              <tr>
                <th scope="row"><code class="fd-code">{{ s.name }}</code></th>
                <td><p class="fd-type__sample" [class]="'fd-type__sample fd-type--' + s.name">Every link in one place</p></td>
                <td class="fd-code">{{ s.spec }}</td>
                <td>{{ s.usage }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>`,
  }),
};
