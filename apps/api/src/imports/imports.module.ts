import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { FoldersModule } from '../folders/folders.module';
import { LinksModule } from '../links/links.module';
import { TagsModule } from '../tags/tags.module';
import { ImportsController } from './imports.controller';
import { ImportGroupsService } from './import-groups.service';
import { ImportsService } from './imports.service';

/** Import of bookmark files (#387, ADR 0056). Imports `LinksModule`; `AiModule` must never import this. */
@Module({
  imports: [AiModule, FoldersModule, TagsModule, LinksModule],
  controllers: [ImportsController],
  providers: [ImportsService, ImportGroupsService],
})
export class ImportsModule {}
