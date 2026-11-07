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
  Res,
  type Type,
} from '@nestjs/common';
import type { AuthUser } from '@shelfmark/contracts';
import type { Response } from 'express';
import { CurrentUser } from '../../src/common/auth/current-user.decorator';
import { FIXTURE_ROUTE } from '../models/fixture-route.const';
import type { LeakyNote } from '../models/leaky-note.interface';
import { CopyNoteDto } from './copy-note-fixture.dto';
import { CookieGateFixtureController } from './cookie-gate-fixture.controller';
import { LEAK } from './leak.const';
import type { Leak } from './leak.type';
import { NoteBodyDto } from './notes-fixture.dto';

/**
 * Deliberately broken notes: the harness self-test proves that `expectIsolated` rejects each kind
 * of leak. Routes are `/api/__fixture/leaky-notes/<leak>`, one broken behaviour per prefix; the
 * rest behaves like the correct fixture.
 */
function createLeakyController(leak: Leak): Type<unknown> {
  @Controller(`${FIXTURE_ROUTE.LeakyNotes}/${leak}`)
  class LeakyNotesController {
    private readonly notes = new Map<string, LeakyNote>();

    /** The note when the user may see it; the leaks decide what happens otherwise. */
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

    @Post('copy')
    copy(@CurrentUser() user: AuthUser, @Body() body: CopyNoteDto): LeakyNote {
      const source = this.find(user, body.sourceId, leak === LEAK.Reference);
      return this.create(user, { text: source.text });
    }

    @Get()
    list(@CurrentUser() user: AuthUser): { items: LeakyNote[] } {
      const all = [...this.notes.values()];
      const own = all.filter((n) => n.ownerId === user.id);
      if (leak === LEAK.ListStatus && own.length === 0) throw new ForbiddenException();
      return { items: leak === LEAK.List ? all : own };
    }

    @Get(':id')
    get(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Res({ passthrough: true }) res: Response,
    ): LeakyNote | Record<string, unknown> {
      const note = this.notes.get(id);
      if (leak === LEAK.Body && note && note.ownerId !== user.id) {
        // Written directly: an exception would go through the error filter, which strips fields.
        res.status(404);
        return {
          statusCode: 404,
          error: 'Not Found',
          message: 'Note not found',
          requestId: 'x',
          id,
        };
      }
      return this.find(user, id, leak === LEAK.Read);
    }

    @Patch(':id')
    update(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() body: NoteBodyDto,
    ): LeakyNote {
      const foreign = this.notes.get(id);
      if (leak === LEAK.MutateOnMiss && foreign && foreign.ownerId !== user.id) {
        foreign.text = body.text;
        throw new NotFoundException('Note not found');
      }
      const note = this.find(user, id, leak === LEAK.Update);
      note.text = body.text;
      return note;
    }

    @Delete(':id')
    remove(@CurrentUser() user: AuthUser, @Param('id') id: string): void {
      const foreign = this.notes.get(id);
      if (leak === LEAK.DeleteOnMiss && foreign && foreign.ownerId !== user.id) {
        this.notes.delete(id);
        throw new NotFoundException('Note not found');
      }
      this.find(user, id, leak === LEAK.Remove);
      this.notes.delete(id);
    }
  }
  return LeakyNotesController;
}

@Module({
  controllers: [...Object.values(LEAK).map(createLeakyController), CookieGateFixtureController],
})
export class LeakyNotesFixtureModule {}
