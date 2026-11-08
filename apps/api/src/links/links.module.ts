import { Module } from '@nestjs/common';
import { FetcherModule } from '../fetcher/fetcher.module';
import { FoldersModule } from '../folders/folders.module';
import { TagsModule } from '../tags/tags.module';
import { LinkImageCaptureService } from './images/link-image-capture.service';
import { LinkImagesService } from './images/link-images.service';
import { LinkPreviewService } from './link-preview.service';
import { LinksController } from './links.controller';
import { LinksWriteService } from './links-write.service';
import { LinksService } from './links.service';

@Module({
  imports: [FetcherModule, FoldersModule, TagsModule],
  controllers: [LinksController],
  providers: [
    LinksService,
    LinksWriteService,
    LinkPreviewService,
    LinkImageCaptureService,
    LinkImagesService,
  ],
  exports: [LinksService, LinksWriteService],
})
export class LinksModule {}
