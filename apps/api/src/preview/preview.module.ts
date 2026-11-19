import { Module } from '@nestjs/common';
import { FetcherModule } from '../fetcher/fetcher.module';
import { YOUTUBE_LIMIT } from './youtube/models/youtube-limit.const';
import { YOUTUBE_OEMBED_ENDPOINT } from './youtube/models/youtube-oembed-endpoint.token';
import { YouTubeOembedService } from './youtube/youtube-oembed.service';

/**
 * Preview helpers that need the fetcher, shared by `LinksModule` (link previews) and `AiModule`
 * (page excerpts). Imports only `FetcherModule`.
 */
@Module({
  imports: [FetcherModule],
  providers: [
    YouTubeOembedService,
    { provide: YOUTUBE_OEMBED_ENDPOINT, useValue: YOUTUBE_LIMIT.OembedEndpoint },
  ],
  exports: [YouTubeOembedService],
})
export class PreviewModule {}
