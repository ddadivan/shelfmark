import type { DismissableEvent } from './dismissable-event.interface';

export interface DismissableOptions {
  /** The layer and its anchor: a press on them is not outside, and focus in them makes Esc "ours". Read at each event. */
  readonly inside: () => readonly (Node | null | undefined)[];
  /** A press whose target is within a match of this selector counts as inside (a toast layer). */
  readonly ignore?: string;
  /** Listen for Esc too (default true). Off where the layer handles its own Esc. */
  readonly escape?: boolean;
  /** Called on an outside press or on Esc while armed. */
  readonly dismissed: (event: DismissableEvent) => void;
}
