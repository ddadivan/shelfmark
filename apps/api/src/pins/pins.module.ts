import { Module } from '@nestjs/common';
import { FoldersModule } from '../folders/folders.module';
import { ViewsModule } from '../views/views.module';
import { PinsController } from './pins.controller';
import { PinsService } from './pins.service';

@Module({
  imports: [FoldersModule, ViewsModule],
  controllers: [PinsController],
  providers: [PinsService],
})
export class PinsModule {}
