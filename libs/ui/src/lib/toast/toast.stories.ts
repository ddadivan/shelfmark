import { Component, inject } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { TOAST_DURATION_MS } from './models/toast-duration.const';
import { TOAST_KIND } from './models/toast-kind.const';
import { ToastComponent } from './toast.component';
import { ToastService } from './toast.service';
import { toastShortcutKeys, toastShortcutLabel } from './toast-shortcut-label';

/** Story helper: buttons that call `ToastService`. Not part of the library. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- story helper, not a library selector
  selector: 'ts-toast-demo',
  imports: [ButtonComponent],
  host: { '(document:keydown)': 'toasts.handleShortcut($event)' },
  template: `
    <div class="tt-row">
      <ui-button variant="secondary" (click)="saved()">Saved</ui-button>
      <ui-button variant="secondary" (click)="moved()">Moved with Undo</ui-button>
      <ui-button variant="secondary" (click)="deleted()">Deleted with Undo</ui-button>
      <ui-button variant="secondary" (click)="success()">Quick confirmation</ui-button>
      <ui-button variant="secondary" (click)="info()">Status</ui-button>
      <ui-button variant="secondary" (click)="warn()">Reminder</ui-button>
      <ui-button variant="secondary" (click)="danger()">Error with Retry</ui-button>
      <ui-button variant="secondary" (click)="many()">Stack of four</ui-button>
      <ui-button variant="secondary" (click)="long()">Long text</ui-button>
    </div>
    <p class="tt-hint">
      Bottom centre, 24px up. 3 s quick, 4 to 5 s save or status, 8 s with Undo (countdown line);
      errors and reminders stay until handled. Hover or focus holds the timer. Up to three stack,
      the newest in front; hover or focus fans them out. Ctrl or Cmd+Z undoes an Undo toast, Esc
      dismisses the newest, {{ shortcut }} moves focus to its action. Last result:
      {{ last || 'none' }}
    </p>
  `,
})
class ToastDemoComponent {
  protected readonly toasts = inject(ToastService);
  protected readonly shortcut = toastShortcutLabel();
  protected last = '';

  protected saved(): void {
    this.toasts.show({
      kind: TOAST_KIND.Saved,
      title: 'Saved to Work / Angular',
      detail: 'Signal Forms in 20 minutes · youtube.com',
      action: { label: 'View', run: () => (this.last = 'View') },
    });
  }

  protected moved(): void {
    this.toasts.show({
      kind: TOAST_KIND.Moved,
      title: 'Moved to Clothes',
      detail: 'Wool coat, straight cut',
      folder: { colour: FOLDER_COLOUR.Clay },
      duration: TOAST_DURATION_MS.Undo,
      actionHint: `Press ${this.shortcut} to reach Undo`,
      action: { label: 'Undo', run: () => (this.last = 'Undo move') },
    });
  }

  protected deleted(): void {
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: 'Link moved to Trash',
      detail: 'Restore it from Trash within 30 days',
      duration: TOAST_DURATION_MS.Undo,
      action: { label: 'Undo', run: () => (this.last = 'Undo delete') },
    });
  }

  protected success(): void {
    this.toasts.show({ kind: TOAST_KIND.Success, title: 'Link copied' });
  }

  protected info(): void {
    this.toasts.show({
      kind: TOAST_KIND.Info,
      title: 'Back online',
      detail: '4 changes synced',
    });
  }

  protected warn(): void {
    this.toasts.show({
      kind: TOAST_KIND.Warn,
      title: 'Reminder: Wool coat, straight cut',
      detail: 'cos.com · you asked for today',
      action: { label: 'Open', run: () => (this.last = 'Open') },
      secondary: { label: 'Later', run: () => (this.last = 'Later') },
    });
  }

  protected danger(): void {
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: 'Couldn’t save the link',
      detail: 'Check your connection. We kept it in the box.',
      action: { label: 'Retry', run: () => (this.last = 'Retry') },
    });
  }

  protected many(): void {
    for (let i = 1; i <= 4; i++) {
      this.toasts.show({
        kind: TOAST_KIND.Saved,
        title: 'Saved to Recipes',
        detail: `Recipe number ${i}`,
        duration: TOAST_DURATION_MS.Sticky,
      });
    }
  }

  protected long(): void {
    this.toasts.show({
      kind: TOAST_KIND.Moved,
      title: 'This link was moved to Work / Angular / Signals and its tags were updated',
      detail:
        'A very long second line that does not wrap but is cut with an ellipsis when it runs out of room',
      duration: TOAST_DURATION_MS.Undo,
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
          '`ToastService.show({ title, detail?, kind, thumb?, folder?, action?, secondary?, duration? })` renders a `ui-toast` in the toast overlay layer: glass, a lead typed by kind (`saved` link thumbnail with a check, `moved` folder tile, tinted icon for `success`, `danger`, `warn`, `info`), a title with a truncating second line, the action and a close button. ' +
          'Durations by kind: 3 s success, 4 s info and moved, 5 s saved, 8 s with Undo (a countdown line runs down the bottom and pauses with the timer), `danger` and `warn` stay until handled; hover, focus or touch pauses. ' +
          'Up to three stack with the newest in front (hover or focus fans them out); a fourth pushes out the oldest (`replaced`). ' +
          'Normal toasts are announced by one persistent polite `role="status"` region and `danger` toasts by a persistent `role="alert"` region; a toast never takes focus by itself. ' +
          'While an Undo toast is visible Ctrl or Cmd+Z undoes it and Esc dismisses the newest (not in text fields or dialogs); `handleShortcut(event)` (Alt+Shift+T, Option+Shift+T on macOS) focuses the action. ' +
          'Bottom centre on every screen, 24px up; the app lifts it above a bottom bar with `--ui-toast-offset`. ' +
          '`show()` returns `{ dismiss(), closed }`: `closed` resolves once with the close reason (`TOAST_CLOSE_REASON`: `action`, `timeout`, `dismissed`, `replaced`).',
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

const kindsMarkup = `
  <ui-toast kind="saved" title="Saved to Work / Angular" detail="Signal Forms in 20 minutes · youtube.com" actionLabel="View" />
  <ui-toast kind="moved" title="Moved to Clothes" detail="Wool coat, straight cut" actionLabel="Undo" [countdown]="8000" [folder]="{ colour: 'clay' }" />
  <ui-toast kind="danger" title="Link moved to Trash" detail="Restore it from Trash within 30 days" actionLabel="Undo" [countdown]="8000" />
  <ui-toast kind="warn" title="Reminder: Wool coat, straight cut" detail="cos.com · you asked for today" actionLabel="Open" secondaryLabel="Later" />
  <ui-toast kind="danger" title="Couldn’t save the link" detail="Check your connection. We kept it in the box." actionLabel="Retry" />
  <ui-toast kind="success" title="Link copied" />
  <ui-toast kind="info" title="Back online" detail="4 changes synced" />`;

const staticView = (inner: string) => ({
  moduleMetadata: { imports: [ToastComponent] },
  template: `<div class="tt-panel tt-static">${inner}</div>`,
});

/** The view of each kind, static (the service renders the same component). */
export const Kinds: Story = { render: () => staticView(kindsMarkup) };

/** The Undo countdown line, running down over 8 s (paused while hovered or focused; not drawn under reduced motion). */
export const UndoCountdown: Story = {
  render: () =>
    staticView(`
      <ui-toast kind="moved" title="Moved to Recipes" detail="Miso glazed salmon" actionLabel="Undo" [countdown]="8000" [folder]="{ colour: 'sage' }" />`),
};

/** With the keyboard shortcut caps (from the tablet breakpoint up). */
export const WithShortcut: Story = {
  render: () => ({
    moduleMetadata: { imports: [ToastComponent] },
    props: { keys: toastShortcutKeys(false), macKeys: toastShortcutKeys(true) },
    template: `
      <div class="tt-panel tt-static">
        <ui-toast kind="danger" title="Link deleted" actionLabel="Undo" actionHint="Press Alt+Shift+T to reach Undo" [shortcut]="keys" />
        <ui-toast kind="danger" title="Link deleted" actionLabel="Undo" actionHint="Press Option+Shift+T to reach Undo" [shortcut]="macKeys" />
      </div>`,
  }),
};

/** Long text: the title wraps, the second line is cut with an ellipsis; width stops at 540px. */
export const LongText: Story = {
  render: () =>
    staticView(`
      <ui-toast
        kind="moved"
        title="This link was moved to Work / Angular / Signals and its tags were updated"
        detail="A very long second line that does not wrap but is cut with an ellipsis when it runs out of room, however wide the toast gets"
        actionLabel="Undo"
      />`),
};

/** Both themes, independent of the toolbar. */
export const AllVariants: Story = {
  render: () => ({
    moduleMetadata: { imports: [ToastComponent] },
    props: { themes: Object.values(THEME) },
    template: `
      <div class="tt-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="tt-panel tt-static">${kindsMarkup}</div>
        }
      </div>`,
  }),
};
