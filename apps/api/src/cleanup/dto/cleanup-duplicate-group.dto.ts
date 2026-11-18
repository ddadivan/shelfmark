import { ApiProperty } from '@nestjs/swagger';
import {
  CLEANUP_SOURCE,
  DUPLICATE_REASON,
  KEEP_REASON,
  type CleanupDuplicateGroup,
  type CleanupSource,
  type DuplicateReason,
  type KeepReason,
} from '@shelfmark/contracts';
import { LinkResponseDto } from '../../links/dto/link-response.dto';

export class CleanupDuplicateGroupDto implements CleanupDuplicateGroup {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: Object.values(DUPLICATE_REASON) }) reason!: DuplicateReason;
  @ApiProperty({ enum: Object.values(CLEANUP_SOURCE) }) source!: CleanupSource;
  @ApiProperty({ type: LinkResponseDto }) keep!: LinkResponseDto;
  @ApiProperty({ enum: Object.values(KEEP_REASON) }) keepReason!: KeepReason;
  @ApiProperty({ type: [LinkResponseDto] }) copies!: LinkResponseDto[];
}
