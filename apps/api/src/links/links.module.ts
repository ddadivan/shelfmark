import { Module } from '@nestjs/common';
import { FetcherModule } from '../fetcher/fetcher.module';
import { LinkPreviewService } from './link-preview.service';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';

@Module({
  imports: [FetcherModule],
  controllers: [LinksController],
  providers: [LinksService, LinkPreviewService],
  exports: [LinksService],
})
export class LinksModule {}
