import type { AskStarter } from '../models/ask-starter.interface';
import type { AskStarterGroupSpec } from '../models/ask-starter-group-spec.interface';
import { askStarters } from './ask-starters';

/** The question with the folder when there is one, else its folder-free twin. */
function withFolder(key: string, fallback: string, folder: string | null): AskStarter {
  return folder === null ? { key: fallback, folder: null } : { key, folder };
}

/**
 * The four "what Ask can do" cards of the Ask start (Shelf 11-ask): Find, Count and compare,
 * Summarise, Plan and pick, two example questions each. Questions name the user's largest folders
 * (`askStarters`) where they can; without folders they fall back to folder-free questions. No
 * server call.
 */
export function askStarterGroups(
  folders: readonly { readonly name: string; readonly linkCount: number }[],
): AskStarterGroupSpec[] {
  const names = askStarters(folders).flatMap((starter) =>
    starter.folder === null ? [] : [starter.folder],
  );
  const first = names[0] ?? null;
  const second = names[1] ?? first;
  const third = names[2] ?? first;
  return [
    {
      titleKey: 'ai.ask.caps.find',
      icon: 'search',
      questions: [
        withFolder('ai.ask.examples.findFolder', 'ai.ask.examples.find', first),
        { key: 'ai.ask.examples.findVideo', folder: null },
      ],
    },
    {
      titleKey: 'ai.ask.caps.count',
      icon: 'hash',
      questions: [
        { key: 'ai.ask.examples.countFolders', folder: null },
        { key: 'ai.ask.examples.countMonth', folder: null },
      ],
    },
    {
      titleKey: 'ai.ask.caps.summarise',
      icon: 'text-size',
      questions: [
        withFolder('ai.ask.examples.summariseFolder', 'ai.ask.examples.summarise', first),
        withFolder('ai.ask.examples.ideasFolder', 'ai.ask.examples.ideas', second),
      ],
    },
    {
      titleKey: 'ai.ask.caps.plan',
      icon: 'history',
      questions: [
        { key: 'ai.ask.examples.watch', folder: null },
        withFolder('ai.ask.examples.firstFolder', 'ai.ask.examples.first', third),
      ],
    },
  ];
}
