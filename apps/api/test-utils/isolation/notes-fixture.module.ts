import { Module } from '@nestjs/common';
import { NotesFixtureController } from './notes-fixture.controller';
import { NotesFixtureService } from './notes-fixture.service';
import { WhoAmIFixtureController } from './whoami-fixture.controller';

/** Test-only (`createAuthTestApp({ imports: [NotesFixtureModule] })`), never part of `AppModule`. */
@Module({
  controllers: [NotesFixtureController, WhoAmIFixtureController],
  providers: [NotesFixtureService],
})
export class NotesFixtureModule {}
