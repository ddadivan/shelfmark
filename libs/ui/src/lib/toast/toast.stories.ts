import { Component, inject } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import type { ToastKind } from './models/toast-kind.type';
import { ToastComponent } from './toast.component';
import { ToastService } from './toast.service';
import { toastShortcutKeys, toastShortcutLabel } from './toast-shortcut-label';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { TOAST_KIND } from './models/toast-kind.const';

/** Story helper: buttons that call `ToastService`. Not part of the library. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- story helper, not a library selector
  selector: 'ts-toast-demo',
  imports: [ButtonComponent],
  host: { '(document:keydown)': 'toasts.handleShortcut($event)' },
  template: `
    <div class="tt-row">
      @for (kind of kinds; track kind) {
        <ui-button variant="secondary" (click)="show(kind)">Show {{ kind }}</ui-button>
      }
      <ui-button variant="secondary" (click)="undo()">Delete with Undo</ui-button>
      <ui-button variant="secondary" (click)="retry()">Error with Retry</ui-button>
      <ui-button variant="secondary" (click)="many()">Show five in a row</ui-button>
      <ui-button variant="secondary" (click)="long()">Long text</ui-button>
    </div>
    <p class="tt-hint">
      Bottom-left from 640px, bottom-centre on phones. 4 s, 8 s with an action; hover or focus the
      toast to hold the timer. {{ shortcut }} moves focus to the action of the toast on screen;
      focus goes back where it was when the toast closes. Last result: {{ last || 'none' }}
    </p>
  `,
})
class ToastDemoComponent {
  protected readonly toasts = inject(ToastService);
  protected readonly kinds: readonly ToastKind[] = Object.values(TOAST_KIND);
  protected readonly shortcut = toastShortcutLabel();
  protected last = '';

  protected show(kind: ToastKind): void {
    const text = { info: 'Link moved', success: 'Link saved', error: "Couldn't save" }[kind];
    this.toasts.show({ kind, text });
  }

  protected undo(): void {
    this.toasts.show({
      text: 'Link deleted',
      actionHint: `Press ${toastShortcutLabel()} to reach Undo`,
      action: {
        label: 'Undo',
        run: () => {
          this.last = 'Undo';
        },
      },
    });
  }

  protected retry(): void {
    this.toasts.show({
      kind: TOAST_KIND.Error,
      text: "Couldn't save. Check your connection.",
      action: {
        label: 'Retry',
        run: () => {
          this.last = 'Retry';
        },
      },
    });
  }

  protected many(): void {
    for (let i = 1; i <= 5; i++) {
      this.toasts.show({ kind: TOAST_KIND.Success, text: `Link ${i} saved` });
    }
  }

  protected long(): void {
    this.toasts.show({
      text: 'This link was moved to Work / Angular / Signals, and its tags were updated to match the new folder.',
      action: { label: 'Undo', run: () => undefined },
    });
  }
}

const meta: Meta<ToastComponent> = {
  title: 'Components/Toast',
  component: ToastComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '`ToastService.show({ text, kind, action?, duration? })` renders a `ui-toast` in the toast overlay layer. ' +
          'One toast at a time, the newest replaces the older. It is announced by one persistent polite live region and never takes focus by itself; the timer pauses on hover and focus. ' +
          "The toast sits at the bottom centre of the viewport on every screen (the author's decision, overriding the spec's bottom-left on desktop). " +
          '`handleShortcut(event)` (Alt+Shift+T, Option+Shift+T on macOS) focuses the action of the toast on screen and focus returns to where it was when the toast closes; `actionHint` is a visually hidden text announced with the toast. ' +
          '`show()` returns `{ dismiss(), closed }`: `closed` is a promise that resolves once with the close reason (`TOAST_CLOSE_REASON`: `action`, `timeout`, `dismissed`, `replaced`).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<ToastComponent>;

/** Trigger buttons for every case. */
export const Playground: Story = {
  render: () => ({
    moduleMetadata: { imports: [ToastDemoComponent] },
    template: `<div class="tt-panel"><ts-toast-demo /></div>`,
  }),
};

const staticView = (inner: string) => ({
  moduleMetadata: { imports: [ToastComponent] },
  template: `<div class="tt-panel tt-static">${inner}</div>`,
});

/** The view of each kind, static (the service renders the same component). */
export const Kinds: Story = {
  render: () =>
    staticView(`
      <ui-toast kind="info" text="Link moved" />
      <ui-toast kind="success" text="Link saved to Work / Angular" actionLabel="View" />
      <ui-toast kind="error" text="Couldn't save. Check your connection." actionLabel="Retry" />`),
};

/** With the Undo action after a delete; the key caps show from the tablet breakpoint up. */
export const WithUndo: Story = {
  render: () => ({
    moduleMetadata: { imports: [ToastComponent] },
    props: { keys: toastShortcutKeys(false), macKeys: toastShortcutKeys(true) },
    template: `
      <div class="tt-panel tt-static">
        <ui-toast text="Link deleted" actionLabel="Undo" actionHint="Press Alt+Shift+T to reach Undo" [shortcut]="keys" />
        <ui-toast text="Link deleted" actionLabel="Undo" actionHint="Press Option+Shift+T to reach Undo" [shortcut]="macKeys" />
      </div>`,
  }),
};

/** Long text wraps; the action stays on the right. */
export const LongText: Story = {
  render: () =>
    staticView(`
      <ui-toast
        text="This link was moved to Work / Angular / Signals, and its tags were updated to match the new folder."
        actionLabel="Undo"
      />`),
};

/** Both themes, independent of the toolbar. */
export const AllVariants: Story = {
  render: () => ({
    moduleMetadata: { imports: [ToastComponent] },
    props: {
      themes: Object.values(THEME),
      keys: toastShortcutKeys(false),
      macKeys: toastShortcutKeys(true),
    },
    template: `
      <div class="tt-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="tt-panel tt-static">
            <ui-toast kind="info" text="Link moved" />
            <ui-toast kind="success" text="Link saved to Work / Angular" actionLabel="View" />
            <ui-toast kind="info" text="Link deleted" actionLabel="Undo" actionHint="Press Alt+Shift+T to reach Undo" [shortcut]="keys" />
            <ui-toast kind="info" text="Link deleted" actionLabel="Undo" actionHint="Press Option+Shift+T to reach Undo" [shortcut]="macKeys" />
            <ui-toast kind="error" text="Couldn't save. Check your connection." actionLabel="Retry" />
          </div>
        }
      </div>`,
  }),
};
