import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { FetcherModule } from '../fetcher/fetcher.module';
import { FoldersModule } from '../folders/folders.module';
import { PreviewModule } from '../preview/preview.module';
import { RulesModule } from '../rules/rules.module';
import { TagsModule } from '../tags/tags.module';
import { LinkFrameCheckService } from './frame-check/link-frame-check.service';
import { LinkImageCaptureService } from './images/link-image-capture.service';
import { LinkImageRecaptureService } from './images/link-image-recapture.service';
import { LinkImagesService } from './images/link-images.service';
import { LinkPreviewService } from './link-preview.service';
import { LinksController } from './links.controller';
import { LinksBulkService } from './links-bulk.service';
import { LinksBatchService } from './links-batch.service';
import { LinksWriteService } from './links-write.service';
import { LinksService } from './links.service';

@Module({
  imports: [FetcherModule, PreviewModule, FoldersModule, TagsModule, RulesModule, AiModule],
  controllers: [LinksController],
  providers: [
    LinksService,
    LinksWriteService,
    LinksBulkService,
    LinksBatchService,
    LinkPreviewService,
    LinkFrameCheckService,
    LinkImageCaptureService,
    LinkImageRecaptureService,
    LinkImagesService,
  ],
  exports: [LinksService, LinksWriteService, LinksBatchService],
})
export class LinksModule {}
