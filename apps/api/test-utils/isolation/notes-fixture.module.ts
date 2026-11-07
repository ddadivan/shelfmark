import { randomUUID } from 'node:crypto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../../src/common/auth/current-user.decorator';
import { NoteBodyDto } from './notes-fixture.dto';

interface Note {
  id: string;
  text: string;
}

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
}

@Controller('__fixture/notes')
export class NotesFixtureController {
  constructor(private readonly service: NotesFixtureService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: NoteBodyDto): Note {
    return this.service.create(user.id, body.text);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): { items: Note[] } {
    return { items: this.service.list(user.id) };
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Note {
    return this.service.get(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: NoteBodyDto): Note {
    return this.service.update(user.id, id, body.text);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string): void {
    this.service.remove(user.id, id);
  }
}

/** Answers with the user the guard resolved (guard integration specs). */
@Controller('__fixture/whoami')
export class WhoAmIFixtureController {
  @Get()
  whoAmI(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}

/** Test-only (`createAuthTestApp({ imports: [NotesFixtureModule] })`), never part of `AppModule`. */
@Module({
  controllers: [NotesFixtureController, WhoAmIFixtureController],
  providers: [NotesFixtureService],
})
export class NotesFixtureModule {}
