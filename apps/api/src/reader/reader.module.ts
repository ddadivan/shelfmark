import { Module } from '@nestjs/common';
import { FetcherModule } from '../fetcher/fetcher.module';
import { ReaderArticleController } from './reader-article.controller';
import { ReaderArticleService } from './reader-article.service';
import { ReaderProgressController } from './reader-progress.controller';
import { ReaderProgressService } from './reader-progress.service';

/**
 * Reader (Shelf Link page): the article text of a link (`GET /api/links/:id/reader`) and the
 * reading progress (`/api/reader/progress`). Imports only
 * `FetcherModule`; `LinksModule` deletes the stored rows on a URL change with its own statements.
 */
@Module({
  imports: [FetcherModule],
  controllers: [ReaderArticleController, ReaderProgressController],
  providers: [ReaderArticleService, ReaderProgressService],
})
export class ReaderModule {}
