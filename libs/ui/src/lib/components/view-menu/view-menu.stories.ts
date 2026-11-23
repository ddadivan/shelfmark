import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import type { ViewMenuField } from './models/view-menu-field.interface';
import { ViewMenuComponent } from './view-menu.component';

const FIELDS: ViewMenuField[] = [
  { id: 'note', label: 'Note', checked: true },
  { id: 'tags', label: 'Hashtags', checked: true },
  { id: 'folder', label: 'Folder', checked: false },
  { id: 'date', label: 'Date', checked: true },
];

const meta: Meta<ViewMenuComponent> = {
  title: 'Components/ViewMenu',
  component: ViewMenuComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The View button of a feed and its panel: the grid size (a six-step slider, disabled in the List view) and ' +
          'one switch per card field (Note, Hashtags, Folder, Date). A non-modal dialog under the button, lined up ' +
          'with its end edge; Esc and a press outside close it and Esc returns focus to the button. Changes apply ' +
          'at once: `step` is a model, `fieldChange` emits `{ id, checked }` and the caller passes `fields` back.',
      },
    },
  },
  args: {
    label: 'View',
    heading: 'Grid size',
    smallLabel: 'Small',
    largeLabel: 'Large',
    steps: 6,
    step: 4,
    gridDisabled: false,
    fields: FIELDS,
  },
  render: (args) => ({
    props: {
      ...args,
      toggle(change: { id: string; checked: boolean }) {
        this['fields'] = (this['fields'] as ViewMenuField[]).map((f) =>
          f.id === change.id ? { ...f, checked: change.checked } : f,
        );
      },
    },
    template: `
      <div class="ms-panel" style="display: flex; justify-content: flex-end; min-block-size: 24rem">
        <ui-view-menu [label]="label" [heading]="heading" [steps]="steps" [(step)]="step"
          [smallLabel]="smallLabel" [largeLabel]="largeLabel" [gridDisabled]="gridDisabled"
          [fields]="fields" (fieldChange)="toggle($event)" />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<ViewMenuComponent>;

/** Click the button: the panel opens under it (Esc or a click outside closes it). */
export const Default: Story = {};

/** Opened by a click, for a quick look at the live panel. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('.ui-view-menu__trigger')?.click();
  },
};

/** The List view has no grid: the slider is off, the switches stay. */
export const GridDisabled: Story = {
  args: { gridDisabled: true },
  play: async ({ canvasElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('.ui-view-menu__trigger')?.click();
  },
};

/** The panel drawn in place (`inline`, docs only) in both themes, with the slider at each end. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: {
      themes: Object.values(THEME),
      fields: FIELDS,
      cases: [
        { name: 'Step 1', step: 1, disabled: false },
        { name: 'Step 4', step: 4, disabled: false },
        { name: 'Step 6', step: 6, disabled: false },
        { name: 'List (grid off)', step: 3, disabled: true },
      ],
    },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            @for (c of cases; track c.name) {
              <ui-view-menu inline label="View" heading="Grid size" smallLabel="Small" largeLabel="Large"
                [step]="c.step" [gridDisabled]="c.disabled" [fields]="fields" />
            }
          </div>
        }
      </div>`,
  }),
};
