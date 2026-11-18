import { ApiProperty } from '@nestjs/swagger';
import { CLEANUP_LIMIT, type CleanupApplyDuplicate } from '@shelfmark/contracts';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CleanupApplyDuplicateDto implements CleanupApplyDuplicate {
  @ApiProperty({ description: 'A duplicate group id of the stored report' })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,32}$/)
  groupId!: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: CLEANUP_LIMIT.GroupSizeMax,
    description: 'Links of the group to move to Trash; at least one member always stays',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(CLEANUP_LIMIT.GroupSizeMax)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  trashIds!: string[];
}
