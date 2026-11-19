import { Module } from '@nestjs/common';
import { FoldersModule } from '../folders/folders.module';
import { LinksModule } from '../links/links.module';
import { TagsModule } from '../tags/tags.module';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

/** Import of bookmark files (#387, ADR 0056). Imports `LinksModule`; `AiModule` must never import this. */
@Module({
  imports: [FoldersModule, TagsModule, LinksModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
