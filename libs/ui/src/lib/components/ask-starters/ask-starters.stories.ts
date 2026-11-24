import type { Meta, StoryObj } from '@storybook/angular-vite';
import { AskStartersComponent } from './ask-starters.component';
import type { AskStarterGroup } from './models/ask-starter-group.interface';

const GROUPS: readonly AskStarterGroup[] = [
  {
    title: 'Find',
    icon: 'search',
    questions: [
      'That ramen recipe with the soft egg',
      'The Signal Forms article I saved in October',
    ],
  },
  {
    title: 'Count and compare',
    icon: 'hash',
    questions: ['How many links do I have, by folder?', 'What did I save most this month?'],
  },
  {
    title: 'Summarise',
    icon: 'text-size',
    questions: ['What is in my Design folder, in five lines?', 'The main ideas in Angular'],
  },
  {
    title: 'Plan and pick',
    icon: 'history',
    questions: ['Something to watch this weekend, under an hour', 'What should I read first?'],
  },
];

const meta: Meta<AskStartersComponent> = {
  title: 'Components/AskStarters',
  component: AskStartersComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'What Ask your shelf can do, before the first question: a card per kind of question with example ' +
          'questions (two columns from 37.5rem of its own width), or on the phone (`compact`) the first ' +
          'question of each kind as a pill. Pressing a question emits it.',
      },
    },
  },
  args: { groups: GROUPS, compact: false, headingLevel: 3 },
  argTypes: { picked: { action: 'picked' } },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 51.25rem">
        <ui-ask-starters [groups]="groups" [compact]="compact" [headingLevel]="headingLevel"
          (picked)="picked($event)" />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<AskStartersComponent>;

/** The page: four cards in two columns. */
export const Default: Story = {};

/** A narrow panel: one column. */
export const Narrow: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 26rem">
        <ui-ask-starters [groups]="groups" (picked)="picked($event)" />
      </div>`,
  }),
};

/** The phone start: one pill per kind. */
export const Compact: Story = {
  args: { compact: true },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 22.5rem">
        <ui-ask-starters [groups]="groups" compact (picked)="picked($event)" />
      </div>`,
  }),
};
