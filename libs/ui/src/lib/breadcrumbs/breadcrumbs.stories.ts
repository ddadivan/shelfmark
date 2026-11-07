import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import type { Theme } from '../theme';
import { BreadcrumbsComponent } from './breadcrumbs.component';
import type { BreadcrumbItem } from './models/breadcrumb-item.interface';

const SHORT: BreadcrumbItem[] = [
  { label: 'All links', href: '#all' },
  { label: 'Work', href: '#work' },
  { label: 'Angular' },
];
const DEEP: BreadcrumbItem[] = [
  { label: 'All links', href: '#all' },
  { label: 'Work', href: '#work' },
  { label: 'Clients', href: '#clients' },
  { label: 'Acme Corporation', href: '#acme' },
  { label: 'Design', href: '#design' },
  { label: 'Angular' },
];
const LONG: BreadcrumbItem[] = [
  { label: 'All links', href: '#all' },
  { label: 'A very long folder name that does not fit in one line at all', href: '#long' },
  { label: 'An even longer current folder name that must be cut with an ellipsis too' },
];

const meta: Meta<BreadcrumbsComponent> = {
  title: 'Components/Breadcrumbs',
  component: BreadcrumbsComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Where the current folder sits, with a jump to any level. Links are real anchors ' +
          '(`linkClick` lets the app route). More than `maxItems` levels fold into a "…" menu; ' +
          'on a phone only the parent and the current level show. Long names are cut and show ' +
          'in full in a tooltip.',
      },
    },
  },
  args: {
    items: SHORT,
    ariaLabel: 'Breadcrumb',
    collapsedLabel: 'Show hidden folders',
    maxItems: 4,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="bc-panel">
        <ui-breadcrumbs
          [items]="items"
          [ariaLabel]="ariaLabel"
          [collapsedLabel]="collapsedLabel"
          [maxItems]="maxItems"
        />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<BreadcrumbsComponent>;

export const Default: Story = {};

export const Collapsed: Story = { args: { items: DEEP, ariaLabel: 'Breadcrumb (collapsed)' } };

export const MaxItemsFive: Story = {
  args: { items: DEEP, maxItems: 5, ariaLabel: 'Breadcrumb (max five)' },
};

export const LongNames: Story = {
  args: { items: LONG, ariaLabel: 'Breadcrumb (long names)' },
  render: (args) => ({
    props: args,
    template: `
      <div class="bc-panel bc-narrow">
        <ui-breadcrumbs [items]="items" [ariaLabel]="ariaLabel" [collapsedLabel]="collapsedLabel" />
      </div>`,
  }),
};

export const SingleLevel: Story = {
  args: { items: [{ label: 'All links' }], ariaLabel: 'Breadcrumb (single level)' },
};

const variants = (theme: Theme) => `
  <div ${THEME_ATTRIBUTE}="${theme}" class="bc-panel">
    <p class="bc-hint">${theme} theme</p>
    <ui-breadcrumbs [items]="short" ariaLabel="Short trail (${theme})" collapsedLabel="Show hidden folders" />
    <ui-breadcrumbs [items]="deep" ariaLabel="Collapsed trail (${theme})" collapsedLabel="Show hidden folders" />
    <div class="bc-narrow">
      <ui-breadcrumbs [items]="long" ariaLabel="Long names (${theme})" collapsedLabel="Show hidden folders" />
    </div>
  </div>`;

/** Short, collapsed and truncated trails in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    props: { short: SHORT, deep: DEEP, long: LONG },
    template: Object.values(THEME).map(variants).join(''),
  }),
};
