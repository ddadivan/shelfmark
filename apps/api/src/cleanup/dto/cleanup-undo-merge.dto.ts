import { ApiProperty } from '@nestjs/swagger';
import { LINK_LIMIT, TAG_LIMIT, type CleanupUndoMerge } from '@shelfmark/contracts';
import { ArrayMaxSize, ArrayUnique, IsArray, IsString, IsUUID, Length } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';

export class CleanupUndoMergeDto implements CleanupUndoMerge {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  keptTagId!: string;

  @ApiProperty({ minLength: 1, maxLength: TAG_LIMIT.NameMax })
  @IsString()
  @Length(1, TAG_LIMIT.NameMax)
  @NoControlChars()
  mergedName!: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMaxSize(LINK_LIMIT.PerUserMax)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  linkIds!: string[];

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMaxSize(LINK_LIMIT.PerUserMax)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  addedLinkIds!: string[];
}
