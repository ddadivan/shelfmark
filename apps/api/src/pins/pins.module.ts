import { Module } from '@nestjs/common';
import { FoldersModule } from '../folders/folders.module';
import { PinsController } from './pins.controller';
import { PinsService } from './pins.service';

@Module({
  imports: [FoldersModule],
  controllers: [PinsController],
  providers: [PinsService],
})
export class PinsModule {}
