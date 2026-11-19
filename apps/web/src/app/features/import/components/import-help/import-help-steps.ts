import { SHORTCUT_KEY } from '../../../shortcuts/models/shortcut-key.const';
import type { ImportHelpStep } from './models/import-help-step.interface';

const { Command, Alt, Shift, B, O } = SHORTCUT_KEY;

/**
 * The export steps per browser for the platform at hand (checked against the browsers' help
 * pages, Nov 2026). `Command` is Cmd on a Mac and Ctrl elsewhere. Chrome's bookmark manager is
 * Cmd+Option+B on a Mac, Ctrl+Shift+O elsewhere; Firefox's Library is Cmd / Ctrl+Shift+O; Edge
 * documents Favorites (Ctrl+Shift+O) only for Windows, so on a Mac its step goes through the ⋯
 * menu; Safari exists only on a Mac.
 */
export function importHelpSteps(mac: boolean): readonly ImportHelpStep[] {
  return mac
    ? [
        { id: 'chrome', textKey: 'import.help.chrome', keys: [Command, Alt, B] },
        { id: 'edge', textKey: 'import.help.edgeMac', keys: [] },
        { id: 'firefox', textKey: 'import.help.firefox', keys: [Command, Shift, O] },
        { id: 'safari', textKey: 'import.help.safari', keys: [] },
      ]
    : [
        { id: 'chrome', textKey: 'import.help.chrome', keys: [Command, Shift, O] },
        { id: 'edge', textKey: 'import.help.edge', keys: [Command, Shift, O] },
        { id: 'firefox', textKey: 'import.help.firefox', keys: [Command, Shift, O] },
      ];
}
