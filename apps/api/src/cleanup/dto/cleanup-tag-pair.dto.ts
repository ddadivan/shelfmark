import { ApiProperty } from '@nestjs/swagger';
import { CLEANUP_SOURCE, type CleanupSource, type CleanupTagPair } from '@shelfmark/contracts';
import { CleanupTagDto } from './cleanup-tag.dto';

export class CleanupTagPairDto implements CleanupTagPair {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: Object.values(CLEANUP_SOURCE) }) source!: CleanupSource;
  @ApiProperty({ type: CleanupTagDto }) keep!: CleanupTagDto;
  @ApiProperty({ type: CleanupTagDto }) merge!: CleanupTagDto;
}
