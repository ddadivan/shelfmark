import { Module } from '@nestjs/common';
import { TagChangeHooks } from './tag-change-hooks.service';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
  controllers: [TagsController],
  providers: [TagsService, TagChangeHooks],
  exports: [TagsService, TagChangeHooks],
})
export class TagsModule {}
