import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Note } from '../models/note.interface';

/** In-memory notes per owner: the reference for a correctly isolated resource. */
@Injectable()
export class NotesFixtureService {
  private readonly notes = new Map<string, Map<string, Note>>();

  create(ownerId: string, text: string): Note {
    const note = { id: randomUUID(), text };
    const own = this.notes.get(ownerId) ?? new Map<string, Note>();
    own.set(note.id, note);
    this.notes.set(ownerId, own);
    return note;
  }

  list(ownerId: string): Note[] {
    return [...(this.notes.get(ownerId)?.values() ?? [])];
  }

  get(ownerId: string, id: string): Note {
    const note = this.notes.get(ownerId)?.get(id);
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  update(ownerId: string, id: string, text: string): Note {
    const note = this.get(ownerId, id);
    note.text = text;
    return note;
  }

  remove(ownerId: string, id: string): void {
    this.get(ownerId, id);
    this.notes.get(ownerId)?.delete(id);
  }

  /** A reference to another note by id: the source must belong to the owner. */
  copy(ownerId: string, sourceId: string): Note {
    return this.create(ownerId, this.get(ownerId, sourceId).text);
  }
}
