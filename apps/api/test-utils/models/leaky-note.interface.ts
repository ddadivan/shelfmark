import type { Note } from './note.interface';

/** A note of the leaky fixture, which remembers its owner (and then ignores it on purpose). */
export interface LeakyNote extends Note {
  ownerId: string;
}
