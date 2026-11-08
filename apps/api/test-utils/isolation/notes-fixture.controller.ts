import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../../src/common/auth/current-user.decorator';
import { FIXTURE_ROUTE } from '../models/fixture-route.const';
import type { Note } from '../models/note.interface';
import { CopyNoteDto } from './copy-note-fixture.dto';
import { NoteBodyDto } from './notes-fixture.dto';
import { NotesFixtureService } from './notes-fixture.service';

@Controller(FIXTURE_ROUTE.Notes)
export class NotesFixtureController {
  constructor(private readonly service: NotesFixtureService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: NoteBodyDto): Note {
    return this.service.create(user.id, body.text);
  }

  /** Creates a note from another note's text; the source id is the foreign reference under test. */
  @Post('copy')
  copy(@CurrentUser() user: AuthUser, @Body() body: CopyNoteDto): Note {
    return this.service.copy(user.id, body.sourceId);
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
