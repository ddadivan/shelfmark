import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import type { SaveStatusState } from './models/save-status-state.type';
import { SaveStatusComponent } from './save-status.component';

const STATES: SaveStatusState[] = ['saving', 'saved', 'error'];

const meta: Meta<SaveStatusComponent> = {
  title: 'Components/SaveStatus',
  component: SaveStatusComponent,
  tags: ['autodocs'],
  args: {
    state: 'saving',
    savingText: 'Saving…',
    savedText: 'Saved',
    errorText: 'Could not save',
  },
  argTypes: { state: { control: 'inline-radio', options: STATES } },
  render: (args) => ({
    props: args,
    template: `
      <ui-save-status
        [state]="state"
        [savingText]="savingText"
        [savedText]="savedText"
        [errorText]="errorText"
      />`,
  }),
};

export default meta;
type Story = StoryObj<SaveStatusComponent>;

export const Saving: Story = {};

export const Saved: Story = { args: { state: 'saved' } };

export const ErrorState: Story = { args: { state: 'error' } };

/** Saving, then saved: the icons swap in one 16px slot and the text does not shift. */
export const Changing: Story = {
  render: (args) => {
    const state = signal<SaveStatusState>('saving');
    setTimeout(() => state.set('saved'), 1500);
    return {
      props: { args, state },
      template: `
        <ui-save-status
          [state]="state()"
          [savingText]="args.savingText"
          [savedText]="args.savedText"
          [errorText]="args.errorText"
        />`,
    };
  },
};

/** Every state in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { states: STATES },
    template: `
      <div class="ls-themes">
        @for (theme of ['light', 'dark']; track theme) {
          <div [attr.data-theme]="theme" class="ls-panel">
            @for (s of states; track s) {
              <ui-save-status
                [state]="s"
                savingText="Saving…"
                savedText="Saved"
                errorText="Could not save"
              />
            }
          </div>
        }
      </div>`,
  }),
};
