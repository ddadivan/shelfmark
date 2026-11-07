import { Module } from '@nestjs/common';
import { SafeFetcherService } from './safe-fetcher.service';

@Module({ providers: [SafeFetcherService], exports: [SafeFetcherService] })
export class FetcherModule {}
