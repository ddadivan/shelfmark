import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { RediscoverController } from './rediscover.controller';
import { RediscoverService } from './rediscover.service';

/**
 * "From your shelf" (F8). Imports `AiModule` for settings, entitlements, the search status and the
 * embedding provider's model; never `LinksModule` (`toLinkResponse` is a function).
 */
@Module({
  imports: [AiModule],
  controllers: [RediscoverController],
  providers: [RediscoverService],
})
export class RediscoverModule {}
