import { randomUUID } from 'node:crypto';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  type Type,
} from '@nestjs/common';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../../src/common/auth/current-user.decorator';
import { LEAK } from './leak.const';
import type { Leak } from './leak.type';
import { NoteBodyDto } from './notes-fixture.dto';

interface LeakyNote {
  id: string;
  text: string;
  ownerId: string;
}

/**
 * Deliberately broken notes: the harness self-test proves that `expectIsolated` rejects each kind
 * of leak. Routes are `/api/__fixture/leaky-notes/<leak>`, one broken behaviour per prefix; the
 * rest behaves like the correct fixture.
 */
function createLeakyController(leak: Leak): Type<unknown> {
  @Controller(`__fixture/leaky-notes/${leak}`)
  class LeakyNotesController {
    private readonly notes = new Map<string, LeakyNote>();

    private find(user: AuthUser, id: string, ignoreOwner: boolean): LeakyNote {
      const note = this.notes.get(id);
      if (note && (ignoreOwner || note.ownerId === user.id)) return note;
      if (note && leak === LEAK.Forbidden) throw new ForbiddenException();
      if (note && leak === LEAK.Distinguishable) throw new NotFoundException('Note is not yours');
      throw new NotFoundException('Note not found');
    }

    @Post()
    create(@CurrentUser() user: AuthUser, @Body() body: NoteBodyDto): LeakyNote {
      const note = { id: randomUUID(), text: body.text, ownerId: user.id };
      this.notes.set(note.id, note);
      return note;
    }

    @Get()
    list(@CurrentUser() user: AuthUser): { items: LeakyNote[] } {
      const all = [...this.notes.values()];
      return { items: leak === LEAK.List ? all : all.filter((n) => n.ownerId === user.id) };
    }

    @Get(':id')
    get(@CurrentUser() user: AuthUser, @Param('id') id: string): LeakyNote {
      return this.find(user, id, leak === LEAK.Read);
    }

    @Patch(':id')
    update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: NoteBodyDto) {
      const note = this.find(user, id, leak === LEAK.Update);
      note.text = body.text;
      return note;
    }

    @Delete(':id')
    remove(@CurrentUser() user: AuthUser, @Param('id') id: string): void {
      this.find(user, id, leak === LEAK.Remove);
      this.notes.delete(id);
    }
  }
  return LeakyNotesController;
}

@Module({
  controllers: Object.values(LEAK).map(createLeakyController),
})
export class LeakyNotesFixtureModule {}
