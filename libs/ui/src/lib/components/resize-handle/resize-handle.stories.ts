import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { ResizeHandleComponent } from './resize-handle.component';

const meta: Meta<ResizeHandleComponent> = {
  title: 'Components/ResizeHandle',
  component: ResizeHandleComponent,
  tags: ['autodocs'],
  args: {
    label: 'Resize the preview panel',
    hint: 'Drag or use the arrow keys to resize',
    min: 160,
    max: 400,
  },
  parameters: { layout: 'padded' },
  render: (args) => {
    const width = signal(280);
    return {
      props: { args, width, reset: () => width.set(280) },
      template: `
        <div class="rs-split">
          <div class="rs-pane" [style.width.px]="width()">List: {{ width() }}px</div>
          <ui-resize-handle [label]="args.label" [hint]="args.hint" [min]="args.min" [max]="args.max" [(value)]="width" (resetRequested)="reset()" />
          <div class="rs-pane rs-pane--fill">Preview</div>
        </div>`,
    };
  },
};

export default meta;
type Story = StoryObj<ResizeHandleComponent>;

/** Drag the pill, or focus it and use the arrow keys (Shift for 64px), Home, End; Enter resets. */
export const Default: Story = {};

/** The grip in both themes: at rest, hovered or focused it turns accent. */
export const AllThemes: Story = {
  render: (args) => ({
    props: { args, themes: Object.values(THEME), width: signal(200) },
    template: `
      <div class="rs-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="rs-panel">
            <p class="rs-caption">{{ theme }}</p>
            <div class="rs-split">
              <div class="rs-pane" [style.width.px]="width()">List</div>
              <ui-resize-handle [label]="args.label" [hint]="args.hint" [min]="args.min" [max]="args.max" [(value)]="width" />
              <div class="rs-pane rs-pane--fill">Preview</div>
            </div>
          </div>
        }
      </div>`,
  }),
};
