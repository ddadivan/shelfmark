import { Module } from '@nestjs/common';
import { FoldersModule } from '../folders/folders.module';
import { FolderSharesController } from './folder-shares.controller';
import { FolderSharesService } from './folder-shares.service';
import { PublicCollectionsController } from './public-collections.controller';
import { PublicCollectionsService } from './public-collections.service';

/** Public collections (#276, ADR 0040): the owner's share settings and the anonymous page data. */
@Module({
  imports: [FoldersModule],
  controllers: [FolderSharesController, PublicCollectionsController],
  providers: [FolderSharesService, PublicCollectionsService],
})
export class SharesModule {}
