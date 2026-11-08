import { ApiProperty } from '@nestjs/swagger';
import { TAG_LIMIT } from '@shelfmark/contracts';
import type { UpdateTagRequest } from '@shelfmark/contracts';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeTagName } from './normalize-tag-name.decorator';

export class UpdateTagDto implements UpdateTagRequest {
  @ApiProperty({ minLength: 1, maxLength: TAG_LIMIT.NameMax, example: 'to-read' })
  @NormalizeTagName()
  @IsString()
  @MinLength(1)
  @MaxLength(TAG_LIMIT.NameMax)
  name!: string;
}
